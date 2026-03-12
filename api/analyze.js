export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { imageBase64 } = req.body;
    const apiKey = process.env.GOOGLE_VISION_API_KEY;

    const visionRes = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{ image: { content: imageBase64 }, features: [{ type: "TEXT_DETECTION", maxResults: 1 }] }]
      })
    });
    const visionData = await visionRes.json();
    const fullText = visionData.responses?.[0]?.fullTextAnnotation?.text || "";

    // ─── Tipo de documento ───────────────────────────────────────────────────
    const lower = fullText.toLowerCase();
    let tipo = "documento";
    if (lower.includes("parcial") || lower.includes("examen")) tipo = "examen";
    else if (lower.includes("trabajo") || lower.includes(" tp ") || lower.includes("t.p")) tipo = "trabajo";
    else if (lower.includes("tarea")) tipo = "tarea";

    // ─── Detección de nota ───────────────────────────────────────────────────
    let nota = "";
    const lines = fullText.split("\n").map(l => l.trim()).filter(Boolean);
    const multiline = fullText.replace(/\n/g, " ");

    const tryNota = (raw) => {
      if (!raw) return "";
      const s = raw.replace(",", ".").trim();
      // "7S" o "7s" → "7.5"
      const mS = s.match(/^([0-9])[Ss]$/);
      if (mS) return mS[1] + ".5";
      // "75" → "7.5" solo si 2 dígitos y conocido
      if (/^[0-9]{2}$/.test(s) && ["65","75","85","95"].includes(s)) return s[0] + "." + s[1];
      const n = parseFloat(s);
      if (!isNaN(n) && n >= 0 && n <= 10) return String(n);
      return "";
    };

    // 1. NOTA/CALIF seguido de número (con o sin separador) en una sola línea
    const p1 = multiline.match(/(?:NOTA|nota|Nota|CALIF|calif)[\s:.\/\-]*([0-9]+[.,][0-9]+|[0-9][Ss]|[0-9]{1,2})/);
    if (p1) nota = tryNota(p1[1]);

    // 2. Línea que empieza con NOTA o termina con número después de NOTA
    if (!nota) {
      for (let idx = 0; idx < lines.length; idx++) {
        const l = lines[idx];
        if (/nota|calif/i.test(l)) {
          // número en la misma línea
          const inline = l.match(/([0-9]+[.,][0-9]+|[0-9][Ss]|[0-9]{1,2})/g);
          if (inline) {
            for (const nm of inline) { nota = tryNota(nm); if (nota) break; }
          }
          // número en la línea siguiente
          if (!nota && lines[idx + 1]) {
            const next = lines[idx + 1].match(/^([0-9]+[.,][0-9]+|[0-9][Ss]|[0-9]{1,2})$/);
            if (next) nota = tryNota(next[1]);
          }
          if (nota) break;
        }
      }
    }

    // 3. Esquina superior derecha: última línea corta que sea número (los maestros escriben la nota arriba a la derecha)
    if (!nota) {
      for (const l of lines.slice(0, 5)) {
        if (/^([0-9]+[.,][0-9]+|[0-9][Ss]|[0-9]{1,2})$/.test(l.trim())) {
          nota = tryNota(l.trim());
          if (nota) break;
        }
      }
    }

    // Validar rango 0-10 — si el número es mayor a 10 y tiene 2 dígitos, correr la coma (75 → 7.5)
    if (nota) {
      const n = parseFloat(nota);
      if (!isNaN(n) && n > 10) {
        const s = String(Math.round(n));
        if (s.length === 2) nota = s[0] + "." + s[1]; // 75 → 7.5
        else nota = ""; // número raro, descartar
      } else if (isNaN(n) || n < 0) {
        nota = "";
      }
    }

    // ─── Detección de materia ────────────────────────────────────────────────
    const materiaKeywords = [
      { key: ["matemat", "algebra", "calculo", "aritmet"], nombre: "Matemática" },
      { key: ["contab", "contador"], nombre: "Contabilidad" },
      { key: ["historia"], nombre: "Historia" },
      { key: ["geografia", "geograf"], nombre: "Geografía" },
      { key: ["lengua", "castellano", "ortograf", "redacc"], nombre: "Lengua" },
      { key: ["biolog", "ciencias nat"], nombre: "Biología" },
      { key: ["fisica"], nombre: "Física" },
      { key: ["quimica"], nombre: "Química" },
      { key: ["ingles", "english"], nombre: "Inglés" },
      { key: ["tecnolog"], nombre: "Tecnología" },
      { key: ["educacion fisica", "ed.fisica"], nombre: "Educación Física" },
      { key: ["filosofia"], nombre: "Filosofía" },
      { key: ["economia"], nombre: "Economía" },
      { key: ["informatica", "computac", "programac"], nombre: "Informática" },
    ];

    let materiaDetectada = "";
    const lowerNorm = fullText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const { key, nombre } of materiaKeywords) {
      if (key.some(k => lowerNorm.includes(k))) { materiaDetectada = nombre; break; }
    }

    console.log("Detectado → nota:", nota, "| tipo:", tipo, "| materia:", materiaDetectada, "| texto (100):", fullText.slice(0,100));
    res.status(200).json({ text: fullText, nota, tipo, materiaDetectada });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
