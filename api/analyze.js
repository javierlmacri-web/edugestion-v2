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

    // Detect tipo
    const lower = fullText.toLowerCase();
    let tipo = "documento";
    if (lower.includes("parcial") || lower.includes("examen")) tipo = "examen";
    else if (lower.includes("trabajo") || lower.includes(" tp ")) tipo = "trabajo";
    else if (lower.includes("tarea")) tipo = "tarea";

    // Solo detecta nota si dice explicitamente NOTA/CALIFICACION/CALIF seguido de número
    let nota = "";
    const lines = fullText.split("\n").map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const m = line.match(/(?:[Nn][Oo][Tt][Aa]|[Cc][Aa][Ll][Ii][Ff])[^0-9]*([0-9]+(?:[.,][0-9]+)?)/);
      if (m) { nota = m[1].replace(",", "."); break; }
    }

    console.log("Detectado → nota:", nota, "tipo:", tipo);
    res.status(200).json({ text: fullText, nota, tipo });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
