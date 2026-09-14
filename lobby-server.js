const http = require('http');

const port = Number(process.env.PORT || 8787);
const rooms = new Map();
const maxAge = 15000;

function send(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(data);
}

function prune() {
  const now = Date.now();
  for (const [peerId, room] of rooms) {
    if (now - room.updatedAt > maxAge) rooms.delete(peerId);
  }
}

function body(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  prune();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const match = url.pathname.match(/^\/rooms\/?([^/]*)$/);

  if (!match) return send(res, 404, { error: 'not found' });
  const peerId = decodeURIComponent(match[1] || '');

  try {
    if (req.method === 'GET' && !peerId) {
      return send(res, 200, [...rooms.values()].map(({ updatedAt, ...room }) => room));
    }
    if (req.method === 'POST' && !peerId) {
      const room = await body(req);
      if (!room.peerId) return send(res, 400, { error: 'peerId required' });
      rooms.set(room.peerId, {
        peerId: room.peerId,
        name: String(room.name || 'REDLINE LOBBY').slice(0, 32),
        mode: String(room.mode || 'coop').slice(0, 20),
        map: String(room.map || 'RANDOM').slice(0, 32),
        players: Math.max(1, Number(room.players) || 1),
        maxPlayers: Math.min(3, Math.max(1, Number(room.maxPlayers) || 3)),
        updatedAt: Date.now(),
      });
      return send(res, 201, { ok: true });
    }
    if (peerId && (req.method === 'PUT' || req.method === 'DELETE')) {
      if (req.method === 'DELETE') {
        rooms.delete(peerId);
        return send(res, 200, { ok: true });
      }
      const room = rooms.get(peerId);
      if (!room) return send(res, 404, { error: 'room not found' });
      const update = await body(req);
      room.players = Math.min(room.maxPlayers, Math.max(1, Number(update.players) || room.players));
      room.updatedAt = Date.now();
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'method not allowed' });
  } catch (error) {
    return send(res, 400, { error: 'invalid request' });
  }
});

server.listen(port, () => console.log(`Redline lobby server listening on :${port}`));
