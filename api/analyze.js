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
          content: `Analizá este texto de un examen escolar escrito a mano. Respondé SOLO con JSON válido, sin texto extra.

Texto:
${fullText.slice(0, 500)}

JSON requerido:
{"nota":"numero del 0 al 10 o vacio","tipo":"examen o parcial o trabajo o documento"}`
        }]
      })
    });

    const claudeData = await claudeRes.json();
    console.log("Claude status:", claudeRes.status);
    console.log("Claude raw:", JSON.stringify(claudeData).slice(0, 300));

    let notaDetectada = "";
    let tipoDetectado = "documento";

    if (claudeData.content?.[0]?.text) {
      try {
        const text = claudeData.content[0].text.replace(/```json|```/g, "").trim();
        console.log("Claude text:", text);
        const parsed = JSON.parse(text);
        notaDetectada = String(parsed.nota || "").replace(/[^0-9.]/g, "");
        tipoDetectado = parsed.tipo || "documento";
      } catch(e) {
        console.log("Parse error:", e.message);
      }
    }

    console.log("Final → nota:", notaDetectada, "tipo:", tipoDetectado);
    res.status(200).json({ text: fullText, nota: notaDetectada, tipo: tipoDetectado });

  } catch (error) {
    console.log("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}
