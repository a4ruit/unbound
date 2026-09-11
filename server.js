const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

// Serve the viewport page and its files.
const server = http.createServer((req, res) => {
  const file = req.url === '/' ? '/index.html' : req.url;
  fs.readFile(__dirname + file, (err, data) => {
    if (err) { res.writeHead(404).end('not found'); return; }
    const type = TYPES[path.extname(file)];
    if (type) res.setHeader('Content-Type', type);
    res.end(data);
  });
});

// Relay every message to all the other connected clients (Unity + phones).
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    for (const client of wss.clients) {
      if (client !== ws && client.readyState === client.OPEN) {
        client.send(msg.toString());
      }
    }
  });
});

server.listen(process.env.PORT || 3000);
