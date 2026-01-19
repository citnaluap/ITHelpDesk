import { ensureTables, getSql } from './_db';
import { serviceStatusSeed } from './seedData';

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

const seedServiceStatus = async (db) => {
  for (const item of serviceStatusSeed) {
    await db`
      INSERT INTO service_status (id, data)
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
      const rows = await db`SELECT data FROM service_status ORDER BY id`;
      if (!rows.length) {
        await seedServiceStatus(db);
        const seededRows = await db`SELECT data FROM service_status ORDER BY id`;
        return res.status(200).json({ statuses: seededRows.map((row) => row.data) });
      }
      return res.status(200).json({ statuses: rows.map((row) => row.data) });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const item = body?.item || body;
      if (!item?.id || !item?.name || !item?.state) {
        return res.status(400).json({ error: 'Missing status id, name, or state' });
      }
      const next = {
        id: item.id,
        name: item.name,
        state: item.state,
        color: item.color || '#008542',
      };
      await db`
        INSERT INTO service_status (id, data)
        VALUES (${next.id}, ${JSON.stringify(next)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
      `;
      return res.status(200).json({ status: next });
    }

    if (req.method === 'PATCH') {
      const body = parseBody(req);
      const id = body?.id;
      const updates = body?.updates;
      if (!id || !updates) {
        return res.status(400).json({ error: 'Missing id or updates' });
      }
      const rows = await db`SELECT data FROM service_status WHERE id = ${id}`;
      if (!rows.length) {
        return res.status(404).json({ error: 'Status not found' });
      }
      const next = { ...rows[0].data, ...updates };
      await db`
        UPDATE service_status
        SET data = ${JSON.stringify(next)}::jsonb
        WHERE id = ${id};
      `;
      return res.status(200).json({ status: next });
    }

    if (req.method === 'DELETE') {
      const body = parseBody(req);
      const id = body?.id;
      if (!id) {
        return res.status(400).json({ error: 'Missing id' });
      }
      await db`DELETE FROM service_status WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
