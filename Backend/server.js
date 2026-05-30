// =====================================================
//  server.js – Servidor HTTP en Node puro
// =====================================================

require('dotenv').config();
const http   = require('http');
const router = require('./router');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {

  // CORS – permite peticiones desde el frontend
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Pre-flight OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Parsear body JSON en POST
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end',  () => {
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch {
        req.body = {};
      }
      router.handle(req, res);
    });
    return;
  }

  // GET y demás
  req.body = {};
  router.handle(req, res);
});

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
