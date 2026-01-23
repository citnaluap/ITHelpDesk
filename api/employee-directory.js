import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { applyCors } from './_security.js';

const HUB_FILE = path.join(process.cwd(), 'Tables', 'Employee Information Hub.xlsx');
const COLUMN_MAP = {
  lastname: 'lastName',
  firstname: 'firstName',
  employeeid: 'employeeId',
  company: 'company',
  department: 'department',
  location: 'location',
  jobtitle: 'jobTitle',
  title: 'jobTitle',
  email: 'email',
  emailaddress: 'email',
  startdate: 'startDate',
  supervisor: 'supervisor',
  manager: 'supervisor',
  computer: 'computer',
  laptop: 'computer',
  mobilephone: 'mobilePhone',
  mobile: 'mobilePhone',
  cellphone: 'mobilePhone',
  keyfob: 'keyFob',
  keycard: 'keyFob',
  printer: 'printer',
  monitor: 'monitor',
  dock: 'dock',
};

let cachedRecords = null;
let cachedMtime = 0;

const normalizeHeader = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const formatCellValue = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return String(value).trim();
};

const loadEmployeeHub = () => {
  if (!fs.existsSync(HUB_FILE)) {
    return [];
  }
  const stats = fs.statSync(HUB_FILE);
  if (cachedRecords && cachedMtime === stats.mtimeMs) {
    return cachedRecords;
  }
  const workbook = xlsx.readFile(HUB_FILE, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  const records = rows
    .map((row) => {
      const mapped = {};
      Object.entries(row).forEach(([key, value]) => {
        const normalized = normalizeHeader(key);
        const mappedKey = COLUMN_MAP[normalized];
        if (!mappedKey) return;
        mapped[mappedKey] = formatCellValue(value);
      });
      return mapped;
    })
    .filter((record) => record.email || record.firstName || record.lastName);
  cachedRecords = records;
  cachedMtime = stats.mtimeMs;
  return records;
};

export default function handler(req, res) {
  applyCors(req, res, { methods: 'GET, OPTIONS' });
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const records = loadEmployeeHub();
    return res.status(200).json({ records });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
