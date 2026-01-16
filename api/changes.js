import { ensureTables, getSql } from './_db';
import { changeSeed } from './seedData';

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

const seedChanges = async (db) => {
  for (const change of changeSeed) {
    await db`
      INSERT INTO change_events (id, data)
      VALUES (${change.id}, ${JSON.stringify(change)}::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `;
  }
};

export default async function handler(req, res) {
  try {
    await ensureTables();
    const db = getSql();

    if (req.method === 'GET') {
      const rows = await db`SELECT data FROM change_events ORDER BY id`;
      if (!rows.length) {
        await seedChanges(db);
        const seededRows = await db`SELECT data FROM change_events ORDER BY id`;
        return res.status(200).json({ changes: seededRows.map((row) => row.data) });
      }
      return res.status(200).json({ changes: rows.map((row) => row.data) });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const change = body?.change || body;
      if (!change?.id) {
        return res.status(400).json({ error: 'Missing change payload' });
      }
      await db`
        INSERT INTO change_events (id, data)
        VALUES (${change.id}, ${JSON.stringify(change)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
      `;
      return res.status(200).json({ change });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
