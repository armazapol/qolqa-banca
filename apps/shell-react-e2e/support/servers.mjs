/**
 * Servidores de soporte E2E en un solo proceso (ADR-0022):
 * - :3101 BCRP simulado + reparto de usuarios de prueba.
 * - :4300 "edge" HTTPS que imita a Vercel: rewrites /api y /mf/investments,
 *   cabeceras CSP de las páginas prerenderizadas (build/csp-static.json), el
 *   WebSocket (/socket.io) hacia el BFF y el resto al SSR.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { connect } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { CERT_DIR, FX, PORTS, ROOT } from './config.mjs';

const REMOTE_DIR = join(ROOT, 'dist/apps/mf-investments/browser');
const CSP_FILE = join(ROOT, 'apps/shell-react/build/csp-static.json');
const TYPES = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
};

// --- BCRP simulado y reparto de usuarios ---------------------------------
let nextUser = 0;
function bcrpPeriods() {
  const periods = [];
  for (let day = 1; day <= 20; day++) {
    const name = `${String(day).padStart(2, '0')}.Oct.26`;
    periods.push({
      name,
      values: [
        String(FX.buy - (20 - day) * 0.001),
        String(FX.sell - (20 - day) * 0.001),
      ],
    });
  }
  return { config: { title: 'Tipo de cambio' }, periods };
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/health') return res.end('ok');
  if (url.pathname.startsWith('/bcrp/')) {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(bcrpPeriods()));
  }
  if (url.pathname === '/__e2e/next-user') {
    // Un proceso, un contador: cada test (y cada reintento) recibe un usuario distinto.
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ index: nextUser++ }));
  }
  res.writeHead(404);
  res.end();
}).listen(PORTS.stub);

// --- Edge ------------------------------------------------------------------
async function proxy(req, res, target) {
  const body = ['GET', 'HEAD'].includes(req.method)
    ? undefined
    : await new Promise((resolve) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
      });
  // Como Vercel: el origen ve el protocolo real (HTTPS) del cliente.
  const headers = { ...req.headers, 'x-forwarded-proto': 'https' };
  delete headers.host;
  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body,
    redirect: 'manual',
  });
  const out = {};
  upstream.headers.forEach((value, key) => {
    if (
      ![
        'content-encoding',
        'content-length',
        'transfer-encoding',
        'set-cookie',
      ].includes(key)
    )
      out[key] = value;
  });
  const cookies = upstream.headers.getSetCookie();
  if (cookies.length) out['set-cookie'] = cookies;

  // Páginas prerenderizadas: CSP con hashes (en Vercel lo hará vercel.json).
  const path = new URL(target).pathname.replace(/\/$/, '') || '/';
  const staticCsp = existsSync(CSP_FILE)
    ? JSON.parse(readFileSync(CSP_FILE, 'utf8'))
    : {};
  if (
    (out['content-type'] ?? '').includes('text/html') &&
    !out['content-security-policy'] &&
    staticCsp[path]
  ) {
    out['content-security-policy'] = staticCsp[path];
  }
  res.writeHead(upstream.status, out);
  res.end(Buffer.from(await upstream.arrayBuffer()));
}

const edge = createHttpsServer(
  {
    key: readFileSync(join(CERT_DIR, 'key.pem')),
    cert: readFileSync(join(CERT_DIR, 'cert.pem')),
  },
  async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        return await proxy(
          req,
          res,
          `http://localhost:${PORTS.api}${url.pathname}${url.search}`,
        );
      }
      if (url.pathname.startsWith('/mf/investments/')) {
        const file = normalize(
          join(REMOTE_DIR, url.pathname.replace('/mf/investments/', '')),
        );
        if (
          !file.startsWith(normalize(REMOTE_DIR)) ||
          !existsSync(file) ||
          statSync(file).isDirectory()
        ) {
          res.writeHead(404);
          return res.end();
        }
        res.writeHead(200, {
          'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
        });
        return res.end(readFileSync(file));
      }
      return await proxy(
        req,
        res,
        `http://localhost:${PORTS.shell}${url.pathname}${url.search}`,
      );
    } catch (error) {
      res.writeHead(502);
      res.end(String(error));
    }
  },
);

// WebSocket (Socket.IO): se reenvía tal cual al BFF por el mismo origen seguro.
edge.on('upgrade', (req, socket, head) => {
  const upstream = connect(PORTS.api, '127.0.0.1', () => {
    const CRLF = '\r\n';
    const headers = Object.entries(req.headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join(CRLF);
    upstream.write(
      `${req.method} ${req.url} HTTP/1.1${CRLF}${headers}${CRLF}${CRLF}`,
    );
    upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

edge.listen(PORTS.edge);

console.log(`E2E: BCRP simulado :${PORTS.stub}, edge :${PORTS.edge}`);
