import { Client } from '@duosecurity/duo_universal';
import { TECHNICIANS } from '../../../src/data/technicians.js';

const getHeaderValue = (header) => (Array.isArray(header) ? header[0] : header || '');

const getOrigin = (req) => {
  const proto = getHeaderValue(req.headers['x-forwarded-proto']) || 'https';
  const host = getHeaderValue(req.headers['x-forwarded-host']) || req.headers.host || '';
  if (!host) return '';
  return `${proto.split(',')[0]}://${host.split(',')[0]}`;
};

const parseRedirectList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const getRedirectUrl = (req) => {
  const raw =
    process.env.DUO_REDIRECT_URI ||
    process.env.REACT_APP_DUO_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_DUO_REDIRECT_URI ||
    '';
  if (raw) {
    const options = parseRedirectList(raw);
    const origin = getOrigin(req);
    if (origin) {
      const match = options.find((item) => item.startsWith(origin));
      if (match) return match;
    }
    return options[0];
  }
  const origin = getOrigin(req);
  return origin ? `${origin}/api/auth/universal/callback` : '/api/auth/universal/callback';
};

const buildClient = (req) => {
  const clientId = process.env.DUO_CLIENT_ID;
  const clientSecret = process.env.DUO_CLIENT_SECRET;
  const apiHost = process.env.DUO_API_HOST;
  const redirectUrl = getRedirectUrl(req);
  const missing = [];
  if (!clientId) missing.push('DUO_CLIENT_ID');
  if (!clientSecret) missing.push('DUO_CLIENT_SECRET');
  if (!apiHost) missing.push('DUO_API_HOST');
  if (missing.length) {
    throw new Error(`Missing Duo credentials: ${missing.join(', ')}`);
  }
  return new Client({
    clientId,
    clientSecret,
    apiHost,
    redirectUrl,
  });
};

const parseCookies = (req) => {
  const header = req.headers.cookie || '';
  if (!header) return {};
  return header.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
};

const appendSetCookie = (res, cookie) => {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', cookie);
    return;
  }
  if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookie]);
    return;
  }
  res.setHeader('Set-Cookie', [existing, cookie]);
};

const setCookie = (res, name, value, options = {}) => {
  const nameValue = `${name}=${encodeURIComponent(value)}`;
  const parts = [nameValue, 'Path=/'];
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);
  const secure = options.secure ?? process.env.NODE_ENV === 'production';
  if (secure) parts.push('Secure');
  appendSetCookie(res, parts.join('; '));
};

const clearCookie = (res, name) => {
  appendSetCookie(res, `${name}=; Path=/; Max-Age=0; SameSite=Lax`);
};

const encodePayload = (payload) => Buffer.from(JSON.stringify(payload)).toString('base64url');

const decodePayload = (value) => {
  try {
    const raw = Buffer.from(value, 'base64url').toString('utf-8');
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const normalizeValue = (value) => (value || '').trim().toLowerCase();

const getTechnicianByName = (name) => {
  const normalized = normalizeValue(name);
  if (!normalized) return null;
  return TECHNICIANS.find((tech) => normalizeValue(tech.name) === normalized);
};

const getTechnicianByEmail = (email) =>
  TECHNICIANS.find((tech) => tech.email && tech.email.toLowerCase() === email.toLowerCase());

export {
  buildClient,
  clearCookie,
  decodePayload,
  encodePayload,
  getRedirectUrl,
  getTechnicianByEmail,
  getTechnicianByName,
  parseCookies,
  setCookie,
};
