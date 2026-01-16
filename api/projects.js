import { ensureTables, getSql } from './_db';
import { projectSeed } from './seedData';

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

const seedProjects = async (db) => {
  for (const project of projectSeed) {
    await db`
      INSERT INTO projects (id, data)
      VALUES (${project.id}, ${JSON.stringify(project)}::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `;
  }
};

export default async function handler(req, res) {
  try {
    await ensureTables();
    const db = getSql();

    if (req.method === 'GET') {
      const rows = await db`SELECT data FROM projects ORDER BY id`;
      if (!rows.length) {
        await seedProjects(db);
        const seededRows = await db`SELECT data FROM projects ORDER BY id`;
        return res.status(200).json({ projects: seededRows.map((row) => row.data) });
      }
      return res.status(200).json({ projects: rows.map((row) => row.data) });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const project = body?.project || body;
      if (!project?.id) {
        return res.status(400).json({ error: 'Missing project payload' });
      }
      await db`
        INSERT INTO projects (id, data)
        VALUES (${project.id}, ${JSON.stringify(project)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
      `;
      return res.status(200).json({ project });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
