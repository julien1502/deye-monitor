export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Pas de code");
  }

  const tokenUrl = "https://auth.tesla.com/oauth2/v3/token";

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.TESLA_CLIENT_ID,
      client_secret: process.env.TESLA_CLIENT_SECRET,
      code,
      redirect_uri: "https://deye-monitor.vercel.app/api/tesla/callback"
    })
  });

  const data = await response.json();

  return res.status(200).json(data);
}
