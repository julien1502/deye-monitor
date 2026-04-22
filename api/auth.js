export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const {
      action,
      username,
      password,
      token,
      deviceId,
      appId,
      appSecret,
      baseUrl,
      companyId
    } = req.body || {};

    const apiBase = String(baseUrl || "").replace(/\/+$/, "");

    if (!action) {
      return res.status(400).json({ error: "Action manquante" });
    }

    if (!apiBase) {
      return res.status(400).json({
        error: "Base URL manquante"
      });
    }

    if (action === "login") {
      return res.status(200).json({
        success: true,
        debug: true,
        received: {
          username,
          hasPassword: !!password,
          appId,
          hasAppSecret: !!appSecret,
          baseUrl: apiBase,
          companyId
        }
      });
    }

    return res.status(400).json({ error: "Action non reconnue" });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return res.status(500).json({
      error: "Erreur serveur",
      details: error?.message || String(error),
      stack: error?.stack || null
    });
  }
}
