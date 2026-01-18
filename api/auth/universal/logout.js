import { clearCookie } from './_utils.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  clearCookie(res, 'duo_session');
  clearCookie(res, 'duo_auth');
  clearCookie(res, 'duo_selected');
  return res.status(200).json({ ok: true });
}
