import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const port = Number(process.env.PORT || 8787);
const origin = process.env.ALLOWED_ORIGIN || 'https://localhost';
const apiKey = process.env.OPENAI_API_KEY;
const accessToken = process.env.AI_PROXY_TOKEN;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const requestWindow = 60_000;
const requestLimit = 12;
const requestCounts = new Map();
const maxBodyBytes = 12 * 1024 * 1024;

function send(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    request.setEncoding('utf8');
    request.on('data', chunk => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > maxBodyBytes) {
        reject(new Error('Das Foto ist zu groß.'));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Ungültige JSON-Anfrage.')); }
    });
    request.on('error', reject);
  });
}

function allowOrigin(request, response) {
  const requestOrigin = request.headers.origin;
  if (requestOrigin && requestOrigin !== origin) return false;
  if (requestOrigin) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.setHeader('Access-Control-Max-Age', '600');
  return true;
}

function withinRateLimit(request) {
  const now = Date.now();
  const key = request.socket.remoteAddress || 'unknown';
  const record = requestCounts.get(key);
  if (!record || now - record.start >= requestWindow) {
    requestCounts.set(key, { start: now, count: 1 });
    return true;
  }
  record.count++;
  return record.count <= requestLimit;
}
function isAuthorized(request) {
  const provided = request.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
  const expectedBuffer = Buffer.from(accessToken || '');
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length > 0 && expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

const server = createServer(async (request, response) => {
  if (!allowOrigin(request, response)) return send(response, 403, { error: 'Ursprung nicht erlaubt.' });
  if (request.method === 'OPTIONS') { response.writeHead(204); return response.end(); }
  if (request.method !== 'POST' || request.url !== '/analyze-clothing') return send(response, 404, { error: 'Route nicht gefunden.' });
  if (!withinRateLimit(request)) return send(response, 429, { error: 'Zu viele Analysen. Bitte kurz warten.' });
  if (!apiKey || !accessToken) return send(response, 503, { error: 'OPENAI_API_KEY und AI_PROXY_TOKEN müssen auf dem Analyse-Server gesetzt sein.' });
  if (!isAuthorized(request)) return send(response, 401, { error: 'Proxy-Token ungültig.' });

  try {
    const body = await readJson(request);
    if (typeof body.image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/i.test(body.image)) {
      return send(response, 400, { error: 'Bitte ein JPEG-, PNG- oder WebP-Foto senden.' });
    }
    const instructions = [
      'Analysiere das Kleidungsfoto und liste jedes klar sichtbare Kleidungsstück oder Accessoire einzeln auf.',
      'Lass Hintergrundobjekte weg. Erfinde keine Marke und keine Materialangabe; verwende null, wenn etwas nicht erkennbar ist.',
      'Antworte ausschließlich als JSON mit einem Objekt {"items":[...]}.',
      'Jedes Element braucht: name (kurzer deutscher Name), category (top, bottom, outerwear, shoes oder accessory), color (cream, black, blue, red, green, pink, yellow oder multi), palette (2 bis 5 HEX-Farben), brand (Text oder null), material (Text oder null), description (kurze sichtbare Merkmale auf Deutsch), confidence (0 bis 1) und bbox ([x,y,width,height]).',
      'bbox sind normalisierte Bildkoordinaten zwischen 0 und 1 relativ zur linken oberen Ecke des Originalfotos. Gib nur Teile mit confidence mindestens 0.35 zurück.',
      body.prompt ? `Wunsch für heute: ${String(body.prompt).slice(0, 120)}` : '',
      body.context ? `Stil-Kontext: ${JSON.stringify(body.context).slice(0, 300)}` : ''
    ].filter(Boolean).join('\n');
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1800,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: instructions },
            { type: 'image_url', image_url: { url: body.image, detail: 'high' } }
          ]
        }]
      }),
      signal: AbortSignal.timeout(45_000)
    });
    const result = await upstream.json();
    if (!upstream.ok) {
      console.error('Vision provider error:', result.error?.type || upstream.status);
      return send(response, 502, { error: 'Der KI-Anbieter konnte das Foto nicht analysieren.' });
    }
    const content = result.choices?.[0]?.message?.content;
    const analysis = JSON.parse(content || '{}');
    const items = Array.isArray(analysis.items) ? analysis.items.slice(0, 12) : [];
    return send(response, 200, { items });
  } catch (error) {
    const status = error.message === 'Das Foto ist zu groß.' ? 413 : 400;
    return send(response, status, { error: error.message || 'Fotoanalyse fehlgeschlagen.' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Vision-Proxy auf Port ${port}; TLS über einen HTTPS-Reverse-Proxy bereitstellen.`);
});