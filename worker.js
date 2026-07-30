const BASE_SERVICES = {
  'lavagem-simples': { name: 'Lavagem simples', price: 40, duration: '20–25 min' },
  pretinho: { name: 'Pretinho nas rodas', price: 15, duration: '5–10 min' },
  aspiracao: { name: 'Aspiração interna', price: 15, duration: '10–15 min' },
  'limpeza-interna': { name: 'Limpeza interna', price: 20, duration: '10–15 min' }
};

const SERVICE_ORDER = Object.keys(BASE_SERVICES);
const COMBO_PRICES = {
  'lavagem-simples|pretinho': { price: 50, duration: '25–30 min' },
  'lavagem-simples|aspiracao': { price: 50, duration: '25–35 min' },
  'lavagem-simples|limpeza-interna': { price: 50, duration: '25–30 min' },
  'pretinho|aspiracao': { price: 25, duration: '10–20 min' },
  'pretinho|limpeza-interna': { price: 30, duration: '10–20 min' },
  'aspiracao|limpeza-interna': { price: 30, duration: '15–25 min' },
  'lavagem-simples|pretinho|aspiracao': { price: 60, duration: '25–35 min' },
  'lavagem-simples|pretinho|limpeza-interna': { price: 60, duration: '25–35 min' },
  'lavagem-simples|aspiracao|limpeza-interna': { price: 60, duration: '25–40 min' },
  'pretinho|aspiracao|limpeza-interna': { price: 40, duration: '20–30 min' },
  'lavagem-simples|pretinho|aspiracao|limpeza-interna': { price: 70, duration: '25–40 min' }
};

const ALLOWED_TIMES = ['12:00', '12:15', '12:30', '12:45'];
const ALLOWED_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
const ADMIN_PASSWORD_HASH = '0286dcd705852180134d731ae446ec833d45bec692a9910af39418fe8cf87a2b';
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();

const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "media-src 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self'"
  ].join('; '),
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};

function withSecurity(response) {
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    secured.headers.set(name, value);
  }
  return secured;
}

function json(data, status = 200, headers = {}) {
  return withSecurity(new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
  }));
}

function redirect(request, pathname) {
  return withSecurity(Response.redirect(new URL(pathname, request.url), 303));
}

function parseCookies(request) {
  return String(request.headers.get('cookie') || '')
    .split(';')
    .map(item => item.trim().split('='))
    .reduce((cookies, [key, ...value]) => {
      if (key) cookies[key] = decodeURIComponent(value.join('='));
      return cookies;
    }, {});
}

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function sha256Hex(value) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

async function signSession(payload, secret) {
  const encoded = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = toBase64Url(await hmac(encoded, secret));
  return `${encoded}.${signature}`;
}

async function verifySession(request, env) {
  if (!env.SESSION_SECRET) return false;
  try {
    const token = parseCookies(request).admin_session || '';
    const [encoded, providedSignature] = token.split('.');
    if (!encoded || !providedSignature) return false;
    const expectedSignature = toBase64Url(await hmac(encoded, env.SESSION_SECRET));
    if (!constantTimeEqual(providedSignature, expectedSignature)) return false;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded)));
    return payload.role === 'admin' && Number(payload.exp) > Date.now();
  } catch {
    return false;
  }
}

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || new URL(origin).host === new URL(request.url).host;
}

async function requestJson(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error('invalid content type');
  return request.json();
}

async function ensureSchema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL,
      veiculo TEXT NOT NULL DEFAULT '',
      servico TEXT NOT NULL,
      servicos TEXT NOT NULL,
      servico_nome TEXT NOT NULL,
      preco INTEGER NOT NULL,
      preco_original INTEGER NOT NULL,
      desconto INTEGER NOT NULL,
      duracao TEXT NOT NULL,
      data TEXT NOT NULL,
      horario TEXT NOT NULL,
      observacoes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      criado_em TEXT NOT NULL,
      atualizado_em TEXT
    )`),
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot_idx
      ON bookings (data, horario) WHERE status != 'cancelled'`),
    db.prepare(`CREATE TABLE IF NOT EXISTS rate_limits (
      bucket TEXT PRIMARY KEY,
      window_start INTEGER NOT NULL,
      request_count INTEGER NOT NULL
    )`)
  ]);
}

async function enforceRateLimit(db, bucket, windowMs, limit) {
  const now = Date.now();
  const current = await db.prepare(
    'SELECT window_start, request_count FROM rate_limits WHERE bucket = ?'
  ).bind(bucket).first();

  if (!current || now - Number(current.window_start) >= windowMs) {
    await db.prepare(
      `INSERT INTO rate_limits (bucket, window_start, request_count) VALUES (?, ?, 1)
       ON CONFLICT(bucket) DO UPDATE SET window_start = excluded.window_start, request_count = 1`
    ).bind(bucket, now).run();
    return true;
  }

  if (Number(current.request_count) >= limit) return false;
  await db.prepare('UPDATE rate_limits SET request_count = request_count + 1 WHERE bucket = ?')
    .bind(bucket).run();
  return true;
}

function clientAddress(request) {
  return request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
}

function calculateSelection(requestedServices) {
  const services = [...new Set(requestedServices)]
    .filter(service => BASE_SERVICES[service])
    .sort((a, b) => SERVICE_ORDER.indexOf(a) - SERVICE_ORDER.indexOf(b));
  if (!services.length) return null;
  const originalPrice = services.reduce((sum, id) => sum + BASE_SERVICES[id].price, 0);
  const combo = COMBO_PRICES[services.join('|')];
  const price = combo?.price ?? originalPrice;
  const names = services.map(id => BASE_SERVICES[id].name);
  return {
    services,
    name: services.length === SERVICE_ORDER.length ? 'Pacote completo' : names.join(' + '),
    price,
    originalPrice,
    savings: originalPrice - price,
    duration: combo?.duration ?? BASE_SERVICES[services[0]].duration
  };
}

function rowToBooking(row) {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone,
    veiculo: row.veiculo,
    servico: row.servico,
    servicos: JSON.parse(row.servicos || '[]'),
    servicoNome: row.servico_nome,
    preco: row.preco,
    precoOriginal: row.preco_original,
    desconto: row.desconto,
    duracao: row.duracao,
    data: row.data,
    horario: row.horario,
    observacoes: row.observacoes,
    status: row.status,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

async function handleApi(request, env, url) {
  if (!env.DB) return json({ error: 'Banco de dados indisponível.' }, 503);
  await ensureSchema(env.DB);

  if (url.pathname === '/api/servicos' && request.method === 'GET') {
    return json(BASE_SERVICES);
  }

  if (url.pathname === '/api/admin/session' && request.method === 'GET') {
    return json({ authenticated: await verifySession(request, env) }, 200, {
      'Cache-Control': 'no-store'
    });
  }

  if (url.pathname === '/api/admin/login' && request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
    if (!env.SESSION_SECRET) return json({ error: 'Acesso administrativo ainda não configurado.' }, 503);
    const allowed = await enforceRateLimit(
      env.DB,
      `login:${clientAddress(request)}`,
      15 * 60 * 1000,
      5
    );
    if (!allowed) return json({ error: 'Muitas tentativas. Aguarde 15 minutos.' }, 429);

    let body;
    try {
      body = await requestJson(request);
    } catch {
      return json({ error: 'Solicitação inválida.' }, 400);
    }
    const suppliedHash = await sha256Hex(`lava-jato-sol-admin-v1:${String(body.password || '')}`);
    if (!constantTimeEqual(suppliedHash, ADMIN_PASSWORD_HASH)) {
      return json({ error: 'Senha incorreta.' }, 401);
    }

    await env.DB.prepare('DELETE FROM rate_limits WHERE bucket = ?')
      .bind(`login:${clientAddress(request)}`).run();
    const token = await signSession({
      role: 'admin',
      exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
    }, env.SESSION_SECRET);
    return json({ success: true }, 200, {
      'Set-Cookie': `admin_session=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Strict`
    });
  }

  if (url.pathname === '/api/admin/logout' && request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
    return json({ success: true }, 200, {
      'Set-Cookie': 'admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'
    });
  }

  if (url.pathname === '/api/disponibilidade' && request.method === 'GET') {
    const date = String(url.searchParams.get('data') || '');
    const result = await env.DB.prepare(
      `SELECT horario FROM bookings WHERE data = ? AND status != 'cancelled' ORDER BY horario`
    ).bind(date).all();
    return json({
      data: date,
      capacidade: 4,
      total: result.results.length,
      horariosOcupados: result.results.map(row => row.horario)
    });
  }

  if (url.pathname === '/api/agendamentos' && request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
    const allowed = await enforceRateLimit(
      env.DB,
      `booking:${clientAddress(request)}`,
      10 * 60 * 1000,
      12
    );
    if (!allowed) return json({ error: 'Muitas solicitações. Aguarde alguns minutos.' }, 429);

    let body;
    try {
      body = await requestJson(request);
    } catch {
      return json({ error: 'Solicitação inválida.' }, 400);
    }
    const phoneDigits = String(body.telefone || '').replace(/\D/g, '');
    const selection = calculateSelection(Array.isArray(body.servicos) ? body.servicos : []);
    const date = String(body.data || '');
    const selectedDate = new Date(`${date}T12:00:00Z`);
    if (
      typeof body.nome !== 'string' ||
      body.nome.trim().length < 3 ||
      phoneDigits.length < 10 ||
      phoneDigits.length > 11 ||
      !selection ||
      !ALLOWED_TIMES.includes(body.horario) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate.getUTCDay() !== 0
    ) {
      return json({ error: 'Confira os dados informados e tente novamente.' }, 400);
    }

    const count = await env.DB.prepare(
      `SELECT COUNT(*) AS total FROM bookings WHERE data = ? AND status != 'cancelled'`
    ).bind(date).first();
    if (Number(count.total) >= 4) {
      return json({ error: 'As solicitações deste domingo estão completas.' }, 409);
    }

    const id = crypto.randomUUID();
    try {
      await env.DB.prepare(
        `INSERT INTO bookings (
          id, nome, telefone, veiculo, servico, servicos, servico_nome,
          preco, preco_original, desconto, duracao, data, horario,
          observacoes, status, criado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
      ).bind(
        id,
        body.nome.trim().slice(0, 150),
        phoneDigits,
        String(body.veiculo || '').trim().slice(0, 100),
        selection.services.join(','),
        JSON.stringify(selection.services),
        selection.name,
        selection.price,
        selection.originalPrice,
        selection.savings,
        selection.duration,
        date,
        body.horario,
        String(body.observacoes || '').trim().slice(0, 500),
        new Date().toISOString()
      ).run();
    } catch {
      return json({ error: 'Este horário acabou de ser solicitado. Escolha outro.' }, 409);
    }
    return json({ success: true, bookingId: id }, 201);
  }

  if (url.pathname === '/api/admin/agendamentos' && request.method === 'GET') {
    if (!await verifySession(request, env)) return json({ error: 'Não autorizado.' }, 401);
    const result = await env.DB.prepare(
      'SELECT * FROM bookings ORDER BY data DESC, horario DESC'
    ).all();
    return json(result.results.map(rowToBooking), 200, { 'Cache-Control': 'no-store' });
  }

  const statusMatch = url.pathname.match(/^\/api\/admin\/agendamentos\/([^/]+)$/);
  if (statusMatch && request.method === 'PATCH') {
    if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
    if (!await verifySession(request, env)) return json({ error: 'Não autorizado.' }, 401);
    let body;
    try {
      body = await requestJson(request);
    } catch {
      return json({ error: 'Solicitação inválida.' }, 400);
    }
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return json({ error: 'Atualização inválida.' }, 400);
    }
    const result = await env.DB.prepare(
      'UPDATE bookings SET status = ?, atualizado_em = ? WHERE id = ?'
    ).bind(body.status, new Date().toISOString(), decodeURIComponent(statusMatch[1])).run();
    if (!result.meta.changes) return json({ error: 'Agendamento não encontrado.' }, 404);
    return json({ success: true });
  }

  return json({ error: 'Rota não encontrada.' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) {
        return await handleApi(request, env, url);
      }

      if (url.pathname === '/dashboard') {
        return redirect(request, '/dashboard.html');
      }

      if (['/agendamentos.json', '/server.js', '/package.json', '/pnpm-lock.yaml', '/.env'].includes(url.pathname)) {
        return withSecurity(new Response('Not found', { status: 404 }));
      }

      return withSecurity(await env.ASSETS.fetch(request));
    } catch (error) {
      console.error('Request failed', error);
      return json({ error: 'Erro interno. Tente novamente.' }, 500);
    }
  }
};
