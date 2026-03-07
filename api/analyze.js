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

    // Step 1: Google Vision OCR
    const visionRes = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{ image: { content: imageBase64 }, features: [{ type: "TEXT_DETECTION", maxResults: 1 }] }]
      })
    });
    const visionData = await visionRes.json();
    const fullText = visionData.responses?.[0]?.fullTextAnnotation?.text || "";

    // Step 2: Claude interprets the text
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `Analizá este texto extraído de un examen escolar escrito a mano. Respondé SOLO con JSON sin explicaciones.

Texto OCR:
${fullText.slice(0, 500)}

Devolvé exactamente este JSON:
{
  "nota": "número entre 0 y 10 si encontrás una nota/calificación/puntaje, o vacío si no hay",
  "tipo": "examen, parcial, trabajo, tp, tarea o documento"
}

La nota puede estar escrita de cualquier forma: sola en una línea, como "NOTA 8", "8/10", "Calificación: 7", etc. Si hay un número suelto entre 1 y 10 que parece ser la calificación final, usalo.`
        }]
      })
    });

    const claudeData = await claudeRes.json();
    let notaDetectada = "";
    let tipoDetectado = "documento";

    try {
      const text = claudeData.content?.[0]?.text || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      notaDetectada = parsed.nota || "";
      tipoDetectado = parsed.tipo || "documento";
    } catch(e) {}

    res.status(200).json({ text: fullText, nota: notaDetectada, tipo: tipoDetectado });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
