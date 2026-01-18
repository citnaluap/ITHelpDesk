import { decodePayload, parseCookies } from './_utils.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = parseCookies(req);
  const rawSession = cookies.duo_session;
  if (!rawSession) {
    return res.status(200).json({ user: null });
  }

  const session = decodePayload(rawSession);
  if (!session?.name) {
    return res.status(200).json({ user: null });
  }

  return res.status(200).json({
    user: {
      name: session.name,
      email: session.email || '',
    },
  });
}
