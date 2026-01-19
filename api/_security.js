const getAllowedOrigins = () => {
  const raw = process.env.CORS_ALLOW_ORIGIN || '';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const getRequestOrigin = (req) => {
  const origin = req.headers?.origin;
  if (Array.isArray(origin)) return origin[0];
  return origin || '';
};

const getRequestHost = (req) => {
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || '';
  if (Array.isArray(host)) return host[0];
  return host || '';
};

const isSameOrigin = (origin, host) =>
  origin === `https://${host}` || origin === `http://${host}`;

const resolveCorsOrigin = (req) => {
  const allowed = getAllowedOrigins();
  if (!allowed.length) return '*';
  if (allowed.includes('*')) return '*';
  const origin = getRequestOrigin(req);
  if (origin && allowed.includes(origin)) return origin;
  return allowed[0];
};

export const applyCors = (req, res, options = {}) => {
  res.setHeader('Access-Control-Allow-Origin', resolveCorsOrigin(req));
  res.setHeader('Access-Control-Allow-Methods', options.methods || 'GET, POST, PATCH, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    options.headers || 'Content-Type, Authorization, x-webhook-secret',
  );
  res.setHeader('Vary', 'Origin');
};

const getWebhookSecret = () =>
  process.env.WEBHOOK_SECRET || process.env.HELPDESK_WEBHOOK_SECRET || '';

const getRequestSecret = (req) => {
  const header = req.headers?.['x-webhook-secret'] || req.headers?.authorization || '';
  const token = Array.isArray(header) ? header[0] : header;
  if (!token) return '';
  if (token.startsWith('Bearer ')) return token.slice(7);
  return token;
};

export const validateSecret = (req) => {
  const secret = getWebhookSecret();
  if (!secret) return true;
  return getRequestSecret(req) === secret;
};

export const isCrossOrigin = (req) => {
  const origin = getRequestOrigin(req);
  if (!origin) return false;
  const host = getRequestHost(req);
  if (!host) return true;
  return !isSameOrigin(origin, host);
};

export const requireSecretForExternal = (req) => {
  const secret = getWebhookSecret();
  if (!secret) return false;
  return isCrossOrigin(req);
};
