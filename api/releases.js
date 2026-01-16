import { ensureTables, getSql } from './_db';
import { releaseSeed } from './seedData';

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

const seedReleases = async (db) => {
  for (const release of releaseSeed) {
    await db`
      INSERT INTO releases (id, data)
      VALUES (${release.id}, ${JSON.stringify(release)}::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `;
  }
};

export default async function handler(req, res) {
  try {
    await ensureTables();
    const db = getSql();

    if (req.method === 'GET') {
      const rows = await db`SELECT data FROM releases ORDER BY id`;
      if (!rows.length) {
        await seedReleases(db);
        const seededRows = await db`SELECT data FROM releases ORDER BY id`;
        return res.status(200).json({ releases: seededRows.map((row) => row.data) });
      }
      return res.status(200).json({ releases: rows.map((row) => row.data) });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const release = body?.release || body;
      if (!release?.id || !release?.title || !release?.owner || !release?.window) {
        return res.status(400).json({ error: 'Missing release id, title, owner, or window' });
      }
      await db`
        INSERT INTO releases (id, data)
        VALUES (${release.id}, ${JSON.stringify(release)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
      `;
      return res.status(200).json({ release });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
