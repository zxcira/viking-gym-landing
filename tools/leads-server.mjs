import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const CSV_FILE = path.join(ROOT, 'заявки.csv');

const PORT = Number(process.env.PORT || 4182);
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

function csvEscape(value) {
  const text = String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ');
  return `"${text}"`;
}

function appendLead(body) {
  const line = [
    new Date().toISOString(),
    body.source || 'viking-gym-site',
    body.name || '',
    body.phone || '',
    body.service || '',
    body.msg || '',
    body.url || ''
  ].map(csvEscape).join(',') + '\n';
  if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(CSV_FILE, '\ufeffДата,Источник,Имя,Телефон,Интерес,Комментарий,Ссылка\n', 'utf-8');
  }
  fs.appendFileSync(CSV_FILE, line, 'utf-8');
}

async function sendTelegram(body) {
  if (!TOKEN || !CHAT_ID) return false;
  const text = `Новая заявка (Викинг)
Имя: ${body.name || '-'}
Телефон: ${body.phone || '-'}
Интерес: ${body.service || '-'}
Комментарий: ${body.msg || '-'}
Ссылка: ${body.url || '-'}`;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text })
    });
    const json = await res.json().catch(() => ({ ok: false }));
    return !!json.ok;
  } catch (e) {
    console.error('Telegram error:', e.message);
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'POST' && url.pathname === '/api/lead') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', async () => {
      let body = {};
      try { body = JSON.parse(raw || '{}'); } catch (e) { body = {}; }
      try {
        appendLead(body);
        console.log('Новая заявка:', body.name || '-', body.phone || '-', body.service || '-');
        const sent = await sendTelegram(body);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, sent }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  let filePath = path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, ''));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.jpg': 'image/jpeg',
      '.png': 'image/png',
      '.json': 'application/json; charset=utf-8'
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Викинг — локальный сервер: http://localhost:${PORT}`);
  if (!TOKEN || !CHAT_ID) console.log('Telegram отключён: задайте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID для отправки заявок.');
});