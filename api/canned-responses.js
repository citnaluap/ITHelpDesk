import { ensureTables, getSql } from './_db';
import { cannedSeed } from './seedData';

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

const seedCanned = async (db) => {
  for (const response of cannedSeed) {
    await db`
      INSERT INTO canned_responses (id, data)
      VALUES (${response.id}, ${JSON.stringify(response)}::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `;
  }
};

export default async function handler(req, res) {
  try {
    await ensureTables();
    const db = getSql();

    if (req.method === 'GET') {
      const rows = await db`SELECT data FROM canned_responses ORDER BY id`;
      if (!rows.length) {
        await seedCanned(db);
        const seeded = await db`SELECT data FROM canned_responses ORDER BY id`;
        return res.status(200).json({ responses: seeded.map((row) => row.data) });
      }
      return res.status(200).json({ responses: rows.map((row) => row.data) });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const responseItem = body?.response;
      if (!responseItem?.id) {
        return res.status(400).json({ error: 'Missing response payload' });
      }
      await db`
        INSERT INTO canned_responses (id, data)
        VALUES (${responseItem.id}, ${JSON.stringify(responseItem)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
      `;
      return res.status(200).json({ response: responseItem });
    }

    if (req.method === 'PATCH') {
      const body = parseBody(req);
      const id = body?.id;
      const updates = body?.updates;
      if (!id || !updates) {
        return res.status(400).json({ error: 'Missing id or updates' });
      }
      const rows = await db`SELECT data FROM canned_responses WHERE id = ${id}`;
      if (!rows.length) {
        return res.status(404).json({ error: 'Response not found' });
      }
      const next = { ...rows[0].data, ...updates };
      await db`
        UPDATE canned_responses
        SET data = ${JSON.stringify(next)}::jsonb
        WHERE id = ${id};
      `;
      return res.status(200).json({ response: next });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
