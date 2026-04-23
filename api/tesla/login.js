export default function handler(req, res) {
  const clientId = process.env.TESLA_CLIENT_ID;
  const redirectUri = encodeURIComponent("https://deye-monitor.vercel.app/api/tesla/callback");
  const scope = encodeURIComponent(
    "openid offline_access vehicle_device_data vehicle_cmds vehicle_charging_cmds"
  );

  const state = Math.random().toString(36).slice(2);

  const url =
    "https://auth.tesla.com/oauth2/v3/authorize" +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=${scope}` +
    `&state=${encodeURIComponent(state)}`;

  res.redirect(url);
}
