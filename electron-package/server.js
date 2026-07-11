const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const OUT_DIR = path.join(__dirname, 'out');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(OUT_DIR, req.url === '/' ? 'index.html' : req.url);
  
  // For SPA routing, fallback to index.html
  if (!fs.existsSync(filePath)) {
    filePath = path.join(OUT_DIR, 'index.html');
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ============================================');
  console.log('    AI Image Processor is running!');
  console.log('    Open: http://localhost:' + PORT);
  console.log('  ============================================');
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
  
  // Open browser
  const { exec } = require('child_process');
  exec(`start http://localhost:${PORT}`);
});
