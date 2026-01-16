import nodemailer from 'nodemailer';

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

const getTransport = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass) {
    throw new Error('Missing SMTP configuration.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

const buildSubject = (ticketId, subject) => {
  const prefix = ticketId ? `${ticketId}` : 'Ticket update';
  if (subject) return `RE: ${prefix} - ${subject}`;
  return `RE: ${prefix}`;
};

export default async function handler(req, res) {
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

    const supportInbox = process.env.SUPPORT_INBOX || 'udsithelpdesk@keynettech.com';
    const fromAddress = process.env.SMTP_FROM || supportInbox;
    const ticketId = body.ticketId ? String(body.ticketId).trim() : '';
    const subject = body.subject ? String(body.subject).trim() : '';
    const requesterName = body.requesterName ? String(body.requesterName).trim() : '';
    const requesterEmail = body.requesterEmail ? String(body.requesterEmail).trim() : '';

    const lines = [
      message,
      '',
      '---',
      ticketId ? `Ticket: ${ticketId}` : null,
      subject ? `Original Subject: ${subject}` : null,
      requesterName || requesterEmail
        ? `Requester: ${requesterName}${requesterEmail ? ` <${requesterEmail}>` : ''}`.trim()
        : null,
    ].filter(Boolean);

    const transport = getTransport();
    await transport.sendMail({
      to: supportInbox,
      from: fromAddress,
      replyTo: requesterEmail || undefined,
      subject: buildSubject(ticketId, subject),
      text: lines.join('\n'),
    });

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
