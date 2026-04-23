export default async function handler(req, res) {
  try {
    const { code, error, error_description } = req.query;

    if (error) {
      return res.status(400).json({
        ok: false,
        error,
        error_description
      });
    }

    if (!code) {
      return res.status(400).json({
        ok: false,
        error: "Pas de code reçu"
      });
    }

    const response = await fetch("https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.TESLA_CLIENT_ID,
        client_secret: process.env.TESLA_CLIENT_SECRET,
        code,
        audience: "https://fleet-api.prd.eu.vn.cloud.tesla.com",
        redirect_uri: "https://deye-monitor.vercel.app/api/tesla/callback"
      })
    });

    const data = await response.json().catch(() => null);

    return res.status(response.status).json({
      ok: response.ok,
      response: data
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: e.message
    });
  }
}
