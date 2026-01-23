import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Clock,
  FolderKanban,
  Gauge,
  Layers,
  LayoutGrid,
  Mail,
  MessageSquareText,
  PenLine,
  PieChart,
  Plus,
  Rocket,
  Search,
  Server,
  Wand2,
  Sparkles,
  TrendingUp,
  Users,
  ShieldCheck,
} from 'lucide-react';
import employeeDirectory from './data/employeeDirectory.json';
import employeePhotos from './data/employeePhotos';
import { TECHNICIANS } from './data/technicians';
import {
  createAutomationRule,
  createAnnouncement,
  createCannedResponse,
  createCatalogItem,
  createChange,
  createApproval,
  createProblem,
  createProject,
  createRelease,
  createServiceStatus,
  createTicket,
  deleteAnnouncement,
  deleteServiceStatus,
  fetchAnnouncements,
  fetchApprovals,
  fetchAutomationRules,
  fetchCannedResponses,
  fetchCatalogItems,
  fetchChanges,
  fetchEmployeeDirectory,
  fetchProblems,
  fetchProjects,
  fetchReleases,
  fetchServiceStatus,
  fetchTickets,
  sendTicketMessage,
  updateAnnouncement,
  updateApproval,
  updateAutomationRule,
  updateServiceStatus,
  updateTicket,
} from './api';
import InlineTag from './components/InlineTag';
import TicketDetail from './components/TicketDetail';
import { formatEasternDateTime, formatEasternTime, formatTicketCreated, toKebabCase } from './utils/format';
import { getTicketDescription, getTicketSummary } from './utils/tickets';
import { buildSlaDisplay, formatDuration, getSlaPolicy } from './utils/sla';

const WORK_FILTERS = ['All', 'Incident', 'Request', 'Task'];
const TICKET_FILTERS = ['All', 'New', 'In Review', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'];
const STATUS_OPTIONS = ['New', 'In Review', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'];
const SERVICE_STATUS_OPTIONS = ['Operational', 'Degraded', 'Investigating', 'Maintenance', 'Outage'];
const TICKET_PAGE_SIZE = 12;
const APPROVAL_PAGE_SIZE = 8;
const EMPLOYEE_DIRECTORY_PAGE_SIZE = 18;
const SLA_ON_CALL_LEAD = 'Erik Lofgren';
const SLA_ESCALATION_OWNER = 'Geoffrey Heller';
const ASSIGNEES = [
  'Unassigned',
  'Paul Antic',
  'Geoffrey Heller',
  'Melvin Paneto',
  'Miles Grater',
  'David Meek',
  'Alec Nauck-Heisey',
  'Erik Lofgren',
];
const INTAKE_EMAIL = 'paula@udservices.org';
const INTAKE_SOURCE = 'Office365 email flow';
const navItems = [
  { id: 'overview', label: 'Overview', icon: Sparkles, targetId: 'overview' },
  { id: 'tickets', label: 'Tickets', icon: Mail, targetId: 'tickets' },
  { id: 'my-work', label: 'My Work', icon: PenLine, targetId: 'my-work' },
  { id: 'team-queue', label: 'Team Queue', icon: PenLine, targetId: 'team-queue' },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle2, targetId: 'approvals' },
  { id: 'service-catalog', label: 'Service Catalog', icon: LayoutGrid, targetId: 'service-catalog' },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, targetId: 'knowledge' },
  { id: 'directory', label: 'Directory', icon: Users, targetId: 'directory' },
  { id: 'problems', label: 'Problems', icon: AlertTriangle, targetId: 'problems' },
  { id: 'reports', label: 'Reports', icon: BarChart3, targetId: 'reports' },
  { id: 'surveys', label: 'Surveys', icon: TrendingUp, targetId: 'surveys' },
  { id: 'assets', label: 'Assets', icon: Server, targetId: 'assets' },
  { id: 'cmdb', label: 'CMDB', icon: Boxes, targetId: 'cmdb' },
  { id: 'changes', label: 'Change Calendar', icon: CalendarClock, targetId: 'changes' },
  { id: 'releases', label: 'Releases', icon: Rocket, targetId: 'releases' },
  { id: 'projects', label: 'Projects', icon: FolderKanban, targetId: 'projects' },
  { id: 'automation', label: 'Automation', icon: Wand2, targetId: 'automation' },
  { id: 'canned', label: 'Canned Responses', icon: MessageSquareText, targetId: 'canned' },
];

const SERVICE_STATUS_FALLBACK = [
  { id: 'STS-1', name: 'Email and MFA', state: 'Operational', color: '#008542' },
  { id: 'STS-2', name: 'VPN / Remote Access', state: 'Degraded', color: '#f9a51a' },
  { id: 'STS-3', name: 'File Shares', state: 'Operational', color: '#008542' },
  { id: 'STS-4', name: 'Printing', state: 'Investigating', color: '#003551' },
];

const LOCAL_SERVICE_STATUS_KEY = 'dev_service_status';
const LOCAL_ANNOUNCEMENTS_KEY = 'dev_announcements';
const LOCAL_DEFLECTION_KEY = 'dev_deflection_stats';

const ANNOUNCEMENTS_FALLBACK = [
  {
    id: 'ANN-1',
    title: 'Duo push update on Friday',
    body: 'MFA prompts will look different starting Friday. No action needed.',
    date: 'Sep 4',
    tag: 'Security',
  },
  {
    id: 'ANN-2',
    title: 'VPN gateway maintenance',
    body: 'Expect brief reconnects between 9:00p and 11:00p on Friday.',
    date: 'Sep 6',
    tag: 'Network',
  },
  {
    id: 'ANN-3',
    title: 'New hire onboarding improvements',
    body: 'Intake forms now auto-collect hardware and access needs.',
    date: 'Sep 9',
    tag: 'Process',
  },
];

const SERVICE_STATUS_COLORS = {
  Operational: '#008542',
  Degraded: '#f9a51a',
  Investigating: '#003551',
  Maintenance: '#2563eb',
  Outage: '#dc2626',
};

const getServiceStatusColor = (state) => SERVICE_STATUS_COLORS[state] || '#008542';

const readLocalList = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
};

const writeLocalList = (key, value) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const readLocalValue = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
};

const writeLocalValue = (key, value) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const workQueue = [
  {
    id: 'INC-4821',
    type: 'Incident',
    title: 'VPN drops every 20 minutes',
    requester: 'Pat Miles',
    status: 'In Progress',
    priority: 'High',
    due: 'Today 3:30p',
    assignee: 'Paul Antic',
  },
  {
    id: 'REQ-4823',
    type: 'Request',
    title: 'New laptop for onboarding',
    requester: 'Jessie Rivera',
    status: 'Waiting on User',
    priority: 'Medium',
    due: 'Tomorrow',
    assignee: 'Geoffrey Heller',
  },
  {
    id: 'TSK-297',
    type: 'Task',
    title: 'Install Intune on Windows devices',
    requester: 'IT Operations',
    status: 'In Progress',
    priority: 'Medium',
    due: 'Thu',
    assignee: 'David Meek',
  },
  {
    id: 'REQ-4812',
    type: 'Request',
    title: 'Finance shared drive access',
    requester: 'Claire V.',
    status: 'In Review',
    priority: 'Low',
    due: 'Fri',
    assignee: 'Melvin Paneto',
  },
  {
    id: 'INC-4810',
    type: 'Incident',
    title: 'Printer jam in 3rd floor',
    requester: 'Marco S.',
    status: 'Open',
    priority: 'Low',
    due: 'Today 4:00p',
    assignee: 'Miles Grater',
  },
];


const changeCalendar = [
  {
    id: 'chg-1',
    area: 'Network',
    title: 'VPN gateway upgrade',
    window: 'Fri 9:00p - 11:00p',
    status: 'Scheduled',
  },
  {
    id: 'chg-2',
    area: 'Collaboration',
    title: 'Teams client patch rollout',
    window: 'Tue 6:00p - 8:00p',
    status: 'In Progress',
  },
  {
    id: 'chg-3',
    area: 'Email',
    title: 'Exchange spam filter tuning',
    window: 'Wed 7:00p - 8:00p',
    status: 'Planned',
  },
];
const CHANGE_STATUS_OPTIONS = ['Planned', 'Scheduled', 'In Progress', 'Completed', 'Canceled'];

const reportRanges = ['Last 7 days', 'Last 30 days', 'Quarter to date'];

const getRangeStart = (range, now) => {
  if (range === 'Last 7 days') return now - 7 * 24 * 60 * 60 * 1000;
  if (range === 'Last 30 days') return now - 30 * 24 * 60 * 60 * 1000;
  const date = new Date(now);
  const month = date.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  return new Date(date.getFullYear(), quarterStartMonth, 1).getTime();
};

const toPercent = (value) => `${Math.round(value)}%`;

const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

const buildReportData = (tickets, range, fallback) => {
  const now = Date.now();
  const start = getRangeStart(range, now);
  const createdInRange = tickets.filter((ticket) => ticket.createdAt && ticket.createdAt >= start);
  const resolvedInRange = tickets.filter((ticket) => ticket.resolvedAt && ticket.resolvedAt >= start);
  const respondedInRange = tickets.filter((ticket) => ticket.respondedAt && ticket.respondedAt >= start);

  const resolutionDurations = resolvedInRange
    .map((ticket) => ticket.resolvedAt - ticket.createdAt)
    .filter((value) => Number.isFinite(value) && value >= 0);
  const responseDurations = respondedInRange
    .map((ticket) => ticket.respondedAt - ticket.createdAt)
    .filter((value) => Number.isFinite(value) && value >= 0);

  const resolvedWithinSla = resolvedInRange.filter((ticket) => {
    if (!ticket.createdAt || !ticket.resolvedAt) return false;
    const policy = getSlaPolicy(ticket.priority);
    return ticket.resolvedAt <= ticket.createdAt + policy.resolveMs;
  });
  const slaMetPercent = resolvedInRange.length
    ? (resolvedWithinSla.length / resolvedInRange.length) * 100
    : 0;

  const avgCsatValues = tickets
    .map((ticket) => Number(ticket.csat || ticket.satisfactionScore || ticket.csatScore))
    .filter((value) => Number.isFinite(value));
  const csatScore = avgCsatValues.length
    ? `${(avgCsatValues.reduce((sum, value) => sum + value, 0) / avgCsatValues.length).toFixed(1)}/5`
    : fallback.kpis.find((item) => item.label === 'CSAT score')?.value || '—';

  const responseMedian = responseDurations.length ? formatDuration(median(responseDurations)) : '—';
  const resolveMedian = resolutionDurations.length ? formatDuration(median(resolutionDurations)) : '—';

  const categoryCounts = new Map();
  const priorityCounts = new Map();
  const channelCounts = new Map();
  const requesterCounts = new Map();
  createdInRange.forEach((ticket) => {
    const category = ticket.category || 'Other';
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    const priority = ticket.priority || 'Medium';
    priorityCounts.set(priority, (priorityCounts.get(priority) || 0) + 1);
    const channel = ticket.contactPreference || ticket.sourceSystem || 'Other';
    channelCounts.set(channel, (channelCounts.get(channel) || 0) + 1);
    const requesterKey = ticket.department || ticket.requester || 'Other';
    requesterCounts.set(requesterKey, (requesterCounts.get(requesterKey) || 0) + 1);
  });

  const toSortedList = (map, limit = 6) =>
    Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

  const backlogBuckets = [
    { label: '0-1 days', min: 0, max: 1 },
    { label: '2-3 days', min: 2, max: 3 },
    { label: '4-7 days', min: 4, max: 7 },
    { label: '8-14 days', min: 8, max: 14 },
    { label: '15+ days', min: 15, max: Infinity },
  ];
  const backlogAging = backlogBuckets.map((bucket) => ({ label: bucket.label, value: 0 }));
  tickets
    .filter((ticket) => !['Resolved', 'Closed'].includes(ticket.status))
    .forEach((ticket) => {
      if (!ticket.createdAt) return;
      const ageDays = Math.floor((now - ticket.createdAt) / (24 * 60 * 60 * 1000));
      const bucketIndex = backlogBuckets.findIndex((bucket) => ageDays >= bucket.min && ageDays <= bucket.max);
      if (bucketIndex >= 0) backlogAging[bucketIndex].value += 1;
    });

  const assigneeMap = new Map();
  const trackAssignee = (ticket, targetMap) => {
    const assignee = ticket.assignee || 'Unassigned';
    if (!targetMap.has(assignee)) {
      targetMap.set(assignee, {
        name: assignee,
        assigned: 0,
        resolved: 0,
        responseTimes: [],
        resolveTimes: [],
        slaMet: 0,
        slaTotal: 0,
      });
    }
    return targetMap.get(assignee);
  };

  createdInRange.forEach((ticket) => {
    const row = trackAssignee(ticket, assigneeMap);
    row.assigned += 1;
    if (ticket.respondedAt) row.responseTimes.push(ticket.respondedAt - ticket.createdAt);
  });
  resolvedInRange.forEach((ticket) => {
    const row = trackAssignee(ticket, assigneeMap);
    row.resolved += 1;
    if (ticket.resolvedAt) row.resolveTimes.push(ticket.resolvedAt - ticket.createdAt);
    const policy = getSlaPolicy(ticket.priority);
    if (ticket.resolvedAt <= ticket.createdAt + policy.resolveMs) {
      row.slaMet += 1;
    }
    row.slaTotal += 1;
  });

  const teamPerformance = Array.from(assigneeMap.values())
    .map((row) => ({
      name: row.name,
      assigned: row.assigned,
      resolved: row.resolved,
      firstResponse: row.responseTimes.length ? formatDuration(median(row.responseTimes)) : '—',
      sla: row.slaTotal ? Math.round((row.slaMet / row.slaTotal) * 100) : 0,
      reopen: 0,
    }))
    .sort((a, b) => b.assigned - a.assigned);

  const slaByPriority = ['Critical', 'High', 'Medium', 'Low'].map((priority) => {
    const resolved = resolvedInRange.filter((ticket) => (ticket.priority || 'Medium') === priority);
    const met = resolved.filter((ticket) => {
      const policy = getSlaPolicy(ticket.priority);
      return ticket.resolvedAt <= ticket.createdAt + policy.resolveMs;
    });
    const percent = resolved.length ? Math.round((met.length / resolved.length) * 100) : 0;
    return { label: priority, value: percent };
  });

  const slaCategoryMap = new Map();
  resolvedInRange.forEach((ticket) => {
    const category = ticket.category || 'Other';
    if (!slaCategoryMap.has(category)) {
      slaCategoryMap.set(category, { label: category, met: 0, total: 0 });
    }
    const row = slaCategoryMap.get(category);
    const policy = getSlaPolicy(ticket.priority);
    if (ticket.resolvedAt <= ticket.createdAt + policy.resolveMs) {
      row.met += 1;
    }
    row.total += 1;
  });
  const slaByCategory = Array.from(slaCategoryMap.values())
    .map((row) => ({
      label: row.label,
      value: row.total ? Math.round((row.met / row.total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const slaQueueMap = new Map();
  resolvedInRange.forEach((ticket) => {
    const queue = ticket.assignee || 'Unassigned';
    if (!slaQueueMap.has(queue)) {
      slaQueueMap.set(queue, { label: queue, met: 0, total: 0 });
    }
    const row = slaQueueMap.get(queue);
    const policy = getSlaPolicy(ticket.priority);
    if (ticket.resolvedAt <= ticket.createdAt + policy.resolveMs) {
      row.met += 1;
    }
    row.total += 1;
  });
  const slaByQueue = Array.from(slaQueueMap.values())
    .map((row) => ({
      label: row.label,
      value: row.total ? Math.round((row.met / row.total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const csatCategoryMap = new Map();
  const csatQueueMap = new Map();
  tickets.forEach((ticket) => {
    const score = Number(ticket.csat || ticket.satisfactionScore || ticket.csatScore);
    if (!Number.isFinite(score)) return;
    const category = ticket.category || 'Other';
    const assignee = ticket.assignee || 'Unassigned';
    if (!csatCategoryMap.has(category)) {
      csatCategoryMap.set(category, { label: category, total: 0, count: 0 });
    }
    if (!csatQueueMap.has(assignee)) {
      csatQueueMap.set(assignee, { label: assignee, total: 0, count: 0 });
    }
    const catRow = csatCategoryMap.get(category);
    catRow.total += score;
    catRow.count += 1;
    const queueRow = csatQueueMap.get(assignee);
    queueRow.total += score;
    queueRow.count += 1;
  });
  const csatByCategory = Array.from(csatCategoryMap.values())
    .map((row) => ({
      label: row.label,
      value: row.count ? Number((row.total / row.count).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const csatByQueue = Array.from(csatQueueMap.values())
    .map((row) => ({
      label: row.label,
      value: row.count ? Number((row.total / row.count).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const volumeTrend =
    range === 'Last 7 days'
      ? Array.from({ length: 7 }).map((_, index) => {
          const dayStart = new Date(now - (6 - index) * 24 * 60 * 60 * 1000);
          const label = dayStart.toLocaleDateString('en-US', { weekday: 'short' });
          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);
          const count = createdInRange.filter(
            (ticket) => ticket.createdAt >= dayStart.getTime() && ticket.createdAt <= dayEnd.getTime(),
          ).length;
          return { label, value: count };
        })
      : range === 'Last 30 days'
        ? ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'].map((label, index) => {
            const startOffset = (3 - index) * 7 * 24 * 60 * 60 * 1000;
            const endOffset = startOffset + 7 * 24 * 60 * 60 * 1000;
            const windowStart = now - endOffset;
            const windowEnd = now - startOffset;
            const count = createdInRange.filter(
              (ticket) => ticket.createdAt >= windowStart && ticket.createdAt < windowEnd,
            ).length;
            return { label, value: count };
          })
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            .slice(0, 12)
            .map((label, index) => {
              const monthStart = new Date(new Date(now).getFullYear(), index, 1).getTime();
              const monthEnd = new Date(new Date(now).getFullYear(), index + 1, 1).getTime();
              const count = createdInRange.filter(
                (ticket) => ticket.createdAt >= monthStart && ticket.createdAt < monthEnd,
              ).length;
              return { label, value: count };
            })
            .filter((item) => item.value > 0);

  const kpis = [
    { label: 'New tickets', value: String(createdInRange.length), delta: '—', trend: 'up', sub: `since ${new Date(start).toLocaleDateString()}`, icon: Activity },
    { label: 'Resolved within SLA', value: toPercent(slaMetPercent), delta: '—', trend: 'up', sub: 'resolution SLA', icon: ShieldCheck },
    { label: 'First response time', value: responseMedian, delta: '—', trend: 'up', sub: 'median response', icon: Clock },
    { label: 'Mean time to resolve', value: resolveMedian, delta: '—', trend: 'up', sub: 'median MTTR', icon: Gauge },
    { label: 'CSAT score', value: csatScore, delta: '—', trend: 'up', sub: 'survey average', icon: TrendingUp },
    { label: 'Reopen rate', value: '0%', delta: '—', trend: 'up', sub: 'no reopen data', icon: Layers },
  ];

  return {
    ...fallback,
    kpis,
    volumeTrend: volumeTrend.length ? volumeTrend : fallback.volumeTrend,
    channelMix: channelCounts.size ? toSortedList(channelCounts, 5) : fallback.channelMix,
    categoryMix: categoryCounts.size ? toSortedList(categoryCounts, 6) : fallback.categoryMix,
    priorityMix: priorityCounts.size ? toSortedList(priorityCounts, 4) : fallback.priorityMix,
    slaByPriority: slaByPriority.some((item) => item.value) ? slaByPriority : fallback.slaByPriority,
    slaByCategory: slaByCategory.length ? slaByCategory : fallback.slaByPriority,
    slaByQueue: slaByQueue.length ? slaByQueue : fallback.slaByPriority,
    backlogAging: backlogAging.some((item) => item.value) ? backlogAging : fallback.backlogAging,
    teamPerformance: teamPerformance.length ? teamPerformance : fallback.teamPerformance,
    topRequesters: requesterCounts.size ? toSortedList(requesterCounts, 6).map((item) => ({ name: item.label, count: item.value })) : fallback.topRequesters,
    csatByCategory: csatByCategory.length ? csatByCategory : fallback.csatTrend,
    csatByQueue: csatByQueue.length ? csatByQueue : fallback.csatTrend,
  };
};

const reportDataByRange = {
  'Last 7 days': {
    kpis: [
      { label: 'New tickets', value: '214', delta: '+8%', trend: 'up', sub: 'vs previous 7 days', icon: Activity },
      { label: 'Resolved within SLA', value: '92%', delta: '+3%', trend: 'up', sub: 'target 90%', icon: ShieldCheck },
      { label: 'First response time', value: '42m', delta: '-6m', trend: 'up', sub: 'median', icon: Clock },
      { label: 'Mean time to resolve', value: '6h 18m', delta: '-12%', trend: 'up', sub: 'MTTR', icon: Gauge },
      { label: 'CSAT score', value: '4.6/5', delta: '+0.2', trend: 'up', sub: 'last 84 surveys', icon: TrendingUp },
      { label: 'Reopen rate', value: '3.2%', delta: '-0.6%', trend: 'up', sub: 'goal < 5%', icon: Layers },
    ],
    volumeTrend: [
      { label: 'Mon', value: 28 },
      { label: 'Tue', value: 36 },
      { label: 'Wed', value: 41 },
      { label: 'Thu', value: 52 },
      { label: 'Fri', value: 44 },
      { label: 'Sat', value: 9 },
      { label: 'Sun', value: 4 },
    ],
    channelMix: [
      { label: 'Email', value: 42 },
      { label: 'Portal', value: 31 },
      { label: 'Phone', value: 17 },
      { label: 'Walk-up', value: 10 },
    ],
    categoryMix: [
      { label: 'Network', value: 18 },
      { label: 'Hardware', value: 17 },
      { label: 'Account / Access', value: 16 },
      { label: 'Email', value: 12 },
      { label: 'Facilities', value: 10 },
      { label: 'Software', value: 9 },
      { label: 'Other', value: 18 },
    ],
    priorityMix: [
      { label: 'Critical', value: 6 },
      { label: 'High', value: 18 },
      { label: 'Medium', value: 44 },
      { label: 'Low', value: 32 },
    ],
    slaByPriority: [
      { label: 'Critical', value: 91 },
      { label: 'High', value: 94 },
      { label: 'Medium', value: 89 },
      { label: 'Low', value: 96 },
    ],
    backlogAging: [
      { label: '0-1 days', value: 56 },
      { label: '2-3 days', value: 24 },
      { label: '4-7 days', value: 13 },
      { label: '8-14 days', value: 5 },
      { label: '15+ days', value: 2 },
    ],
    teamPerformance: [
      { name: 'Paul Antic', assigned: 38, resolved: 31, firstResponse: '34m', sla: 94, reopen: 2 },
      { name: 'Geoffrey Heller', assigned: 29, resolved: 26, firstResponse: '41m', sla: 93, reopen: 1 },
      { name: 'Melvin Paneto', assigned: 24, resolved: 21, firstResponse: '52m', sla: 89, reopen: 2 },
      { name: 'Miles Grater', assigned: 22, resolved: 18, firstResponse: '1h 05m', sla: 86, reopen: 3 },
      { name: 'David Meek', assigned: 17, resolved: 15, firstResponse: '38m', sla: 92, reopen: 1 },
    ],
    topRequesters: [
      { name: 'HCBS Finance', count: 18 },
      { name: 'Resource Center', count: 14 },
      { name: 'HCBS AmeriHealth', count: 11 },
      { name: 'UDS Foundation', count: 9 },
    ],
    csatTrend: [
      { label: 'Wk 1', value: 4.2 },
      { label: 'Wk 2', value: 4.4 },
      { label: 'Wk 3', value: 4.6 },
      { label: 'Wk 4', value: 4.5 },
    ],
    changeSuccess: [
      { label: 'Successful', value: 92 },
      { label: 'With issues', value: 6 },
      { label: 'Failed', value: 2 },
    ],
  },
  'Last 30 days': {
    kpis: [
      { label: 'New tickets', value: '902', delta: '+6%', trend: 'up', sub: 'vs previous 30 days', icon: Activity },
      { label: 'Resolved within SLA', value: '90%', delta: '+2%', trend: 'up', sub: 'target 90%', icon: ShieldCheck },
      { label: 'First response time', value: '48m', delta: '-4m', trend: 'up', sub: 'median', icon: Clock },
      { label: 'Mean time to resolve', value: '7h 04m', delta: '-8%', trend: 'up', sub: 'MTTR', icon: Gauge },
      { label: 'CSAT score', value: '4.5/5', delta: '+0.1', trend: 'up', sub: 'last 310 surveys', icon: TrendingUp },
      { label: 'Reopen rate', value: '3.8%', delta: '-0.4%', trend: 'up', sub: 'goal < 5%', icon: Layers },
    ],
    volumeTrend: [
      { label: 'Wk 1', value: 208 },
      { label: 'Wk 2', value: 221 },
      { label: 'Wk 3', value: 236 },
      { label: 'Wk 4', value: 237 },
    ],
    channelMix: [
      { label: 'Email', value: 44 },
      { label: 'Portal', value: 29 },
      { label: 'Phone', value: 16 },
      { label: 'Walk-up', value: 11 },
    ],
    categoryMix: [
      { label: 'Network', value: 19 },
      { label: 'Hardware', value: 16 },
      { label: 'Account / Access', value: 15 },
      { label: 'Email', value: 12 },
      { label: 'Facilities', value: 11 },
      { label: 'Software', value: 10 },
      { label: 'Other', value: 17 },
    ],
    priorityMix: [
      { label: 'Critical', value: 5 },
      { label: 'High', value: 20 },
      { label: 'Medium', value: 45 },
      { label: 'Low', value: 30 },
    ],
    slaByPriority: [
      { label: 'Critical', value: 89 },
      { label: 'High', value: 92 },
      { label: 'Medium', value: 88 },
      { label: 'Low', value: 95 },
    ],
    backlogAging: [
      { label: '0-1 days', value: 52 },
      { label: '2-3 days', value: 26 },
      { label: '4-7 days', value: 14 },
      { label: '8-14 days', value: 6 },
      { label: '15+ days', value: 2 },
    ],
    teamPerformance: [
      { name: 'Paul Antic', assigned: 146, resolved: 132, firstResponse: '39m', sla: 93, reopen: 5 },
      { name: 'Geoffrey Heller', assigned: 131, resolved: 118, firstResponse: '44m', sla: 92, reopen: 4 },
      { name: 'Melvin Paneto', assigned: 118, resolved: 101, firstResponse: '55m', sla: 88, reopen: 6 },
      { name: 'Miles Grater', assigned: 97, resolved: 84, firstResponse: '1h 07m', sla: 86, reopen: 7 },
      { name: 'David Meek', assigned: 78, resolved: 71, firstResponse: '41m', sla: 91, reopen: 3 },
    ],
    topRequesters: [
      { name: 'HCBS Finance', count: 62 },
      { name: 'Resource Center', count: 48 },
      { name: 'HCBS AmeriHealth', count: 44 },
      { name: 'UDS Foundation', count: 36 },
    ],
    csatTrend: [
      { label: 'Wk 1', value: 4.3 },
      { label: 'Wk 2', value: 4.4 },
      { label: 'Wk 3', value: 4.5 },
      { label: 'Wk 4', value: 4.5 },
    ],
    changeSuccess: [
      { label: 'Successful', value: 91 },
      { label: 'With issues', value: 7 },
      { label: 'Failed', value: 2 },
    ],
  },
  'Quarter to date': {
    kpis: [
      { label: 'New tickets', value: '2,482', delta: '+4%', trend: 'up', sub: 'vs previous quarter', icon: Activity },
      { label: 'Resolved within SLA', value: '89%', delta: '+1%', trend: 'up', sub: 'target 90%', icon: ShieldCheck },
      { label: 'First response time', value: '51m', delta: '-3m', trend: 'up', sub: 'median', icon: Clock },
      { label: 'Mean time to resolve', value: '7h 42m', delta: '-6%', trend: 'up', sub: 'MTTR', icon: Gauge },
      { label: 'CSAT score', value: '4.4/5', delta: '+0.1', trend: 'up', sub: 'last 980 surveys', icon: TrendingUp },
      { label: 'Reopen rate', value: '4.1%', delta: '-0.3%', trend: 'up', sub: 'goal < 5%', icon: Layers },
    ],
    volumeTrend: [
      { label: 'Apr', value: 788 },
      { label: 'May', value: 823 },
      { label: 'Jun', value: 871 },
    ],
    channelMix: [
      { label: 'Email', value: 45 },
      { label: 'Portal', value: 28 },
      { label: 'Phone', value: 16 },
      { label: 'Walk-up', value: 11 },
    ],
    categoryMix: [
      { label: 'Network', value: 20 },
      { label: 'Hardware', value: 15 },
      { label: 'Account / Access', value: 15 },
      { label: 'Email', value: 13 },
      { label: 'Facilities', value: 10 },
      { label: 'Software', value: 9 },
      { label: 'Other', value: 18 },
    ],
    priorityMix: [
      { label: 'Critical', value: 4 },
      { label: 'High', value: 21 },
      { label: 'Medium', value: 47 },
      { label: 'Low', value: 28 },
    ],
    slaByPriority: [
      { label: 'Critical', value: 88 },
      { label: 'High', value: 91 },
      { label: 'Medium', value: 87 },
      { label: 'Low', value: 95 },
    ],
    backlogAging: [
      { label: '0-1 days', value: 49 },
      { label: '2-3 days', value: 27 },
      { label: '4-7 days', value: 15 },
      { label: '8-14 days', value: 6 },
      { label: '15+ days', value: 3 },
    ],
    teamPerformance: [
      { name: 'Paul Antic', assigned: 404, resolved: 368, firstResponse: '41m', sla: 92, reopen: 12 },
      { name: 'Geoffrey Heller', assigned: 376, resolved: 340, firstResponse: '46m', sla: 91, reopen: 11 },
      { name: 'Melvin Paneto', assigned: 342, resolved: 298, firstResponse: '57m', sla: 87, reopen: 14 },
      { name: 'Miles Grater', assigned: 291, resolved: 255, firstResponse: '1h 09m', sla: 85, reopen: 16 },
      { name: 'David Meek', assigned: 228, resolved: 205, firstResponse: '44m', sla: 90, reopen: 8 },
    ],
    topRequesters: [
      { name: 'HCBS Finance', count: 162 },
      { name: 'Resource Center', count: 131 },
      { name: 'HCBS AmeriHealth', count: 118 },
      { name: 'UDS Foundation', count: 102 },
    ],
    csatTrend: [
      { label: 'Apr', value: 4.3 },
      { label: 'May', value: 4.4 },
      { label: 'Jun', value: 4.4 },
    ],
    changeSuccess: [
      { label: 'Successful', value: 90 },
      { label: 'With issues', value: 8 },
      { label: 'Failed', value: 2 },
    ],
  },
};

const serviceCatalog = [
  { id: 'CAT-101', name: 'New employee onboarding', type: 'Workflow', eta: '3 days', approval: 'Manager approval' },
  { id: 'CAT-203', name: 'VPN access request', type: 'Access', eta: '1 day', approval: 'Security review' },
  { id: 'CAT-312', name: 'Laptop replacement', type: 'Hardware', eta: '5 days', approval: 'IT approval' },
  { id: 'CAT-404', name: 'Software Install', type: 'Software', eta: '2 days', approval: 'Cost center' },
];

const knowledgeArticlesSeed = [
  {
    id: 'KB-102',
    title: 'Form Tracker user and participant management',
    category: 'Applications',
    updated: 'Oct 8',
    views: 412,
    summary: 'Create staff and participants, assign caseloads, and manage forms safely.',
    audience: 'HCBS staff, IT support',
    steps: [
      'Open https://formtracker.udservices.org/users/login and sign in.',
      'To create staff: Staff tab > Create New Staff, complete fields, username matches network account, Save.',
      'To create admin users: Admin tab > Create New User, leave password blank, Active checked, Create.',
      'Set role: SC = Staff, SC II = Supervisor, Program Specialist = Manager, IT/Admin = Admin.',
      'To add participants: Participants tab > Create New Participant, enter known details, Save.',
      'Assign participant to staff: Participants > search > open participant > Staff (left) > Assign New Staff.',
      'Choose staff, set Start Date, mark Primary if needed, Save.',
      'Remove forms: Participants > open participant > click trash icon next to form (archived, not deleted).',
    ],
    notes: [
      'If a participant is still listed under the wrong SC, open Staff and change Primary from Yes to No.',
      'Form Tracker changes are archived and can be recovered if needed.',
    ],
  },
  {
    id: 'KB-108',
    title: 'Form Tracker audit access (QMET accounts)',
    category: 'Compliance',
    updated: 'Oct 6',
    views: 176,
    summary: 'Grant and remove QMET audit access by assigning participants to QMET accounts.',
    audience: 'Program Specialists, IT support',
    steps: [
      'Log in to Form Tracker and open the participant record.',
      'Click Staff on the left and select Add Staff.',
      'Add qmet1-qmet5 as needed, set as Primary, and choose the date.',
      'Repeat for each participant that needs audit access.',
      'After the audit, open each QMET account in Staff, uncheck Primary, and add end date.',
      'Repeat cleanup for all participants and QMET accounts.',
    ],
    notes: ['QMET accounts share the same password listed in IT documentation.'],
  },
  {
    id: 'KB-114',
    title: 'MFA setup for eLTSS using WinAuth',
    category: 'Security',
    updated: 'Oct 3',
    views: 389,
    summary: 'Enroll WinAuth for TOTP MFA on the AmeriHealth eLTSS portal.',
    audience: 'External users, IT support',
    steps: [
      'Open the account confirmation email and select the Setup TOTP Authentication link.',
      'Launch WinAuth and click Add > Authenticator.',
      'Name it "AmeriHealth Caritas eLTSS".',
      'Copy the manual setup code from the email and paste into WinAuth.',
      'Click Verify Authenticator to generate the six-digit code.',
      'Enter the six-digit code into the setup page and submit.',
      'If prompted, skip setting a WinAuth password (recommended for now).',
      'Log in to https://amerihealth-pennsylvania.eltss.org and enter the MFA code.',
    ],
    notes: ['If setup link expires after 7 days, request a new confirmation email.'],
  },
  {
    id: 'KB-121',
    title: 'Email encryption and EncryptScan basics',
    category: 'Email',
    updated: 'Sep 30',
    views: 268,
    summary: 'Encrypt outbound email and use EncryptScan on mobile when needed.',
    audience: 'All staff',
    steps: [
      'In Outlook, add the word "encrypt" in the email subject line.',
      'Attach the file or message content and confirm the recipient address.',
      'Send the email; encryption is applied automatically.',
      'For mobile scans, open EncryptScan and follow the iOS/Android guide.',
      'Verify the recipient can open the secure message.',
    ],
  },
  {
    id: 'KB-127',
    title: 'Outlook iOS: update login info',
    category: 'Mobile',
    updated: 'Sep 28',
    views: 205,
    summary: 'Refresh Outlook iOS credentials after a password change.',
    audience: 'All staff',
    steps: [
      'Open Outlook on iOS and tap the profile icon.',
      'Tap the account and choose Re-enter Password.',
      'Enter the updated password and complete MFA if prompted.',
      'Return to Inbox and verify mail syncs.',
    ],
  },
  {
    id: 'KB-131',
    title: 'New hire onboarding checklist',
    category: 'Onboarding',
    updated: 'Sep 24',
    views: 322,
    summary: 'Walkthrough for laptop setup, VPN access, RDP, and required apps.',
    audience: 'IT support',
    steps: [
      'Verify laptop, charger, and mouse; review device care.',
      'Connect to Guest WiFi and open Cisco AnyConnect.',
      'Confirm VPN server is vpn.udservices.org and sign in.',
      'Open Remote Desktop and connect to assigned UDSTS server.',
      'If login error, confirm domain is set to UCP.',
      'Open Outlook and Jabber; verify login and screen share basics.',
      'Set email signature and confirm "encrypt" works.',
      'Review email fraud awareness and correct domains.',
      'Show how to log out of the server.',
      'Provide IT contact: ithelpdesk@udservices.org or 717-397-1841.',
    ],
  },
  {
    id: 'KB-137',
    title: 'AnyConnect VPN and remote desktop setup',
    category: 'Network',
    updated: 'Sep 20',
    views: 291,
    summary: 'Steps to connect to VPN and log in to the UDS terminal server.',
    audience: 'All staff',
    steps: [
      'Open Cisco AnyConnect and enter vpn.udservices.org.',
      'Sign in with network credentials.',
      'Open Remote Desktop and connect to your UDSTS server.',
      'If login fails, confirm the domain is set to UCP and try again.',
    ],
  },
  {
    id: 'KB-144',
    title: 'Call forwarding to cell (Cisco portal)',
    category: 'Telecom',
    updated: 'Sep 18',
    views: 144,
    summary: 'Forward office calls to a cell phone through the Cisco web portal.',
    audience: 'IT support',
    steps: [
      'From a terminal server session, open http://192.168.32.3/Web/Common/HomePage.do.',
      'Log in with Cisco credentials provided by IT.',
      'Click Configure > Phone.',
      'Select Line 1 and enter 9 + the cell number in the "all" field.',
      'Click Change to save and close the dialog.',
      'Log out in the top right corner.',
    ],
  },
  {
    id: 'KB-151',
    title: 'Connected Sign: upload images, web, and video',
    category: 'Digital Signage',
    updated: 'Sep 14',
    views: 98,
    summary: 'Upload media and URLs to the Connected Sign portal.',
    audience: 'Facilities, IT support',
    steps: [
      'Log in to http://cscloud.connectedsign.com/digitalsignage/WebUI/Login#no-back-button.',
      'For images: Media & Templates > Images, right-click > Add > Media, upload files.',
      'For videos: Media & Templates > Videos, right-click > Add > Media, upload files.',
      'For websites: Media & Templates > Web Page, right-click > Add > URL, paste URL and set duration.',
      'Create or update a playlist and publish the playlist.',
    ],
  },
  {
    id: 'KB-158',
    title: 'New printer setup and meter readings',
    category: 'Printing',
    updated: 'Sep 10',
    views: 132,
    summary: 'Set up network printers and capture copier meter readings.',
    audience: 'IT support',
    steps: [
      'Document make/model/serial in the Hardware Inventory sheet.',
      'Assign an available IP and record it in inventory.',
      'Install driver on all company servers and note printer share name.',
      'Create AD printer group matching the share name.',
      'Add a matching VBS script in \\\\UDSDC01\\netlogon\\TSPrinters and update TerminalServerLogon.kix.',
      'Test print from the target location.',
      'For meter readings, log into printer IPs and capture counters.',
    ],
  },
  {
    id: 'KB-166',
    title: 'Barracuda file restore workflow',
    category: 'Backup',
    updated: 'Sep 8',
    views: 119,
    summary: 'Restore files from Barracuda via UDSFS01.',
    audience: 'IT support',
    steps: [
      'RDP to UDSFS01 and open Internet Explorer.',
      'Navigate to 192.168.10.36 and log in with Barracuda credentials.',
      'Open Restore tab and select Restore Browser.',
      'Browse to UDSFS01 > Backup Agent > File Systems > D: > Company Data.',
      'Select the file or folder; adjust backup date if needed.',
      'Restore to original location (preferred) or C:\\ as required.',
    ],
  },
  {
    id: 'KB-173',
    title: 'OpenDNS allow/block list updates',
    category: 'Web Filter',
    updated: 'Sep 5',
    views: 87,
    summary: 'Add domains to allow or block lists in OpenDNS.',
    audience: 'IT support',
    steps: [
      'Log in to https://www.opendns.com/.',
      'Go to Policies > Destination Lists.',
      'Select UDS Allow List to whitelist or UDS Black List to block.',
      'Add the domain and save changes.',
      'Confirm the policy applies to the correct network.',
    ],
  },
  {
    id: 'KB-179',
    title: 'Yarnell door access: add users and fobs',
    category: 'Access Control',
    updated: 'Sep 2',
    views: 73,
    summary: 'Create door access users for Erin Court or Corporate Blvd.',
    audience: 'IT support, Facilities',
    steps: [
      'Log in at https://www.virtualkeypad.com/systems/162773.',
      'Switch to the correct system (Erin Court or Corporate Blvd).',
      'Click Users > Users + to add a user.',
      'Erin Court: First Name = Fob# - Firstname; Last Name = Lastname; Profile = STAFF.',
      'Corporate Blvd: First Name = Lastname, Firstname; Last Name = 7-digit fob code.',
      'Type should be Code; enter the 5-digit fob code.',
      'Save and document access details in the UP Spreadsheet.',
    ],
  },
];

const KNOWLEDGE_CATEGORY_STYLES = {
  Applications: { background: '#e0f2fe', color: '#075985', borderColor: '#7dd3fc' },
  Compliance: { background: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' },
  Security: { background: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' },
  Email: { background: '#dcfce7', color: '#166534', borderColor: '#86efac' },
  Mobile: { background: '#cffafe', color: '#0e7490', borderColor: '#67e8f9' },
  Onboarding: { background: '#ffedd5', color: '#9a3412', borderColor: '#fdba74' },
  Network: { background: '#dbeafe', color: '#1d4ed8', borderColor: '#93c5fd' },
  Telecom: { background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' },
  'Digital Signage': { background: '#ecfccb', color: '#365314', borderColor: '#bef264' },
  Printing: { background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' },
  Backup: { background: '#fef9c3', color: '#854d0e', borderColor: '#fde047' },
  'Web Filter': { background: '#f8fafc', color: '#475569', borderColor: '#cbd5e1' },
  'Access Control': { background: '#ccfbf1', color: '#115e59', borderColor: '#5eead4' },
  General: { background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' },
};

const getKnowledgeCategoryStyle = (category) => KNOWLEDGE_CATEGORY_STYLES[category] || KNOWLEDGE_CATEGORY_STYLES.General;

const CATALOG_SUGGESTIONS = {
  'CAT-101': ['KB-112', 'KB-179'],
  'CAT-203': ['KB-106', 'KB-140'],
  'CAT-312': ['KB-118', 'KB-140'],
  'CAT-404': ['KB-112', 'KB-140'],
};

const getSuggestedArticles = (catalogId, articles) => {
  const ids = CATALOG_SUGGESTIONS[catalogId] || [];
  const mapped = ids
    .map((id) => articles.find((article) => article.id === id))
    .filter(Boolean);
  if (mapped.length) return mapped;
  return articles.slice(0, 3);
};

const problemRecords = [
  {
    id: 'PRB-19',
    title: 'Recurring VPN disconnects',
    status: 'Root cause analysis',
    impact: 'Multiple teams',
    linked: 6,
    owner: 'Erik Lofgren',
    rootCause: 'VPN gateway firmware regression causing session resets.',
    workaround: 'Pin users to secondary gateway.',
    fixPlan: 'Patch firmware in next maintenance window.',
  },
  {
    id: 'PRB-22',
    title: 'Email delays with vendor relay',
    status: 'Known error',
    impact: 'Org-wide',
    linked: 3,
    owner: 'Geoffrey Heller',
    rootCause: 'Throttling on third-party relay.',
    workaround: 'Failover relay for high priority domains.',
    fixPlan: 'Negotiate new relay limits.',
  },
  {
    id: 'PRB-25',
    title: 'Print server spooler crash',
    status: 'Workaround',
    impact: 'Single site',
    linked: 4,
    owner: 'Miles Grater',
    rootCause: 'Driver conflict after Windows update.',
    workaround: 'Rollback to previous driver package.',
    fixPlan: 'Standardize driver set across sites.',
  },
];
const PROBLEM_STATUS_OPTIONS = ['Investigation', 'Root cause analysis', 'Known error', 'Workaround', 'Resolved'];

const releaseRecords = [
  { id: 'REL-12', title: 'Q4 Windows patch bundle', status: 'Scheduled', window: 'Oct 10', owner: 'Change Mgmt' },
  { id: 'REL-13', title: 'Teams client feature update', status: 'In Progress', window: 'Sep 28', owner: 'Unified Comms' },
  { id: 'REL-14', title: 'Firewall policy baseline', status: 'Planned', window: 'Nov 2', owner: 'Security' },
];
const RELEASE_STATUS_OPTIONS = ['Planned', 'Scheduled', 'In Progress', 'Completed', 'Canceled'];

const projectRecords = [
  {
    id: 'PRJ-8',
    title: 'Remote worker hardening',
    status: 'On track',
    owner: 'Erik Lofgren',
    progress: 60,
    summary: 'Baseline endpoint hardening and conditional access policies for remote staff.',
    targetDate: 'Oct 18',
    team: 'Security + End User Computing',
    nextMilestone: 'Conditional access pilot complete',
    tasks: [
      { id: 'PRJ-8-1', title: 'Inventory device posture policies', done: true },
      { id: 'PRJ-8-2', title: 'Pilot conditional access for VPN', done: true },
      { id: 'PRJ-8-3', title: 'Enable MFA session controls', done: false },
      { id: 'PRJ-8-4', title: 'Publish remote work checklist', done: false },
      { id: 'PRJ-8-5', title: 'Enable disk encryption reporting', done: true },
    ],
  },
  {
    id: 'PRJ-11',
    title: 'Asset lifecycle refresh',
    status: 'At risk',
    owner: 'Paul Antic',
    progress: 40,
    summary: 'Replace aging laptops and standardize peripherals across field teams.',
    targetDate: 'Nov 8',
    team: 'IT Operations',
    nextMilestone: 'Wave 2 purchase order',
    tasks: [
      { id: 'PRJ-11-1', title: 'Compile aging inventory list', done: true },
      { id: 'PRJ-11-2', title: 'Finalize hardware standards', done: false },
      { id: 'PRJ-11-3', title: 'Approve refresh budget', done: false },
      { id: 'PRJ-11-4', title: 'Coordinate swap clinics', done: false },
      { id: 'PRJ-11-5', title: 'Stage new docking stations', done: true },
    ],
  },
  {
    id: 'PRJ-14',
    title: 'Service catalog expansion',
    status: 'On track',
    owner: 'Geoffrey Heller',
    progress: 71,
    summary: 'Expand self-service requests to cover software, access, and onboarding needs.',
    targetDate: 'Sep 30',
    team: 'IT Service Management',
    nextMilestone: 'Publish new catalog categories',
    tasks: [
      { id: 'PRJ-14-1', title: 'Define new request categories', done: true },
      { id: 'PRJ-14-2', title: 'Draft approval workflows', done: true },
      { id: 'PRJ-14-3', title: 'Review SLAs with stakeholders', done: true },
      { id: 'PRJ-14-4', title: 'Update request intake forms', done: true },
      { id: 'PRJ-14-5', title: 'Pilot with HR onboarding', done: true },
      { id: 'PRJ-14-6', title: 'Train service desk staff', done: false },
      { id: 'PRJ-14-7', title: 'Launch catalog update', done: false },
    ],
  },
];
const PROJECT_STATUS_OPTIONS = ['Planned', 'On track', 'At risk', 'In Progress', 'Blocked', 'Completed'];

const assetInventory = [
  { id: 'AST-1102', name: 'Dell Latitude 7420', user: 'Prem Acharya', status: 'In use', location: 'HQ' },
  { id: 'AST-1184', name: 'MacBook Pro 14', user: 'Nina Patel', status: 'In use', location: 'Remote' },
  { id: 'AST-1209', name: 'HP LaserJet M507', user: 'Facilities', status: 'Needs service', location: '3rd Floor' },
  { id: 'AST-1310', name: 'Surface Laptop 5', user: 'Open stock', status: 'In stock', location: 'IT Storage' },
];

const cmdbItems = [
  {
    id: 'CI-402',
    name: 'Exchange Online',
    type: 'Cloud service',
    status: 'Operational',
    owner: 'Messaging',
    environment: 'Production',
    criticality: 'High',
    location: 'Microsoft 365',
    serviceTier: 'Tier 1',
    supportWindow: '24x7',
    lastAudit: 'Aug 28',
    description: 'Primary email and calendar platform for all staff accounts.',
    documentation: 'https://learn.microsoft.com/microsoft-365/enterprise/',
    dependencies: ['Entra ID', 'Azure AD Connect', 'Defender for Office 365'],
    tasks: [
      { id: 'CI-402-1', title: 'Review transport rules and alerts', done: true },
      { id: 'CI-402-2', title: 'Validate MFA policy coverage', done: false },
      { id: 'CI-402-3', title: 'Confirm spam filter tuning', done: true },
    ],
  },
  {
    id: 'CI-418',
    name: 'VPN Gateway - East',
    type: 'Network appliance',
    status: 'Degraded',
    owner: 'Network',
    environment: 'Production',
    criticality: 'High',
    location: 'Ashburn DC',
    serviceTier: 'Tier 1',
    supportWindow: '24x7',
    lastAudit: 'Aug 22',
    description: 'Primary remote access gateway for East region users.',
    documentation: 'https://intranet/it/network/vpn-gateway',
    dependencies: ['MFA', 'ISP - Carrier 1', 'Firewall Cluster'],
    tasks: [
      { id: 'CI-418-1', title: 'Check tunnel latency and packet loss', done: true },
      { id: 'CI-418-2', title: 'Rotate shared secrets', done: false },
      { id: 'CI-418-3', title: 'Apply firmware hotfix', done: false },
    ],
  },
  {
    id: 'CI-431',
    name: 'File Server FS-02',
    type: 'Server',
    status: 'Operational',
    owner: 'Infrastructure',
    environment: 'Production',
    criticality: 'Medium',
    location: 'HQ Data Center',
    serviceTier: 'Tier 2',
    supportWindow: 'Business hours',
    lastAudit: 'Aug 15',
    description: 'Department file shares and archival storage.',
    documentation: 'https://intranet/it/storage/fs-02',
    dependencies: ['Backup Vault', 'AD DS', 'VMware Cluster'],
    tasks: [
      { id: 'CI-431-1', title: 'Verify backup success', done: true },
      { id: 'CI-431-2', title: 'Review disk capacity alerts', done: true },
      { id: 'CI-431-3', title: 'Test file restore sample', done: false },
    ],
  },
  {
    id: 'CI-447',
    name: 'Print Server PS-01',
    type: 'Server',
    status: 'Investigating',
    owner: 'Workplace',
    environment: 'Production',
    criticality: 'Low',
    location: 'HQ Data Center',
    serviceTier: 'Tier 3',
    supportWindow: 'Business hours',
    lastAudit: 'Aug 10',
    description: 'Centralized print queue and driver management.',
    documentation: 'https://intranet/it/workplace/print-server',
    dependencies: ['AD DS', 'Print Fleet'],
    tasks: [
      { id: 'CI-447-1', title: 'Clear stalled queue jobs', done: true },
      { id: 'CI-447-2', title: 'Restart print spooler service', done: true },
      { id: 'CI-447-3', title: 'Validate driver update policy', done: false },
    ],
  },
];
const CMDB_STATUS_OPTIONS = ['Operational', 'Degraded', 'Investigating', 'Maintenance', 'Retired'];

const csatSurveys = [
  { id: 'CSAT-09', title: 'Ticket closure survey', status: 'Active', responses: 84, score: '4.6/5' },
  { id: 'CSAT-11', title: 'Hardware delivery feedback', status: 'Active', responses: 41, score: '4.4/5' },
  { id: 'CSAT-12', title: 'New hire onboarding survey', status: 'Draft', responses: 0, score: '-' },
];

 

const ReportKpiCard = ({ item }) => {
  const Icon = item.icon;
  const trendClass = item.trend === 'down' ? 'trend down' : 'trend up';
  const trendArrow = item.trend === 'down' ? '▼' : '▲';
  return (
    <div className="report-kpi">
      <div className="report-kpi-icon">
        <Icon size={18} />
      </div>
      <div className="report-kpi-body">
        <div className="report-kpi-label">{item.label}</div>
        <div className="report-kpi-value">{item.value}</div>
        <div className="report-kpi-sub">{item.sub}</div>
      </div>
      <div className={trendClass}>
        <span>{trendArrow}</span>
        <span>{item.delta}</span>
      </div>
    </div>
  );
};

const ReportBarList = ({ title, items, valueSuffix = '%', hint, icon: Icon }) => {
  const max = Math.max(...items.map((item) => item.value));
  return (
    <div className="report-card">
      <div className="report-card-header">
        <div>
          <h3>{title}</h3>
          {hint && <p>{hint}</p>}
        </div>
        {Icon && (
          <span className="report-card-icon">
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="report-bars">
        {items.map((item) => (
          <div key={item.label} className="report-bar-row">
            <div className="report-bar-label">
              <span>{item.label}</span>
              <span className="report-bar-value">
                {item.value}
                {valueSuffix}
              </span>
            </div>
            <div className="report-bar-track">
              <span className="report-bar-fill" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TrendBars = ({ title, items, hint, icon: Icon }) => {
  const max = Math.max(...items.map((item) => item.value));
  return (
    <div className="report-card">
      <div className="report-card-header">
        <div>
          <h3>{title}</h3>
          {hint && <p>{hint}</p>}
        </div>
        {Icon && (
          <span className="report-card-icon">
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="trend-bars">
        {items.map((item) => (
          <div key={item.label} className="trend-bar">
            <span className="trend-bar-fill" style={{ height: `${(item.value / max) * 100}%` }} />
            <span className="trend-bar-value">{item.value}</span>
            <span className="trend-bar-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const NavItem = ({ item, isActive, onClick }) => {
  const Icon = item.icon;
  if (item.href) {
    return (
      <a className="nav-item" href={item.href}>
        <Icon size={18} />
        <span>{item.label}</span>
      </a>
    );
  }
  return (
    <button className={`nav-item${isActive ? ' active' : ''}`} type="button" onClick={() => onClick(item.targetId)}>
      <Icon size={18} />
      <span>{item.label}</span>
    </button>
  );
};

const MetricCard = ({ item, style }) => {
  const Icon = item.icon;
  const content = (
    <>
      <span className="metric-icon">
        <Icon size={18} />
      </span>
      <div>
        <div className="metric-value">{item.value}</div>
        <div className="metric-label">{item.label}</div>
        <div className="metric-sub">{item.sub}</div>
      </div>
    </>
  );
  if (item.onClick) {
    return (
      <button
        className="card metric-card reveal metric-action"
        style={style}
        type="button"
        onClick={item.onClick}
        aria-label={item.ariaLabel || `View ${item.label}`}
      >
        {content}
      </button>
    );
  }
  return (
    <div className="card metric-card reveal" style={style}>
      {content}
    </div>
  );
};

const WorkItem = ({ item, onOpen }) => (
  <div className="work-item" onDoubleClick={() => (onOpen ? onOpen(item.id) : null)}>
    <div>
      <div className="list-inline">
        <InlineTag>{item.type}</InlineTag>
        <InlineTag className="mono">{item.id}</InlineTag>
        <span className={`priority-tag ${toKebabCase(item.priority)}`}>{item.priority}</span>
      </div>
      <p className="work-title">{item.title}</p>
      <p className="work-meta">
        {item.requester} - {item.assignee || 'Unassigned'}
      </p>
    </div>
    <div className="work-side">
      <span className={`status-pill status-${toKebabCase(item.status)}`}>{item.status}</span>
      <span className="work-time">{item.due}</span>
    </div>
    <button className="btn btn-ghost btn-small" type="button" onClick={() => (onOpen ? onOpen(item.id) : null)}>
      Open
    </button>
  </div>
);

const ApprovalRow = ({ item, onDecision }) => {
  const isPending = item.status === 'Pending';
  return (
    <div className="approval-row">
      <div>
        <div className="list-inline">
          <InlineTag>{item.type}</InlineTag>
          <InlineTag className="mono">{item.id}</InlineTag>
          <span className={`status-pill status-${toKebabCase(item.status)}`}>{item.status}</span>
        </div>
        <p className="work-title">{item.title}</p>
        <p className="work-meta">
          {item.requester}
          {item.ticketId ? ` · ${item.ticketId}` : ''}
        </p>
        {(item.approver || item.due) && (
          <p className="work-meta">
            {item.approver ? `Approver: ${item.approver}` : ''}
            {item.approver && item.due ? ' · ' : ''}
            {item.due ? `Due: ${item.due}` : ''}
          </p>
        )}
      </div>
      <div className="approval-actions">
        <button className="btn btn-primary btn-small" type="button" disabled={!isPending} onClick={() => onDecision(item.id, 'Approved')}>
          Approve
        </button>
        <button className="btn btn-ghost btn-small" type="button" disabled={!isPending} onClick={() => onDecision(item.id, 'Denied')}>
          Deny
        </button>
      </div>
    </div>
  );
};

const WizardSteps = ({ steps, currentStep }) => (
  <div className="wizard-steps">
    {steps.map((step, index) => {
      const stateClass = index === currentStep ? ' active' : index < currentStep ? ' complete' : '';
      return (
        <div key={step} className={`wizard-step${stateClass}`}>
          <span className="wizard-step-index">{index + 1}</span>
          <span className="wizard-step-label">{step}</span>
        </div>
      );
    })}
  </div>
);

const TicketRow = ({ item, isActive, onSelect, onOpen }) => (
  <button
    className={`ticket-row${isActive ? ' active' : ''}`}
    type="button"
    onClick={() => onSelect(item.id)}
    onDoubleClick={() => (onOpen ? onOpen(item.id) : onSelect(item.id))}
  >
    <div>
      <div className="list-inline">
        <InlineTag>{item.type}</InlineTag>
        <InlineTag className="mono">{item.id}</InlineTag>
        <span className={`priority-tag ${toKebabCase(item.priority)}`}>{item.priority}</span>
        <span className={`status-pill status-${toKebabCase(item.status)}`}>{item.status}</span>
      </div>
      <p className="work-title">{item.title}</p>
      <p className="work-meta">
        {item.requester} - {item.assignee || 'Unassigned'}
      </p>
    </div>
    <div className="ticket-side">
      <span className="work-time">Created {formatTicketCreated(item)}</span>
    </div>
  </button>
);

const TicketPreviewCard = ({ ticket, onOpen, title = 'Ticket preview', compact = false }) => (
  <div className={`ticket-preview-card${compact ? ' compact' : ''}`}>
    <div className="section-title">{title}</div>
    {ticket ? (
      <>
        <div className="ticket-preview-head">
          <div className="list-inline">
            <InlineTag>{ticket.type}</InlineTag>
            <InlineTag className="mono">{ticket.id}</InlineTag>
            <span className={`priority-tag ${toKebabCase(ticket.priority)}`}>{ticket.priority}</span>
            <span className={`status-pill status-${toKebabCase(ticket.status)}`}>{ticket.status}</span>
          </div>
          <div className="preview-meta">
            <span>Created {formatTicketCreated(ticket)}</span>
            <span>Assignee: {ticket.assignee}</span>
          </div>
        </div>
        <h3 className="ticket-title">{ticket.title}</h3>
        <p className="work-meta">
          {ticket.requester} - {ticket.requesterEmail}
        </p>
        <p className="preview-description">{getTicketSummary(ticket) || 'No description provided yet.'}</p>
        <div className="preview-grid">
          <div>
            <div className="detail-label">Impact</div>
            <div className="detail-value">{ticket.impact}</div>
          </div>
          <div>
            <div className="detail-label">Urgency</div>
            <div className="detail-value">{ticket.urgency}</div>
          </div>
          <div>
            <div className="detail-label">Device</div>
            <div className="detail-value">{ticket.device}</div>
          </div>
          <div>
            <div className="detail-label">Updates</div>
            <div className="detail-value">{ticket.entries?.length || 0} notes</div>
          </div>
        </div>
        <div className="ticket-preview-actions">
          <button className="btn btn-primary" type="button" onClick={() => onOpen(ticket.id)}>
            View full workspace
          </button>
          <span className="preview-footnote">Opens the dedicated ticket page with SLAs, assets, and updates.</span>
        </div>
      </>
    ) : (
      <div className="empty-state">
        <p>No tickets available.</p>
      </div>
    )}
  </div>
);


const AnnouncementCard = ({ item, onEdit, onRemove, isReadOnly }) => (
  <div className="announcement-card">
    <div className="list-inline">
      <InlineTag>{item.tag || 'General'}</InlineTag>
      <span className="timestamp">{item.date || ''}</span>
      {!isReadOnly && (onEdit || onRemove) && (
        <div className="list-inline" style={{ marginLeft: 'auto' }}>
          {onEdit && (
            <button className="btn btn-ghost btn-small" type="button" onClick={() => onEdit(item)}>
              Edit
            </button>
          )}
          {onRemove && (
            <button className="btn btn-ghost btn-small" type="button" onClick={() => onRemove(item.id)}>
              Remove
            </button>
          )}
        </div>
      )}
    </div>
    <p className="announcement-title">{item.title}</p>
    <p className="announcement-body">{item.body}</p>
  </div>
);

const ChangeRow = ({ item }) => (
  <div className="change-row">
    <div>
      <div className="list-inline">
        <InlineTag>{item.area}</InlineTag>
        <span className={`status-pill status-${toKebabCase(item.status)}`}>{item.status}</span>
      </div>
      <p className="work-title">{item.title}</p>
      <p className="work-meta">{item.window}</p>
    </div>
    <button className="btn btn-ghost btn-small" type="button">
      Details
    </button>
  </div>
);

const PaginationControls = ({ page, pageSize, total, onPageChange, isLoading }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;
  return (
    <div className="pagination">
      <button className="btn btn-ghost btn-small" type="button" disabled={!canPrev || isLoading} onClick={() => onPageChange(page - 1)}>
        Previous
      </button>
      <span className="pagination-meta">
        Page {page + 1} of {totalPages}
      </span>
      <button className="btn btn-ghost btn-small" type="button" disabled={!canNext || isLoading} onClick={() => onPageChange(page + 1)}>
        Next
      </button>
    </div>
  );
};

const buildAssetList = (record) => {
  if (!record) return [];
  const fields = [
    { label: 'Computer', value: record.computer },
    { label: 'Mobile', value: record.mobilePhone },
    { label: 'Key fob', value: record.keyFob },
    { label: 'Printer', value: record.printer },
    { label: 'Monitor', value: record.monitor },
    { label: 'Dock', value: record.dock },
  ];
  return fields.filter((item) => item.value);
};

const getProjectTasks = (project) => (Array.isArray(project?.tasks) ? project.tasks : []);

const getProjectProgress = (project) => {
  const tasks = getProjectTasks(project);
  if (!tasks.length) return project.progress || 0;
  const completed = tasks.filter((task) => task.done).length;
  return Math.round((completed / tasks.length) * 100);
};

const EMPLOYEE_PHOTO_BASE = `${process.env.PUBLIC_URL || ''}/employee-pictures`;

const normalizeEmployeeKey = (value) => (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const buildEmployeeDisplayName = (record) => {
  if (!record) return '';
  const first = (record.firstName || '').trim();
  const last = (record.lastName || '').trim();
  return [first, last].filter(Boolean).join(' ').trim();
};

const buildEmployeePhotoLookup = (files) => {
  const orderedFiles = [...files].sort((a, b) => {
    const aBase = a.replace(/\.[^.]+$/, '');
    const bBase = b.replace(/\.[^.]+$/, '');
    const aScore = /\(\d+\)$/.test(aBase) || /\d$/.test(aBase) ? 1 : 0;
    const bScore = /\(\d+\)$/.test(bBase) || /\d$/.test(bBase) ? 1 : 0;
    if (aScore !== bScore) return aScore - bScore;
    return aBase.localeCompare(bBase);
  });
  const map = new Map();
  orderedFiles.forEach((file) => {
    const baseName = file.replace(/\.[^.]+$/, '');
    const candidates = [
      baseName,
      baseName.replace(/\s*\(\d+\)\s*$/, ''),
      baseName.replace(/\d+$/, ''),
    ];
    candidates.forEach((candidate) => {
      const key = normalizeEmployeeKey(candidate);
      if (key && !map.has(key)) {
        map.set(key, file);
      }
    });
  });
  return map;
};

const getEmployeePhotoFile = (record, lookup) => {
  if (!record) return '';
  const firstName = (record.firstName || '').trim();
  const lastName = (record.lastName || '').trim();
  const firstInitial = firstName ? firstName[0] : '';
  const candidates = [
    `${firstName} ${lastName}`.trim(),
    `${lastName} ${firstName}`.trim(),
    `${firstInitial} ${lastName}`.trim(),
    `${lastName} ${firstInitial}`.trim(),
  ];
  for (const candidate of candidates) {
    const key = normalizeEmployeeKey(candidate);
    if (key && lookup.has(key)) {
      return lookup.get(key);
    }
  }
  return '';
};

const HIGH_COST_SOFTWARE = [
  'adobe',
  'autocad',
  'salesforce',
  'microsoft 365',
  'office 365',
  'zoom',
  'slack',
  'jira',
  'confluence',
];

const getApprovalRequirements = (catalogId, draft, matchRecord) => {
  const approvals = [];
  const managerName = draft.manager?.trim() || matchRecord?.supervisor || 'Manager';
  if (catalogId === 'CAT-101') {
    approvals.push({
      type: 'Onboarding',
      title: `Onboarding approval for ${draft.employeeName || 'new hire'}`,
      approver: managerName,
      due: 'Today',
    });
    approvals.push({
      type: 'Onboarding',
      title: `IT provisioning for ${draft.employeeName || 'new hire'}`,
      approver: 'IT Manager',
      due: 'Today',
    });
  }
  if (catalogId === 'CAT-203') {
    approvals.push({
      type: 'Access',
      title: `VPN access review for ${draft.vpnUser || 'requester'}`,
      approver: 'Security',
      due: 'Today',
    });
  }
  if (catalogId === 'CAT-312') {
    const issue = draft.laptopIssue?.toLowerCase() || '';
    const needsSecurity = ['lost', 'stolen', 'missing'].some((term) => issue.includes(term));
    approvals.push({
      type: needsSecurity ? 'Security' : 'Hardware',
      title: `Laptop replacement approval for ${draft.laptopUser || 'requester'}`,
      approver: needsSecurity ? 'Security' : managerName,
      due: 'Today',
    });
  }
  if (catalogId === 'CAT-404') {
    const software = draft.softwareTitle?.toLowerCase() || '';
    const isHighCost = HIGH_COST_SOFTWARE.some((item) => software.includes(item));
    const needsManager = !draft.softwareCostCenter?.trim() || isHighCost;
    if (needsManager) {
      approvals.push({
        type: 'Software',
        title: `Software approval for ${draft.softwareTitle || 'requester software'}`,
        approver: managerName,
        due: 'Today',
      });
    }
    if (draft.softwareRequiresAdmin) {
      approvals.push({
        type: 'Security',
        title: `Admin install review for ${draft.softwareTitle || 'software'}`,
        approver: 'Security',
        due: 'Today',
      });
    }
  }
  return approvals;
};

const getEmployeeInitials = (name) =>
  (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

const EmployeeAvatar = ({ name, photoFile }) => {
  const [hasError, setHasError] = useState(false);
  const initials = getEmployeeInitials(name);
  const photoSrc = photoFile ? `${EMPLOYEE_PHOTO_BASE}/${encodeURIComponent(photoFile)}` : '';

  if (!photoFile || hasError) {
    return (
      <div className="employee-avatar fallback" aria-label={name}>
        {initials || '??'}
      </div>
    );
  }

  return (
    <img
      className="employee-avatar"
      src={photoSrc}
      alt={name}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
};

const EmployeeCard = ({ record, photoFile }) => {
  const name = `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Employee';
  const assets = buildAssetList(record);
  const tags = [record.company, record.department, record.location].filter(Boolean);

  return (
    <article className="employee-card">
      <EmployeeAvatar name={name} photoFile={photoFile} />
      <div className="employee-card-body">
        <div className="employee-card-header">
          <div>
            <div className="employee-name">{name}</div>
            <div className="employee-role">{record.jobTitle || 'Role not listed'}</div>
          </div>
          <div className="employee-tags">
            {record.employeeId && <InlineTag className="mono">{record.employeeId}</InlineTag>}
            {tags.map((tag, index) => (
              <InlineTag key={`${tag}-${index}`}>{tag}</InlineTag>
            ))}
          </div>
        </div>
        <div className="employee-info-grid">
          <div>
            <div className="detail-label">Email</div>
            {record.email ? (
              <a className="employee-link" href={`mailto:${record.email}`}>
                {record.email}
              </a>
            ) : (
              <div className="detail-value">Not listed</div>
            )}
          </div>
          <div>
            <div className="detail-label">Mobile</div>
            {record.mobilePhone ? (
              <a className="employee-link" href={`tel:${record.mobilePhone}`}>
                {record.mobilePhone}
              </a>
            ) : (
              <div className="detail-value">Not listed</div>
            )}
          </div>
          <div>
            <div className="detail-label">Supervisor</div>
            <div className="detail-value">{record.supervisor || 'Not listed'}</div>
          </div>
          <div>
            <div className="detail-label">Start date</div>
            <div className="detail-value">{record.startDate || 'Not listed'}</div>
          </div>
        </div>
        <div className="employee-assets">
          <div className="detail-label">Assigned assets</div>
          {assets.length ? (
            <div className="asset-grid">
              {assets.map((asset) => (
                <div key={asset.label} className="asset-chip">
                  <span>{asset.label}</span>
                  <strong>{asset.value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="detail-value employee-empty">No assets listed.</div>
          )}
        </div>
      </div>
    </article>
  );
};

const HubMatchCard = ({ record, onApply }) => {
  if (!record) return null;
  const name = buildEmployeeDisplayName(record) || 'Employee';
  const assets = buildAssetList(record);
  return (
    <div className="form-alert success">
      <div className="form-alert-message">Employee Hub match found</div>
      <div className="form-alert-details">
        <div>
          <strong>{name}</strong>
          {record.jobTitle ? ` · ${record.jobTitle}` : ''}
          {record.department ? ` · ${record.department}` : ''}
        </div>
        {record.location && <div>Location: {record.location}</div>}
        {record.supervisor && <div>Supervisor: {record.supervisor}</div>}
        {assets.length ? (
          <div className="asset-grid">
            {assets.map((asset) => (
              <div key={asset.label} className="asset-chip">
                <span>{asset.label}</span>
                <strong>{asset.value}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div>No assets listed in hub.</div>
        )}
      </div>
      <button className="btn btn-ghost btn-small" type="button" onClick={onApply}>
        Use hub data
      </button>
    </div>
  );
};

const SuggestedArticles = ({ articles, onOpen, onDeflect }) => {
  if (!articles.length) return null;
  return (
    <div className="detail-card suggestion-card">
      <div className="detail-label">Suggested knowledge articles</div>
      <div className="suggestion-list">
        {articles.map((article) => (
          <div key={article.id} className="suggestion-row">
            <div>
              <div className="work-title">{article.title}</div>
              <div className="work-meta">{article.summary}</div>
            </div>
            <div className="suggestion-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => onOpen(article)}>
                View article
              </button>
              <button className="btn btn-primary btn-small" type="button" onClick={() => onDeflect(article)}>
                Resolved
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function AppIT() {
  const isAuthRequired = process.env.NODE_ENV === 'production';
  const defaultDevUser = isAuthRequired ? '' : (TECHNICIANS[0]?.name || '');
  const [activeSection, setActiveSection] = useState('overview');
  const [search, setSearch] = useState('');
  const [workFilter, setWorkFilter] = useState('All');
  const [ticketFilter, setTicketFilter] = useState('All');
  const [approvals, setApprovals] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [employeeDirectoryRecords, setEmployeeDirectoryRecords] = useState(() => employeeDirectory);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [ticketsMeta, setTicketsMeta] = useState({ total: 0, limit: TICKET_PAGE_SIZE, offset: 0 });
  const [approvalsMeta, setApprovalsMeta] = useState({ total: 0, limit: APPROVAL_PAGE_SIZE, offset: 0 });
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState('');
  const [approvalsError, setApprovalsError] = useState('');
  const [ticketPage, setTicketPage] = useState(0);
  const [approvalPage, setApprovalPage] = useState(0);
  const [directoryPage, setDirectoryPage] = useState(0);
  const [currentUser, setCurrentUser] = useState(defaultDevUser);
  const [selectedUser, setSelectedUser] = useState(defaultDevUser);
  const [reportRange, setReportRange] = useState(reportRanges[0]);
  const [automationRules, setAutomationRules] = useState([]);
  const [catalogActiveId, setCatalogActiveId] = useState('');
  const [catalogStep, setCatalogStep] = useState(0);
  const [catalogItems, setCatalogItems] = useState(() => serviceCatalog);
  const [catalogItemDraft, setCatalogItemDraft] = useState({
    name: '',
    type: '',
    eta: '',
    approval: '',
  });
  const [catalogItemError, setCatalogItemError] = useState('');
  const [showCatalogForm, setShowCatalogForm] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [catalogSubmitting, setCatalogSubmitting] = useState(false);
  const [changeEvents, setChangeEvents] = useState(() => changeCalendar);
  const [changeDraft, setChangeDraft] = useState({
    area: '',
    title: '',
    window: '',
    status: 'Planned',
  });
  const [changeError, setChangeError] = useState('');
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [cmdbRecords, setCmdbRecords] = useState(() => cmdbItems);
  const [cmdbDraft, setCmdbDraft] = useState({
    name: '',
    type: '',
    owner: '',
    status: CMDB_STATUS_OPTIONS[0],
    environment: 'Production',
    criticality: 'Medium',
    location: '',
    serviceTier: 'Tier 2',
    supportWindow: 'Business hours',
    description: '',
    documentation: '',
    dependencies: '',
  });
  const [cmdbError, setCmdbError] = useState('');
  const [showCmdbForm, setShowCmdbForm] = useState(false);
  const [openCmdbId, setOpenCmdbId] = useState('');
  const [catalogDraft, setCatalogDraft] = useState({
    employeeName: '',
    employeeEmail: '',
    startDate: '',
    department: '',
    manager: '',
    role: '',
    location: '',
    onboardingNeedsHardware: true,
    onboardingNeedsAccess: true,
    deviceNeeds: '',
    accessNeeds: '',
    notes: '',
    vpnUser: '',
    vpnEmail: '',
    vpnReason: '',
    vpnTemporaryAccess: false,
    vpnStartDate: '',
    vpnEndDate: '',
    laptopUser: '',
    laptopEmail: '',
    laptopIssue: '',
    laptopAssetTag: '',
    laptopNeedsLoaner: false,
    laptopLoanerDuration: '',
    laptopNeededBy: '',
    softwareUser: '',
    softwareEmail: '',
    softwareTitle: '',
    softwareJustification: '',
    softwareCostCenter: '',
    softwareRequiresAdmin: false,
    softwareAdminNeed: '',
  });
  const [automationDraft, setAutomationDraft] = useState({
    name: '',
    when: 'Ticket created',
    condition: 'Priority is High',
    action: 'Assign to on-call lead',
  });
  const [automationLog, setAutomationLog] = useState([]);
  const [cannedResponses, setCannedResponses] = useState([]);
  const [cannedDraft, setCannedDraft] = useState({ title: '', body: '' });
  const [selectedCannedId, setSelectedCannedId] = useState('');
  const [pendingCannedBody, setPendingCannedBody] = useState('');
  const [knowledgeArticles, setKnowledgeArticles] = useState(() => knowledgeArticlesSeed);
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState('');
  const [isEditingKnowledge, setIsEditingKnowledge] = useState(false);
  const [knowledgeDraft, setKnowledgeDraft] = useState(null);
  const [automationError, setAutomationError] = useState('');
  const [cannedError, setCannedError] = useState('');
  const [projects, setProjects] = useState(() => projectRecords);
  const [projectDraft, setProjectDraft] = useState({
    title: '',
    owner: '',
    status: 'Planned',
    progress: '',
  });
  const [projectError, setProjectError] = useState('');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [openProjectId, setOpenProjectId] = useState('');
  const [problems, setProblems] = useState(() => problemRecords);
  const [problemDraft, setProblemDraft] = useState({
    title: '',
    status: 'Investigation',
    impact: '',
    linked: '',
    owner: '',
    rootCause: '',
    workaround: '',
    fixPlan: '',
  });
  const [problemError, setProblemError] = useState('');
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [releases, setReleases] = useState(() => releaseRecords);
  const [releaseDraft, setReleaseDraft] = useState({
    title: '',
    owner: '',
    window: '',
    status: 'Planned',
  });
  const [releaseError, setReleaseError] = useState('');
  const [showReleaseForm, setShowReleaseForm] = useState(false);
  const [serviceStatus, setServiceStatus] = useState(() => SERVICE_STATUS_FALLBACK);
  const [serviceStatusDraft, setServiceStatusDraft] = useState({ name: '', state: 'Operational' });
  const [serviceStatusError, setServiceStatusError] = useState('');
  const [showServiceStatusForm, setShowServiceStatusForm] = useState(false);
  const [editingServiceStatusId, setEditingServiceStatusId] = useState('');
  const [announcements, setAnnouncements] = useState(() => ANNOUNCEMENTS_FALLBACK);
  const [announcementDraft, setAnnouncementDraft] = useState({ title: '', body: '', tag: '', date: '' });
  const [announcementError, setAnnouncementError] = useState('');
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState('');
  const [deflectionStats, setDeflectionStats] = useState(() =>
    readLocalValue(LOCAL_DEFLECTION_KEY, {
      views: 0,
      deflected: 0,
      submitted: 0,
      articleOpens: 0,
    }),
  );
  const [theme, setTheme] = useState('light');
  const [authError, setAuthError] = useState('');

  const employeeLookup = useMemo(() => {
    const map = new Map();
    employeeDirectoryRecords.forEach((record) => {
      if (record.email) {
        map.set(record.email.toLowerCase(), record);
      }
    });
    return map;
  }, [employeeDirectoryRecords]);
  const employeeNameLookup = useMemo(() => {
    const map = new Map();
    employeeDirectoryRecords.forEach((record) => {
      const first = (record.firstName || '').trim();
      const last = (record.lastName || '').trim();
      const firstInitial = first ? first[0] : '';
      const candidates = [
        `${first} ${last}`.trim(),
        `${last} ${first}`.trim(),
        `${firstInitial} ${last}`.trim(),
        `${last} ${firstInitial}`.trim(),
      ];
      candidates.forEach((candidate) => {
        const key = normalizeEmployeeKey(candidate);
        if (key && !map.has(key)) {
          map.set(key, record);
        }
      });
    });
    return map;
  }, [employeeDirectoryRecords]);
  const employeePhotoLookup = useMemo(() => buildEmployeePhotoLookup(employeePhotos), []);
  const directorySearchTerm = search.trim().toLowerCase();
  const directoryTotals = useMemo(() => {
    const departments = new Set();
    const locations = new Set();
    employeeDirectoryRecords.forEach((record) => {
      if (record.department) departments.add(record.department);
      if (record.location) locations.add(record.location);
    });
    return { total: employeeDirectoryRecords.length, departments: departments.size, locations: locations.size };
  }, [employeeDirectoryRecords]);
  const directoryRecords = useMemo(() => {
    const records = employeeDirectoryRecords.filter((record) => {
      if (!directorySearchTerm) return true;
      const haystack = [
        record.firstName,
        record.lastName,
        record.email,
        record.department,
        record.location,
        record.jobTitle,
        record.company,
        record.supervisor,
        record.employeeId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(directorySearchTerm);
    });
    return records.sort((a, b) => {
      const lastCompare = (a.lastName || '').localeCompare(b.lastName || '');
      if (lastCompare !== 0) return lastCompare;
      return (a.firstName || '').localeCompare(b.firstName || '');
    });
  }, [directorySearchTerm, employeeDirectoryRecords]);
  const directoryPageRecords = useMemo(() => {
    const start = directoryPage * EMPLOYEE_DIRECTORY_PAGE_SIZE;
    return directoryRecords.slice(start, start + EMPLOYEE_DIRECTORY_PAGE_SIZE);
  }, [directoryRecords, directoryPage]);
  const knowledgeSearchTerm = search.trim().toLowerCase();
  const knowledgeGroups = useMemo(() => {
    const grouped = new Map();
    knowledgeArticles.forEach((article) => {
      if (knowledgeSearchTerm) {
        const haystack = [article.title, article.summary, article.category, article.audience]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(knowledgeSearchTerm)) return;
      }
      const category = article.category || 'General';
      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category).push(article);
    });
    return Array.from(grouped.entries())
      .map(([category, articles]) => ({
        category,
        articles: articles.slice().sort((a, b) => (a.title || '').localeCompare(b.title || '')),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [knowledgeArticles, knowledgeSearchTerm]);
  const cmdbSearchTerm = search.trim().toLowerCase();
  const filteredCmdbRecords = useMemo(() => {
    const records = cmdbRecords.filter((item) => {
      if (!cmdbSearchTerm) return true;
      const haystack = [item.id, item.name, item.type, item.status, item.owner, item.location, item.environment, item.criticality]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(cmdbSearchTerm);
    });
    return records.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [cmdbRecords, cmdbSearchTerm]);

  const filteredWorkQueue = useMemo(() => {
    const term = search.trim().toLowerCase();
    return workQueue.filter((item) => {
      const matchesFilter = workFilter === 'All' || item.type === workFilter;
      const matchesTerm =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term) ||
        item.requester.toLowerCase().includes(term);
      return matchesFilter && matchesTerm;
    });
  }, [workFilter, search]);

  const myWorkTickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tickets.filter((item) => {
      if (item.assignee !== currentUser) return false;
      if (!term) return true;
      return (
        item.title.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term) ||
        item.requester.toLowerCase().includes(term)
      );
    });
  }, [tickets, currentUser, search]);

  const myWorkTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return workQueue.filter((item) => {
      if (item.assignee !== currentUser) return false;
      if (!term) return true;
      return (
        item.title.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term) ||
        item.requester.toLowerCase().includes(term)
      );
    });
  }, [currentUser, search]);

  const previewTicket = useMemo(() => {
    if (!tickets.length) return null;
    const candidates = tickets.filter((item) => !['Resolved', 'Closed'].includes(item.status));
    return (candidates.length ? candidates : tickets)
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
  }, [tickets]);
  const reportData = useMemo(
    () => buildReportData(tickets, reportRange, reportDataByRange[reportRange]),
    [tickets, reportRange],
  );

  const activeTicket = tickets.find((item) => item.id === selectedTicketId) || tickets[0] || null;
  const requesterRecord = activeTicket?.requesterEmail
    ? employeeLookup.get(activeTicket.requesterEmail.toLowerCase())
    : null;
  const requesterAssets = requesterRecord ? buildAssetList(requesterRecord) : [];
  const activeKnowledge =
    knowledgeArticles.find((article) => article.id === selectedKnowledgeId) || knowledgeArticles[0] || null;
  const knowledgeView = isEditingKnowledge && knowledgeDraft ? knowledgeDraft : activeKnowledge;
  const catalogSuggestedArticles = useMemo(
    () => (catalogActiveId ? getSuggestedArticles(catalogActiveId, knowledgeArticles) : []),
    [catalogActiveId, knowledgeArticles],
  );

  const resolveEmployeeMatch = (name, email) => {
    if (email) {
      const match = employeeLookup.get(email.toLowerCase());
      if (match) return match;
    }
    const key = normalizeEmployeeKey(name);
    if (!key) return null;
    return employeeNameLookup.get(key) || null;
  };

  const onboardingMatch = useMemo(
    () => resolveEmployeeMatch(catalogDraft.employeeName, catalogDraft.employeeEmail),
    [catalogDraft.employeeName, catalogDraft.employeeEmail, employeeNameLookup, employeeLookup],
  );
  const vpnMatch = useMemo(
    () => resolveEmployeeMatch(catalogDraft.vpnUser, catalogDraft.vpnEmail),
    [catalogDraft.vpnUser, catalogDraft.vpnEmail, employeeNameLookup, employeeLookup],
  );
  const laptopMatch = useMemo(
    () => resolveEmployeeMatch(catalogDraft.laptopUser, catalogDraft.laptopEmail),
    [catalogDraft.laptopUser, catalogDraft.laptopEmail, employeeNameLookup, employeeLookup],
  );
  const softwareMatch = useMemo(
    () => resolveEmployeeMatch(catalogDraft.softwareUser, catalogDraft.softwareEmail),
    [catalogDraft.softwareUser, catalogDraft.softwareEmail, employeeNameLookup, employeeLookup],
  );

  const ticketQuery = useMemo(() => {
    const query = {
      limit: activeSection === 'reports' ? 200 : TICKET_PAGE_SIZE,
      offset: activeSection === 'reports' ? 0 : ticketPage * TICKET_PAGE_SIZE,
    };
    const term = search.trim();
    if (term) query.q = term;
    if (activeSection === 'my-work') {
      if (currentUser) query.assignee = currentUser;
    } else if (['tickets', 'ticket-detail'].includes(activeSection) && ticketFilter !== 'All') {
      query.status = ticketFilter;
    } else if (activeSection === 'reports' && ticketFilter !== 'All') {
      query.status = ticketFilter;
    }
    return query;
  }, [activeSection, currentUser, search, ticketFilter, ticketPage]);

  const approvalQuery = useMemo(() => {
    const query = {
      limit: APPROVAL_PAGE_SIZE,
      offset: approvalPage * APPROVAL_PAGE_SIZE,
    };
    if (activeSection === 'approvals') {
      const term = search.trim();
      if (term) query.q = term;
    }
    return query;
  }, [activeSection, approvalPage, search]);

  useEffect(() => {
    const shouldLoad = ['tickets', 'ticket-detail', 'overview', 'my-work', 'reports'].includes(activeSection);
    if (!shouldLoad) return undefined;
    let isActive = true;
    const loadTickets = async () => {
      setTicketsLoading(true);
      setTicketsError('');
      try {
        const response = await fetchTickets(ticketQuery);
        if (!isActive) return;
        setTickets(response.tickets || []);
        setTicketsMeta(response.meta || { total: 0, limit: TICKET_PAGE_SIZE, offset: 0 });
      } catch (error) {
        if (!isActive) return;
        setTicketsError('Unable to load tickets right now.');
      } finally {
        if (isActive) setTicketsLoading(false);
      }
    };
    loadTickets();
    return () => {
      isActive = false;
    };
  }, [activeSection, ticketQuery]);

  useEffect(() => {
    if (!['approvals', 'overview'].includes(activeSection)) return undefined;
    let isActive = true;
    const loadApprovals = async () => {
      setApprovalsLoading(true);
      setApprovalsError('');
      try {
        const response = await fetchApprovals(approvalQuery);
        if (!isActive) return;
        setApprovals(response.approvals || []);
        setApprovalsMeta(response.meta || { total: 0, limit: APPROVAL_PAGE_SIZE, offset: 0 });
      } catch (error) {
        if (!isActive) return;
        setApprovalsError('Unable to load approvals right now.');
      } finally {
        if (isActive) setApprovalsLoading(false);
      }
    };
    loadApprovals();
    return () => {
      isActive = false;
    };
  }, [activeSection, approvalQuery]);

  useEffect(() => {
    let isActive = true;
    const loadAutomation = async () => {
      setAutomationError('');
      try {
        const rules = await fetchAutomationRules();
        if (!isActive) return;
        setAutomationRules(rules);
      } catch (error) {
        if (!isActive) return;
        setAutomationError('Unable to load automation rules.');
      }
    };
    loadAutomation();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadCanned = async () => {
      setCannedError('');
      try {
        const responses = await fetchCannedResponses();
        if (!isActive) return;
        setCannedResponses(responses);
      } catch (error) {
        if (!isActive) return;
        setCannedError('Unable to load canned responses.');
      }
    };
    loadCanned();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadEmployeeDirectory = async () => {
      try {
        const records = await fetchEmployeeDirectory();
        if (!isActive) return;
        if (records.length) {
          setEmployeeDirectoryRecords(records);
        }
      } catch (error) {
        console.error('Failed to load Employee Information Hub data', error);
      }
    };
    loadEmployeeDirectory();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadReferenceData = async () => {
      try {
        const [catalog, projectsList, changesList, problemsList, releasesList] = await Promise.all([
          fetchCatalogItems(),
          fetchProjects(),
          fetchChanges(),
          fetchProblems(),
          fetchReleases(),
        ]);
        if (!isActive) return;
        if (catalog.length) setCatalogItems(catalog);
        if (projectsList.length) setProjects(projectsList);
        if (changesList.length) setChangeEvents(changesList);
        if (problemsList.length) setProblems(problemsList);
        if (releasesList.length) setReleases(releasesList);
      } catch (error) {
        if (!isActive) return;
        console.error('Failed to load reference data', error);
      }
    };
    loadReferenceData();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadServiceStatus = async () => {
      setServiceStatusError('');
      if (!isAuthRequired) {
        const localStatuses = readLocalList(LOCAL_SERVICE_STATUS_KEY);
        if (!isActive) return;
        setServiceStatus(localStatuses && localStatuses.length ? localStatuses : SERVICE_STATUS_FALLBACK);
        return;
      }
      try {
        const statuses = await fetchServiceStatus();
        if (!isActive) return;
        if (statuses.length) setServiceStatus(statuses);
      } catch (error) {
        if (!isActive) return;
        if (!isAuthRequired) return;
        setServiceStatusError('Unable to load service status.');
      }
    };
    const loadAnnouncements = async () => {
      setAnnouncementError('');
      if (!isAuthRequired) {
        const localAnnouncements = readLocalList(LOCAL_ANNOUNCEMENTS_KEY);
        if (!isActive) return;
        setAnnouncements(localAnnouncements && localAnnouncements.length ? localAnnouncements : ANNOUNCEMENTS_FALLBACK);
        return;
      }
      try {
        const items = await fetchAnnouncements();
        if (!isActive) return;
        if (items.length) setAnnouncements(items);
      } catch (error) {
        if (!isActive) return;
        if (!isAuthRequired) return;
        setAnnouncementError('Unable to load announcements.');
      }
    };
    loadServiceStatus();
    loadAnnouncements();
    return () => {
      isActive = false;
    };
  }, [isAuthRequired]);

  useEffect(() => {
    if (!selectedCannedId && cannedResponses.length) {
      setSelectedCannedId(cannedResponses[0].id);
    }
  }, [cannedResponses, selectedCannedId]);

  useEffect(() => {
    if (['tickets', 'ticket-detail', 'overview', 'my-work'].includes(activeSection)) {
      setTicketPage(0);
    }
  }, [activeSection, currentUser, search, ticketFilter]);

  useEffect(() => {
    if (activeSection === 'approvals') {
      setApprovalPage(0);
    }
  }, [activeSection, search]);

  useEffect(() => {
    if (activeSection === 'directory') {
      setDirectoryPage(0);
    }
  }, [activeSection, search]);

  useEffect(() => {
    if (!tickets.length) return;
    if (!selectedTicketId || !tickets.some((item) => item.id === selectedTicketId)) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const error = params.get('authError');
    if (error) {
      setAuthError(error);
    }
    if (error || params.has('authSuccess')) {
      params.delete('authError');
      params.delete('authSuccess');
      const next = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
      window.history.replaceState({}, '', next);
    }
  }, []);

  useEffect(() => {
    if (isAuthRequired) return;
    if (defaultDevUser && !currentUser) {
      setCurrentUser(defaultDevUser);
      setSelectedUser(defaultDevUser);
    }
  }, [isAuthRequired, defaultDevUser, currentUser]);

  useEffect(() => {
    if (!isAuthRequired) return undefined;
    let isMounted = true;
    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/universal/session', { credentials: 'include' });
        if (!response.ok) return;
        const data = await response.json();
        if (isMounted && data?.user?.name) {
          setCurrentUser(data.user.name);
          setSelectedUser(data.user.name);
          setAuthError('');
        }
      } catch (error) {
        console.error('Failed to load Duo session', error);
      }
    };
    loadSession();
    return () => {
      isMounted = false;
    };
  }, [isAuthRequired]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
  }, [theme]);

  useEffect(() => {
    writeLocalValue(LOCAL_DEFLECTION_KEY, deflectionStats);
  }, [deflectionStats]);

  const handleApprovalDecision = (id, status) => {
    const decidedAt = Date.now();
    let decidedApproval = null;
    setApprovals((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        decidedApproval = { ...item, status, decidedAt };
        return decidedApproval;
      }),
    );
    updateApproval(id, { status, decidedAt }).catch((error) => {
      console.error('Failed to update approval', error);
    });
    if (decidedApproval?.ticketId) {
      const entry = {
        id: `entry-${decidedAt}`,
        type: 'approval',
        author: currentUser || 'Approver',
        time: formatEasternTime(decidedAt),
        text: `${status} approval: ${decidedApproval.title}`,
      };
      appendEntriesToTicket(decidedApproval.ticketId, [entry]);
    }
  };

  const handleTicketUpdate = (id, updates) => {
    let nextForRequest = null;
    setTickets((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const now = Date.now();
        const nextEntries = [...(item.entries || [])];
        if (updates.status && updates.status !== item.status) {
          nextEntries.push({
            id: `entry-${now}-status`,
            type: 'status',
            author: currentUser || 'System',
            time: formatEasternTime(now),
            text: `Status changed from ${item.status} to ${updates.status}.`,
          });
        }
        if (updates.assignee && updates.assignee !== item.assignee) {
          nextEntries.push({
            id: `entry-${now}-assignee`,
            type: 'status',
            author: currentUser || 'System',
            time: formatEasternTime(now),
            text: `Assignee changed from ${item.assignee || 'Unassigned'} to ${updates.assignee}.`,
          });
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'problemId') && updates.problemId !== item.problemId) {
          const nextProblem = problems.find((problem) => problem.id === updates.problemId);
          const message = updates.problemId
            ? `Linked to problem ${updates.problemId}${nextProblem ? ` (${nextProblem.title})` : ''}.`
            : 'Problem link removed.';
          nextEntries.push({
            id: `entry-${now}-problem`,
            type: 'status',
            author: currentUser || 'System',
            time: formatEasternTime(now),
            text: message,
          });
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'changeId') && updates.changeId !== item.changeId) {
          const nextChange = changeEvents.find((change) => change.id === updates.changeId);
          const message = updates.changeId
            ? `Linked to change ${updates.changeId}${nextChange ? ` (${nextChange.title})` : ''}.`
            : 'Change link removed.';
          nextEntries.push({
            id: `entry-${now}-change`,
            type: 'status',
            author: currentUser || 'System',
            time: formatEasternTime(now),
            text: message,
          });
        }
        const next = { ...item, ...updates, entries: nextEntries };
        if (updates.status && item.status === 'New' && updates.status !== 'New' && !item.respondedAt) {
          next.respondedAt = Date.now();
        }
        if (updates.status && ['Resolved', 'Closed'].includes(updates.status) && !item.resolvedAt) {
          next.resolvedAt = Date.now();
        }
        nextForRequest = next;
        return next;
      }),
    );
    if (nextForRequest) {
      const { updatedTickets, changedTickets, logEntries } = applyAutomationRules([nextForRequest]);
      const automatedTicket = updatedTickets[0] || nextForRequest;
      if (changedTickets.size) {
        setTickets((prev) => prev.map((item) => (item.id === id ? automatedTicket : item)));
      }
      updateTicket(id, automatedTicket).catch((error) => {
        console.error('Failed to update ticket', error);
      });
      if (logEntries.length) {
        setAutomationLog((prev) => [...logEntries, ...prev]);
      }
    }
  };

  const handleSelectTicket = (id) => {
    setSelectedTicketId(id);
  };

  const handleOpenTicket = (id) => {
    const existing = tickets.find((item) => item.id === id);
    if (existing) {
      handleSelectTicket(id);
      setActiveSection('ticket-detail');
      return;
    }
    const queueItem = workQueue.find((item) => item.id === id);
    if (queueItem) {
      const fallbackEmail = `${queueItem.requester.split(' ')[0].toLowerCase()}@udservices.org`;
      const newTicket = {
        id: queueItem.id,
        type: queueItem.type,
        title: queueItem.title,
        requester: queueItem.requester,
        requesterEmail: fallbackEmail,
        department: 'General',
        status: queueItem.status === 'Open' ? 'New' : queueItem.status,
        priority: queueItem.priority,
        assignee: queueItem.assignee || 'Unassigned',
        created: 'Today',
        createdAt: Date.now(),
        category: 'General',
        impact: 'Just me',
        urgency: 'Normal',
        contactPreference: 'Email',
        device: 'Unknown',
        description: 'Created from Team Queue.',
        entries: [],
      };
      let added = false;
      setTickets((prev) => {
        if (prev.some((item) => item.id === newTicket.id)) return prev;
        added = true;
        return [newTicket, ...prev];
      });
      if (added) {
        setTicketsMeta((prev) => ({ ...prev, total: prev.total + 1 }));
      }
      setSelectedTicketId(newTicket.id);
      setActiveSection('ticket-detail');
    }
  };

  const handleSignIn = () => {
    const nextUser = selectedUser.trim();
    if (!nextUser) {
      setAuthError('Select your name to continue.');
      return;
    }
    const allowed = TECHNICIANS.find((tech) => tech.name === nextUser);
    if (!allowed) {
      setAuthError('This account is not authorized for IT Support access.');
      return;
    }
    setAuthError('');
    document.cookie = `duo_selected=${encodeURIComponent(nextUser)}; Path=/; SameSite=Lax`;
    const query = new URLSearchParams({ name: nextUser });
    window.location.assign(`/api/auth/universal/authorize?${query.toString()}`);
  };

  const handleSignOut = () => {
    const clearSession = async () => {
      if (!isAuthRequired) {
        setCurrentUser(defaultDevUser);
        setSelectedUser(defaultDevUser);
        setAuthError('');
        return;
      }
      try {
        await fetch('/api/auth/universal/logout', { method: 'POST', credentials: 'include' });
      } catch (error) {
        console.error('Failed to clear Duo session', error);
      } finally {
        setCurrentUser('');
        setSelectedUser('');
        setAuthError('');
      }
    };
    clearSession();
  };

  const appendEntriesToTicket = (ticketId, entries) => {
    if (!ticketId || !entries?.length) return null;
    let nextForRequest = null;
    setTickets((prev) =>
      prev.map((item) => {
        if (item.id !== ticketId) return item;
        const next = {
          ...item,
          entries: [...(item.entries || []), ...entries],
        };
        nextForRequest = next;
        return next;
      }),
    );
    if (nextForRequest) {
      updateTicket(ticketId, nextForRequest).catch((error) => {
        console.error('Failed to append entry', error);
      });
    }
    return nextForRequest;
  };

  const handleAddEntry = (ticketId, entry) => {
    if (!ticketId || !entry) return;
    const nextForRequest = appendEntriesToTicket(ticketId, [entry]);
    if (entry.type === 'message' && nextForRequest) {
      sendTicketMessage({
        ticketId,
        subject: nextForRequest.title,
        message: entry.text,
        requesterEmail: nextForRequest.requesterEmail,
        requesterName: nextForRequest.requester,
      }).catch((error) => {
        console.error('Failed to send requester message', error);
      });
    }
  };

  const createId = (prefix) => `${prefix}-${Math.floor(100 + Math.random() * 900)}`;

  const handleAddAutomation = () => {
    if (!automationDraft.name.trim()) return;
    const newRule = {
      id: createId('AUTO'),
      name: automationDraft.name.trim(),
      when: automationDraft.when,
      condition: automationDraft.condition,
      action: automationDraft.action,
      enabled: true,
    };
    setAutomationRules((prev) => [newRule, ...prev]);
    setAutomationDraft({
      name: '',
      when: 'Ticket created',
      condition: 'Priority is High',
      action: 'Assign to on-call lead',
    });
    createAutomationRule(newRule).catch((error) => {
      console.error('Failed to save automation rule', error);
      setAutomationError('Unable to save the automation rule.');
    });
  };

  const handleToggleAutomation = (rule) => {
    const nextEnabled = !rule.enabled;
    setAutomationRules((prev) =>
      prev.map((item) => (item.id === rule.id ? { ...item, enabled: nextEnabled } : item)),
    );
    updateAutomationRule(rule.id, { enabled: nextEnabled }).catch((error) => {
      console.error('Failed to update automation rule', error);
      setAutomationError('Unable to update the automation rule.');
    });
  };

  const buildAutomationEntry = (text) => ({
    id: `entry-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'automation',
    author: 'Automation',
    time: formatEasternTime(Date.now()),
    text,
  });

  const applyAutomationRules = (ticketsToProcess) => {
    const now = Date.now();
    const changedTickets = new Map();
    const logEntries = [];

    const updatedTickets = ticketsToProcess.map((ticket) => {
      let next = { ...ticket };
      let changed = false;
      const entries = [...(ticket.entries || [])];
      const automationState = { ...(ticket.automation || {}) };
      const appliedRuleIds = Array.isArray(automationState.appliedRuleIds)
        ? [...automationState.appliedRuleIds]
        : [];
      automationState.appliedRuleIds = appliedRuleIds;

      const addEntry = (text) => {
        entries.push(buildAutomationEntry(text));
        logEntries.push({ id: `log-${Date.now()}-${Math.random()}`, text, when: new Date(now).toLocaleString() });
        changed = true;
      };

      const markRule = (ruleId) => {
        if (!appliedRuleIds.includes(ruleId)) {
          appliedRuleIds.push(ruleId);
          changed = true;
        }
      };

      const slaPolicy = ticket.createdAt ? getSlaPolicy(ticket.priority) : null;
      const responseSla =
        ticket.createdAt && !ticket.respondedAt
          ? buildSlaDisplay({
              startAt: ticket.createdAt,
              targetMs: slaPolicy.responseMs,
              completedAt: ticket.respondedAt,
              now,
              warnMs: slaPolicy.responseWarnMs,
            })
          : null;
      const resolveSla =
        ticket.createdAt && !ticket.resolvedAt
          ? buildSlaDisplay({
              startAt: ticket.createdAt,
              targetMs: slaPolicy.resolveMs,
              completedAt: ticket.resolvedAt,
              now,
              warnMs: slaPolicy.resolveWarnMs,
            })
          : null;

      automationRules.forEach((rule) => {
        if (!rule.enabled) return;
        const conditionMet =
          (rule.condition === 'Priority is High' && ticket.priority === 'High') ||
          (rule.condition === 'Status is Waiting on User' && ticket.status === 'Waiting on User');
        const shouldApplyOnce =
          rule.when === 'Ticket created' || rule.when === 'Status updated' || rule.when === 'SLA at risk';
        if (shouldApplyOnce && appliedRuleIds.includes(rule.id)) return;

        if (rule.when === 'SLA at risk') {
          const slaAtRisk = responseSla?.state === 'at-risk' || resolveSla?.state === 'at-risk';
          if (!slaAtRisk) return;
          if (rule.condition && !conditionMet) return;
        } else if (!conditionMet) {
          return;
        }

        if (rule.action === 'Assign to on-call lead') {
          if (next.assignee !== SLA_ON_CALL_LEAD) {
            next = { ...next, assignee: SLA_ON_CALL_LEAD };
            addEntry(`Automation: ${rule.name} assigned ticket to ${SLA_ON_CALL_LEAD}.`);
          }
        }
        if (rule.action === 'Send reminder email') {
          addEntry(`Automation: ${rule.name} sent a reminder to the assignee.`);
        }

        if (shouldApplyOnce) {
          markRule(rule.id);
        }
      });

      if (responseSla?.state === 'at-risk' && !automationState.slaResponseWarnedAt) {
        automationState.slaResponseWarnedAt = now;
        addEntry('Automation: Response SLA at risk. Reminder sent to the assignee.');
      }
      if (resolveSla?.state === 'at-risk' && !automationState.slaResolveWarnedAt) {
        automationState.slaResolveWarnedAt = now;
        addEntry('Automation: Resolution SLA at risk. Reminder sent to the assignee.');
      }
      if (responseSla?.state === 'breached' && !automationState.slaResponseBreachedAt) {
        automationState.slaResponseBreachedAt = now;
        if (next.assignee !== SLA_ESCALATION_OWNER) {
          next = { ...next, assignee: SLA_ESCALATION_OWNER };
        }
        addEntry(`Automation: Response SLA breached. Escalated to ${SLA_ESCALATION_OWNER}.`);
      }
      if (resolveSla?.state === 'breached' && !automationState.slaResolveBreachedAt) {
        automationState.slaResolveBreachedAt = now;
        if (next.assignee !== SLA_ESCALATION_OWNER) {
          next = { ...next, assignee: SLA_ESCALATION_OWNER };
        }
        addEntry(`Automation: Resolution SLA breached. Escalated to ${SLA_ESCALATION_OWNER}.`);
      }

      if (changed) {
        next = { ...next, entries, automation: automationState };
        changedTickets.set(next.id, next);
        return next;
      }
      return ticket;
    });

    return { updatedTickets, changedTickets, logEntries };
  };

  const handleRunAutomation = () => {
    if (!tickets.length) return;
    const { updatedTickets, changedTickets, logEntries } = applyAutomationRules(tickets);
    if (!changedTickets.size) return;
    setTickets(updatedTickets);
    changedTickets.forEach((ticket) => {
      updateTicket(ticket.id, ticket).catch((error) => {
        console.error('Failed to apply automation update', error);
      });
    });
    if (logEntries.length) {
      setAutomationLog((prev) => [...logEntries, ...prev]);
    }
  };

  useEffect(() => {
    if (!tickets.length) return undefined;
    const interval = setInterval(() => {
      const { updatedTickets, changedTickets, logEntries } = applyAutomationRules(tickets);
      if (!changedTickets.size) return;
      setTickets(updatedTickets);
      changedTickets.forEach((ticket) => {
        updateTicket(ticket.id, ticket).catch((error) => {
          console.error('Failed to apply automation update', error);
        });
      });
      if (logEntries.length) {
        setAutomationLog((prev) => [...logEntries, ...prev]);
      }
    }, 120000);
    return () => clearInterval(interval);
  }, [automationRules, tickets]);

  const handleToggleCmdbItem = (itemId) => {
    setOpenCmdbId((prev) => (prev === itemId ? '' : itemId));
  };

  const handleUpdateCmdbItem = (itemId, updates) => {
    setCmdbRecords((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
  };

  const handleToggleCmdbTask = (itemId, taskId) => {
    setCmdbRecords((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const tasks = Array.isArray(item.tasks) ? item.tasks : [];
        const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task));
        return { ...item, tasks: updatedTasks };
      }),
    );
  };

  const handleAddCmdbItem = () => {
    const name = cmdbDraft.name.trim();
    const type = cmdbDraft.type.trim();
    const owner = cmdbDraft.owner.trim();
    if (!name || !type || !owner) {
      setCmdbError('Name, type, and owner are required.');
      return;
    }
    const newItem = {
      id: createId('CI'),
      name,
      type,
      owner,
      status: cmdbDraft.status,
      environment: cmdbDraft.environment.trim() || 'Production',
      criticality: cmdbDraft.criticality.trim() || 'Medium',
      location: cmdbDraft.location.trim() || 'Not specified',
      serviceTier: cmdbDraft.serviceTier.trim() || 'Tier 2',
      supportWindow: cmdbDraft.supportWindow.trim() || 'Business hours',
      description: cmdbDraft.description.trim(),
      documentation: cmdbDraft.documentation.trim(),
      dependencies: cmdbDraft.dependencies
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      tasks: [],
      lastAudit: 'Today',
    };
    setCmdbRecords((prev) => [newItem, ...prev]);
    setCmdbDraft({
      name: '',
      type: '',
      owner: '',
      status: CMDB_STATUS_OPTIONS[0],
      environment: 'Production',
      criticality: 'Medium',
      location: '',
      serviceTier: 'Tier 2',
      supportWindow: 'Business hours',
      description: '',
      documentation: '',
      dependencies: '',
    });
    setCmdbError('');
    setShowCmdbForm(false);
    setOpenCmdbId(newItem.id);
  };

  const handleToggleProject = (projectId) => {
    setOpenProjectId((prev) => (prev === projectId ? '' : projectId));
  };

  const handleToggleProjectTask = (projectId, taskId) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) return project;
        const tasks = getProjectTasks(project);
        if (!tasks.length) return project;
        const updatedTasks = tasks.map((task) =>
          task.id === taskId ? { ...task, done: !task.done } : task,
        );
        return { ...project, tasks: updatedTasks };
      }),
    );
  };

  const handleAddProject = async () => {
    const title = projectDraft.title.trim();
    const owner = projectDraft.owner.trim();
    const progressValue = projectDraft.progress === '' ? 0 : Number(projectDraft.progress);
    if (!title || !owner) {
      setProjectError('Project title and owner are required.');
      return;
    }
    if (Number.isNaN(progressValue) || progressValue < 0 || progressValue > 100) {
      setProjectError('Progress must be a number between 0 and 100.');
      return;
    }
    setProjectError('');
    const newProject = {
      id: createId('PRJ'),
      title,
      status: projectDraft.status,
      owner,
      progress: Math.round(progressValue),
    };
    try {
      const response = await createProject(newProject);
      const saved = response.project || newProject;
      setProjects((prev) => [saved, ...prev]);
      setProjectDraft({ title: '', owner: '', status: 'Planned', progress: '' });
      setShowProjectForm(false);
    } catch (error) {
      console.error('Failed to create project', error);
      setProjectError('Unable to save the project.');
    }
  };

  const handleAddProblem = async () => {
    const title = problemDraft.title.trim();
    const impact = problemDraft.impact.trim();
    const owner = problemDraft.owner.trim();
    const linkedValue = problemDraft.linked === '' ? 0 : Number(problemDraft.linked);
    if (!title || !impact) {
      setProblemError('Problem title and impact are required.');
      return;
    }
    if (Number.isNaN(linkedValue) || linkedValue < 0) {
      setProblemError('Linked incidents must be a valid number.');
      return;
    }
    setProblemError('');
    const newProblem = {
      id: createId('PRB'),
      title,
      status: problemDraft.status,
      impact,
      linked: Math.round(linkedValue),
      owner: owner || 'Unassigned',
      rootCause: problemDraft.rootCause.trim(),
      workaround: problemDraft.workaround.trim(),
      fixPlan: problemDraft.fixPlan.trim(),
    };
    try {
      const response = await createProblem(newProblem);
      const saved = response.problem || newProblem;
      setProblems((prev) => [saved, ...prev]);
      setProblemDraft({
        title: '',
        status: 'Investigation',
        impact: '',
        linked: '',
        owner: '',
        rootCause: '',
        workaround: '',
        fixPlan: '',
      });
      setShowProblemForm(false);
    } catch (error) {
      console.error('Failed to create problem', error);
      setProblemError('Unable to save the problem.');
    }
  };

  const handleAddChangeEvent = async () => {
    const area = changeDraft.area.trim();
    const title = changeDraft.title.trim();
    const window = changeDraft.window.trim();
    if (!area || !title || !window) {
      setChangeError('Area, title, and window are required.');
      return;
    }
    setChangeError('');
    const newEvent = {
      id: createId('CHG'),
      area,
      title,
      window,
      status: changeDraft.status,
    };
    try {
      const response = await createChange(newEvent);
      const saved = response.change || newEvent;
      setChangeEvents((prev) => [saved, ...prev]);
      setChangeDraft({ area: '', title: '', window: '', status: 'Planned' });
      setShowChangeForm(false);
    } catch (error) {
      console.error('Failed to create change event', error);
      setChangeError('Unable to save the change event.');
    }
  };

  const handleOpenCatalog = (id) => {
    setCatalogActiveId(id);
    setCatalogError('');
    setCatalogStep(0);
    setDeflectionStats((prev) => ({ ...prev, views: prev.views + 1 }));
  };

  const handleOpenSuggestedArticle = (article) => {
    if (!article) return;
    setDeflectionStats((prev) => ({ ...prev, articleOpens: prev.articleOpens + 1 }));
    setSelectedKnowledgeId(article.id);
    setIsEditingKnowledge(false);
    setKnowledgeDraft(null);
    setActiveSection('knowledge-detail');
  };

  const handleDeflectRequest = () => {
    setDeflectionStats((prev) => ({ ...prev, deflected: prev.deflected + 1 }));
    setCatalogActiveId('');
    setCatalogStep(0);
  };

  const handleExportReport = () => {
    if (typeof document === 'undefined') return;
    const now = Date.now();
    const start = getRangeStart(reportRange, now);
    const rows = tickets.filter((ticket) => ticket.createdAt && ticket.createdAt >= start);
    const headers = [
      'Ticket ID',
      'Title',
      'Requester',
      'Assignee',
      'Status',
      'Category',
      'Priority',
      'Created At',
      'Responded At',
      'Resolved At',
      'Response SLA Met',
      'Resolution SLA Met',
      'CSAT',
    ];
    const escapeCsv = (value) => {
      const raw = value === null || value === undefined ? '' : String(value);
      return `"${raw.replace(/\"/g, '""')}"`;
    };
    const lines = rows.map((ticket) => {
      const policy = getSlaPolicy(ticket.priority);
      const responseMet = ticket.respondedAt ? ticket.respondedAt <= ticket.createdAt + policy.responseMs : false;
      const resolveMet = ticket.resolvedAt ? ticket.resolvedAt <= ticket.createdAt + policy.resolveMs : false;
      return [
        ticket.id,
        ticket.title,
        ticket.requester,
        ticket.assignee,
        ticket.status,
        ticket.category,
        ticket.priority,
        formatEasternDateTime(ticket.createdAt),
        formatEasternDateTime(ticket.respondedAt),
        formatEasternDateTime(ticket.resolvedAt),
        responseMet ? 'Yes' : 'No',
        resolveMet ? 'Yes' : 'No',
        ticket.csat || ticket.satisfactionScore || ticket.csatScore || '',
      ]
        .map(escapeCsv)
        .join(',');
    });
    const csv = [headers.map(escapeCsv).join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ticket-report-${reportRange.replace(/\s+/g, '-').toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCatalogStepChange = (nextStep) => {
    setCatalogError('');
    setCatalogStep(nextStep);
  };

  const handleCloseCatalog = () => {
    setCatalogStep(0);
    setCatalogActiveId('');
    setCatalogError('');
    setCatalogStep(0);
  };

  const applyHubRecord = (record, mapping) => {
    if (!record) return;
    setCatalogDraft((prev) => {
      const next = { ...prev };
      Object.entries(mapping).forEach(([draftKey, value]) => {
        if (!next[draftKey] && value) {
          next[draftKey] = value;
        }
      });
      return next;
    });
  };

  const buildHubName = (record) => buildEmployeeDisplayName(record);

  const createApprovalsForTicket = async (ticket, requirements) => {
    if (!requirements.length) return;
    const now = Date.now();
    const approvalsToCreate = requirements.map((requirement) => ({
      id: createId('APR'),
      type: requirement.type,
      title: requirement.title,
      requester: ticket.requester,
      status: 'Pending',
      due: requirement.due || 'Today',
      approver: requirement.approver || 'IT Manager',
      ticketId: ticket.id,
      createdAt: now,
    }));
    setApprovals((prev) => [...approvalsToCreate, ...prev]);
    setApprovalsMeta((prev) => ({ ...prev, total: prev.total + approvalsToCreate.length }));
    await Promise.all(
      approvalsToCreate.map((approval) =>
        createApproval(approval).catch((error) => {
          console.error('Failed to create approval', error);
        }),
      ),
    );
    const approvalEntries = approvalsToCreate.map((approval) => ({
      id: `entry-${approval.id}`,
      type: 'approval',
      author: 'Workflow',
      time: formatEasternTime(now),
      text: `Approval requested: ${approval.title} (Approver: ${approval.approver}).`,
    }));
    appendEntriesToTicket(ticket.id, approvalEntries);
  };

  const handleAddCatalogItem = async () => {
    const name = catalogItemDraft.name.trim();
    const type = catalogItemDraft.type.trim();
    const eta = catalogItemDraft.eta.trim();
    const approval = catalogItemDraft.approval.trim();
    if (!name || !type || !eta) {
      setCatalogItemError('Name, type, and ETA are required.');
      return;
    }
    setCatalogItemError('');
    const newItem = {
      id: createId('CAT'),
      name,
      type,
      eta,
      approval: approval || 'Approval pending',
    };
    try {
      const response = await createCatalogItem(newItem);
      const saved = response.item || newItem;
      setCatalogItems((prev) => [saved, ...prev]);
      setCatalogItemDraft({ name: '', type: '', eta: '', approval: '' });
      setShowCatalogForm(false);
    } catch (error) {
      console.error('Failed to create catalog item', error);
      setCatalogItemError('Unable to save the catalog item.');
    }
  };

  const handleAddRelease = async () => {
    const title = releaseDraft.title.trim();
    const owner = releaseDraft.owner.trim();
    const window = releaseDraft.window.trim();
    if (!title || !owner || !window) {
      setReleaseError('Title, owner, and window are required.');
      return;
    }
    setReleaseError('');
    const newRelease = {
      id: createId('REL'),
      title,
      status: releaseDraft.status,
      window,
      owner,
    };
    try {
      const response = await createRelease(newRelease);
      const saved = response.release || newRelease;
      setReleases((prev) => [saved, ...prev]);
      setReleaseDraft({ title: '', owner: '', window: '', status: 'Planned' });
      setShowReleaseForm(false);
    } catch (error) {
      console.error('Failed to create release', error);
      setReleaseError('Unable to save the release.');
    }
  };

  const handleCatalogSubmit = async (event) => {
    event.preventDefault();
    let ticketPayload = null;
    let approvalRequirements = [];
    if (catalogActiveId === 'CAT-101') {
      const name = catalogDraft.employeeName.trim();
      const email = catalogDraft.employeeEmail.trim();
      const startDate = catalogDraft.startDate.trim();
      const department = catalogDraft.department.trim();
      if (!name || !email || !startDate || !department) {
        setCatalogError('Employee name, email, start date, and department are required.');
        return;
      }
      const descriptionLines = [
        'New employee onboarding request',
        `Employee: ${name}`,
        `Email: ${email}`,
        `Start date: ${startDate}`,
        `Department: ${department}`,
        catalogDraft.manager.trim() ? `Manager: ${catalogDraft.manager.trim()}` : null,
        catalogDraft.role.trim() ? `Role/Title: ${catalogDraft.role.trim()}` : null,
        catalogDraft.location.trim() ? `Location: ${catalogDraft.location.trim()}` : null,
        catalogDraft.onboardingNeedsHardware && catalogDraft.deviceNeeds.trim()
          ? `Device needs: ${catalogDraft.deviceNeeds.trim()}`
          : null,
        !catalogDraft.onboardingNeedsHardware ? 'Device needs: None' : null,
        catalogDraft.onboardingNeedsAccess && catalogDraft.accessNeeds.trim()
          ? `Access needs: ${catalogDraft.accessNeeds.trim()}`
          : null,
        !catalogDraft.onboardingNeedsAccess ? 'Access needs: None' : null,
        catalogDraft.notes.trim() ? `Notes: ${catalogDraft.notes.trim()}` : null,
      ].filter(Boolean);
      ticketPayload = {
        type: 'Request',
        title: `New employee onboarding - ${name}`,
        requester: name,
        requesterEmail: email,
        department,
        status: 'New',
        priority: 'Medium',
        assignee: 'Unassigned',
        category: 'Onboarding',
        impact: 'Just me',
        urgency: 'Normal',
        contactPreference: 'Email',
        device: catalogDraft.deviceNeeds.trim(),
        description: descriptionLines.join('\n'),
        entries: [],
      };
      approvalRequirements = getApprovalRequirements(catalogActiveId, catalogDraft, onboardingMatch);
    } else if (catalogActiveId === 'CAT-203') {
      const name = catalogDraft.vpnUser.trim();
      const email = catalogDraft.vpnEmail.trim();
      const reason = catalogDraft.vpnReason.trim();
      if (!name || !email || !reason) {
        setCatalogError('Requester name, email, and reason are required.');
        return;
      }
      const descriptionLines = [
        'VPN access request',
        `Requester: ${name}`,
        `Email: ${email}`,
        `Reason: ${reason}`,
        catalogDraft.vpnTemporaryAccess ? 'Access duration: Temporary' : 'Access duration: Ongoing',
        catalogDraft.vpnTemporaryAccess && catalogDraft.vpnStartDate.trim() ? `Start date: ${catalogDraft.vpnStartDate.trim()}` : null,
        catalogDraft.vpnTemporaryAccess && catalogDraft.vpnEndDate.trim() ? `End date: ${catalogDraft.vpnEndDate.trim()}` : null,
        catalogDraft.notes.trim() ? `Notes: ${catalogDraft.notes.trim()}` : null,
      ].filter(Boolean);
      ticketPayload = {
        type: 'Request',
        title: `VPN access request - ${name}`,
        requester: name,
        requesterEmail: email,
        department: catalogDraft.department.trim(),
        status: 'New',
        priority: 'Medium',
        assignee: 'Unassigned',
        category: 'Access',
        impact: 'Just me',
        urgency: 'Normal',
        contactPreference: 'Email',
        description: descriptionLines.join('\n'),
        entries: [],
      };
      approvalRequirements = getApprovalRequirements(catalogActiveId, catalogDraft, vpnMatch);
    } else if (catalogActiveId === 'CAT-312') {
      const name = catalogDraft.laptopUser.trim();
      const email = catalogDraft.laptopEmail.trim();
      const issue = catalogDraft.laptopIssue.trim();
      if (!name || !email || !issue) {
        setCatalogError('Requester name, email, and issue are required.');
        return;
      }
      const descriptionLines = [
        'Laptop replacement request',
        `Requester: ${name}`,
        `Email: ${email}`,
        `Issue: ${issue}`,
        catalogDraft.laptopAssetTag.trim() ? `Asset tag: ${catalogDraft.laptopAssetTag.trim()}` : null,
        catalogDraft.laptopNeedsLoaner ? `Loaner device: Yes (${catalogDraft.laptopLoanerDuration || 'Duration TBD'})` : 'Loaner device: No',
        catalogDraft.laptopNeededBy.trim() ? `Needed by: ${catalogDraft.laptopNeededBy.trim()}` : null,
        catalogDraft.department.trim() ? `Department: ${catalogDraft.department.trim()}` : null,
        catalogDraft.notes.trim() ? `Notes: ${catalogDraft.notes.trim()}` : null,
      ].filter(Boolean);
      ticketPayload = {
        type: 'Request',
        title: `Laptop replacement - ${name}`,
        requester: name,
        requesterEmail: email,
        department: catalogDraft.department.trim(),
        status: 'New',
        priority: 'Medium',
        assignee: 'Unassigned',
        category: 'Hardware',
        impact: 'Just me',
        urgency: 'Normal',
        contactPreference: 'Email',
        device: catalogDraft.laptopAssetTag.trim(),
        description: descriptionLines.join('\n'),
        entries: [],
      };
      approvalRequirements = getApprovalRequirements(catalogActiveId, catalogDraft, laptopMatch);
    } else if (catalogActiveId === 'CAT-404') {
      const name = catalogDraft.softwareUser.trim();
      const email = catalogDraft.softwareEmail.trim();
      const software = catalogDraft.softwareTitle.trim();
      if (!name || !email || !software) {
        setCatalogError('Requester name, email, and software title are required.');
        return;
      }
      const descriptionLines = [
        'Software install request',
        `Requester: ${name}`,
        `Email: ${email}`,
        `Software: ${software}`,
        catalogDraft.softwareJustification.trim() ? `Justification: ${catalogDraft.softwareJustification.trim()}` : null,
        catalogDraft.softwareCostCenter.trim() ? `Cost center: ${catalogDraft.softwareCostCenter.trim()}` : null,
        catalogDraft.softwareRequiresAdmin ? `Admin install required: ${catalogDraft.softwareAdminNeed || 'Yes'}` : 'Admin install required: No',
        catalogDraft.department.trim() ? `Department: ${catalogDraft.department.trim()}` : null,
        catalogDraft.notes.trim() ? `Notes: ${catalogDraft.notes.trim()}` : null,
      ].filter(Boolean);
      ticketPayload = {
        type: 'Request',
        title: `Software install - ${software}`,
        requester: name,
        requesterEmail: email,
        department: catalogDraft.department.trim(),
        status: 'New',
        priority: 'Medium',
        assignee: 'Unassigned',
        category: 'Software',
        impact: 'Just me',
        urgency: 'Normal',
        contactPreference: 'Email',
        description: descriptionLines.join('\n'),
        entries: [],
      };
      approvalRequirements = getApprovalRequirements(catalogActiveId, catalogDraft, softwareMatch);
    } else {
      return;
    }
    setCatalogSubmitting(true);
    setCatalogError('');
    try {
      const response = await createTicket(ticketPayload);
      const createdTicket = response.ticket || ticketPayload;
      setDeflectionStats((prev) => ({ ...prev, submitted: prev.submitted + 1 }));
      const { updatedTickets, changedTickets, logEntries } = applyAutomationRules([createdTicket]);
      const automatedTicket = updatedTickets[0] || createdTicket;
      setTickets((prev) => [automatedTicket, ...prev]);
      if (changedTickets.size) {
        updateTicket(automatedTicket.id, automatedTicket).catch((error) => {
          console.error('Failed to apply automation update', error);
        });
        if (logEntries.length) {
          setAutomationLog((prev) => [...logEntries, ...prev]);
        }
      }
      setTicketsMeta((prev) => ({ ...prev, total: prev.total + 1 }));
      setSelectedTicketId(automatedTicket.id);
      setActiveSection('ticket-detail');
      if (approvalRequirements.length) {
        await createApprovalsForTicket(automatedTicket, approvalRequirements);
      }
      setCatalogDraft({
        employeeName: '',
        employeeEmail: '',
        startDate: '',
        department: '',
        manager: '',
        role: '',
        location: '',
        onboardingNeedsHardware: true,
        onboardingNeedsAccess: true,
        deviceNeeds: '',
        accessNeeds: '',
        notes: '',
        vpnUser: '',
        vpnEmail: '',
        vpnReason: '',
        vpnTemporaryAccess: false,
        vpnStartDate: '',
        vpnEndDate: '',
        laptopUser: '',
        laptopEmail: '',
        laptopIssue: '',
        laptopAssetTag: '',
        laptopNeedsLoaner: false,
        laptopLoanerDuration: '',
        laptopNeededBy: '',
        softwareUser: '',
        softwareEmail: '',
        softwareTitle: '',
        softwareJustification: '',
        softwareCostCenter: '',
        softwareRequiresAdmin: false,
        softwareAdminNeed: '',
      });
      setCatalogStep(0);
      setCatalogActiveId('');
    } catch (error) {
      console.error('Failed to create onboarding ticket', error);
      setCatalogError('Unable to submit the onboarding request.');
    } finally {
      setCatalogSubmitting(false);
    }
  };

  const handleAddCanned = () => {
    if (!cannedDraft.title.trim() || !cannedDraft.body.trim()) return;
    const newResponse = {
      id: createId('CAN'),
      title: cannedDraft.title.trim(),
      body: cannedDraft.body.trim(),
    };
    setCannedResponses((prev) => [newResponse, ...prev]);
    setCannedDraft({ title: '', body: '' });
    setSelectedCannedId(newResponse.id);
    createCannedResponse(newResponse).catch((error) => {
      console.error('Failed to save canned response', error);
      setCannedError('Unable to save the canned response.');
    });
  };

  const handleNavigate = (targetId) => {
    setActiveSection(targetId);
  };

  const handleOpenKnowledge = (articleId) => {
    setSelectedKnowledgeId(articleId);
    setIsEditingKnowledge(false);
    setKnowledgeDraft(null);
    setActiveSection('knowledge-detail');
  };

  const handleEditKnowledge = () => {
    if (!activeKnowledge) return;
    setKnowledgeDraft({
      ...activeKnowledge,
      steps: [...(activeKnowledge.steps || [])],
      notes: [...(activeKnowledge.notes || [])],
    });
    setIsEditingKnowledge(true);
  };

  const handleCancelKnowledgeEdit = () => {
    setIsEditingKnowledge(false);
    if (knowledgeDraft?.isNew) {
      setSelectedKnowledgeId('');
      setActiveSection('knowledge');
    }
    setKnowledgeDraft(null);
  };

  const handleSaveKnowledge = () => {
    if (!knowledgeDraft) return;
    const { isNew, ...nextArticle } = knowledgeDraft;
    setKnowledgeArticles((prev) => {
      const exists = prev.some((article) => article.id === nextArticle.id);
      if (exists) {
        return prev.map((article) => (article.id === nextArticle.id ? nextArticle : article));
      }
      return [nextArticle, ...prev];
    });
    setIsEditingKnowledge(false);
    setSelectedKnowledgeId(knowledgeDraft.id);
    setKnowledgeDraft(null);
  };

  const formatShortDate = () =>
    new Date().toLocaleString('en-US', { month: 'short', day: 'numeric' });

  const resetServiceStatusForm = () => {
    setServiceStatusDraft({ name: '', state: 'Operational' });
    setEditingServiceStatusId('');
    setShowServiceStatusForm(false);
  };

  const handleEditServiceStatus = (item) => {
    setServiceStatusDraft({ name: item.name, state: item.state });
    setEditingServiceStatusId(item.id);
    setShowServiceStatusForm(true);
  };

  const handleSaveServiceStatus = async () => {
    const name = serviceStatusDraft.name.trim();
    const state = serviceStatusDraft.state.trim();
    if (!name || !state) {
      setServiceStatusError('Service name and status are required.');
      return;
    }
    setServiceStatusError('');
    const next = {
      id: editingServiceStatusId || createId('STS'),
      name,
      state,
      color: getServiceStatusColor(state),
    };
    const nextList = editingServiceStatusId
      ? serviceStatus.map((item) => (item.id === next.id ? next : item))
      : [...serviceStatus, next];
    setServiceStatus(nextList);
    resetServiceStatusForm();
    if (!isAuthRequired) {
      writeLocalList(LOCAL_SERVICE_STATUS_KEY, nextList);
      return;
    }
    try {
      if (editingServiceStatusId) {
        await updateServiceStatus(next.id, next);
      } else {
        await createServiceStatus(next);
      }
    } catch (error) {
      console.error('Failed to save service status', error);
      setServiceStatusError('Unable to save the service status.');
    }
  };

  const handleDeleteServiceStatus = (id) => {
    const nextList = serviceStatus.filter((item) => item.id !== id);
    setServiceStatus(nextList);
    if (editingServiceStatusId === id) {
      resetServiceStatusForm();
    }
    if (!isAuthRequired) {
      writeLocalList(LOCAL_SERVICE_STATUS_KEY, nextList);
      return;
    }
    deleteServiceStatus(id).catch((error) => {
      console.error('Failed to delete service status', error);
      setServiceStatusError('Unable to delete the service status.');
    });
  };

  const resetAnnouncementForm = () => {
    setAnnouncementDraft({ title: '', body: '', tag: '', date: '' });
    setEditingAnnouncementId('');
    setShowAnnouncementForm(false);
  };

  const handleEditAnnouncement = (item) => {
    setAnnouncementDraft({
      title: item.title,
      body: item.body,
      tag: item.tag || 'General',
      date: item.date || '',
    });
    setEditingAnnouncementId(item.id);
    setShowAnnouncementForm(true);
  };

  const handleSaveAnnouncement = async () => {
    const title = announcementDraft.title.trim();
    const body = announcementDraft.body.trim();
    if (!title || !body) {
      setAnnouncementError('Title and announcement text are required.');
      return;
    }
    setAnnouncementError('');
    const next = {
      id: editingAnnouncementId || createId('ANN'),
      title,
      body,
      tag: announcementDraft.tag.trim() || 'General',
      date: announcementDraft.date.trim() || formatShortDate(),
    };
    const nextList = editingAnnouncementId
      ? announcements.map((item) => (item.id === next.id ? next : item))
      : [next, ...announcements];
    setAnnouncements(nextList);
    resetAnnouncementForm();
    if (!isAuthRequired) {
      writeLocalList(LOCAL_ANNOUNCEMENTS_KEY, nextList);
      return;
    }
    try {
      if (editingAnnouncementId) {
        await updateAnnouncement(next.id, next);
      } else {
        await createAnnouncement(next);
      }
    } catch (error) {
      console.error('Failed to save announcement', error);
      setAnnouncementError('Unable to save the announcement.');
    }
  };

  const handleDeleteAnnouncement = (id) => {
    const nextList = announcements.filter((item) => item.id !== id);
    setAnnouncements(nextList);
    if (editingAnnouncementId === id) {
      resetAnnouncementForm();
    }
    if (!isAuthRequired) {
      writeLocalList(LOCAL_ANNOUNCEMENTS_KEY, nextList);
      return;
    }
    deleteAnnouncement(id).catch((error) => {
      console.error('Failed to delete announcement', error);
      setAnnouncementError('Unable to delete the announcement.');
    });
  };

  const handleAddKnowledge = () => {
    const newId = createId('KB');
    setSelectedKnowledgeId(newId);
    setKnowledgeDraft({
      id: newId,
      title: '',
      category: 'General',
      updated: formatShortDate(),
      views: 0,
      summary: '',
      audience: 'All staff',
      steps: [],
      notes: [],
      isNew: true,
    });
    setIsEditingKnowledge(true);
    setActiveSection('knowledge-detail');
  };

  const updateKnowledgeDraft = (field, value) => {
    setKnowledgeDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateKnowledgeList = (field, value) => {
    setKnowledgeDraft((prev) => {
      if (!prev) return prev;
      const nextItems = value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
      return { ...prev, [field]: nextItems };
    });
  };

  const openTicketCount = tickets.filter((item) => !['Resolved', 'Closed'].includes(item.status)).length;
  const unassignedCount = tickets.filter((item) => item.assignee === 'Unassigned').length;
  const pendingApprovalsCount = approvals.filter((item) => item.status === 'Pending').length;
  const openWorkCount = workQueue.filter((item) => item.status !== 'Completed').length;

  const metrics = [
    {
      label: 'Open tickets',
      value: openTicketCount,
      sub: 'Active incidents and requests',
      icon: Mail,
      ariaLabel: 'View open tickets',
      onClick: () => {
        setSearch('');
        setTicketFilter('All');
        handleNavigate('tickets');
      },
    },
    {
      label: 'Unassigned',
      value: unassignedCount,
      sub: 'Needs ownership',
      icon: PenLine,
      ariaLabel: 'View unassigned tickets',
      onClick: () => {
        setSearch('');
        setTicketFilter('All');
        handleNavigate('tickets');
      },
    },
    {
      label: 'Approvals waiting',
      value: pendingApprovalsCount,
      sub: 'Needs review',
      icon: CheckCircle2,
      ariaLabel: 'View approvals waiting',
      onClick: () => {
        setSearch('');
        handleNavigate('approvals');
      },
    },
    {
      label: 'Tasks in flight',
      value: openWorkCount,
      sub: 'Assigned to your queue',
      icon: PenLine,
      ariaLabel: 'View tasks in flight',
      onClick: () => {
        setSearch('');
        handleNavigate('my-work');
      },
    },
  ];

  const currentUserRole = TECHNICIANS.find((tech) => tech.name === currentUser)?.role || 'IT Support';
  const isReadOnlyPortal = process.env.REACT_APP_APP_VARIANT === 'request';

  if (isAuthRequired && !currentUser) {
    return (
      <div className="helpdesk-app auth">
        <div className="auth-shell">
          <div className="card auth-card">
            <div className="auth-header">
              <div className="brand-mark">
                <span className="brand-initials">UDS</span>
              </div>
              <div>
                <h1>UDS IT Support</h1>
                <p>Select your name and continue to Duo verification to enter the support workspace.</p>
              </div>
            </div>
            <div className="auth-form">
              {authError && (
                <div className="form-alert error">
                  <div className="form-alert-message">{authError}</div>
                </div>
              )}
              <label className="control-label">
                Technician
                <select
                  className="control-select"
                  value={selectedUser}
                  onChange={(event) => setSelectedUser(event.target.value)}
                >
                  <option value="">Select your name</option>
                  {TECHNICIANS.map((tech) => (
                    <option key={tech.name} value={tech.name}>
                      {tech.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn btn-primary" type="button" onClick={handleSignIn} disabled={!selectedUser}>
                Continue with Duo
              </button>
              <div className="form-alert">
                <div className="form-alert-message">Access notes</div>
                <div className="form-alert-details">
                  <div>Access is limited to IT Support team members.</div>
                  <div>You will be redirected to Duo for verification.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="helpdesk-app">
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              <span className="brand-initials">UDS</span>
            </div>
            <div>
              <div className="brand-title">UDS Help Desk</div>
              <div className="brand-subtitle">IT operations workspace</div>
            </div>
          </div>
          <nav className="nav">
            {navItems.map((item) => (
              <NavItem key={item.id} item={item} isActive={activeSection === item.targetId} onClick={handleNavigate} />
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="card compact">
              <div className="section-title">On-call status</div>
              <p className="sidebar-meta">Geoffrey Heller - until 6:00p</p>
              <div className="list-inline">
                <InlineTag>Queue: 14</InlineTag>
                <InlineTag>Escalations: 2</InlineTag>
              </div>
            </div>
          </div>
        </aside>

        <div className="workspace">
          <header className="topbar">
            <div className="topbar-search">
              <Search size={18} />
              <input
                className="search-input"
                placeholder="Search tickets, people, assets, or queues..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="topbar-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => handleNavigate('tickets')}>
                View tickets
              </button>
              <button
                className="btn btn-ghost btn-small"
                type="button"
                onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              >
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
              <button className="btn btn-primary" type="button" onClick={() => handleNavigate('tickets')}>
                <Plus size={16} />
                New ticket
              </button>
              <div className="topbar-user">
                <span className="user-pill">
                  {currentUser} - {currentUserRole}
                </span>
                <button className="btn btn-ghost btn-small" type="button" onClick={handleSignOut}>
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <main className="workspace-main">
            {activeSection === 'overview' && (
              <>
                <section className="hero">
                  <div className="hero-main">
                    <span className="pill">
                      <Sparkles size={16} />
                      IT Support workspace
                    </span>
                    <h1 className="display-title">Manage the queue, resolve faster, keep SLAs visible.</h1>
                    <p className="hero-sub">
                      Assign tickets, track approvals, and coordinate changes from one place. Everything stays searchable and easy to triage.
                    </p>
                    <div className="cta-row">
                      <button className="btn btn-primary" type="button" onClick={() => handleNavigate('tickets')}>
                        <Mail size={18} />
                        Review tickets
                      </button>
                      <button className="btn btn-ghost" type="button" onClick={() => handleNavigate('my-work')}>
                        <PenLine size={18} />
                        Go to My Work
                      </button>
                    </div>
                  </div>
                  <div className="hero-side">
                    <div className="card compact">
                      <div className="list-inline" style={{ justifyContent: 'space-between', width: '100%' }}>
                        <div className="section-title">Service status</div>
                        {!isReadOnlyPortal && (
                          <button
                            className="btn btn-ghost btn-small"
                            type="button"
                            onClick={() => (showServiceStatusForm ? resetServiceStatusForm() : setShowServiceStatusForm(true))}
                          >
                            {showServiceStatusForm ? 'Close' : 'Manage'}
                          </button>
                        )}
                      </div>
                      {serviceStatusError && (
                        <div className="form-alert error">
                          <div className="form-alert-message">{serviceStatusError}</div>
                        </div>
                      )}
                      {serviceStatus.length ? (
                        serviceStatus.map((item) => (
                          <div key={item.id} className="status-row">
                            <span>{item.name}</span>
                            <div className="list-inline">
                              <span className="status-pill service-status-pill">
                                <span className="status-dot" style={{ background: getServiceStatusColor(item.state) }} />
                                {item.state}
                              </span>
                              {!isReadOnlyPortal && showServiceStatusForm && (
                                <>
                                  <button className="btn btn-ghost btn-small" type="button" onClick={() => handleEditServiceStatus(item)}>
                                    Edit
                                  </button>
                                  <button className="btn btn-ghost btn-small" type="button" onClick={() => handleDeleteServiceStatus(item.id)}>
                                    Remove
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="empty-state">
                          <p>No service status updates yet.</p>
                        </div>
                      )}
                      {showServiceStatusForm && !isReadOnlyPortal && (
                        <div className="detail-card">
                          <div className="detail-label">
                            {editingServiceStatusId ? 'Edit service status' : 'Add service status'}
                          </div>
                          <label className="label">
                            Service name
                            <input
                              className="input"
                              value={serviceStatusDraft.name}
                              onChange={(event) => setServiceStatusDraft((prev) => ({ ...prev, name: event.target.value }))}
                              placeholder="e.g. Email and MFA"
                            />
                          </label>
                          <label className="label">
                            Status
                            <select
                              className="control-select"
                              value={serviceStatusDraft.state}
                              onChange={(event) => setServiceStatusDraft((prev) => ({ ...prev, state: event.target.value }))}
                            >
                              {SERVICE_STATUS_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="list-inline">
                            <button className="btn btn-primary btn-small" type="button" onClick={handleSaveServiceStatus}>
                              {editingServiceStatusId ? 'Save status' : 'Add status'}
                            </button>
                            <button className="btn btn-ghost btn-small" type="button" onClick={resetServiceStatusForm}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="card compact">
                      <div className="list-inline" style={{ justifyContent: 'space-between', width: '100%' }}>
                        <div className="section-title">Announcements</div>
                        {!isReadOnlyPortal && (
                          <button
                            className="btn btn-ghost btn-small"
                            type="button"
                            onClick={() => (showAnnouncementForm ? resetAnnouncementForm() : setShowAnnouncementForm(true))}
                          >
                            {showAnnouncementForm ? 'Close' : 'Manage'}
                          </button>
                        )}
                      </div>
                      {announcementError && (
                        <div className="form-alert error">
                          <div className="form-alert-message">{announcementError}</div>
                        </div>
                      )}
                      <div className="announcement-list">
                        {announcements.length ? (
                          announcements.map((item) => (
                            <AnnouncementCard
                              key={item.id}
                              item={item}
                              isReadOnly={isReadOnlyPortal || !showAnnouncementForm}
                              onEdit={showAnnouncementForm ? handleEditAnnouncement : null}
                              onRemove={showAnnouncementForm ? handleDeleteAnnouncement : null}
                            />
                          ))
                        ) : (
                          <div className="empty-state">
                            <p>No announcements posted yet.</p>
                          </div>
                        )}
                      </div>
                      {showAnnouncementForm && !isReadOnlyPortal && (
                        <div className="detail-card">
                          <div className="detail-label">
                            {editingAnnouncementId ? 'Edit announcement' : 'Add announcement'}
                          </div>
                          <label className="label">
                            Title
                            <input
                              className="input"
                              value={announcementDraft.title}
                              onChange={(event) => setAnnouncementDraft((prev) => ({ ...prev, title: event.target.value }))}
                              placeholder="e.g. VPN gateway maintenance"
                            />
                          </label>
                          <label className="label">
                            Tag
                            <input
                              className="input"
                              value={announcementDraft.tag}
                              onChange={(event) => setAnnouncementDraft((prev) => ({ ...prev, tag: event.target.value }))}
                              placeholder="e.g. Network"
                            />
                          </label>
                          <label className="label">
                            Date
                            <input
                              className="input"
                              value={announcementDraft.date}
                              onChange={(event) => setAnnouncementDraft((prev) => ({ ...prev, date: event.target.value }))}
                              placeholder={formatShortDate()}
                            />
                          </label>
                          <label className="label">
                            Message
                            <textarea
                              className="textarea"
                              value={announcementDraft.body}
                              onChange={(event) => setAnnouncementDraft((prev) => ({ ...prev, body: event.target.value }))}
                              placeholder="Share the update details."
                            />
                          </label>
                          <div className="list-inline">
                            <button className="btn btn-primary btn-small" type="button" onClick={handleSaveAnnouncement}>
                              {editingAnnouncementId ? 'Save announcement' : 'Add announcement'}
                            </button>
                            <button className="btn btn-ghost btn-small" type="button" onClick={resetAnnouncementForm}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="metrics-grid">
                  {metrics.map((item, index) => (
                    <MetricCard key={item.label} item={item} style={{ animationDelay: `${index * 80}ms` }} />
                  ))}
                </section>

                <section className="ticket-preview-section">
                  <TicketPreviewCard title="Queue spotlight" ticket={previewTicket} onOpen={handleOpenTicket} />
                </section>
              </>
            )}

            {activeSection === 'tickets' && (
              <section className="card">
                <div className="section-title">Tickets</div>
                <h2 className="section-heading">Incoming and active tickets</h2>
                <p className="section-sub">Assign, update, and resolve from a single queue.</p>
                <p className="ticket-intake">Intake: {INTAKE_EMAIL} via {INTAKE_SOURCE}</p>
                <div className="list-inline filter-row" role="group" aria-label="Filter tickets by status">
                  {TICKET_FILTERS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`chip filter-chip${ticketFilter === option ? ' active' : ''}`}
                      onClick={() => setTicketFilter(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <div className="tickets-layout">
                  <div className="ticket-list">
                    {ticketsError && (
                      <div className="empty-state">
                        <p>{ticketsError}</p>
                      </div>
                    )}
                    {ticketsLoading && !ticketsError && (
                      <div className="empty-state">
                        <p>Loading tickets...</p>
                      </div>
                    )}
                    {!ticketsLoading &&
                      !ticketsError &&
                      tickets.map((item) => (
                        <TicketRow
                          key={item.id}
                          item={item}
                          isActive={activeTicket?.id === item.id}
                          onSelect={handleSelectTicket}
                          onOpen={handleOpenTicket}
                        />
                      ))}
                    {!ticketsLoading && !ticketsError && tickets.length === 0 && (
                      <div className="empty-state">
                        <p>No tickets match this filter. Try adjusting the search or filter.</p>
                      </div>
                    )}
                    <PaginationControls
                      page={ticketPage}
                      pageSize={TICKET_PAGE_SIZE}
                      total={ticketsMeta.total || tickets.length}
                      onPageChange={setTicketPage}
                      isLoading={ticketsLoading}
                    />
                  </div>
                  <div className="ticket-preview-panel">
                    <TicketPreviewCard title="Quick preview" ticket={activeTicket} onOpen={handleOpenTicket} compact />
                    <p className="preview-footnote">Open the ticket workspace to edit status, ownership, and SLAs.</p>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'ticket-detail' && (
                <TicketDetail
                  activeTicket={activeTicket}
                  currentUser={currentUser}
                  assignees={ASSIGNEES}
                  statusOptions={STATUS_OPTIONS}
                  intakeEmail={INTAKE_EMAIL}
                  intakeSource={INTAKE_SOURCE}
                  requesterRecord={requesterRecord}
                  requesterAssets={requesterAssets}
                  problems={problems}
                  changeEvents={changeEvents}
                  cannedResponses={cannedResponses}
                  selectedCannedId={selectedCannedId}
                  onSelectCannedId={setSelectedCannedId}
                  pendingCannedBody={pendingCannedBody}
                  onConsumeCannedBody={() => setPendingCannedBody('')}
                onBack={() => handleNavigate('tickets')}
                onTicketUpdate={handleTicketUpdate}
                onAddEntry={handleAddEntry}
              />
            )}

            {activeSection === 'my-work' && (
              <section className="grid grid-two">
                <div className="card">
                  <div className="section-title">My work</div>
                  <h2 className="section-heading">Assigned tickets</h2>
                  <p className="section-sub">Only items assigned to you show here.</p>
                  <div className="ticket-list compact">
                    {myWorkTickets.map((item) => (
                      <TicketRow
                        key={item.id}
                        item={item}
                        isActive={activeTicket?.id === item.id}
                        onSelect={handleSelectTicket}
                        onOpen={handleOpenTicket}
                      />
                    ))}
                    {myWorkTickets.length === 0 && (
                      <div className="empty-state">
                        <p>No tickets assigned to you yet.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="card">
                  <div className="section-title">My work</div>
                  <h2 className="section-heading">Assigned tasks</h2>
                  <p className="section-sub">Tasks and requests you own in the queue.</p>
                  <div className="work-list">
                    {myWorkTasks.map((item) => (
                      <WorkItem key={item.id} item={item} onOpen={handleOpenTicket} />
                    ))}
                    {myWorkTasks.length === 0 && (
                      <div className="empty-state">
                        <p>No tasks assigned to you yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'team-queue' && (
              <section className="card">
                <div className="section-title">Team queue</div>
                <h2 className="section-heading">Tickets and tasks across the team</h2>
                <p className="section-sub">Filter by type, search by requester, and keep SLAs visible.</p>
                <div className="list-inline filter-row" role="group" aria-label="Filter work by type">
                  {WORK_FILTERS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`chip filter-chip${workFilter === option ? ' active' : ''}`}
                      onClick={() => setWorkFilter(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <div className="work-list">
                  {filteredWorkQueue.map((item) => (
                    <WorkItem key={item.id} item={item} onOpen={handleOpenTicket} />
                  ))}
                  {filteredWorkQueue.length === 0 && (
                    <div className="empty-state">
                      <p>No work items match this filter. Try clearing the search or adjusting filters.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeSection === 'approvals' && (
              <section className="card">
                <div className="section-title">Approvals</div>
                <h2 className="section-heading">Requests waiting on you</h2>
                <p className="section-sub">Approve quickly, or deny with feedback when needed.</p>
                <div className="approval-list">
                  {approvalsError && (
                    <div className="empty-state">
                      <p>{approvalsError}</p>
                    </div>
                  )}
                  {approvalsLoading && !approvalsError && (
                    <div className="empty-state">
                      <p>Loading approvals...</p>
                    </div>
                  )}
                  {!approvalsLoading &&
                    !approvalsError &&
                    approvals.map((item) => <ApprovalRow key={item.id} item={item} onDecision={handleApprovalDecision} />)}
                  {!approvalsLoading && !approvalsError && approvals.length === 0 && (
                    <div className="empty-state">
                      <p>No approvals match your search.</p>
                    </div>
                  )}
                  <PaginationControls
                    page={approvalPage}
                    pageSize={APPROVAL_PAGE_SIZE}
                    total={approvalsMeta.total || approvals.length}
                    onPageChange={setApprovalPage}
                    isLoading={approvalsLoading}
                  />
                </div>
              </section>
            )}

            {activeSection === 'service-catalog' && (
              <section className="card">
                <div className="section-title">Service Catalog</div>
                <h2 className="section-heading">Standard requests and workflows</h2>
                <p className="section-sub">Launch new requests from predefined service offerings.</p>
                <div className="ticket-actions">
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowCatalogForm(true)}>
                    Add request
                  </button>
                </div>
                <div className="catalog-metrics">
                  <div className="detail-card">
                    <div className="detail-label">Deflection analytics</div>
                    <div className="list-inline">
                      <InlineTag>{deflectionStats.views} request views</InlineTag>
                      <InlineTag>{deflectionStats.articleOpens} KB opens</InlineTag>
                      <InlineTag>{deflectionStats.deflected} resolved without ticket</InlineTag>
                      <InlineTag>{deflectionStats.submitted} submitted</InlineTag>
                    </div>
                    <p className="work-meta">Track how many requests are resolved by self-service.</p>
                  </div>
                </div>
                <div className="module-grid">
                  {catalogItems.map((item) => (
                    <div key={item.id} className="module-card">
                      <div className="list-inline">
                        <InlineTag>{item.type}</InlineTag>
                        <InlineTag className="mono">{item.id}</InlineTag>
                      </div>
                      <h3>{item.name}</h3>
                      <p>ETA: {item.eta}</p>
                      <p>Approval: {item.approval}</p>
                      <button className="btn btn-primary btn-small" type="button" onClick={() => handleOpenCatalog(item.id)}>
                        Request
                      </button>
                    </div>
                  ))}
                </div>
                {showCatalogForm && (
                  <>
                    {catalogItemError && (
                      <div className="form-alert error">
                        <div className="form-alert-message">{catalogItemError}</div>
                      </div>
                    )}
                    <div className="detail-card">
                      <div className="detail-label">Add service request</div>
                      <label className="label">
                        Name
                        <input
                          className="input"
                          value={catalogItemDraft.name}
                          onChange={(event) => setCatalogItemDraft((prev) => ({ ...prev, name: event.target.value }))}
                          placeholder="e.g. MFA reset"
                        />
                      </label>
                      <label className="label">
                        Type
                        <input
                          className="input"
                          value={catalogItemDraft.type}
                          onChange={(event) => setCatalogItemDraft((prev) => ({ ...prev, type: event.target.value }))}
                          placeholder="e.g. Access"
                        />
                      </label>
                      <label className="label">
                        ETA
                        <input
                          className="input"
                          value={catalogItemDraft.eta}
                          onChange={(event) => setCatalogItemDraft((prev) => ({ ...prev, eta: event.target.value }))}
                          placeholder="e.g. 1 day"
                        />
                      </label>
                      <label className="label">
                        Approval
                        <input
                          className="input"
                          value={catalogItemDraft.approval}
                          onChange={(event) => setCatalogItemDraft((prev) => ({ ...prev, approval: event.target.value }))}
                          placeholder="e.g. Manager approval"
                        />
                      </label>
                      <div className="list-inline">
                        <button className="btn btn-primary btn-small" type="button" onClick={handleAddCatalogItem}>
                          Add request
                        </button>
                        <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowCatalogForm(false)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {catalogActiveId === 'CAT-101' &&
                  (() => {
                    const steps = ['Employee basics', 'Role & location', 'Equipment & access', 'Review'];
                    const isLastStep = catalogStep === steps.length - 1;
                    const canProceed =
                      catalogStep === 0
                        ? Boolean(
                            catalogDraft.employeeName.trim() &&
                              catalogDraft.employeeEmail.trim() &&
                              catalogDraft.startDate.trim() &&
                              catalogDraft.department.trim(),
                          )
                        : true;

                    return (
                      <form className="detail-card wizard-form" onSubmit={handleCatalogSubmit}>
                        <div className="wizard-header">
                          <div>
                            <div className="detail-label">New employee onboarding</div>
                            <div className="wizard-title">New employee onboarding intake</div>
                            <div className="wizard-step-count">
                              Step {catalogStep + 1} of {steps.length} · {steps[catalogStep]}
                            </div>
                          </div>
                        </div>
                        <WizardSteps steps={steps} currentStep={catalogStep} />
                        <div className="wizard-body">
                          {catalogStep === 0 && (
                            <>
                              <label className="label">
                                Employee name
                                <input
                                  className="input"
                                  value={catalogDraft.employeeName}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, employeeName: event.target.value }))}
                                  placeholder="e.g. Jamie Rivera"
                                />
                              </label>
                              <label className="label">
                                Employee email
                                <input
                                  className="input"
                                  type="email"
                                  value={catalogDraft.employeeEmail}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, employeeEmail: event.target.value }))}
                                  placeholder="e.g. jamier@udservices.org"
                                />
                              </label>
                              <label className="label">
                                Start date
                                <input
                                  className="input"
                                  value={catalogDraft.startDate}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, startDate: event.target.value }))}
                                  placeholder="e.g. 2026-02-01"
                                />
                              </label>
                              <label className="label">
                                Department
                                <input
                                  className="input"
                                  value={catalogDraft.department}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, department: event.target.value }))}
                                  placeholder="e.g. HCBS"
                                />
                              </label>
                              <HubMatchCard
                                record={onboardingMatch}
                                onApply={() =>
                                  applyHubRecord(onboardingMatch, {
                                    employeeName: buildHubName(onboardingMatch),
                                    employeeEmail: onboardingMatch?.email,
                                    department: onboardingMatch?.department,
                                    manager: onboardingMatch?.supervisor,
                                    role: onboardingMatch?.jobTitle,
                                    location: onboardingMatch?.location,
                                  })
                                }
                              />
                              <SuggestedArticles
                                articles={catalogSuggestedArticles}
                                onOpen={handleOpenSuggestedArticle}
                                onDeflect={handleDeflectRequest}
                              />
                            </>
                          )}
                          {catalogStep === 1 && (
                            <>
                              <label className="label">
                                Manager
                                <input
                                  className="input"
                                  value={catalogDraft.manager}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, manager: event.target.value }))}
                                  placeholder="e.g. Chris Moore"
                                />
                              </label>
                              <label className="label">
                                Role/Title
                                <input
                                  className="input"
                                  value={catalogDraft.role}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, role: event.target.value }))}
                                  placeholder="e.g. Program Specialist"
                                />
                              </label>
                              <label className="label">
                                Location
                                <input
                                  className="input"
                                  value={catalogDraft.location}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, location: event.target.value }))}
                                  placeholder="e.g. Corporate Blvd"
                                />
                              </label>
                            </>
                          )}
                          {catalogStep === 2 && (
                            <>
                              <label className="label">
                                Provision hardware?
                                <select
                                  className="control-select"
                                  value={catalogDraft.onboardingNeedsHardware ? 'Yes' : 'No'}
                                  onChange={(event) =>
                                    setCatalogDraft((prev) => ({
                                      ...prev,
                                      onboardingNeedsHardware: event.target.value === 'Yes',
                                    }))
                                  }
                                >
                                  <option>Yes</option>
                                  <option>No</option>
                                </select>
                              </label>
                              {catalogDraft.onboardingNeedsHardware && (
                                <label className="label">
                                  Device needs
                                  <input
                                    className="input"
                                    value={catalogDraft.deviceNeeds}
                                    onChange={(event) => setCatalogDraft((prev) => ({ ...prev, deviceNeeds: event.target.value }))}
                                    placeholder="e.g. Laptop + docking station"
                                  />
                                </label>
                              )}
                              <label className="label">
                                Provision access?
                                <select
                                  className="control-select"
                                  value={catalogDraft.onboardingNeedsAccess ? 'Yes' : 'No'}
                                  onChange={(event) =>
                                    setCatalogDraft((prev) => ({
                                      ...prev,
                                      onboardingNeedsAccess: event.target.value === 'Yes',
                                    }))
                                  }
                                >
                                  <option>Yes</option>
                                  <option>No</option>
                                </select>
                              </label>
                              {catalogDraft.onboardingNeedsAccess && (
                                <label className="label">
                                  Access needs
                                  <input
                                    className="input"
                                    value={catalogDraft.accessNeeds}
                                    onChange={(event) => setCatalogDraft((prev) => ({ ...prev, accessNeeds: event.target.value }))}
                                    placeholder="e.g. Teams, Salesforce"
                                  />
                                </label>
                              )}
                              <label className="label">
                                Notes
                                <textarea
                                  className="textarea"
                                  value={catalogDraft.notes}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, notes: event.target.value }))}
                                  placeholder="Anything else we should know."
                                />
                              </label>
                            </>
                          )}
                          {catalogStep === 3 && (
                            <div className="wizard-review">
                              <div className="detail-label">Review request details</div>
                              <div className="wizard-review-list">
                                <div className="wizard-review-item">
                                  <strong>Employee:</strong> {catalogDraft.employeeName || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Email:</strong> {catalogDraft.employeeEmail || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Start date:</strong> {catalogDraft.startDate || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Department:</strong> {catalogDraft.department || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Manager:</strong> {catalogDraft.manager || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Role/Title:</strong> {catalogDraft.role || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Location:</strong> {catalogDraft.location || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Hardware:</strong>{' '}
                                  {catalogDraft.onboardingNeedsHardware
                                    ? catalogDraft.deviceNeeds || 'Requested'
                                    : 'No hardware needed'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Access:</strong>{' '}
                                  {catalogDraft.onboardingNeedsAccess
                                    ? catalogDraft.accessNeeds || 'Requested'
                                    : 'No access needed'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Notes:</strong> {catalogDraft.notes || 'Not provided'}
                                </div>
                                {getApprovalRequirements(catalogActiveId, catalogDraft, onboardingMatch).length > 0 && (
                                  <div className="wizard-review-item">
                                    <strong>Approvals:</strong>{' '}
                                    {getApprovalRequirements(catalogActiveId, catalogDraft, onboardingMatch)
                                      .map((item) => `${item.type} (${item.approver})`)
                                      .join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {catalogError && <div className="form-alert error">{catalogError}</div>}
                        <div className="wizard-actions">
                          <button
                            className="btn btn-ghost btn-small"
                            type="button"
                            onClick={handleCloseCatalog}
                            disabled={catalogSubmitting}
                          >
                            Cancel
                          </button>
                          <div className="wizard-actions-right">
                            {catalogStep > 0 && (
                              <button
                                className="btn btn-ghost btn-small"
                                type="button"
                                onClick={() => handleCatalogStepChange(catalogStep - 1)}
                              >
                                Back
                              </button>
                            )}
                            {!isLastStep ? (
                              <button
                                className="btn btn-primary btn-small"
                                type="button"
                                onClick={() => handleCatalogStepChange(catalogStep + 1)}
                                disabled={!canProceed}
                              >
                                Next
                              </button>
                            ) : (
                              <button className="btn btn-primary btn-small" type="submit" disabled={catalogSubmitting}>
                                {catalogSubmitting ? 'Submitting...' : 'Submit request'}
                              </button>
                            )}
                          </div>
                        </div>
                      </form>
                    );
                  })()}
                {catalogActiveId === 'CAT-203' &&
                  (() => {
                    const steps = ['Requester', 'Access details', 'Review'];
                    const isLastStep = catalogStep === steps.length - 1;
                    const canProceed =
                      catalogStep === 0
                        ? Boolean(catalogDraft.vpnUser.trim() && catalogDraft.vpnEmail.trim())
                        : catalogStep === 1
                          ? Boolean(
                              catalogDraft.vpnReason.trim() &&
                                (!catalogDraft.vpnTemporaryAccess || catalogDraft.vpnEndDate.trim()),
                            )
                          : true;

                    return (
                      <form className="detail-card wizard-form" onSubmit={handleCatalogSubmit}>
                        <div className="wizard-header">
                          <div>
                            <div className="detail-label">VPN access request</div>
                            <div className="wizard-title">VPN access request</div>
                            <div className="wizard-step-count">
                              Step {catalogStep + 1} of {steps.length} · {steps[catalogStep]}
                            </div>
                          </div>
                        </div>
                        <WizardSteps steps={steps} currentStep={catalogStep} />
                        <div className="wizard-body">
                          {catalogStep === 0 && (
                            <>
                              <label className="label">
                                Requester name
                                <input
                                  className="input"
                                  value={catalogDraft.vpnUser}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, vpnUser: event.target.value }))}
                                  placeholder="e.g. Renee Alston"
                                />
                              </label>
                              <label className="label">
                                Requester email
                                <input
                                  className="input"
                                  type="email"
                                  value={catalogDraft.vpnEmail}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, vpnEmail: event.target.value }))}
                                  placeholder="e.g. renee@udservices.org"
                                />
                              </label>
                              <label className="label">
                                Department (optional)
                                <input
                                  className="input"
                                  value={catalogDraft.department}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, department: event.target.value }))}
                                  placeholder="e.g. HCBS"
                                />
                              </label>
                              <HubMatchCard
                                record={vpnMatch}
                                onApply={() =>
                                  applyHubRecord(vpnMatch, {
                                    vpnUser: buildHubName(vpnMatch),
                                    vpnEmail: vpnMatch?.email,
                                    department: vpnMatch?.department,
                                  })
                                }
                              />
                              <SuggestedArticles
                                articles={catalogSuggestedArticles}
                                onOpen={handleOpenSuggestedArticle}
                                onDeflect={handleDeflectRequest}
                              />
                            </>
                          )}
                          {catalogStep === 1 && (
                            <>
                              <label className="label">
                                Reason for access
                                <textarea
                                  className="textarea"
                                  value={catalogDraft.vpnReason}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, vpnReason: event.target.value }))}
                                  placeholder="Describe the remote access need."
                                />
                              </label>
                              <label className="label">
                                Temporary access?
                                <select
                                  className="control-select"
                                  value={catalogDraft.vpnTemporaryAccess ? 'Yes' : 'No'}
                                  onChange={(event) =>
                                    setCatalogDraft((prev) => ({
                                      ...prev,
                                      vpnTemporaryAccess: event.target.value === 'Yes',
                                    }))
                                  }
                                >
                                  <option>No</option>
                                  <option>Yes</option>
                                </select>
                              </label>
                              {catalogDraft.vpnTemporaryAccess && (
                                <>
                                  <label className="label">
                                    Start date (optional)
                                    <input
                                      className="input"
                                      value={catalogDraft.vpnStartDate}
                                      onChange={(event) => setCatalogDraft((prev) => ({ ...prev, vpnStartDate: event.target.value }))}
                                      placeholder="e.g. 2026-02-01"
                                    />
                                  </label>
                                  <label className="label">
                                    End date
                                    <input
                                      className="input"
                                      value={catalogDraft.vpnEndDate}
                                      onChange={(event) => setCatalogDraft((prev) => ({ ...prev, vpnEndDate: event.target.value }))}
                                      placeholder="Leave blank if ongoing"
                                    />
                                  </label>
                                </>
                              )}
                              <label className="label">
                                Notes
                                <textarea
                                  className="textarea"
                                  value={catalogDraft.notes}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, notes: event.target.value }))}
                                  placeholder="Anything else we should know."
                                />
                              </label>
                            </>
                          )}
                          {catalogStep === 2 && (
                            <div className="wizard-review">
                              <div className="detail-label">Review request details</div>
                              <div className="wizard-review-list">
                                <div className="wizard-review-item">
                                  <strong>Requester:</strong> {catalogDraft.vpnUser || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Email:</strong> {catalogDraft.vpnEmail || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Department:</strong> {catalogDraft.department || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Reason:</strong> {catalogDraft.vpnReason || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Access duration:</strong>{' '}
                                  {catalogDraft.vpnTemporaryAccess ? 'Temporary' : 'Ongoing'}
                                </div>
                                {catalogDraft.vpnTemporaryAccess && (
                                  <>
                                    <div className="wizard-review-item">
                                      <strong>Start date:</strong> {catalogDraft.vpnStartDate || 'Not provided'}
                                    </div>
                                    <div className="wizard-review-item">
                                      <strong>End date:</strong> {catalogDraft.vpnEndDate || 'Not provided'}
                                    </div>
                                  </>
                                )}
                                <div className="wizard-review-item">
                                  <strong>Notes:</strong> {catalogDraft.notes || 'Not provided'}
                                </div>
                                {getApprovalRequirements(catalogActiveId, catalogDraft, vpnMatch).length > 0 && (
                                  <div className="wizard-review-item">
                                    <strong>Approvals:</strong>{' '}
                                    {getApprovalRequirements(catalogActiveId, catalogDraft, vpnMatch)
                                      .map((item) => `${item.type} (${item.approver})`)
                                      .join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {catalogError && <div className="form-alert error">{catalogError}</div>}
                        <div className="wizard-actions">
                          <button
                            className="btn btn-ghost btn-small"
                            type="button"
                            onClick={handleCloseCatalog}
                            disabled={catalogSubmitting}
                          >
                            Cancel
                          </button>
                          <div className="wizard-actions-right">
                            {catalogStep > 0 && (
                              <button
                                className="btn btn-ghost btn-small"
                                type="button"
                                onClick={() => handleCatalogStepChange(catalogStep - 1)}
                              >
                                Back
                              </button>
                            )}
                            {!isLastStep ? (
                              <button
                                className="btn btn-primary btn-small"
                                type="button"
                                onClick={() => handleCatalogStepChange(catalogStep + 1)}
                                disabled={!canProceed}
                              >
                                Next
                              </button>
                            ) : (
                              <button className="btn btn-primary btn-small" type="submit" disabled={catalogSubmitting}>
                                {catalogSubmitting ? 'Submitting...' : 'Submit request'}
                              </button>
                            )}
                          </div>
                        </div>
                      </form>
                    );
                  })()}
                {catalogActiveId === 'CAT-312' &&
                  (() => {
                    const steps = ['Requester', 'Issue details', 'Review'];
                    const isLastStep = catalogStep === steps.length - 1;
                    const canProceed =
                      catalogStep === 0
                        ? Boolean(catalogDraft.laptopUser.trim() && catalogDraft.laptopEmail.trim())
                        : catalogStep === 1
                          ? Boolean(
                              catalogDraft.laptopIssue.trim() &&
                                (!catalogDraft.laptopNeedsLoaner || catalogDraft.laptopLoanerDuration.trim()),
                            )
                          : true;

                    return (
                      <form className="detail-card wizard-form" onSubmit={handleCatalogSubmit}>
                        <div className="wizard-header">
                          <div>
                            <div className="detail-label">Laptop replacement</div>
                            <div className="wizard-title">Laptop replacement request</div>
                            <div className="wizard-step-count">
                              Step {catalogStep + 1} of {steps.length} · {steps[catalogStep]}
                            </div>
                          </div>
                        </div>
                        <WizardSteps steps={steps} currentStep={catalogStep} />
                        <div className="wizard-body">
                          {catalogStep === 0 && (
                            <>
                              <label className="label">
                                Requester name
                                <input
                                  className="input"
                                  value={catalogDraft.laptopUser}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, laptopUser: event.target.value }))}
                                  placeholder="e.g. Jamie Rivera"
                                />
                              </label>
                              <label className="label">
                                Requester email
                                <input
                                  className="input"
                                  type="email"
                                  value={catalogDraft.laptopEmail}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, laptopEmail: event.target.value }))}
                                  placeholder="e.g. jamier@udservices.org"
                                />
                              </label>
                              <label className="label">
                                Department (optional)
                                <input
                                  className="input"
                                  value={catalogDraft.department}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, department: event.target.value }))}
                                  placeholder="e.g. HCBS"
                                />
                              </label>
                              <HubMatchCard
                                record={laptopMatch}
                                onApply={() =>
                                  applyHubRecord(laptopMatch, {
                                    laptopUser: buildHubName(laptopMatch),
                                    laptopEmail: laptopMatch?.email,
                                    department: laptopMatch?.department,
                                    laptopAssetTag: laptopMatch?.computer,
                                  })
                                }
                              />
                              <SuggestedArticles
                                articles={catalogSuggestedArticles}
                                onOpen={handleOpenSuggestedArticle}
                                onDeflect={handleDeflectRequest}
                              />
                            </>
                          )}
                          {catalogStep === 1 && (
                            <>
                              <label className="label">
                                Issue summary
                                <textarea
                                  className="textarea"
                                  value={catalogDraft.laptopIssue}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, laptopIssue: event.target.value }))}
                                  placeholder="Describe the performance or hardware issue."
                                />
                              </label>
                              <label className="label">
                                Asset tag (optional)
                                <input
                                  className="input"
                                  value={catalogDraft.laptopAssetTag}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, laptopAssetTag: event.target.value }))}
                                  placeholder="e.g. LAPTOP418"
                                />
                              </label>
                              <label className="label">
                                Loaner device needed?
                                <select
                                  className="control-select"
                                  value={catalogDraft.laptopNeedsLoaner ? 'Yes' : 'No'}
                                  onChange={(event) =>
                                    setCatalogDraft((prev) => ({
                                      ...prev,
                                      laptopNeedsLoaner: event.target.value === 'Yes',
                                    }))
                                  }
                                >
                                  <option>No</option>
                                  <option>Yes</option>
                                </select>
                              </label>
                              {catalogDraft.laptopNeedsLoaner && (
                                <label className="label">
                                  Loaner duration
                                  <input
                                    className="input"
                                    value={catalogDraft.laptopLoanerDuration}
                                    onChange={(event) => setCatalogDraft((prev) => ({ ...prev, laptopLoanerDuration: event.target.value }))}
                                    placeholder="e.g. 2 weeks"
                                  />
                                </label>
                              )}
                              <label className="label">
                                Needed by (optional)
                                <input
                                  className="input"
                                  value={catalogDraft.laptopNeededBy}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, laptopNeededBy: event.target.value }))}
                                  placeholder="e.g. Next Friday"
                                />
                              </label>
                              <label className="label">
                                Notes
                                <textarea
                                  className="textarea"
                                  value={catalogDraft.notes}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, notes: event.target.value }))}
                                  placeholder="Anything else we should know."
                                />
                              </label>
                            </>
                          )}
                          {catalogStep === 2 && (
                            <div className="wizard-review">
                              <div className="detail-label">Review request details</div>
                              <div className="wizard-review-list">
                                <div className="wizard-review-item">
                                  <strong>Requester:</strong> {catalogDraft.laptopUser || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Email:</strong> {catalogDraft.laptopEmail || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Department:</strong> {catalogDraft.department || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Issue:</strong> {catalogDraft.laptopIssue || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Asset tag:</strong> {catalogDraft.laptopAssetTag || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Loaner device:</strong>{' '}
                                  {catalogDraft.laptopNeedsLoaner
                                    ? catalogDraft.laptopLoanerDuration || 'Requested'
                                    : 'No'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Needed by:</strong> {catalogDraft.laptopNeededBy || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Notes:</strong> {catalogDraft.notes || 'Not provided'}
                                </div>
                                {getApprovalRequirements(catalogActiveId, catalogDraft, laptopMatch).length > 0 && (
                                  <div className="wizard-review-item">
                                    <strong>Approvals:</strong>{' '}
                                    {getApprovalRequirements(catalogActiveId, catalogDraft, laptopMatch)
                                      .map((item) => `${item.type} (${item.approver})`)
                                      .join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {catalogError && <div className="form-alert error">{catalogError}</div>}
                        <div className="wizard-actions">
                          <button
                            className="btn btn-ghost btn-small"
                            type="button"
                            onClick={handleCloseCatalog}
                            disabled={catalogSubmitting}
                          >
                            Cancel
                          </button>
                          <div className="wizard-actions-right">
                            {catalogStep > 0 && (
                              <button
                                className="btn btn-ghost btn-small"
                                type="button"
                                onClick={() => handleCatalogStepChange(catalogStep - 1)}
                              >
                                Back
                              </button>
                            )}
                            {!isLastStep ? (
                              <button
                                className="btn btn-primary btn-small"
                                type="button"
                                onClick={() => handleCatalogStepChange(catalogStep + 1)}
                                disabled={!canProceed}
                              >
                                Next
                              </button>
                            ) : (
                              <button className="btn btn-primary btn-small" type="submit" disabled={catalogSubmitting}>
                                {catalogSubmitting ? 'Submitting...' : 'Submit request'}
                              </button>
                            )}
                          </div>
                        </div>
                      </form>
                    );
                  })()}
                {catalogActiveId === 'CAT-404' &&
                  (() => {
                    const steps = ['Requester', 'Software details', 'Review'];
                    const isLastStep = catalogStep === steps.length - 1;
                    const canProceed =
                      catalogStep === 0
                        ? Boolean(catalogDraft.softwareUser.trim() && catalogDraft.softwareEmail.trim())
                        : catalogStep === 1
                          ? Boolean(
                              catalogDraft.softwareTitle.trim() &&
                                (!catalogDraft.softwareRequiresAdmin || catalogDraft.softwareAdminNeed.trim()),
                            )
                          : true;

                    return (
                      <form className="detail-card wizard-form" onSubmit={handleCatalogSubmit}>
                        <div className="wizard-header">
                          <div>
                            <div className="detail-label">Software install</div>
                            <div className="wizard-title">Software install request</div>
                            <div className="wizard-step-count">
                              Step {catalogStep + 1} of {steps.length} · {steps[catalogStep]}
                            </div>
                          </div>
                        </div>
                        <WizardSteps steps={steps} currentStep={catalogStep} />
                        <div className="wizard-body">
                          {catalogStep === 0 && (
                            <>
                              <label className="label">
                                Requester name
                                <input
                                  className="input"
                                  value={catalogDraft.softwareUser}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, softwareUser: event.target.value }))}
                                  placeholder="e.g. Paul Antic"
                                />
                              </label>
                              <label className="label">
                                Requester email
                                <input
                                  className="input"
                                  type="email"
                                  value={catalogDraft.softwareEmail}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, softwareEmail: event.target.value }))}
                                  placeholder="e.g. paul@udservices.org"
                                />
                              </label>
                              <label className="label">
                                Department (optional)
                                <input
                                  className="input"
                                  value={catalogDraft.department}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, department: event.target.value }))}
                                  placeholder="e.g. Resource Center"
                                />
                              </label>
                              <HubMatchCard
                                record={softwareMatch}
                                onApply={() =>
                                  applyHubRecord(softwareMatch, {
                                    softwareUser: buildHubName(softwareMatch),
                                    softwareEmail: softwareMatch?.email,
                                    department: softwareMatch?.department,
                                  })
                                }
                              />
                              <SuggestedArticles
                                articles={catalogSuggestedArticles}
                                onOpen={handleOpenSuggestedArticle}
                                onDeflect={handleDeflectRequest}
                              />
                            </>
                          )}
                          {catalogStep === 1 && (
                            <>
                              <label className="label">
                                Software title
                                <input
                                  className="input"
                                  value={catalogDraft.softwareTitle}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, softwareTitle: event.target.value }))}
                                  placeholder="e.g. Adobe Acrobat Pro"
                                />
                              </label>
                              <label className="label">
                                Justification
                                <textarea
                                  className="textarea"
                                  value={catalogDraft.softwareJustification}
                                  onChange={(event) =>
                                    setCatalogDraft((prev) => ({ ...prev, softwareJustification: event.target.value }))
                                  }
                                  placeholder="Describe why this is needed."
                                />
                              </label>
                              <label className="label">
                                Cost center (optional)
                                <input
                                  className="input"
                                  value={catalogDraft.softwareCostCenter}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, softwareCostCenter: event.target.value }))}
                                  placeholder="e.g. HCBS-112"
                                />
                              </label>
                              <label className="label">
                                Admin install required?
                                <select
                                  className="control-select"
                                  value={catalogDraft.softwareRequiresAdmin ? 'Yes' : 'No'}
                                  onChange={(event) =>
                                    setCatalogDraft((prev) => ({
                                      ...prev,
                                      softwareRequiresAdmin: event.target.value === 'Yes',
                                    }))
                                  }
                                >
                                  <option>No</option>
                                  <option>Yes</option>
                                </select>
                              </label>
                              {catalogDraft.softwareRequiresAdmin && (
                                <label className="label">
                                  Admin install justification
                                  <textarea
                                    className="textarea"
                                    value={catalogDraft.softwareAdminNeed}
                                    onChange={(event) => setCatalogDraft((prev) => ({ ...prev, softwareAdminNeed: event.target.value }))}
                                    placeholder="Describe the admin-level need."
                                  />
                                </label>
                              )}
                              <label className="label">
                                Notes
                                <textarea
                                  className="textarea"
                                  value={catalogDraft.notes}
                                  onChange={(event) => setCatalogDraft((prev) => ({ ...prev, notes: event.target.value }))}
                                  placeholder="Anything else we should know."
                                />
                              </label>
                            </>
                          )}
                          {catalogStep === 2 && (
                            <div className="wizard-review">
                              <div className="detail-label">Review request details</div>
                              <div className="wizard-review-list">
                                <div className="wizard-review-item">
                                  <strong>Requester:</strong> {catalogDraft.softwareUser || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Email:</strong> {catalogDraft.softwareEmail || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Department:</strong> {catalogDraft.department || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Software:</strong> {catalogDraft.softwareTitle || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Justification:</strong> {catalogDraft.softwareJustification || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Cost center:</strong> {catalogDraft.softwareCostCenter || 'Not provided'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Admin install:</strong>{' '}
                                  {catalogDraft.softwareRequiresAdmin
                                    ? catalogDraft.softwareAdminNeed || 'Requested'
                                    : 'No'}
                                </div>
                                <div className="wizard-review-item">
                                  <strong>Notes:</strong> {catalogDraft.notes || 'Not provided'}
                                </div>
                                {getApprovalRequirements(catalogActiveId, catalogDraft, softwareMatch).length > 0 && (
                                  <div className="wizard-review-item">
                                    <strong>Approvals:</strong>{' '}
                                    {getApprovalRequirements(catalogActiveId, catalogDraft, softwareMatch)
                                      .map((item) => `${item.type} (${item.approver})`)
                                      .join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {catalogError && <div className="form-alert error">{catalogError}</div>}
                        <div className="wizard-actions">
                          <button
                            className="btn btn-ghost btn-small"
                            type="button"
                            onClick={handleCloseCatalog}
                            disabled={catalogSubmitting}
                          >
                            Cancel
                          </button>
                          <div className="wizard-actions-right">
                            {catalogStep > 0 && (
                              <button
                                className="btn btn-ghost btn-small"
                                type="button"
                                onClick={() => handleCatalogStepChange(catalogStep - 1)}
                              >
                                Back
                              </button>
                            )}
                            {!isLastStep ? (
                              <button
                                className="btn btn-primary btn-small"
                                type="button"
                                onClick={() => handleCatalogStepChange(catalogStep + 1)}
                                disabled={!canProceed}
                              >
                                Next
                              </button>
                            ) : (
                              <button className="btn btn-primary btn-small" type="submit" disabled={catalogSubmitting}>
                                {catalogSubmitting ? 'Submitting...' : 'Submit request'}
                              </button>
                            )}
                          </div>
                        </div>
                      </form>
                    );
                  })()}
              </section>
            )}

            {activeSection === 'knowledge' && (
              <section className="card">
                <div className="section-title">Knowledge Base</div>
                <h2 className="section-heading">Articles and troubleshooting guides</h2>
                <p className="section-sub">Curated answers for common issues and workflows.</p>
                <div className="ticket-actions">
                  <button className="btn btn-primary btn-small" type="button" onClick={handleAddKnowledge}>
                    Add article
                  </button>
                </div>
                {knowledgeGroups.length ? (
                  <div className="knowledge-grid">
                    {knowledgeGroups.flatMap((group) =>
                      group.articles.map((article) => (
                        <button
                          key={article.id}
                          className="knowledge-card"
                          type="button"
                          onClick={() => handleOpenKnowledge(article.id)}
                        >
                          <div className="knowledge-card-header">
                            <InlineTag className="category-chip" style={getKnowledgeCategoryStyle(group.category)}>
                              {group.category}
                            </InlineTag>
                            <InlineTag className="mono">{article.id}</InlineTag>
                          </div>
                          <div className="knowledge-card-title">{article.title}</div>
                          <div className="knowledge-card-summary">{article.summary}</div>
                          <div className="knowledge-card-meta">
                            {article.updated} · {article.views} views
                          </div>
                        </button>
                      )),
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No knowledge articles match the current search.</p>
                  </div>
                )}
              </section>
            )}

            {activeSection === 'knowledge-detail' && (
              <section className="card">
                <div className="ticket-detail-hero">
                  <div>
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => handleNavigate('knowledge')}>
                      Back to knowledge base
                    </button>
                    <div className="section-title">Knowledge Base</div>
                    <h2 className="section-heading">
                      {isEditingKnowledge ? knowledgeDraft?.title || 'Knowledge article' : knowledgeView?.title || 'Knowledge article'}
                    </h2>
                    <p className="section-sub">
                      {isEditingKnowledge
                        ? knowledgeDraft?.summary || 'Detailed guidance for this topic.'
                        : knowledgeView?.summary || 'Detailed guidance for this topic.'}
                    </p>
                  </div>
                {knowledgeView && (
                  <div className="ticket-detail-hero-meta">
                    <InlineTag
                      className="category-chip"
                      style={getKnowledgeCategoryStyle(knowledgeView.category || 'General')}
                    >
                      {knowledgeView.category || 'General'}
                    </InlineTag>
                    <InlineTag className="mono">{knowledgeView.id}</InlineTag>
                  </div>
                )}
                </div>

                {knowledgeView ? (
                  <div className="ticket-detail">
                    <div className="ticket-actions">
                      {!isEditingKnowledge ? (
                        <button className="btn btn-ghost btn-small" type="button" onClick={handleEditKnowledge}>
                          Edit article
                        </button>
                      ) : (
                        <>
                          <button className="btn btn-primary btn-small" type="button" onClick={handleSaveKnowledge}>
                            Save changes
                          </button>
                          <button className="btn btn-ghost btn-small" type="button" onClick={handleCancelKnowledgeEdit}>
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                    <div className="ticket-detail-grid">
                      <div className="detail-card">
                        <div className="detail-label">Audience</div>
                        {isEditingKnowledge ? (
                          <input
                            className="input"
                            value={knowledgeDraft?.audience || ''}
                            onChange={(event) => updateKnowledgeDraft('audience', event.target.value)}
                            placeholder="e.g. IT support, Facilities"
                          />
                        ) : (
                          <div className="detail-value">{knowledgeView.audience || 'All staff'}</div>
                        )}
                        <div className="detail-label">Last updated</div>
                        {isEditingKnowledge ? (
                          <input
                            className="input"
                            value={knowledgeDraft?.updated || ''}
                            onChange={(event) => updateKnowledgeDraft('updated', event.target.value)}
                            placeholder="e.g. Oct 12"
                          />
                        ) : (
                          <div className="detail-value">{knowledgeView.updated}</div>
                        )}
                      </div>
                      <div className="detail-card">
                        <div className="detail-label">Views</div>
                        {isEditingKnowledge ? (
                          <input
                            className="input"
                            value={knowledgeDraft?.views ?? ''}
                            onChange={(event) => updateKnowledgeDraft('views', Number(event.target.value || 0))}
                            placeholder="0"
                            type="number"
                          />
                        ) : (
                          <div className="detail-value">{knowledgeView.views}</div>
                        )}
                        <div className="detail-label">Category</div>
                        {isEditingKnowledge ? (
                          <input
                            className="input"
                            value={knowledgeDraft?.category || ''}
                            onChange={(event) => updateKnowledgeDraft('category', event.target.value)}
                            placeholder="e.g. Network"
                          />
                        ) : (
                          <div className="detail-value">{knowledgeView.category}</div>
                        )}
                      </div>
                    </div>

                    <div className="detail-card">
                      <div className="detail-label">Summary</div>
                      {isEditingKnowledge ? (
                        <textarea
                          className="textarea"
                          value={knowledgeDraft?.summary || ''}
                          onChange={(event) => updateKnowledgeDraft('summary', event.target.value)}
                          placeholder="Short summary"
                        />
                      ) : (
                        <p className="work-meta">{knowledgeView.summary}</p>
                      )}
                    </div>

                    <div className="detail-card">
                      <div className="detail-label">Steps</div>
                      {isEditingKnowledge ? (
                        <textarea
                          className="textarea"
                          value={(knowledgeDraft?.steps || []).join('\n')}
                          onChange={(event) => updateKnowledgeList('steps', event.target.value)}
                          placeholder="One step per line"
                        />
                      ) : (
                        <ol className="escalation-list kb-list">
                          {(knowledgeView.steps || []).map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      )}
                    </div>

                    {(isEditingKnowledge || (knowledgeView.notes && knowledgeView.notes.length > 0)) && (
                      <div className="detail-card">
                        <div className="detail-label">Notes</div>
                        {isEditingKnowledge ? (
                          <textarea
                            className="textarea"
                            value={(knowledgeDraft?.notes || []).join('\n')}
                            onChange={(event) => updateKnowledgeList('notes', event.target.value)}
                            placeholder="One note per line"
                          />
                        ) : (
                          <ul className="escalation-list kb-list">
                            {knowledgeView.notes.map((note) => (
                              <li key={note}>{note}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>Select an article to view details.</p>
                  </div>
                )}
              </section>
            )}

            {activeSection === 'directory' && (
              <section className="card directory-page">
                <div className="section-title">Employee directory</div>
                <h2 className="section-heading">Employee Information Hub</h2>
                <p className="section-sub">Profiles, roles, locations, and assets paired with official headshots.</p>
                <div className="directory-summary">
                  <div className="list-inline">
                    <InlineTag>{directoryTotals.total} employees</InlineTag>
                    <InlineTag>{directoryTotals.departments} departments</InlineTag>
                    <InlineTag>{directoryTotals.locations} locations</InlineTag>
                    {directorySearchTerm && <InlineTag>{directoryRecords.length} results</InlineTag>}
                  </div>
                  <div className="directory-meta">Data source: Employee Information Hub.</div>
                  {directorySearchTerm && (
                    <div className="directory-meta">
                      Showing {directoryRecords.length} result{directoryRecords.length === 1 ? '' : 's'} for "
                      {search.trim()}".
                    </div>
                  )}
                </div>
                {directoryPageRecords.length ? (
                  <div className="directory-grid">
                    {directoryPageRecords.map((record) => (
                      <EmployeeCard
                        key={record.employeeId || record.email || `${record.firstName}-${record.lastName}`}
                        record={record}
                        photoFile={getEmployeePhotoFile(record, employeePhotoLookup)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No employees found. Try a different search.</p>
                  </div>
                )}
                <PaginationControls
                  page={directoryPage}
                  pageSize={EMPLOYEE_DIRECTORY_PAGE_SIZE}
                  total={directoryRecords.length}
                  onPageChange={setDirectoryPage}
                  isLoading={false}
                />
              </section>
            )}

            {activeSection === 'problems' && (
              <section className="card">
                <div className="section-title">Problems</div>
                <h2 className="section-heading">Root cause and known errors</h2>
                <p className="section-sub">Track recurring incidents and permanent fixes.</p>
                <div className="ticket-actions">
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowProblemForm(true)}>
                    Add problem
                  </button>
                </div>
                <div className="record-list">
                  {problems.map((problem) => (
                    <div key={problem.id} className="record-row">
                      <div>
                        <div className="list-inline">
                          <InlineTag className="mono">{problem.id}</InlineTag>
                          <span className={`status-pill status-${toKebabCase(problem.status)}`}>{problem.status}</span>
                        </div>
                        <p className="work-title">{problem.title}</p>
                        <p className="work-meta">
                          Impact: {problem.impact} · Owner: {problem.owner || 'Unassigned'} · Linked incidents: {problem.linked}
                        </p>
                        {problem.rootCause && <p className="work-meta">Root cause: {problem.rootCause}</p>}
                        {problem.workaround && <p className="work-meta">Workaround: {problem.workaround}</p>}
                      </div>
                      <button className="btn btn-ghost btn-small" type="button">
                        Review
                      </button>
                    </div>
                  ))}
                </div>
                {showProblemForm && (
                  <>
                    {problemError && (
                      <div className="form-alert error">
                        <div className="form-alert-message">{problemError}</div>
                      </div>
                    )}
                    <div className="detail-card">
                      <div className="detail-label">Add problem</div>
                      <label className="label">
                        Title
                        <input
                          className="input"
                          value={problemDraft.title}
                          onChange={(event) => setProblemDraft((prev) => ({ ...prev, title: event.target.value }))}
                          placeholder="e.g. VPN drops every 20 minutes"
                        />
                      </label>
                      <label className="label">
                        Impact
                        <input
                          className="input"
                          value={problemDraft.impact}
                          onChange={(event) => setProblemDraft((prev) => ({ ...prev, impact: event.target.value }))}
                          placeholder="e.g. Multiple teams"
                        />
                      </label>
                      <label className="label">
                        Owner
                        <input
                          className="input"
                          value={problemDraft.owner}
                          onChange={(event) => setProblemDraft((prev) => ({ ...prev, owner: event.target.value }))}
                          placeholder="e.g. Geoffrey Heller"
                        />
                      </label>
                      <label className="label">
                        Status
                        <select
                          className="control-select"
                          value={problemDraft.status}
                          onChange={(event) => setProblemDraft((prev) => ({ ...prev, status: event.target.value }))}
                        >
                          {PROBLEM_STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="label">
                        Linked incidents
                        <input
                          className="input"
                          value={problemDraft.linked}
                          onChange={(event) => setProblemDraft((prev) => ({ ...prev, linked: event.target.value }))}
                          placeholder="e.g. 3"
                        />
                      </label>
                      <label className="label">
                        Root cause
                        <textarea
                          className="textarea"
                          value={problemDraft.rootCause}
                          onChange={(event) => setProblemDraft((prev) => ({ ...prev, rootCause: event.target.value }))}
                          placeholder="Describe the underlying root cause."
                        />
                      </label>
                      <label className="label">
                        Workaround
                        <textarea
                          className="textarea"
                          value={problemDraft.workaround}
                          onChange={(event) => setProblemDraft((prev) => ({ ...prev, workaround: event.target.value }))}
                          placeholder="Current mitigation or workaround."
                        />
                      </label>
                      <label className="label">
                        Fix plan
                        <textarea
                          className="textarea"
                          value={problemDraft.fixPlan}
                          onChange={(event) => setProblemDraft((prev) => ({ ...prev, fixPlan: event.target.value }))}
                          placeholder="Planned permanent fix."
                        />
                      </label>
                      <div className="list-inline">
                        <button className="btn btn-primary btn-small" type="button" onClick={handleAddProblem}>
                          Add problem
                        </button>
                        <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowProblemForm(false)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}

            {activeSection === 'reports' && (
              <section className="card reports-section">
                <div className="reports-header">
                  <div>
                    <div className="section-title">Reports</div>
                    <h2 className="section-heading">Analytics & compliance</h2>
                    <p className="section-sub">Operational health across tickets, SLAs, and team performance.</p>
                  </div>
                  <div className="reports-controls">
                    <label className="control-label">
                      <span>Reporting window</span>
                      <select
                        className="control-select"
                        value={reportRange}
                        onChange={(event) => setReportRange(event.target.value)}
                      >
                        {reportRanges.map((range) => (
                          <option key={range} value={range}>
                            {range}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="report-export">
                      <button className="btn btn-ghost btn-small" type="button" onClick={handleExportReport}>
                        Export CSV
                      </button>
                      <button className="btn btn-primary btn-small" type="button">
                        Schedule report
                      </button>
                    </div>
                  </div>
                </div>

                <div className="reports-kpis">
                  {reportData.kpis.map((item) => (
                    <ReportKpiCard key={item.label} item={item} />
                  ))}
                </div>

                <div className="reports-grid">
                  <TrendBars
                    title="Ticket volume"
                    items={reportData.volumeTrend}
                    hint="Intake volume across the selected period."
                    icon={BarChart3}
                  />
                  <ReportBarList
                    title="Channel mix"
                    items={reportData.channelMix}
                    hint="How tickets enter the queue."
                    icon={PieChart}
                  />
                </div>

                <div className="reports-grid">
                  <ReportBarList
                    title="Category mix"
                    items={reportData.categoryMix}
                    hint="Top issue areas by ticket share."
                    icon={PieChart}
                  />
                  <ReportBarList
                    title="Priority mix"
                    items={reportData.priorityMix}
                    hint="Distribution by severity."
                    icon={Layers}
                  />
                </div>

                <div className="reports-grid">
                  <ReportBarList
                    title="SLA compliance by priority"
                    items={reportData.slaByPriority}
                    hint="Percent resolved within SLA."
                    icon={ShieldCheck}
                  />
                  <ReportBarList
                    title="Backlog aging"
                    items={reportData.backlogAging}
                    hint="Open ticket age distribution."
                    icon={Clock}
                  />
                </div>

                <div className="reports-grid">
                  <ReportBarList
                    title="SLA compliance by category"
                    items={reportData.slaByCategory}
                    hint="Resolution SLA by category."
                    icon={ShieldCheck}
                  />
                  <ReportBarList
                    title="SLA compliance by queue"
                    items={reportData.slaByQueue}
                    hint="Resolution SLA by assignee."
                    icon={Users}
                  />
                </div>

                <div className="reports-grid">
                  <TrendBars title="CSAT trend" items={reportData.csatTrend} hint="Average score over time." icon={TrendingUp} />
                  <ReportBarList
                    title="Change success rate"
                    items={reportData.changeSuccess}
                    hint="Outcome rate for scheduled changes."
                    icon={CheckCircle2}
                  />
                </div>

                <div className="reports-grid">
                  <ReportBarList
                    title="CSAT by category"
                    items={reportData.csatByCategory}
                    hint="Average CSAT per category."
                    icon={TrendingUp}
                    valueSuffix="/5"
                  />
                  <ReportBarList
                    title="CSAT by assignee"
                    items={reportData.csatByQueue}
                    hint="Average CSAT per assignee."
                    icon={Users}
                    valueSuffix="/5"
                  />
                </div>

                <div className="reports-grid reports-grid-wide">
                  <div className="report-card">
                    <div className="report-card-header">
                      <div>
                        <h3>Technician performance</h3>
                        <p>Assigned vs resolved volume, SLA health, and reopen rate.</p>
                      </div>
                      <span className="report-card-icon">
                        <Users size={16} />
                      </span>
                    </div>
                    <div className="report-table-wrapper">
                      <table className="report-table">
                        <thead>
                          <tr>
                            <th>Technician</th>
                            <th>Assigned</th>
                            <th>Resolved</th>
                            <th>First response</th>
                            <th>SLA hit rate</th>
                            <th>Reopens</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.teamPerformance.map((item) => (
                            <tr key={item.name}>
                              <td>{item.name}</td>
                              <td>{item.assigned}</td>
                              <td>{item.resolved}</td>
                              <td>{item.firstResponse}</td>
                              <td>{item.sla}%</td>
                              <td>{item.reopen}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="report-card">
                    <div className="report-card-header">
                      <div>
                        <h3>Top requesters</h3>
                        <p>Organizations submitting the most tickets.</p>
                      </div>
                      <span className="report-card-icon">
                        <Users size={16} />
                      </span>
                    </div>
                    <div className="report-list">
                      {reportData.topRequesters.map((item) => (
                        <div key={item.name} className="report-list-row">
                          <span>{item.name}</span>
                          <span className="report-list-value">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="report-card">
                    <div className="report-card-header">
                      <div>
                        <h3>Self-service deflection</h3>
                        <p>Catalog views vs deflected requests.</p>
                      </div>
                      <span className="report-card-icon">
                        <CheckCircle2 size={16} />
                      </span>
                    </div>
                    <div className="report-list">
                      <div className="report-list-row">
                        <span>Request views</span>
                        <span className="report-list-value">{deflectionStats.views}</span>
                      </div>
                      <div className="report-list-row">
                        <span>KB opens</span>
                        <span className="report-list-value">{deflectionStats.articleOpens}</span>
                      </div>
                      <div className="report-list-row">
                        <span>Resolved without ticket</span>
                        <span className="report-list-value">{deflectionStats.deflected}</span>
                      </div>
                      <div className="report-list-row">
                        <span>Requests submitted</span>
                        <span className="report-list-value">{deflectionStats.submitted}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'surveys' && (
              <section className="card">
                <div className="section-title">Surveys</div>
                <h2 className="section-heading">Customer satisfaction and feedback</h2>
                <p className="section-sub">Manage CSAT surveys tied to ticket milestones.</p>
                <div className="record-list">
                  {csatSurveys.map((survey) => (
                    <div key={survey.id} className="record-row">
                      <div>
                        <div className="list-inline">
                          <InlineTag className="mono">{survey.id}</InlineTag>
                          <span className={`status-pill status-${toKebabCase(survey.status)}`}>{survey.status}</span>
                        </div>
                        <p className="work-title">{survey.title}</p>
                        <p className="work-meta">
                          Responses: {survey.responses} - Score: {survey.score}
                        </p>
                      </div>
                      <button className="btn btn-ghost btn-small" type="button">
                        Configure
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeSection === 'assets' && (
              <section className="card">
                <div className="section-title">Assets</div>
                <h2 className="section-heading">Hardware and software inventory</h2>
                <p className="section-sub">Track assigned equipment and maintenance status.</p>
                <div className="record-list">
                  {assetInventory.map((asset) => (
                    <div key={asset.id} className="record-row">
                      <div>
                        <div className="list-inline">
                          <InlineTag className="mono">{asset.id}</InlineTag>
                          <span className={`status-pill status-${toKebabCase(asset.status)}`}>{asset.status}</span>
                        </div>
                        <p className="work-title">{asset.name}</p>
                        <p className="work-meta">
                          {asset.user} - {asset.location}
                        </p>
                      </div>
                      <button className="btn btn-ghost btn-small" type="button">
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeSection === 'cmdb' && (
              <section className="card">
                <div className="section-title">CMDB</div>
                <h2 className="section-heading">Configuration items and services</h2>
                <p className="section-sub">Service relationships and operational status.</p>
                <div className="ticket-actions">
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowCmdbForm((prev) => !prev)}>
                    {showCmdbForm ? 'Close form' : 'Add CI'}
                  </button>
                </div>
                {cmdbError && (
                  <div className="form-alert error">
                    <div className="form-alert-message">{cmdbError}</div>
                  </div>
                )}
                {showCmdbForm && (
                  <div className="detail-card">
                    <div className="detail-label">Add configuration item</div>
                    <label className="label">
                      Name
                      <input
                        className="input"
                        value={cmdbDraft.name}
                        onChange={(event) => setCmdbDraft((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="e.g. Jira Cloud"
                      />
                    </label>
                    <label className="label">
                      Type
                      <input
                        className="input"
                        value={cmdbDraft.type}
                        onChange={(event) => setCmdbDraft((prev) => ({ ...prev, type: event.target.value }))}
                        placeholder="e.g. SaaS platform"
                      />
                    </label>
                    <label className="label">
                      Owner
                      <input
                        className="input"
                        value={cmdbDraft.owner}
                        onChange={(event) => setCmdbDraft((prev) => ({ ...prev, owner: event.target.value }))}
                        placeholder="e.g. IT Ops"
                      />
                    </label>
                    <label className="label">
                      Status
                      <select
                        className="control-select"
                        value={cmdbDraft.status}
                        onChange={(event) => setCmdbDraft((prev) => ({ ...prev, status: event.target.value }))}
                      >
                        {CMDB_STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="label">
                      Environment
                      <input
                        className="input"
                        value={cmdbDraft.environment}
                        onChange={(event) => setCmdbDraft((prev) => ({ ...prev, environment: event.target.value }))}
                        placeholder="e.g. Production"
                      />
                    </label>
                    <label className="label">
                      Criticality
                      <input
                        className="input"
                        value={cmdbDraft.criticality}
                        onChange={(event) => setCmdbDraft((prev) => ({ ...prev, criticality: event.target.value }))}
                        placeholder="e.g. Medium"
                      />
                    </label>
                    <label className="label">
                      Location
                      <input
                        className="input"
                        value={cmdbDraft.location}
                        onChange={(event) => setCmdbDraft((prev) => ({ ...prev, location: event.target.value }))}
                        placeholder="e.g. AWS us-east-1"
                      />
                    </label>
                    <label className="label">
                      Service tier
                      <input
                        className="input"
                        value={cmdbDraft.serviceTier}
                        onChange={(event) => setCmdbDraft((prev) => ({ ...prev, serviceTier: event.target.value }))}
                        placeholder="e.g. Tier 2"
                      />
                    </label>
                    <label className="label">
                      Support window
                      <input
                        className="input"
                        value={cmdbDraft.supportWindow}
                        onChange={(event) => setCmdbDraft((prev) => ({ ...prev, supportWindow: event.target.value }))}
                        placeholder="e.g. 24x7"
                      />
                    </label>
                    <label className="label">
                      Description
                      <textarea
                        className="textarea"
                        value={cmdbDraft.description}
                        onChange={(event) => setCmdbDraft((prev) => ({ ...prev, description: event.target.value }))}
                        placeholder="Describe the service or system."
                      />
                    </label>
                    <label className="label">
                      Documentation URL
                      <input
                        className="input"
                        value={cmdbDraft.documentation}
                        onChange={(event) => setCmdbDraft((prev) => ({ ...prev, documentation: event.target.value }))}
                        placeholder="https://..."
                      />
                    </label>
                    <label className="label">
                      Dependencies (comma-separated)
                      <input
                        className="input"
                        value={cmdbDraft.dependencies}
                        onChange={(event) => setCmdbDraft((prev) => ({ ...prev, dependencies: event.target.value }))}
                        placeholder="e.g. Entra ID, Okta"
                      />
                    </label>
                    <div className="list-inline">
                      <button className="btn btn-primary btn-small" type="button" onClick={handleAddCmdbItem}>
                        Add CI
                      </button>
                      <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowCmdbForm(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {filteredCmdbRecords.length ? (
                  <div className="record-list">
                    {filteredCmdbRecords.map((item) => {
                      const tasks = Array.isArray(item.tasks) ? item.tasks : [];
                      const completedTasks = tasks.filter((task) => task.done).length;
                      const isOpen = openCmdbId === item.id;

                      return (
                        <div key={item.id} className={`record-row cmdb-row${isOpen ? ' open' : ''}`}>
                          <div>
                            <div className="list-inline">
                              <InlineTag className="mono">{item.id}</InlineTag>
                              <span className={`status-pill status-${toKebabCase(item.status)}`}>{item.status}</span>
                            </div>
                            <p className="work-title">{item.name}</p>
                            <p className="work-meta">
                              {item.type} - Owner: {item.owner}
                            </p>
                          </div>
                          <button className="btn btn-ghost btn-small" type="button" onClick={() => handleToggleCmdbItem(item.id)}>
                            {isOpen ? 'Close' : 'Open'}
                          </button>
                          {isOpen && (
                            <div className="cmdb-details">
                              <div className="cmdb-detail-grid">
                                <div>
                                  <div className="detail-label">Status</div>
                                  <select
                                    className="control-select"
                                    value={item.status}
                                    onChange={(event) => handleUpdateCmdbItem(item.id, { status: event.target.value })}
                                  >
                                    {CMDB_STATUS_OPTIONS.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <div className="detail-label">Owner</div>
                                  <input
                                    className="input"
                                    value={item.owner}
                                    onChange={(event) => handleUpdateCmdbItem(item.id, { owner: event.target.value })}
                                  />
                                </div>
                                <div>
                                  <div className="detail-label">Environment</div>
                                  <div className="detail-value">{item.environment || 'Not set'}</div>
                                </div>
                                <div>
                                  <div className="detail-label">Criticality</div>
                                  <div className="detail-value">{item.criticality || 'Not set'}</div>
                                </div>
                                <div>
                                  <div className="detail-label">Location</div>
                                  <div className="detail-value">{item.location || 'Not set'}</div>
                                </div>
                                <div>
                                  <div className="detail-label">Service tier</div>
                                  <div className="detail-value">{item.serviceTier || 'Not set'}</div>
                                </div>
                                <div>
                                  <div className="detail-label">Support window</div>
                                  <div className="detail-value">{item.supportWindow || 'Not set'}</div>
                                </div>
                                <div>
                                  <div className="detail-label">Last audit</div>
                                  <div className="detail-value">{item.lastAudit || 'Not set'}</div>
                                </div>
                              </div>
                              <div className="cmdb-detail-card">
                                <div className="detail-label">Description</div>
                                <div className="detail-value">{item.description || 'No description added yet.'}</div>
                              </div>
                              {item.documentation && (
                                <div className="cmdb-detail-card">
                                  <div className="detail-label">Documentation</div>
                                  <a className="cmdb-link" href={item.documentation} target="_blank" rel="noreferrer">
                                    {item.documentation}
                                  </a>
                                </div>
                              )}
                              <div className="cmdb-detail-card">
                                <div className="detail-label">Dependencies</div>
                                {item.dependencies && item.dependencies.length ? (
                                  <div className="cmdb-tags">
                                    {item.dependencies.map((dependency) => (
                                      <InlineTag key={dependency}>{dependency}</InlineTag>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="detail-value">No dependencies linked.</div>
                                )}
                              </div>
                              <div className="cmdb-detail-card">
                                <div className="detail-label">Maintenance tasks</div>
                                {tasks.length ? (
                                  <>
                                    <div className="cmdb-task-meta">
                                      {completedTasks}/{tasks.length} tasks complete
                                    </div>
                                    <div className="cmdb-task-list">
                                      {tasks.map((task) => (
                                        <label key={task.id} className={`cmdb-task${task.done ? ' done' : ''}`}>
                                          <input
                                            type="checkbox"
                                            checked={task.done}
                                            onChange={() => handleToggleCmdbTask(item.id, task.id)}
                                          />
                                          <span>{task.title}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </>
                                ) : (
                                  <div className="detail-value">No tasks defined.</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No configuration items match the current filters.</p>
                  </div>
                )}
              </section>
            )}

            {activeSection === 'changes' && (
              <section className="card">
                <div className="section-title">Change calendar</div>
                <p className="section-sub">Stay ahead of upcoming maintenance windows.</p>
                <div className="ticket-actions">
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowChangeForm(true)}>
                    Add event
                  </button>
                </div>
                <div className="change-list">
                  {changeEvents.map((item) => (
                    <ChangeRow key={item.id} item={item} />
                  ))}
                </div>
                {showChangeForm && (
                  <>
                    {changeError && (
                      <div className="form-alert error">
                        <div className="form-alert-message">{changeError}</div>
                      </div>
                    )}
                    <div className="detail-card">
                      <div className="detail-label">Add change event</div>
                      <label className="label">
                        Area
                        <input
                          className="input"
                          value={changeDraft.area}
                          onChange={(event) => setChangeDraft((prev) => ({ ...prev, area: event.target.value }))}
                          placeholder="e.g. Network"
                        />
                      </label>
                      <label className="label">
                        Title
                        <input
                          className="input"
                          value={changeDraft.title}
                          onChange={(event) => setChangeDraft((prev) => ({ ...prev, title: event.target.value }))}
                          placeholder="e.g. VPN gateway upgrade"
                        />
                      </label>
                      <label className="label">
                        Window
                        <input
                          className="input"
                          value={changeDraft.window}
                          onChange={(event) => setChangeDraft((prev) => ({ ...prev, window: event.target.value }))}
                          placeholder="e.g. Fri 9:00p - 11:00p"
                        />
                      </label>
                      <label className="label">
                        Status
                        <select
                          className="control-select"
                          value={changeDraft.status}
                          onChange={(event) => setChangeDraft((prev) => ({ ...prev, status: event.target.value }))}
                        >
                          {CHANGE_STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="list-inline">
                        <button className="btn btn-primary btn-small" type="button" onClick={handleAddChangeEvent}>
                          Add event
                        </button>
                        <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowChangeForm(false)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}

            {activeSection === 'releases' && (
              <section className="card">
                <div className="section-title">Releases</div>
                <h2 className="section-heading">Planned rollouts and upgrades</h2>
                <p className="section-sub">Coordinate releases with change windows.</p>
                <div className="ticket-actions">
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowReleaseForm(true)}>
                    Add release
                  </button>
                </div>
                <div className="record-list">
                  {releases.map((release) => (
                    <div key={release.id} className="record-row">
                      <div>
                        <div className="list-inline">
                          <InlineTag className="mono">{release.id}</InlineTag>
                          <span className={`status-pill status-${toKebabCase(release.status)}`}>{release.status}</span>
                        </div>
                        <p className="work-title">{release.title}</p>
                        <p className="work-meta">
                          Window: {release.window} - Owner: {release.owner}
                        </p>
                      </div>
                      <button className="btn btn-ghost btn-small" type="button">
                        Plan
                      </button>
                    </div>
                  ))}
                </div>
                {showReleaseForm && (
                  <>
                    {releaseError && (
                      <div className="form-alert error">
                        <div className="form-alert-message">{releaseError}</div>
                      </div>
                    )}
                    <div className="detail-card">
                      <div className="detail-label">Add release</div>
                      <label className="label">
                        Title
                        <input
                          className="input"
                          value={releaseDraft.title}
                          onChange={(event) => setReleaseDraft((prev) => ({ ...prev, title: event.target.value }))}
                          placeholder="e.g. Teams client feature update"
                        />
                      </label>
                      <label className="label">
                        Owner
                        <input
                          className="input"
                          value={releaseDraft.owner}
                          onChange={(event) => setReleaseDraft((prev) => ({ ...prev, owner: event.target.value }))}
                          placeholder="e.g. Unified Comms"
                        />
                      </label>
                      <label className="label">
                        Window
                        <input
                          className="input"
                          value={releaseDraft.window}
                          onChange={(event) => setReleaseDraft((prev) => ({ ...prev, window: event.target.value }))}
                          placeholder="e.g. Oct 10"
                        />
                      </label>
                      <label className="label">
                        Status
                        <select
                          className="control-select"
                          value={releaseDraft.status}
                          onChange={(event) => setReleaseDraft((prev) => ({ ...prev, status: event.target.value }))}
                        >
                          {RELEASE_STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="list-inline">
                        <button className="btn btn-primary btn-small" type="button" onClick={handleAddRelease}>
                          Add release
                        </button>
                        <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowReleaseForm(false)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}

            {activeSection === 'projects' && (
              <section className="card">
                <div className="section-title">Projects</div>
                <h2 className="section-heading">Cross-team initiatives</h2>
                <p className="section-sub">Track progress, owners, and delivery risk.</p>
                <div className="ticket-actions">
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowProjectForm(true)}>
                    Add project
                  </button>
                </div>
                {projectError && (
                  <div className="form-alert error">
                    <div className="form-alert-message">{projectError}</div>
                  </div>
                )}
                <div className="record-list">
                  {projects.map((project) => {
                    const tasks = getProjectTasks(project);
                    const completedTasks = tasks.filter((task) => task.done).length;
                    const progressValue = getProjectProgress(project);
                    const isOpen = openProjectId === project.id;

                    return (
                      <div key={project.id} className={`record-row project-row${isOpen ? ' open' : ''}`}>
                        <div className="project-meta">
                          <div className="list-inline">
                            <InlineTag className="mono">{project.id}</InlineTag>
                            <span className={`status-pill status-${toKebabCase(project.status)}`}>{project.status}</span>
                          </div>
                          <p className="work-title">{project.title}</p>
                          <p className="work-meta">Owner: {project.owner}</p>
                          <div className="progress-track">
                            <span className="progress-fill" style={{ width: `${progressValue}%` }} />
                          </div>
                          <span className="progress-value">{progressValue}% complete</span>
                        </div>
                        <button className="btn btn-ghost btn-small" type="button" onClick={() => handleToggleProject(project.id)}>
                          {isOpen ? 'Close' : 'Open'}
                        </button>
                        {isOpen && (
                          <div className="project-details">
                            <div className="project-detail-grid">
                              <div>
                                <div className="detail-label">Summary</div>
                                <div className="detail-value">{project.summary || 'No summary added yet.'}</div>
                              </div>
                              <div>
                                <div className="detail-label">Target date</div>
                                <div className="detail-value">{project.targetDate || 'Not scheduled'}</div>
                              </div>
                              <div>
                                <div className="detail-label">Primary team</div>
                                <div className="detail-value">{project.team || 'Not assigned'}</div>
                              </div>
                              <div>
                                <div className="detail-label">Next milestone</div>
                                <div className="detail-value">{project.nextMilestone || 'No milestone set'}</div>
                              </div>
                            </div>
                            <div className="project-tasks">
                              <div className="detail-label">Tasks</div>
                              {tasks.length ? (
                                <>
                                  <div className="project-task-meta">
                                    {completedTasks}/{tasks.length} tasks complete
                                  </div>
                                  <div className="project-task-list">
                                    {tasks.map((task) => (
                                      <label
                                        key={task.id}
                                        className={`project-task${task.done ? ' done' : ''}`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={task.done}
                                          onChange={() => handleToggleProjectTask(project.id, task.id)}
                                        />
                                        <span>{task.title}</span>
                                      </label>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <div className="detail-value project-empty">No tasks added yet.</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {showProjectForm && (
                  <div className="detail-card">
                    <div className="detail-label">Create project</div>
                    <label className="label">
                      Project title
                      <input
                        className="input"
                        value={projectDraft.title}
                        onChange={(event) => setProjectDraft((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="e.g. Office 365 rollout"
                      />
                    </label>
                    <label className="label">
                      Owner
                      <input
                        className="input"
                        value={projectDraft.owner}
                        onChange={(event) => setProjectDraft((prev) => ({ ...prev, owner: event.target.value }))}
                        placeholder="e.g. Paul Antic"
                      />
                    </label>
                    <label className="label">
                      Status
                      <select
                        className="control-select"
                        value={projectDraft.status}
                        onChange={(event) => setProjectDraft((prev) => ({ ...prev, status: event.target.value }))}
                      >
                        {PROJECT_STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="label">
                      Progress (%)
                      <input
                        className="input"
                        value={projectDraft.progress}
                        onChange={(event) => setProjectDraft((prev) => ({ ...prev, progress: event.target.value }))}
                        placeholder="e.g. 45"
                      />
                    </label>
                    <div className="list-inline">
                      <button className="btn btn-primary btn-small" type="button" onClick={handleAddProject}>
                        Add project
                      </button>
                      <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowProjectForm(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {activeSection === 'automation' && (
              <section className="card">
                <div className="section-title">Automation</div>
                <h2 className="section-heading">Workflow rules and triggers</h2>
                <p className="section-sub">Automate routing, notifications, and ticket updates.</p>
                {automationError && (
                  <div className="form-alert error">
                    <div className="form-alert-message">{automationError}</div>
                  </div>
                )}
                <div className="record-list">
                  {automationRules.map((rule) => (
                    <div key={rule.id} className="record-row">
                      <div>
                        <div className="list-inline">
                          <InlineTag className="mono">{rule.id}</InlineTag>
                          <span className={`status-pill status-${rule.enabled ? 'active' : 'closed'}`}>
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <p className="work-title">{rule.name}</p>
                        <p className="work-meta">
                          {rule.when} - {rule.condition} - {rule.action}
                        </p>
                      </div>
                      <button
                        className="btn btn-ghost btn-small"
                        type="button"
                        onClick={() => handleToggleAutomation(rule)}
                      >
                        {rule.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="automation-grid">
                  <div className="detail-card">
                    <div className="detail-label">Create rule</div>
                    <label className="label">
                      Rule name
                      <input
                        className="input"
                        value={automationDraft.name}
                        onChange={(event) => setAutomationDraft((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="e.g. Auto-assign network incidents"
                      />
                    </label>
                    <label className="label">
                      Trigger
                      <select
                        className="control-select"
                        value={automationDraft.when}
                        onChange={(event) => setAutomationDraft((prev) => ({ ...prev, when: event.target.value }))}
                      >
                        <option>Ticket created</option>
                        <option>Status updated</option>
                        <option>SLA at risk</option>
                      </select>
                    </label>
                    <label className="label">
                      Condition
                      <select
                        className="control-select"
                        value={automationDraft.condition}
                        onChange={(event) => setAutomationDraft((prev) => ({ ...prev, condition: event.target.value }))}
                      >
                        <option>Priority is High</option>
                        <option>Status is Waiting on User</option>
                      </select>
                    </label>
                    <label className="label">
                      Action
                      <select
                        className="control-select"
                        value={automationDraft.action}
                        onChange={(event) => setAutomationDraft((prev) => ({ ...prev, action: event.target.value }))}
                      >
                        <option>Assign to on-call lead</option>
                        <option>Send reminder email</option>
                      </select>
                    </label>
                    <button className="btn btn-primary btn-small" type="button" onClick={handleAddAutomation}>
                      Add rule
                    </button>
                  </div>
                  <div className="detail-card">
                    <div className="detail-label">Automation run log</div>
                    <div className="automation-log">
                      {automationLog.length === 0 && <p className="empty-text">No automation runs yet.</p>}
                      {automationLog.map((log) => (
                        <div key={log.id} className="automation-log-row">
                          <span>{log.text}</span>
                          <span className="timestamp">{log.when}</span>
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-ghost btn-small" type="button" onClick={handleRunAutomation}>
                      Run automations on tickets
                    </button>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'canned' && (
              <section className="card">
                <div className="section-title">Canned Responses</div>
                <h2 className="section-heading">Reusable reply templates</h2>
                <p className="section-sub">Keep messaging consistent across the team.</p>
                {cannedError && (
                  <div className="form-alert error">
                    <div className="form-alert-message">{cannedError}</div>
                  </div>
                )}
                <div className="record-list">
                  {cannedResponses.map((response) => (
                    <div key={response.id} className="record-row">
                      <div>
                        <div className="list-inline">
                          <InlineTag className="mono">{response.id}</InlineTag>
                        </div>
                        <p className="work-title">{response.title}</p>
                        <p className="work-meta">{response.body}</p>
                      </div>
                      <button
                        className="btn btn-ghost btn-small"
                        type="button"
                        onClick={() => {
                          setSelectedCannedId(response.id);
                          setPendingCannedBody(response.body);
                          setActiveSection('ticket-detail');
                        }}
                      >
                        Use
                      </button>
                    </div>
                  ))}
                </div>
                <div className="detail-card">
                  <div className="detail-label">Create response</div>
                  <label className="label">
                    Title
                    <input
                      className="input"
                      value={cannedDraft.title}
                      onChange={(event) => setCannedDraft((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="e.g. Request received"
                    />
                  </label>
                  <label className="label">
                    Body
                    <textarea
                      className="textarea"
                      value={cannedDraft.body}
                      onChange={(event) => setCannedDraft((prev) => ({ ...prev, body: event.target.value }))}
                      placeholder="Write the response template."
                    />
                  </label>
                  <button className="btn btn-primary btn-small" type="button" onClick={handleAddCanned}>
                    Save canned response
                  </button>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default AppIT;
