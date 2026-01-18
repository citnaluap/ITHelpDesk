import { ensureTables, getSql } from './_db.js';
import { ticketSeed } from './seedData.js';

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

const parseQuery = (req) => {
  const query = req.query || {};
  const getValue = (key) => (Array.isArray(query[key]) ? query[key][0] : query[key]);
  const limit = Math.min(Math.max(parseInt(getValue('limit') || '20', 10), 1), 200);
  const offset = Math.max(parseInt(getValue('offset') || '0', 10), 0);
  const q = (getValue('q') || '').trim().toLowerCase();
  const status = getValue('status') || '';
  const assignee = getValue('assignee') || '';
  const type = getValue('type') || '';
  return { limit, offset, q, status, assignee, type };
};

const buildFilters = ({ q, status, assignee, type }) => {
  const clauses = [];
  const params = [];

  if (status) {
    params.push(status);
    clauses.push(`data->>'status' = $${params.length}`);
  }
  if (assignee) {
    params.push(assignee);
    clauses.push(`data->>'assignee' = $${params.length}`);
  }
  if (type) {
    params.push(type);
    clauses.push(`data->>'type' = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    clauses.push(
      `(lower(data->>'title') LIKE $${idx} OR lower(data->>'id') LIKE $${idx} OR lower(data->>'requester') LIKE $${idx})`,
    );
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { where, params };
};

const seedTickets = async (db) => {
  for (const ticket of ticketSeed) {
    await db`
      INSERT INTO tickets (id, data)
      VALUES (${ticket.id}, ${JSON.stringify(ticket)}::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `;
  }
};

export default async function handler(req, res) {
  try {
    await ensureTables();
    const db = getSql();

    if (req.method === 'GET') {
      const { limit, offset, ...filters } = parseQuery(req);
      const { where, params } = buildFilters(filters);
      const filterParams = [...params];
      const totalRows = await db(`SELECT COUNT(*)::int AS total FROM tickets ${where}`, filterParams);
      const rows = await db(
        `SELECT data FROM tickets ${where} ORDER BY (data->>'createdAt')::bigint DESC NULLS LAST, id DESC LIMIT $${
          params.length + 1
        } OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      );

      if (!rows.length) {
        await seedTickets(db);
        const seededRows = await db(
          `SELECT data FROM tickets ${where} ORDER BY (data->>'createdAt')::bigint DESC NULLS LAST, id DESC LIMIT $${
            params.length + 1
          } OFFSET $${params.length + 2}`,
          [...params, limit, offset],
        );
        const seededTotal = await db(`SELECT COUNT(*)::int AS total FROM tickets ${where}`, filterParams);
        return res.status(200).json({
          tickets: seededRows.map((row) => row.data),
          meta: { total: seededTotal[0]?.total || 0, limit, offset },
        });
      }

      return res.status(200).json({
        tickets: rows.map((row) => row.data),
        meta: { total: totalRows[0]?.total || 0, limit, offset },
      });
    }

    if (req.method === 'PATCH') {
      const body = parseBody(req);
      const id = body?.id;
      const updates = body?.updates;
      if (!id || !updates) {
        return res.status(400).json({ error: 'Missing id or updates' });
      }
      const rows = await db`SELECT data FROM tickets WHERE id = ${id}`;
      if (!rows.length) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
      const next = { ...rows[0].data, ...updates };
      await db`
        UPDATE tickets
        SET data = ${JSON.stringify(next)}::jsonb
        WHERE id = ${id};
      `;
      return res.status(200).json({ ticket: next });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const incoming = body?.ticket || body;
      if (!incoming) {
        return res.status(400).json({ error: 'Missing ticket payload' });
      }
      const createdAt = incoming.createdAt || Date.now();
      const ticket = {
        id: incoming.id || `REQ-${Date.now()}`,
        type: incoming.type || 'Request',
        title: incoming.title || incoming.subject || 'New support request',
        requester: incoming.requester || incoming.requesterName || 'Unknown requester',
        requesterEmail: incoming.requesterEmail || incoming.contactEmail || '',
        department: incoming.department || '',
        status: incoming.status || 'New',
        priority: incoming.priority || 'Medium',
        assignee: incoming.assignee || 'Unassigned',
        created: incoming.created || formatCreatedLabel(createdAt),
        createdAt,
        category: incoming.category || 'General',
        impact: incoming.impact || 'Just me',
        urgency: incoming.urgency || 'Normal',
        contactPreference: incoming.contactPreference || 'Email',
        device: incoming.device || '',
        description: incoming.description || incoming.details || '',
        entries: Array.isArray(incoming.entries) ? incoming.entries : [],
      };
      await db`
        INSERT INTO tickets (id, data)
        VALUES (${ticket.id}, ${JSON.stringify(ticket)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
      `;
      return res.status(200).json({ ticket });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
