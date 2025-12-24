const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleApi } = require('./apiRouter');

const PORT = process.env.PORT || 4000;
const clientRoot = path.join(__dirname, '..', 'client');

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.ico') return 'image/x-icon';
  return 'application/octet-stream';
}

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent(reqPath);
  const cleaned = decoded.replace(/\0/g, '');
  const full = path.normalize(path.join(root, cleaned));
  if (!full.startsWith(root)) return null;
  return full;
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let reqPath = url.pathname;

  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const fullPath = safeJoin(clientRoot, reqPath);
  if (!fullPath) {
    res.writeHead(400);
    return res.end('Bad request');
  }

  fs.stat(fullPath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      return res.end('Not found');
    }

    res.writeHead(200, { 'Content-Type': contentTypeFor(fullPath) });
    fs.createReadStream(fullPath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (
    url.pathname === '/new' || url.pathname === '/join' || url.pathname === '/state' || url.pathname === '/move' ||
    url.pathname.startsWith('/api/')
  ) {
    return handleApi(req, res);
  }

  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
