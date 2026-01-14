import { ensureTables, getSql } from './_db';
import { approvalSeed } from './seedData';

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
      const rows = await db`SELECT data FROM approvals ORDER BY id`;
      if (!rows.length) {
        await seedApprovals(db);
        const seeded = await db`SELECT data FROM approvals ORDER BY id`;
        return res.status(200).json({ approvals: seeded.map((row) => row.data) });
      }
      return res.status(200).json({ approvals: rows.map((row) => row.data) });
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
