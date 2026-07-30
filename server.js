const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'agendamentos.json');
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_PASSWORD_SALT = 'lava-jato-sol-admin-v1';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ||
  '58601a9d13a38e73e9019a397dda0d89278ae781e580f24c41c25621587b77b4a853479783728c59d65d1432d3cf61c70470b83db79b2b5abe02e7a4fecc2569';
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const BASE_SERVICES = {
  'lavagem-simples': { name: 'Lavagem simples', price: 40, duration: '20–25 min' },
  'pretinho': { name: 'Pretinho nas rodas', price: 15, duration: '5–10 min' },
  'aspiracao': { name: 'Aspiração interna', price: 15, duration: '10–15 min' },
  'limpeza-interna': { name: 'Limpeza interna', price: 20, duration: '10–15 min' }
};

const SERVICE_ORDER = Object.keys(BASE_SERVICES);
const LEGACY_PRESETS = {
  'lavagem-simples': ['lavagem-simples'],
  'pretinho': ['pretinho'],
  'aspiracao': ['aspiracao'],
  'limpeza-interna': ['limpeza-interna'],
  'lavagem-pretinho': ['lavagem-simples', 'pretinho'],
  'lavagem-aspiracao': ['lavagem-simples', 'aspiracao'],
  'lavagem-limpeza': ['lavagem-simples', 'limpeza-interna'],
  'pacote-completo': [...SERVICE_ORDER]
};

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
const loginAttempts = new Map();
const bookingAttempts = new Map();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  res.set({
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
  });
  next();
});

function readBookings() {
  try {
    const bookings = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(bookings) ? bookings : [];
  } catch {
    return [];
  }
}

function writeBookings(bookings) {
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(bookings, null, 2));
  fs.renameSync(tempFile, DATA_FILE);
}

function parseCookies(req) {
  return String(req.headers.cookie || '')
    .split(';')
    .map(item => item.trim().split('='))
    .reduce((cookies, [key, ...value]) => {
      if (key) cookies[key] = decodeURIComponent(value.join('='));
      return cookies;
    }, {});
}

function signSession(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifySession(token) {
  try {
    const [encoded, providedSignature] = String(token || '').split('.');
    if (!encoded || !providedSignature) return false;
    const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest();
    const actualSignature = Buffer.from(providedSignature, 'base64url');
    if (
      actualSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(actualSignature, expectedSignature)
    ) return false;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return payload.role === 'admin' && Number(payload.exp) > Date.now();
  } catch {
    return false;
  }
}

function isAdminAuthorized(req) {
  return verifySession(parseCookies(req).admin_session);
}

function requireAdmin(req, res, next) {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: 'Acesso administrativo não autorizado.' });
  }
  next();
}

function requireAdminPage(req, res, next) {
  if (!isAdminAuthorized(req)) {
    return res.redirect(303, '/login.html');
  }
  res.set('Cache-Control', 'no-store');
  next();
}

function requireSameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (!origin) return next();
  try {
    if (new URL(origin).host === req.get('host')) return next();
  } catch {
    // Invalid origins are rejected below.
  }
  return res.status(403).json({ error: 'Origem da solicitação não autorizada.' });
}

function rateLimit(store, { windowMs, limit, message }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const recent = (store.get(key) || []).filter(timestamp => now - timestamp < windowMs);
    recent.push(now);
    store.set(key, recent);
    if (recent.length > limit) {
      res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

const limitLogin = rateLimit(loginAttempts, {
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: 'Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.'
});

const limitBooking = rateLimit(bookingAttempts, {
  windowMs: 10 * 60 * 1000,
  limit: 12,
  message: 'Muitas solicitações deste endereço. Aguarde alguns minutos e tente novamente.'
});

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

app.post('/api/admin/login', requireSameOrigin, limitLogin, (req, res) => {
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const suppliedHash = crypto.scryptSync(password, ADMIN_PASSWORD_SALT, 64);
  const expectedHash = Buffer.from(ADMIN_PASSWORD_HASH, 'hex');
  const passwordMatches =
    suppliedHash.length === expectedHash.length &&
    crypto.timingSafeEqual(suppliedHash, expectedHash);

  if (!passwordMatches) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  loginAttempts.delete(req.ip || req.socket.remoteAddress || 'unknown');
  const token = signSession({
    role: 'admin',
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  });
  const secure = req.secure || req.get('x-forwarded-proto') === 'https';
  res.cookie('admin_session', token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
    sameSite: 'strict',
    secure
  });
  res.json({ success: true });
});

app.get('/api/admin/session', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ authenticated: isAdminAuthorized(req) });
});

app.post('/api/admin/logout', requireSameOrigin, (req, res) => {
  res.clearCookie('admin_session', {
    httpOnly: true,
    sameSite: 'strict',
    secure: req.secure || req.get('x-forwarded-proto') === 'https'
  });
  res.json({ success: true });
});

app.get(['/dashboard', '/dashboard.html'], requireAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login.html', (req, res) => {
  if (isAdminAuthorized(req)) return res.redirect(303, '/dashboard.html');
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'login.html'));
});

['style.css', 'script.js', 'dashboard.css', 'dashboard.js', 'login.css', 'login.js', 'robots.txt']
  .forEach(file => {
    app.get(`/${file}`, (req, res) => res.sendFile(path.join(__dirname, file)));
  });

const staticOptions = {
  dotfiles: 'deny',
  etag: true,
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0
};
app.use('/assets', express.static(path.join(__dirname, 'assets'), staticOptions));
app.use('/imagens', express.static(path.join(__dirname, 'imagens'), staticOptions));

app.get('/api/servicos', (req, res) => {
  res.json(BASE_SERVICES);
});

app.get('/api/disponibilidade', (req, res) => {
  const date = String(req.query.data || '');
  const bookings = readBookings().filter(
    booking => booking.data === date && booking.status !== 'cancelled'
  );

  res.json({
    data: date,
    capacidade: 4,
    total: bookings.length,
    horariosOcupados: bookings.map(booking => booking.horario)
  });
});

app.post('/api/agendamentos', requireSameOrigin, limitBooking, (req, res) => {
  const { nome, telefone, veiculo = '', servico, servicos, data, horario, observacoes = '' } = req.body;
  const phoneDigits = String(telefone || '').replace(/\D/g, '');
  const selectedDate = new Date(`${data}T12:00:00`);
  const requestedServices = Array.isArray(servicos) ? servicos : (LEGACY_PRESETS[servico] || []);
  const selection = calculateSelection(requestedServices);

  if (
    typeof nome !== 'string' ||
    nome.trim().length < 3 ||
    phoneDigits.length < 10 ||
    phoneDigits.length > 11 ||
    !selection ||
    !ALLOWED_TIMES.includes(horario) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(data || '')) ||
    Number.isNaN(selectedDate.getTime())
  ) {
    return res.status(400).json({ error: 'Confira os dados informados e tente novamente.' });
  }

  if (selectedDate.getDay() !== 0) {
    return res.status(400).json({ error: 'O atendimento normalmente acontece aos domingos.' });
  }

  const bookings = readBookings();
  const activeOnDate = bookings.filter(
    booking => booking.data === data && booking.status !== 'cancelled'
  );

  if (activeOnDate.length >= 4) {
    return res.status(409).json({ error: 'As solicitações deste domingo estão completas.' });
  }

  if (activeOnDate.some(booking => booking.horario === horario)) {
    return res.status(409).json({ error: 'Este horário acabou de ser solicitado. Escolha outro.' });
  }

  const booking = {
    id: Date.now(),
    nome: nome.trim().slice(0, 150),
    telefone: phoneDigits,
    veiculo: String(veiculo).trim().slice(0, 100),
    servico: selection.services.join(','),
    servicos: selection.services,
    servicoNome: selection.name,
    preco: selection.price,
    precoOriginal: selection.originalPrice,
    desconto: selection.savings,
    duracao: selection.duration,
    data,
    horario,
    observacoes: String(observacoes).trim().slice(0, 500),
    status: 'pending',
    criadoEm: new Date().toISOString()
  };

  bookings.push(booking);
  writeBookings(bookings);
  res.status(201).json({ success: true, bookingId: booking.id });
});

app.get('/api/admin/agendamentos', requireAdmin, (req, res) => {
  const bookings = readBookings()
    .map(booking => ({ status: 'pending', ...booking }))
    .sort((a, b) => `${b.data} ${b.horario}`.localeCompare(`${a.data} ${a.horario}`));
  res.json(bookings);
});

app.patch('/api/admin/agendamentos/:id', requireSameOrigin, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || '');

  if (!Number.isFinite(id) || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Atualização inválida.' });
  }

  const bookings = readBookings();
  const booking = bookings.find(item => Number(item.id) === id);
  if (!booking) {
    return res.status(404).json({ error: 'Agendamento não encontrado.' });
  }

  booking.status = status;
  booking.atualizadoEm = new Date().toISOString();
  writeBookings(bookings);
  res.json({ success: true, booking });
});

app.listen(PORT, () => {
  console.log(`Lava Jato Sol disponível na porta ${PORT}`);
});
