import { ensureTables, getSql } from './_db';
import { taskSeed } from './seedData';

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
  const ticketId = getValue('ticketId') || '';
  const status = getValue('status') || '';
  const assignee = getValue('assignee') || '';
  return { limit, offset, q, ticketId, status, assignee };
};

const buildFilters = ({ q, ticketId, status, assignee }) => {
  const clauses = [];
  const params = [];

  if (ticketId) {
    params.push(ticketId);
    clauses.push(`data->>'ticketId' = $${params.length}`);
  }
  if (status) {
    params.push(status);
    clauses.push(`data->>'status' = $${params.length}`);
  }
  if (assignee) {
    params.push(assignee);
    clauses.push(`data->>'assignee' = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    clauses.push(`(lower(data->>'title') LIKE $${idx} OR lower(data->>'id') LIKE $${idx})`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { where, params };
};

const seedTasks = async (db) => {
  for (const task of taskSeed) {
    await db`
      INSERT INTO tasks (id, data)
      VALUES (${task.id}, ${JSON.stringify(task)}::jsonb)
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
      const totalRows = await db(`SELECT COUNT(*)::int AS total FROM tasks ${where}`, filterParams);
      const rows = await db(
        `SELECT data FROM tasks ${where} ORDER BY id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      );

      if (!rows.length) {
        await seedTasks(db);
        const seededRows = await db(
          `SELECT data FROM tasks ${where} ORDER BY id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, limit, offset],
        );
        const seededTotal = await db(`SELECT COUNT(*)::int AS total FROM tasks ${where}`, filterParams);
        return res.status(200).json({
          tasks: seededRows.map((row) => row.data),
          meta: { total: seededTotal[0]?.total || 0, limit, offset },
        });
      }

      return res.status(200).json({
        tasks: rows.map((row) => row.data),
        meta: { total: totalRows[0]?.total || 0, limit, offset },
      });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const task = body?.task;
      if (!task?.id) {
        return res.status(400).json({ error: 'Missing task payload' });
      }
      await db`
        INSERT INTO tasks (id, data)
        VALUES (${task.id}, ${JSON.stringify(task)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
      `;
      return res.status(200).json({ task });
    }

    if (req.method === 'PATCH') {
      const body = parseBody(req);
      const id = body?.id;
      const updates = body?.updates;
      if (!id || !updates) {
        return res.status(400).json({ error: 'Missing id or updates' });
      }
      const rows = await db`SELECT data FROM tasks WHERE id = ${id}`;
      if (!rows.length) {
        return res.status(404).json({ error: 'Task not found' });
      }
      const next = { ...rows[0].data, ...updates };
      await db`
        UPDATE tasks
        SET data = ${JSON.stringify(next)}::jsonb
        WHERE id = ${id};
      `;
      return res.status(200).json({ task: next });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
