import crypto from "crypto";

function sha256Lower(value) {
  return crypto
    .createHash("sha256")
    .update(String(value), "utf8")
    .digest("hex")
    .toLowerCase();
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function deyeLogin({ username, password, appId, appSecret, baseUrl, companyId }) {
  const apiBase = String(baseUrl || "").replace(/\/+$/, "");
  const loginUrl = `${apiBase}/account/token?appId=${encodeURIComponent(appId)}`;

  const loginBody = {
    email: username,
    password: sha256Lower(password),
    appSecret,
  };

  if (companyId) loginBody.companyId = companyId;

  const response = await fetch(loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(loginBody),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.accessToken) {
    throw new Error(data?.msg || "Échec login Deye");
  }

  return {
    token: data.accessToken,
    apiBase,
  };
}

async function getStations(token, apiBase) {
  const response = await fetch(`${apiBase}/station/listWithDevice`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ page: 1, size: 20 }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.msg || "Impossible de récupérer les stations");
  }

  return data.stationList || [];
}

async function getRealtime(token, apiBase, stationId) {
  const response = await fetch(`${apiBase}/station/latest`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ stationId: Number(stationId) }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.msg || "Impossible de récupérer le temps réel");
  }

  return data;
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      username,
      password,
      appId,
      appSecret,
      baseUrl = "https://eu1-developer.deyecloud.com/v1.0",
      companyId = "",
      stationName = "",
    } = req.query;

    if (!username || !password || !appId || !appSecret) {
      return res.status(400).json({
        error: "Paramètres manquants",
      });
    }

    const { token, apiBase } = await deyeLogin({
      username,
      password,
      appId,
      appSecret,
      baseUrl,
      companyId,
    });

    const stations = await getStations(token, apiBase);

    const allInverters = stations.flatMap((station) =>
      (station.deviceListItems || [])
        .filter((d) => d.deviceType === "INVERTER")
        .map((d) => ({
          ...d,
          stationName: station.name,
        }))
    );

    const selected =
      allInverters.find((d) => stationName && d.stationName === stationName) ||
      allInverters.find((d) => d.stationName !== "This is a demo") ||
      allInverters[0];

    if (!selected) {
      return res.status(404).json({ error: "Aucun onduleur trouvé" });
    }

    const realtime = await getRealtime(token, apiBase, selected.stationId);

    return res.status(200).json({
      ok: true,
      stationName: selected.stationName,
      stationId: selected.stationId,
      deviceId: selected.deviceId,
      generationPower: realtime.generationPower ?? 0,
      consumptionPower: realtime.consumptionPower ?? 0,
      batteryPower: realtime.batteryPower ?? 0,
      batterySOC: realtime.batterySOC ?? 0,
      wirePower: realtime.wirePower ?? 0,
      lastUpdateTime: realtime.lastUpdateTime ?? null,
      raw: realtime,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: e.message,
    });
  }
}
