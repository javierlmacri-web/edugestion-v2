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
    const { messages, system } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY no configurada" });

    // En v1, el system prompt va como primer mensaje del modelo
    const contents = [
      { role: "user", parts: [{ text: system }] },
      { role: "model", parts: [{ text: "Entendido. Estoy listo para responder consultas sobre los datos del colegio." }] },
      ...messages.map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }))
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("Gemini error:", JSON.stringify(data));
      return res.status(response.status).json({ error: data.error?.message || "Error de Gemini API" });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude procesar la consulta.";
    res.status(200).json({ text });
  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(500).json({ error: error.message });
  }
}
