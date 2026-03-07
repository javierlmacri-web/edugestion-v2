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
    const { imageBase64, mimeType, fileName } = req.body;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    const timestamp = Math.floor(Date.now() / 1000);
    const { createHmac } = await import("crypto");
    const signature = createHmac("sha256", apiSecret)
      .update(`timestamp=${timestamp}${apiSecret}`)
      .digest("hex");

    const formData = new URLSearchParams();
    formData.append("file", `data:${mimeType};base64,${imageBase64}`);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder", "edugestion");

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: formData
    });

    const data = await uploadRes.json();
    console.log("Cloudinary response:", JSON.stringify(data).slice(0, 200));

    if (data.secure_url) {
      res.status(200).json({ url: data.secure_url, publicId: data.public_id });
    } else {
      res.status(500).json({ error: "Upload failed", detail: data });
    }
  } catch (error) {
    console.log("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}
