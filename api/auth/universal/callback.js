import {
  buildClient,
  clearCookie,
  decodePayload,
  encodePayload,
  getTechnicianByEmail,
  getTechnicianByName,
  parseCookies,
  setCookie,
} from './_utils.js';

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

    const state = getQueryParam(req, 'state');
    const code = getQueryParam(req, 'duo_code') || getQueryParam(req, 'code');
    if (!state || !code) {
      return redirectWithError(res, 'Duo response was missing required parameters.');
    }

    const cookies = parseCookies(req);
    const authCookie = cookies.duo_auth;
    if (!authCookie) {
      return redirectWithError(res, 'Duo session expired. Please try again.');
    }
    const authPayload = decodePayload(authCookie);
    if (!authPayload || authPayload.state !== state) {
      clearCookie(res, 'duo_auth');
      return redirectWithError(res, 'Duo session did not match. Please try again.');
    }

    const client = buildClient(req);
    const token = await client.exchangeAuthorizationCodeFor2FAResult(code, authPayload.username);
    const authResult = token?.auth_result?.result || token?.auth_context?.result || '';
    if (authResult && authResult !== 'allow') {
      clearCookie(res, 'duo_auth');
      return redirectWithError(res, 'Duo verification was not approved.');
    }

    const email =
      token?.auth_context?.email ||
      token?.preferred_username ||
      authPayload.email ||
      authPayload.username ||
      '';
    const normalizedEmail = email.toLowerCase();
    const technician =
      (normalizedEmail && getTechnicianByEmail(normalizedEmail)) || getTechnicianByName(authPayload.name);
    if (!technician) {
      clearCookie(res, 'duo_auth');
      return redirectWithError(res, 'This account is not authorized for IT Support access.');
    }
    if (technician.email && normalizedEmail && technician.email.toLowerCase() !== normalizedEmail) {
      clearCookie(res, 'duo_auth');
      return redirectWithError(res, 'Duo account did not match the selected technician.');
    }

    const sessionPayload = {
      name: technician.name,
      email: technician.email || normalizedEmail,
      verifiedAt: Date.now(),
    };
    setCookie(res, 'duo_session', encodePayload(sessionPayload), { maxAge: 60 * 60 * 8 });
    clearCookie(res, 'duo_auth');
    clearCookie(res, 'duo_selected');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', '/?authSuccess=1');
    return res.status(302).end();
  } catch (error) {
    console.error('Duo callback error', error);
    clearCookie(res, 'duo_auth');
    return redirectWithError(res, 'Duo verification failed. Please try again.');
  }
}
