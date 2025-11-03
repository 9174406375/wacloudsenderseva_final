module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Home endpoint
  if (req.url === '/' && req.method === 'GET') {
    return res.status(200).json({
      status: '✅ ACTIVE',
      service: 'WhatsApp Cloud Sender Bot',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
  
  // Status endpoint
  if (req.url === '/api/status' && req.method === 'GET') {
    return res.status(200).json({
      bot_status: 'ready',
      api_version: '1.0.0',
      platform: 'vercel'
    });
  }
  
  // Order creation endpoint
  if (req.url === '/api/order/create' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        return res.status(200).json({
          success: true,
          orderId: Math.random().toString(36).substr(2, 9),
          customer: data.customerName,
          message: 'Order created successfully',
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON' });
      }
    });
  }
  
  // 404
  res.status(404).json({ error: 'Not found' });
};
