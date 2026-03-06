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
    const { imageBase64, mimeType } = req.body;

    // Get Google access token
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    // Create JWT
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/cloud-vision",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    })).toString("base64url");

    const { createSign } = await import("crypto");
    const sign = createSign("RSA-SHA256");
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(privateKey, "base64url");
    const jwt = `${header}.${payload}.${signature}`;

    // Exchange JWT for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.log("Token error:", JSON.stringify(tokenData));
      return res.status(500).json({ error: "No access token", detail: tokenData });
    }

    // Call Google Vision API
    const visionRes = await fetch("https://vision.googleapis.com/v1/images:annotate", {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: "TEXT_DETECTION", maxResults: 1 }]
        }]
      })
    });

    const visionData = await visionRes.json();
    const fullText = visionData.responses?.[0]?.fullTextAnnotation?.text || "";
    console.log("Vision text detected:", fullText.slice(0, 200));

    res.status(200).json({ text: fullText });
  } catch (error) {
    console.log("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}
