export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY no configurada" });
  const r = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
  const data = await r.json();
  res.status(200).json(data);
}
