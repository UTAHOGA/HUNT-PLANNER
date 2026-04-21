const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = process.env.PORT ? Number(process.env.PORT) : 4173;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function resolvePath(urlPath) {
  const safePath = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.normalize(safePath).replace(/^(\.\.[\\/])+/, '');
  const target = normalized === path.sep || normalized === '/' ? 'index.html' : normalized.replace(/^[/\\]/, '');
  return path.join(ROOT, target);
}

const server = http.createServer((req, res) => {
  const filePath = resolvePath(req.url || '/');

  if (!filePath.startsWith(ROOT)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(filePath, (statErr, stats) => {
    if (statErr) {
      send(res, 404, 'Not Found');
      return;
    }

    const finalPath = stats.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    fs.readFile(finalPath, (readErr, data) => {
      if (readErr) {
        send(res, 500, 'Server Error');
        return;
      }

      const ext = path.extname(finalPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      send(res, 200, data, contentType);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`UOGA Hunt Planner local server running at http://${HOST}:${PORT}`);
});
