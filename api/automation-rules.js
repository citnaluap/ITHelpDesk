import { ensureTables, getSql } from './_db';
import { automationSeed } from './seedData';

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

const seedAutomation = async (db) => {
  for (const rule of automationSeed) {
    await db`
      INSERT INTO automation_rules (id, data)
      VALUES (${rule.id}, ${JSON.stringify(rule)}::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `;
  }
};

export default async function handler(req, res) {
  try {
    await ensureTables();
    const db = getSql();

    if (req.method === 'GET') {
      const rows = await db`SELECT data FROM automation_rules ORDER BY id`;
      if (!rows.length) {
        await seedAutomation(db);
        const seeded = await db`SELECT data FROM automation_rules ORDER BY id`;
        return res.status(200).json({ rules: seeded.map((row) => row.data) });
      }
      return res.status(200).json({ rules: rows.map((row) => row.data) });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const rule = body?.rule;
      if (!rule?.id) {
        return res.status(400).json({ error: 'Missing rule payload' });
      }
      await db`
        INSERT INTO automation_rules (id, data)
        VALUES (${rule.id}, ${JSON.stringify(rule)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
      `;
      return res.status(200).json({ rule });
    }

    if (req.method === 'PATCH') {
      const body = parseBody(req);
      const id = body?.id;
      const updates = body?.updates;
      if (!id || !updates) {
        return res.status(400).json({ error: 'Missing id or updates' });
      }
      const rows = await db`SELECT data FROM automation_rules WHERE id = ${id}`;
      if (!rows.length) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      const next = { ...rows[0].data, ...updates };
      await db`
        UPDATE automation_rules
        SET data = ${JSON.stringify(next)}::jsonb
        WHERE id = ${id};
      `;
      return res.status(200).json({ rule: next });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
