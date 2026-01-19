import { applyCors, requireSecretForExternal, validateSecret } from './_security.js';

const parseBody = (req) => {
  if (!req.body) return null;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return null;
    }
  }
  return req.body;
};

const buildSubject = (ticketId, subject) => {
  const prefix = ticketId ? `${ticketId}` : 'Ticket update';
  if (subject) return `RE: ${prefix} - ${subject}`;
  return `RE: ${prefix}`;
};

export default async function handler(req, res) {
  applyCors(req, res, { methods: 'POST, OPTIONS' });
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (requireSecretForExternal(req) && !validateSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = parseBody(req);
    if (!body) {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return res.status(400).json({ error: 'Missing message content' });
    }

    const ticketId = body.ticketId ? String(body.ticketId).trim() : '';
    const subject = body.subject ? String(body.subject).trim() : '';
    const requesterName = body.requesterName ? String(body.requesterName).trim() : '';
    const requesterEmail = body.requesterEmail ? String(body.requesterEmail).trim() : '';

    const flowUrl = process.env.POWER_AUTOMATE_URL;
    if (!flowUrl) {
      throw new Error('POWER_AUTOMATE_URL is not set.');
    }

    const response = await fetch(flowUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId,
        subject,
        message,
        requesterEmail,
        requesterName,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Power Automate request failed: ${response.status}`);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Failed to send ticket message', error);
    const isProd = process.env.NODE_ENV === 'production';
    return res.status(500).json({
      error: error.message || 'Failed to send email',
      ...(isProd ? {} : { stack: error.stack }),
    });
  }
}
