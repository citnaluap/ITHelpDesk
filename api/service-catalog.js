import { ensureTables, getSql } from './_db';
import { serviceCatalogSeed } from './seedData';

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

const seedCatalog = async (db) => {
  for (const item of serviceCatalogSeed) {
    await db`
      INSERT INTO service_catalog (id, data)
      VALUES (${item.id}, ${JSON.stringify(item)}::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `;
  }
};

export default async function handler(req, res) {
  try {
    await ensureTables();
    const db = getSql();

    if (req.method === 'GET') {
      const rows = await db`SELECT data FROM service_catalog ORDER BY id`;
      if (!rows.length) {
        await seedCatalog(db);
        const seededRows = await db`SELECT data FROM service_catalog ORDER BY id`;
        return res.status(200).json({ items: seededRows.map((row) => row.data) });
      }
      return res.status(200).json({ items: rows.map((row) => row.data) });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const item = body?.item || body;
      if (!item?.id) {
        return res.status(400).json({ error: 'Missing catalog item payload' });
      }
      await db`
        INSERT INTO service_catalog (id, data)
        VALUES (${item.id}, ${JSON.stringify(item)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
      `;
      return res.status(200).json({ item });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
