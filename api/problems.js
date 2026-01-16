import { ensureTables, getSql } from './_db';
import { problemSeed } from './seedData';

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

const seedProblems = async (db) => {
  for (const problem of problemSeed) {
    await db`
      INSERT INTO problems (id, data)
      VALUES (${problem.id}, ${JSON.stringify(problem)}::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `;
  }
};

export default async function handler(req, res) {
  try {
    await ensureTables();
    const db = getSql();

    if (req.method === 'GET') {
      const rows = await db`SELECT data FROM problems ORDER BY id`;
      if (!rows.length) {
        await seedProblems(db);
        const seededRows = await db`SELECT data FROM problems ORDER BY id`;
        return res.status(200).json({ problems: seededRows.map((row) => row.data) });
      }
      return res.status(200).json({ problems: rows.map((row) => row.data) });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const problem = body?.problem || body;
      if (!problem?.id || !problem?.title || !problem?.impact) {
        return res.status(400).json({ error: 'Missing problem id, title, or impact' });
      }
      await db`
        INSERT INTO problems (id, data)
        VALUES (${problem.id}, ${JSON.stringify(problem)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
      `;
      return res.status(200).json({ problem });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
