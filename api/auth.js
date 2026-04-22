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
      appId,
      appSecret,
      baseUrl,
      companyId
    } = req.body || {};

    const apiBase = String(baseUrl || "").replace(/\/+$/, "");

    if (action !== "login") {
      return res.status(400).json({ error: "Action non reconnue pour ce test" });
    }

    if (!username || !password || !appId || !appSecret || !apiBase) {
      return res.status(400).json({
        error: "Champs manquants",
        details: { username: !!username, password: !!password, appId: !!appId, appSecret: !!appSecret, baseUrl: !!apiBase }
      });
    }

    const loginBody = {
      email: username,
      password: password,
      appSecret: appSecret
    };

    if (companyId) {
      loginBody.companyId = companyId;
    }

    const loginUrl = `${apiBase}/account/token?appId=${encodeURIComponent(appId)}`;

    const authResponse = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(loginBody)
    });

    const rawText = await authResponse.text();

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { rawText };
    }

    return res.status(authResponse.status).json({
      success: authResponse.ok,
      status: authResponse.status,
      loginUrl,
      sentBodyPreview: {
        email: username,
        hasPassword: !!password,
        hasAppSecret: !!appSecret,
        hasCompanyId: !!companyId
      },
      response: parsed
    });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return res.status(500).json({
      error: "Erreur serveur",
      details: error?.message || String(error),
      stack: error?.stack || null
    });
  }
}
