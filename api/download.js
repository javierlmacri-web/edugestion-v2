export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { url, nombre } = req.query;
  if (!url) return res.status(400).json({ error: "url requerida" });

  try {
    const response = await fetch(decodeURIComponent(url));
    if (!response.ok) return res.status(404).json({ error: "Archivo no encontrado" });

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const fileName = nombre ? decodeURIComponent(nombre) : "archivo";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(Buffer.from(buffer));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
