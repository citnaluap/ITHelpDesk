import { ensureTables, getSql } from './_db';
import { ticketSeed } from './seedData';

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
      const rows = await db`SELECT data FROM tickets ORDER BY id`;
      if (!rows.length) {
        await seedTickets(db);
        const seeded = await db`SELECT data FROM tickets ORDER BY id`;
        return res.status(200).json({ tickets: seeded.map((row) => row.data) });
      }
      return res.status(200).json({ tickets: rows.map((row) => row.data) });
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

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
