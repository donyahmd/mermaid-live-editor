import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.MERMAID_FILES_DIR || path.resolve('data/diagrams');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function safeName(name) {
  // Only allow alphanumeric, dash, underscore, dot; must end with .mmd
  const clean = path.basename(name);
  if (!/^[\w\-.]+\.mmd$/.test(clean)) {
    return null;
  }
  return clean;
}

function getFilePath(name) {
  const safe = safeName(name);
  if (!safe) return null;
  const resolved = path.resolve(DATA_DIR, safe);
  // Prevent path traversal
  if (!resolved.startsWith(path.resolve(DATA_DIR))) return null;
  return resolved;
}

function handleListFiles(res) {
  ensureDataDir();
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.mmd'))
    .map((f) => {
      const stat = fs.statSync(path.join(DATA_DIR, f));
      return { name: f, updatedAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(files));
}

function handleGetFile(name, res) {
  const filePath = getFilePath(name);
  if (!filePath) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid filename' }));
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found' }));
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { code: raw, config: '{\n  "theme": "default"\n}' };
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function handleSaveFile(name, body, res) {
  ensureDataDir();
  const filePath = getFilePath(name);
  if (!filePath) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid filename' }));
    return;
  }

  fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf-8');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
}

function handleDeleteFile(name, res) {
  const filePath = getFilePath(name);
  if (!filePath) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid filename' }));
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found' }));
    return;
  }

  fs.unlinkSync(filePath);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_SIZE) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Vite plugin that adds file API middleware during dev.
 */
export default function fileApiPlugin() {
  return {
    name: 'file-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/files')) {
          return next();
        }

        // CORS for dev
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const urlPath = req.url.replace(/\?.*$/, '');
        const parts = urlPath.split('/').filter(Boolean); // ['api', 'files', ...name]

        try {
          if (parts.length === 2 && req.method === 'GET') {
            // GET /api/files — list all
            handleListFiles(res);
          } else if (parts.length >= 3) {
            const fileName = decodeURIComponent(parts.slice(2).join('/'));
            if (req.method === 'GET') {
              handleGetFile(fileName, res);
            } else if (req.method === 'PUT') {
              const body = await parseBody(req);
              handleSaveFile(fileName, body, res);
            } else if (req.method === 'DELETE') {
              handleDeleteFile(fileName, res);
            } else {
              res.writeHead(405, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Method not allowed' }));
            }
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Bad request' }));
          }
        } catch (err) {
          console.error('File API error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    }
  };
}
