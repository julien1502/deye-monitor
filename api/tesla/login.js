export default function handler(req, res) {
  const clientId = process.env.TESLA_CLIENT_ID;
  const redirectUri = encodeURIComponent("https://deye-monitor.vercel.app/api/tesla/callback");

  const scope = encodeURIComponent(
    "openid offline_access vehicle_device_data vehicle_cmds vehicle_charging_cmds"
  );

  const url = `https://auth.tesla.com/oauth2/v3/authorize?` +
    `response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=${scope}`;

  res.redirect(url);
}
