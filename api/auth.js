import crypto from "crypto";

function sha256Lower(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex").toLowerCase();
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

export default async function handler(req, res) {
  setCors(res);

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
      return res.status(400).json({ error: "Base URL manquante" });
    }

    if (action === "login") {
      if (!username || !password || !appId || !appSecret) {
        return res.status(400).json({ error: "Champs login manquants" });
      }

      const loginBody = {
        email: username,
        password: sha256Lower(password),
        appSecret
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

      const authData = await authResponse.json().catch(() => null);

      return res.status(authResponse.status).json({
        success: authResponse.ok,
        response: authData
      });
    }

    if (action === "devices") {
      if (!token) {
        return res.status(400).json({ error: "Token manquant" });
      }

      const devicesUrl = `${apiBase}/station/listWithDevice`;

      const devicesResponse = await fetch(devicesUrl, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          page: 1,
          size: 20
        })
      });

      const devicesData = await devicesResponse.json().catch(() => null);

      return res.status(devicesResponse.status).json({
        success: devicesResponse.ok,
        response: devicesData
      });
    }

   if (action === "realtime") {
  if (!token || !deviceId) {
    return res.status(400).json({ error: "Token ou deviceId manquant" });
  }

  const realtimeUrl = `${apiBase}/device/latest`;

  const realtimeResponse = await fetch(realtimeUrl, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      deviceId: deviceId
    })
  });

  const realtimeData = await realtimeResponse.json().catch(() => null);

  return res.status(realtimeResponse.ok ? 200 : 500).json({
    success: realtimeResponse.ok,
    sent: {
      deviceId: deviceId
    },
    response: realtimeData
  });
}

    return res.status(400).json({ error: "Action non reconnue" });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return res.status(500).json({
      error: "Erreur serveur",
      details: error?.message || String(error)
    });
  }
}
