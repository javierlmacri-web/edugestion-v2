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

    // Patrones en orden de confianza:
    // 1. NOTA / CALIF seguido de número con punto o coma
    const p1 = multiline.match(/(?:[Nn][Oo][Tt][Aa]|[Cc][Aa][Ll][Ii][Ff])[\s:.\-]*([0-9]+[.,][0-9]+)/);
    if (p1) nota = p1[1].replace(",", ".");

    // 2. NOTA seguido de número entero
    if (!nota) {
      const p2 = multiline.match(/(?:[Nn][Oo][Tt][Aa]|[Cc][Aa][Ll][Ii][Ff])[\s:.\-]*([0-9]+)/);
      if (p2) nota = p2[1];
    }

    // 3. Corrección OCR: "7S" o "7s" → "7.5" (Vision confunde .5 manuscrito con S)
    if (!nota || nota.length === 1) {
      const p3 = multiline.match(/(?:[Nn][Oo][Tt][Aa]|[Cc][Aa][Ll][Ii][Ff])[\s:.\-]*([0-9])[\s]*[Ss5]/);
      if (p3) nota = p3[1] + ".5";
    }

    // 4. Corrección OCR: "75" después de NOTA sin separador → puede ser "7.5"
    if (!nota) {
      const p4 = multiline.match(/(?:[Nn][Oo][Tt][Aa]|[Cc][Aa][Ll][Ii][Ff])[\s:.\-]*(7[5]|8[5]|9[5]|6[5])\b/);
      if (p4) nota = p4[1][0] + "." + p4[1][1];
    }

    // 5. Buscar número en la misma línea que contiene "NOTA" o "CALIF"
    if (!nota) {
      for (const line of lines) {
        const lnorm = line.toLowerCase();
        if (lnorm.includes("nota") || lnorm.includes("calif")) {
          const numMatch = line.match(/([0-9]+[.,][0-9]+|[0-9]+)/g);
          if (numMatch) {
            for (const nm of numMatch) {
              const n = parseFloat(nm.replace(",", "."));
              if (!isNaN(n) && n >= 0 && n <= 10) { nota = String(n); break; }
              if (nm.length === 2 && ["65","75","85","95"].includes(nm)) { nota = nm[0] + "." + nm[1]; break; }
            }
          }
        }
      }
    }

    // Validar rango 0-10
    if (nota) {
      const n = parseFloat(nota);
      if (isNaN(n) || n < 0 || n > 10) nota = "";
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
