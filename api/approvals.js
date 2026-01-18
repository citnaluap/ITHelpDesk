import { ensureTables, getSql } from './_db.js';
import { approvalSeed } from './seedData.js';

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

const parseQuery = (req) => {
  const query = req.query || {};
  const getValue = (key) => (Array.isArray(query[key]) ? query[key][0] : query[key]);
  const limit = Math.min(Math.max(parseInt(getValue('limit') || '20', 10), 1), 200);
  const offset = Math.max(parseInt(getValue('offset') || '0', 10), 0);
  const q = (getValue('q') || '').trim().toLowerCase();
  const status = getValue('status') || '';
  const type = getValue('type') || '';
  return { limit, offset, q, status, type };
};

const buildFilters = ({ q, status, type }) => {
  const clauses = [];
  const params = [];

  if (status) {
    params.push(status);
    clauses.push(`data->>'status' = $${params.length}`);
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

const seedApprovals = async (db) => {
  for (const approval of approvalSeed) {
    await db`
      INSERT INTO approvals (id, data)
      VALUES (${approval.id}, ${JSON.stringify(approval)}::jsonb)
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
      const totalRows = await db(`SELECT COUNT(*)::int AS total FROM approvals ${where}`, filterParams);
      const rows = await db(
        `SELECT data FROM approvals ${where} ORDER BY id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      );

      if (!rows.length) {
        await seedApprovals(db);
        const seededRows = await db(
          `SELECT data FROM approvals ${where} ORDER BY id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, limit, offset],
        );
        const seededTotal = await db(`SELECT COUNT(*)::int AS total FROM approvals ${where}`, filterParams);
        return res.status(200).json({
          approvals: seededRows.map((row) => row.data),
          meta: { total: seededTotal[0]?.total || 0, limit, offset },
        });
      }

      return res.status(200).json({
        approvals: rows.map((row) => row.data),
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
      const rows = await db`SELECT data FROM approvals WHERE id = ${id}`;
      if (!rows.length) {
        return res.status(404).json({ error: 'Approval not found' });
      }
      const next = { ...rows[0].data, ...updates };
      await db`
        UPDATE approvals
        SET data = ${JSON.stringify(next)}::jsonb
        WHERE id = ${id};
      `;
      return res.status(200).json({ approval: next });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
