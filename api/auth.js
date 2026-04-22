// api/auth.js
import crypto from "crypto";

function sha256Lower(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex").toLowerCase();
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function cleanBaseUrl(baseUrl) {
  return String(baseUrl || "").replace(/\/+$/, "");
}

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function flattenDevicesFromStations(payload) {
  const stations = payload?.data?.records || payload?.data?.rows || payload?.data || [];
  const out = [];

  const walk = (value) => {
    if (!value) return;

    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }

    if (typeof value !== "object") return;

    const maybeDeviceId =
      value.deviceId ??
      value.id ??
      value.devId ??
      value.device_id;

    const maybeName =
      value.deviceName ??
      value.name ??
      value.alias ??
      value.sn ??
      value.deviceSn;

    if (maybeDeviceId) {
      out.push({
        deviceId: maybeDeviceId,
        deviceName: maybeName || `Device ${maybeDeviceId}`,
        raw: value,
      });
    }

    for (const key of Object.keys(value)) {
      walk(value[key]);
    }
  };

  walk(stations);

  const unique = new Map();
  for (const item of out) {
    unique.set(String(item.deviceId), item);
  }

  return Array.from(unique.values());
}

function pickMetric(raw, keys) {
  if (!raw || typeof raw !== "object") return undefined;

  for (const key of keys) {
    if (raw[key] !== undefined && raw[key] !== null) return raw[key];
  }

  if (Array.isArray(raw.dataList)) {
    for (const entry of raw.dataList) {
      const code = entry?.code ?? entry?.key ?? entry?.name;
      if (keys.includes(code)) {
        return entry?.value;
      }
    }
  }

  if (Array.isArray(raw.metrics)) {
    for (const entry of raw.metrics) {
      const code = entry?.code ?? entry?.key ?? entry?.name;
      if (keys.includes(code)) {
        return entry?.value;
      }
    }
  }

  return undefined;
}

function normalizeRealtime(raw) {
  const powerAC =
    pickMetric(raw, ["powerAC", "acPower", "pac", "outputPower", "activePower"]) ?? 0;

  const energyToday =
    pickMetric(raw, ["energyToday", "eday", "todayEnergy", "dayEnergy"]) ?? 0;

  const temperature =
    pickMetric(raw, ["temperature", "temp", "inverterTemp", "radiatorTemp"]) ?? 0;

  const batterySOC =
    pickMetric(raw, ["batterySOC", "soc", "batterySoc"]) ?? 0;

  const batteryPower =
    pickMetric(raw, ["batteryPower", "batPower", "batteryChargeDischargePower"]) ?? 0;

  const gridPower =
    pickMetric(raw, ["gridPower", "gridActivePower", "meterPower"]) ?? 0;

  const pvVoltage =
    pickMetric(raw, ["pvVoltage", "pv1Voltage", "vpv1"]) ?? 0;

  const pvCurrent =
    pickMetric(raw, ["pvCurrent", "pv1Current", "ipv1"]) ?? 0;

  const gridFrequency =
    pickMetric(raw, ["gridFrequency", "frequency", "fac"]) ?? 0;

  const systemStatus =
    pickMetric(raw, ["systemStatus", "status", "runState"]) ?? "Normal";

  return {
    powerAC,
    energyToday,
    temperature,
    batterySOC,
    batteryPower,
    gridPower,
    pvVoltage,
    pvCurrent,
    gridFrequency,
    systemStatus,
    raw,
  };
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Méthode non autorisée" });
  }

  const {
    action,
    username,
    password,
    token,
    deviceId,
    appId,
    appSecret,
    baseUrl,
    companyId,
    startDate,
    endDate,
  } = req.body || {};

  const apiBase = cleanBaseUrl(baseUrl);

  try {
    if (!action) {
      return sendJson(res, 400, { error: "Action manquante" });
    }

    if (!apiBase) {
      return sendJson(res, 400, {
        error: "Base URL manquante. Exemple Europe: https://eu1-developer.deyecloud.com/v1.0",
      });
    }

    if (action === "login") {
      if (!username || !password || !appId || !appSecret) {
        return sendJson(res, 400, {
          error: "Champs requis: username, password, appId, appSecret, baseUrl",
        });
      }

      const hashedPassword = sha256Lower(password);

      const loginBody = {
        email: username,
        password: hashedPassword,
        appSecret,
      };

      if (companyId) {
        loginBody.companyId = companyId;
      }

      const loginUrl = `${apiBase}/account/token?appId=${encodeURIComponent(appId)}`;

      const authResponse = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginBody),
      });

      const authData = await authResponse.json().catch(() => null);

      if (!authResponse.ok || !authData?.success || !authData?.accessToken) {
        return sendJson(res, 401, {
          error:
            authData?.msg ||
            authData?.message ||
            "Authentification Deye échouée",
          details: authData,
        });
      }

      return sendJson(res, 200, {
        success: true,
        data: {
          accessToken: authData.accessToken,
          refreshToken: authData.refreshToken,
          tokenType: authData.tokenType,
          expiresIn: authData.expiresIn,
          raw: authData,
        },
      });
    }

    if (action === "devices") {
      if (!token) {
        return sendJson(res, 400, { error: "Token manquant" });
      }

      const devicesUrl = `${apiBase}/station/listWithDevice`;

      const devicesResponse = await fetch(devicesUrl, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          page: 1,
          size: 20,
        }),
      });

      const devicesData = await devicesResponse.json().catch(() => null);

      if (!devicesResponse.ok || devicesData?.success === false) {
        return sendJson(res, 401, {
          error:
            devicesData?.msg ||
            devicesData?.message ||
            "Impossible de récupérer les appareils",
          details: devicesData,
        });
      }

      const devices = flattenDevicesFromStations(devicesData);

      return sendJson(res, 200, {
        success: true,
        data: devices,
        raw: devicesData,
      });
    }

    if (action === "realtime") {
      if (!token || !deviceId) {
        return sendJson(res, 400, { error: "Token ou deviceId manquant" });
      }

      const latestUrl = `${apiBase}/device/latest`;

      const latestResponse = await fetch(latestUrl, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          deviceIdList: [deviceId],
        }),
      });

      const latestData = await latestResponse.json().catch(() => null);

      if (!latestResponse.ok || latestData?.success === false) {
        return sendJson(res, 401, {
          error:
            latestData?.msg ||
            latestData?.message ||
            "Impossible de récupérer les données temps réel",
          details: latestData,
        });
      }

      const first =
        latestData?.data?.[0] ??
        latestData?.data?.records?.[0] ??
        latestData?.data?.rows?.[0] ??
        latestData?.data ??
        null;

      const normalized = normalizeRealtime(first);

      return sendJson(res, 200, {
        success: true,
        data: normalized,
        raw: latestData,
      });
    }

    if (action === "history") {
      if (!token || !deviceId || !startDate || !endDate) {
        return sendJson(res, 400, {
          error: "Token, deviceId, startDate et endDate sont requis",
        });
      }

      const historyUrl = `${apiBase}/device/history`;

      const historyResponse = await fetch(historyUrl, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          deviceId,
          startDate,
          endDate,
        }),
      });

      const historyData = await historyResponse.json().catch(() => null);

      if (!historyResponse.ok || historyData?.success === false) {
        return sendJson(res, 400, {
          error:
            historyData?.msg ||
            historyData?.message ||
            "Impossible de récupérer l'historique",
          details: historyData,
        });
      }

      return sendJson(res, 200, {
        success: true,
        data: historyData?.data ?? null,
        raw: historyData,
      });
    }

    return sendJson(res, 400, { error: "Action non reconnue" });
  } catch (error) {
    console.error("Erreur serveur Deye:", error);
    return sendJson(res, 500, {
      error: "Erreur serveur",
      details: error.message,
    });
  }
}
