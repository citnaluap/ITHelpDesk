import { ensureTables, getSql } from './_db.js';

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

const formatCreatedLabel = (timestamp) => {
  if (!timestamp) return 'Just now';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const parseEmailBody = (body) => {
  if (!body || typeof body !== 'string') {
    return { ticketNumber: '', subject: '', requester: '', description: '' };
  }

  const lines = body.split(/\r?\n/).map((line) => line.trim());
  const disclaimerIndex = lines.findIndex((line) => /\bDISCLAIMER\b/i.test(line));
  const scopedLines = disclaimerIndex >= 0 ? lines.slice(0, disclaimerIndex) : lines;
  const filtered = scopedLines.filter((line) => line);
  const isNoiseLine = (line) => {
    if (!line) return true;
    if (/^markdig\.syntax\.inlines\.linkinline/i.test(line)) return true;
    if (/^\[cid:/i.test(line)) return true;
    if (/^\[image\]$/i.test(line)) return true;
    if (/^https?:\/\//i.test(line) || /^www\./i.test(line)) return true;
    return false;
  };
  const isMetaLine = (line) =>
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/i.test(line) ||
    /\b\d{1,2}:\d{2}\s*(AM|PM)\b/i.test(line) ||
    /-\s*$/.test(line);
  const isSignatureMarker = (line) =>
    /^(thanks|thank you|regards|sincerely|best|respectfully)\b/i.test(line) ||
    /^-{2,}$/.test(line) ||
    /^sent from/i.test(line) ||
    /^follow us/i.test(line) ||
    /^we['’]d love your help/i.test(line) ||
    /^amazon wish list/i.test(line) ||
    /^partnering for paws/i.test(line) ||
    /\budservices\.org\b/i.test(line) ||
    /\b(o:|c:|office|mobile|cell|fax)\b/i.test(line) ||
    /\b\d{3}[-)\s]\d{3}[-\s]\d{4}\b/.test(line) ||
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(line);
  const cleanDiscussionLines = (linesToClean) => {
    const cleaned = [];
    let hasContent = false;
    for (const line of linesToClean) {
      if (isNoiseLine(line)) continue;
      if (isMetaLine(line)) continue;
      if (isSignatureMarker(line) && hasContent) break;
      if (hasContent && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/.test(line)) break;
      cleaned.push(line);
      if (/[a-z0-9]/i.test(line)) hasContent = true;
    }
    return cleaned;
  };

  let ticketNumber = '';
  let subject = '';
  let requester = '';
  let description = '';

  for (const line of filtered) {
    if (!ticketNumber) {
      const match = line.match(/Ticket\s*#:\s*(\S+)/i);
      if (match) {
        ticketNumber = match[1];
        continue;
      }
    }
    if (!subject) {
      const match = line.match(/^Subject:\s*(.+)$/i);
      if (match) {
        subject = match[1].trim();
        continue;
      }
    }
  }

  const discussionIndex = filtered.findIndex((line) => {
    const normalized = line.replace(/[^a-z]/gi, '').toLowerCase();
    return normalized === 'discussion' || normalized.startsWith('discussion');
  });
  if (discussionIndex >= 0) {
    requester = filtered[discussionIndex + 1] || '';
    const afterDiscussion = filtered.slice(discussionIndex + 2);
    const cleanedDiscussion = cleanDiscussionLines(afterDiscussion);
    description = cleanedDiscussion.join('\n').trim();
  }

  if (!description && discussionIndex < 0) {
    description = filtered.slice(0, 40).join(' ').trim();
  }

  return { ticketNumber, subject, requester, description };
};

const parseFromField = (value) => {
  if (!value) return { name: '', email: '' };
  if (typeof value === 'object') {
    const email = value.address || value.email || '';
    const name = value.name || '';
    return { name, email };
  }
  if (typeof value !== 'string') return { name: '', email: '' };
  const match = value.match(/(.*)<(.+@.+)>/);
  if (match) {
    return { name: match[1].trim().replace(/^\"|\"$/g, ''), email: match[2].trim() };
  }
  if (value.includes('@')) {
    return { name: '', email: value.trim() };
  }
  return { name: value.trim(), email: '' };
};

const mapPayloadToTicket = (payload) => {
  const ticket = payload?.ticket || payload?.data || payload || {};
  const bodyContent =
    payload?.cleanMessage ||
    payload?.rawText ||
    payload?.body?.content ||
    payload?.body ||
    payload?.text ||
    payload?.content ||
    '';
  const parsedEmail = parseEmailBody(bodyContent);
  const rawId =
    ticket.id ||
    ticket.ticketId ||
    ticket.ticketNumber ||
    ticket.number ||
    ticket.srNumber ||
    ticket.recordId ||
    ticket.summaryId ||
    payload?.id ||
    payload?.internetMessageId ||
    parsedEmail.ticketNumber;
  const createdAtValue =
    ticket.createdAt ||
    ticket.created_date ||
    ticket.created ||
    payload?.received ||
    payload?.createdAt ||
    payload?.receivedDateTime;
  const parsedCreatedAt = createdAtValue ? new Date(createdAtValue).getTime() : NaN;
  const createdAt = Number.isNaN(parsedCreatedAt) ? Date.now() : parsedCreatedAt;
  const from =
    payload?.from?.emailAddress?.address ||
    payload?.from?.emailAddress?.name ||
    payload?.from?.address ||
    payload?.from?.name ||
    payload?.from ||
    payload?.sender;
  const parsedFrom = parseFromField(payload?.from || payload?.sender || from);
  const requesterName =
    payload?.from?.emailAddress?.name ||
    payload?.from?.name ||
    (typeof from === 'string' ? from : '') ||
    parsedFrom.name ||
    '' ||
    parsedEmail.requester;
  const requesterEmail =
    payload?.from?.emailAddress?.address ||
    payload?.from?.address ||
    (typeof from === 'string' && from.includes('@') ? from : '') ||
    parsedFrom.email ||
    '';

  return {
    id: rawId ? String(rawId) : `WEB-${Date.now()}`,
    type: ticket.type?.name || ticket.type || ticket.serviceType || 'Incident',
    title:
      ticket.summary ||
      ticket.title ||
      ticket.subject ||
      payload?.subject ||
      parsedEmail.subject ||
      'New support request',
    requester:
      ticket.requester?.name ||
      ticket.contact?.name ||
      ticket.requesterName ||
      ticket.contactName ||
      ticket.name ||
      (typeof payload?.from === 'string' ? payload.from : '') ||
      requesterName ||
      'Unknown requester',
    requesterEmail:
      ticket.requester?.email ||
      ticket.contact?.email ||
      ticket.requesterEmail ||
      ticket.contactEmail ||
      requesterEmail ||
      '',
    department:
      ticket.department ||
      ticket.departmentName ||
      ticket.company?.name ||
      ticket.companyName ||
      '',
    status: ticket.status?.name || ticket.status || 'New',
    priority: ticket.priority?.name || ticket.priority || 'Medium',
    assignee: ticket.assignee?.name || ticket.owner?.name || ticket.assignedTo || 'Unassigned',
    created: formatCreatedLabel(createdAt),
    createdAt,
    respondedAt: ticket.respondedAt ? new Date(ticket.respondedAt).getTime() : null,
    resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : null,
    category: ticket.category?.name || ticket.category || ticket.service || 'General',
    impact: ticket.impact?.name || ticket.impact || 'Just me',
    urgency: ticket.urgency?.name || ticket.urgency || 'Normal',
    contactPreference: ticket.contactPreference || ticket.contactMethod || 'Email',
    device: ticket.device || ticket.asset || ticket.configurationItem || '',
    description:
      ticket.description ||
      ticket.details ||
      ticket.notes ||
      parsedEmail.description ||
      payload?.cleanMessage ||
      payload?.rawText ||
      bodyContent ||
      '',
    entries: Array.isArray(ticket.entries)
      ? ticket.entries.map((entry, index) => ({
          id: entry.id || `entry-${Date.now()}-${index}`,
          type: entry.type || 'note',
          author: entry.author || entry.owner || 'System',
          time: entry.time || entry.timestamp || '',
          text: entry.text || entry.note || entry.message || '',
        }))
      : [],
    sourceSystem: 'connectwise',
    externalId: rawId ? String(rawId) : null,
  };
};

const validateSecret = (req) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true;
  const header = req.headers['x-webhook-secret'] || req.headers['authorization'] || '';
  const token = Array.isArray(header) ? header[0] : header;
  if (token.startsWith('Bearer ')) {
    return token.slice(7) === secret;
  }
  return token === secret;
};

const applyCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ALLOW_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-webhook-secret');
};

export default async function handler(req, res) {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!validateSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = parseBody(req);
    if (!body) {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const ticket = mapPayloadToTicket(body);

    await ensureTables();
    const db = getSql();

    await db`
      INSERT INTO tickets (id, data)
      VALUES (${ticket.id}, ${JSON.stringify(ticket)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
    `;

    return res.status(200).json({ ok: true, id: ticket.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
