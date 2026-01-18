import { buildClient, encodePayload, getTechnicianByName, parseCookies, setCookie } from './_utils.js';

const getQueryValue = (value) => (Array.isArray(value) ? value[0] : value || '');

const getQueryParam = (req, key) => {
  if (req.query && key in req.query) {
    return getQueryValue(req.query[key]);
  }
  const base = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host || 'localhost'}`;
  try {
    const url = new URL(req.url || '', base);
    return url.searchParams.get(key) || '';
  } catch (error) {
    return '';
  }
};

const redirectWithError = (res, message) => {
  const query = new URLSearchParams({ authError: message });
  res.setHeader('Location', `/?${query.toString()}`);
  return res.status(302).end();
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const name = getQueryParam(req, 'name');
    const cookies = parseCookies(req);
    const fallbackName = cookies.duo_selected || '';
    const technician = getTechnicianByName(name.trim()) || getTechnicianByName(fallbackName);
    if (!technician) {
      return redirectWithError(res, 'Select a valid technician before continuing.');
    }

    const client = await buildClient(req);
    const state = client.generateState();
    const username = technician.email || technician.name;
    const authUrl = await client.createAuthUrl(username, state);

    const payload = {
      state,
      name: technician.name,
      email: technician.email,
      username,
      issuedAt: Date.now(),
    };
    setCookie(res, 'duo_auth', encodePayload(payload), { maxAge: 300 });
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', authUrl);
    return res.status(302).end();
  } catch (error) {
    console.error('Duo authorize error', error);
    return redirectWithError(res, error.message || 'Unable to start Duo verification.');
  }
}
