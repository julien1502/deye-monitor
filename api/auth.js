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

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      action,
      username,
      password,
      token,
      deviceId,
      stationId,
      appId,
      appSecret,
      baseUrl,
      companyId
    } = req.body || {};

    const apiBase = String(baseUrl || "").replace(/\/+$/, "");

    // ================= LOGIN =================
    if (action === "login") {
      const loginUrl = `${apiBase}/account/token?appId=${encodeURIComponent(appId)}`;

      const loginBody = {
        email: username,
        password: sha256Lower(password),
        appSecret
      };

      if (companyId) loginBody.companyId = companyId;

      const r = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginBody)
      });

      const data = await r.json().catch(() => null);

      return res.status(r.status).json({
        success: r.ok,
        response: data
      });
    }

    // ================= DEVICES =================
    if (action === "devices") {
      const r = await fetch(`${apiBase}/station/listWithDevice`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ page: 1, size: 20 })
      });

      const data = await r.json().catch(() => null);

      return res.status(r.status).json({
        success: r.ok,
        response: data
      });
    }

    // ================= REALTIME =================
    if (action === "realtime") {
      const r = await fetch(`${apiBase}/station/latest`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          stationId: Number(stationId)
        })
      });

      const data = await r.json().catch(() => null);

      return res.status(r.status).json({
        success: r.ok,
        response: data
      });
    }

    return res.status(400).json({ error: "Action inconnue" });

  } catch (e) {
    return res.status(500).json({
      error: "Erreur serveur",
      details: e.message
    });
  }
}
