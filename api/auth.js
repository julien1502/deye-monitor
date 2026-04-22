// Vercel Serverless Function - api/auth.js
// Sauvegardez ce fichier dans: vercel-project/api/auth.js

export default async function handler(req, res) {
  // Autoriser les requêtes CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action, username, password, deviceId, token } = req.body;

  try {
    // ACTION: Authentification
    if (action === 'login') {
      const authResponse = await fetch('https://api.deye.com.cn/v1/user/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      if (!authResponse.ok) {
        return res.status(401).json({ 
          error: 'Authentification échouée. Vérifiez vos identifiants.' 
        });
      }

      const data = await authResponse.json();
      return res.status(200).json({
        success: true,
        data: data.data
      });
    }

    // ACTION: Récupérer la liste des appareils
    if (action === 'devices') {
      const devicesResponse = await fetch('https://api.deye.com.cn/v1/device/list', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (!devicesResponse.ok) {
        return res.status(401).json({ 
          error: 'Impossible de récupérer les appareils. Token expiré ?' 
        });
      }

      const data = await devicesResponse.json();
      return res.status(200).json({
        success: true,
        data: data.data
      });
    }

    // ACTION: Récupérer les données temps réel
    if (action === 'realtime') {
      const realtimeResponse = await fetch(
        `https://api.deye.com.cn/v1/device/real-time/${deviceId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          }
        }
      );

      if (!realtimeResponse.ok) {
        return res.status(401).json({ 
          error: 'Impossible de récupérer les données. Token expiré ?' 
        });
      }

      const data = await realtimeResponse.json();
      return res.status(200).json({
        success: true,
        data: data.data
      });
    }

    // ACTION: Récupérer l'historique énergétique
    if (action === 'history') {
      const { startDate, endDate } = req.body;
      
      const historyResponse = await fetch(
        `https://api.deye.com.cn/v1/device/energy/${deviceId}?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          }
        }
      );

      if (!historyResponse.ok) {
        return res.status(400).json({ 
          error: 'Impossible de récupérer l\'historique' 
        });
      }

      const data = await historyResponse.json();
      return res.status(200).json({
        success: true,
        data: data.data
      });
    }

    return res.status(400).json({ error: 'Action non reconnue' });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return res.status(500).json({ 
      error: `Erreur serveur: ${error.message}` 
    });
  }
}
