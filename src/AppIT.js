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
import { fetchApprovals, fetchTickets, updateApproval, updateTicket } from './api';

const WORK_FILTERS = ['All', 'Incident', 'Request', 'Task'];
const TICKET_FILTERS = ['All', 'New', 'In Review', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'];
const STATUS_OPTIONS = ['New', 'In Review', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'];
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
const TECHNICIANS = [
  { name: 'Paul Antic', role: 'IT Support Specialist' },
  { name: 'Geoffrey Heller', role: 'IT Support Specialist' },
  { name: 'Melvin Paneto', role: 'IT Support Specialist' },
  { name: 'Miles Grater', role: 'IT Support Specialist' },
  { name: 'David Meek', role: 'IT Support Specialist' },
  { name: 'Alec Nauck-Heisey', role: 'IT Support Specialist' },
  { name: 'Erik Lofgren', role: 'Chief of Technology' },
];
const AUTH_STORAGE_KEY = 'it-support-auth-user';
const SLA_POLICIES = {
  High: {
    responseMs: 60 * 60 * 1000,
    resolveMs: 4 * 60 * 60 * 1000,
    responseWarnMs: 15 * 60 * 1000,
    resolveWarnMs: 60 * 60 * 1000,
    escalation: [
      '15 minutes before response breach: alert on-call lead.',
      'At response breach: page Incident Manager.',
      '1 hour before resolution breach: notify IT manager.',
    ],
  },
  Medium: {
    responseMs: 4 * 60 * 60 * 1000,
    resolveMs: 2 * 24 * 60 * 60 * 1000,
    responseWarnMs: 60 * 60 * 1000,
    resolveWarnMs: 6 * 60 * 60 * 1000,
    escalation: [
      '1 hour before response breach: alert queue lead.',
      'At response breach: notify IT manager.',
      '6 hours before resolution breach: notify service owner.',
    ],
  },
  Low: {
    responseMs: 8 * 60 * 60 * 1000,
    resolveMs: 5 * 24 * 60 * 60 * 1000,
    responseWarnMs: 2 * 60 * 60 * 1000,
    resolveWarnMs: 24 * 60 * 60 * 1000,
    escalation: [
      '2 hours before response breach: notify queue lead.',
      'At response breach: escalate to service owner.',
      '24 hours before resolution breach: notify IT manager.',
    ],
  },
};
const INTAKE_EMAIL = 'paula@udservices.org';
const INTAKE_SOURCE = 'Office365 email flow';
const SLA_STATE_LABELS = {
  'on-track': 'On track',
  'at-risk': 'At risk',
  breached: 'Breached',
  met: 'Met',
};
const BASE_TIME = Date.now();
const hoursAgo = (hours) => BASE_TIME - hours * 60 * 60 * 1000;
const daysAgo = (days) => BASE_TIME - days * 24 * 60 * 60 * 1000;

const navItems = [
  { id: 'overview', label: 'Overview', icon: Sparkles, targetId: 'overview' },
  { id: 'tickets', label: 'Tickets', icon: Mail, targetId: 'tickets' },
  { id: 'my-work', label: 'My Work', icon: PenLine, targetId: 'my-work' },
  { id: 'team-queue', label: 'Team Queue', icon: PenLine, targetId: 'team-queue' },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle2, targetId: 'approvals' },
  { id: 'service-catalog', label: 'Service Catalog', icon: LayoutGrid, targetId: 'service-catalog' },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, targetId: 'knowledge' },
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

const systemStatus = [
  { name: 'Email and MFA', state: 'Operational', color: '#16a34a' },
  { name: 'VPN / Remote Access', state: 'Degraded', color: '#f59e0b' },
  { name: 'File Shares', state: 'Operational', color: '#16a34a' },
  { name: 'Printing', state: 'Investigating', color: '#f97316' },
];

const announcements = [
  {
    id: 'ann-1',
    title: 'Duo push update on Friday',
    body: 'MFA prompts will look different starting Friday. No action needed.',
    date: 'Sep 4',
    tag: 'Security',
  },
  {
    id: 'ann-2',
    title: 'VPN gateway maintenance',
    body: 'Expect brief reconnects between 9:00p and 11:00p on Friday.',
    date: 'Sep 6',
    tag: 'Network',
  },
  {
    id: 'ann-3',
    title: 'New hire onboarding improvements',
    body: 'Intake forms now auto-collect hardware and access needs.',
    date: 'Sep 9',
    tag: 'Process',
  },
];

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

const approvalSeed = [
  {
    id: 'APR-88',
    type: 'Access',
    title: 'Salesforce license upgrade',
    requester: 'Maya Khan',
    status: 'Pending',
    due: 'Today',
  },
  {
    id: 'APR-87',
    type: 'Hardware',
    title: 'Second monitor for design team',
    requester: 'Nina Patel',
    status: 'Pending',
    due: 'Tomorrow',
  },
  {
    id: 'APR-86',
    type: 'Software',
    title: 'Figma enterprise seat',
    requester: 'Jon Park',
    status: 'Approved',
    due: 'Completed',
  },
  {
    id: 'APR-85',
    type: 'Access',
    title: 'Finance shared drive access',
    requester: 'Claire V.',
    status: 'Pending',
    due: 'Thu',
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

const ticketSeed = [
  {
    id: 'INC-4921',
    type: 'Incident',
    title: 'VPN drops every 20 minutes',
    requester: 'Prem Acharya',
    requesterEmail: 'prema@udservices.org',
    department: 'HCBS',
    status: 'New',
    priority: 'High',
    assignee: 'Unassigned',
    created: 'Today 10:14a',
    createdAt: hoursAgo(2),
    category: 'Network',
    impact: 'Multiple teams',
    urgency: 'High',
    contactPreference: 'Phone',
    device: 'LAPTOP418',
    description:
      'VPN disconnects roughly every 20 minutes when offsite. User confirmed Wi-Fi is stable and Duo prompts succeed.',
    entries: [
      { id: 'entry-1', type: 'note', author: 'Auto-triage', time: '10:16a', text: 'Captured device and VPN logs for last 24 hours.' },
      { id: 'entry-2', type: 'message', author: 'Paul Antic', time: '10:24a', text: 'Hi Prem, can you confirm if this happens on Ethernet as well?' },
    ],
  },
  {
    id: 'REQ-4923',
    type: 'Request',
    title: 'Laptop replacement request',
    requester: 'Aracelis Alamo',
    requesterEmail: 'Aracelisa@udservices.org',
    department: 'HCBS',
    status: 'In Review',
    priority: 'Medium',
    assignee: 'Paul Antic',
    created: 'Today 9:22a',
    createdAt: hoursAgo(5),
    respondedAt: hoursAgo(4),
    category: 'Hardware',
    impact: 'Just me',
    urgency: 'Normal',
    contactPreference: 'Email',
    device: 'LAPTOP286',
    description: 'Laptop is running slow and battery life is failing. Requesting a replacement with the standard UDS bundle.',
    entries: [{ id: 'entry-3', type: 'note', author: 'Paul Antic', time: '9:40a', text: 'Confirmed device diagnostics and replacement eligibility.' }],
  },
  {
    id: 'REQ-4925',
    type: 'Request',
    title: 'Finance shared drive access',
    requester: 'Islam Algodi',
    requesterEmail: 'islama@udservices.org',
    department: 'HCBS',
    status: 'Waiting on User',
    priority: 'Low',
    assignee: 'Melvin Paneto',
    created: 'Yesterday',
    createdAt: hoursAgo(28),
    respondedAt: hoursAgo(24),
    category: 'Account / Access',
    impact: 'Just me',
    urgency: 'Normal',
    contactPreference: 'Teams chat',
    device: 'LAPTOP533',
    description: 'Needs access to Finance shared drive for quarterly reporting and client audits.',
    entries: [{ id: 'entry-4', type: 'message', author: 'Melvin Paneto', time: 'Yesterday 3:18p', text: 'Hi Islam, please confirm manager approval and access level.' }],
  },
  {
    id: 'INC-4912',
    type: 'Incident',
    title: 'Printer jam on 3rd floor',
    requester: 'Clara Ames',
    requesterEmail: 'claraa@udservices.org',
    department: 'HCBS AmeriHealth',
    status: 'In Progress',
    priority: 'Low',
    assignee: 'Miles Grater',
    created: 'Yesterday',
    createdAt: hoursAgo(26),
    respondedAt: hoursAgo(25),
    category: 'Facilities',
    impact: 'My team',
    urgency: 'Normal',
    contactPreference: 'Phone',
    device: 'PRINTER012',
    description: 'Paper jam in tray 2. Needs maintenance and toner check.',
    entries: [{ id: 'entry-5', type: 'note', author: 'Miles Grater', time: 'Yesterday 1:05p', text: 'On-site visit scheduled for 2:00p.' }],
  },
  {
    id: 'REQ-4910',
    type: 'Request',
    title: 'Zoom room AV calibration',
    requester: 'Renee Alston',
    requesterEmail: 'reneea@udsfoundation.org',
    department: 'Resource Center',
    status: 'New',
    priority: 'Medium',
    assignee: 'Unassigned',
    created: 'Mon',
    createdAt: daysAgo(2),
    category: 'Facilities',
    impact: 'My team',
    urgency: 'Normal',
    contactPreference: 'Email',
    device: 'Conference room AV - Erin Court',
    description: 'Room mics are clipping. Requesting calibration for upcoming webinar.',
    entries: [],
  },
  {
    id: 'INC-4908',
    type: 'Incident',
    title: 'Email delivery delays',
    requester: 'Imelda Almaguer',
    requesterEmail: 'imeldaa@udservices.org',
    department: 'HCBS',
    status: 'Resolved',
    priority: 'High',
    assignee: 'Geoffrey Heller',
    created: 'Mon',
    createdAt: daysAgo(3),
    respondedAt: daysAgo(3) + 60 * 60 * 1000,
    resolvedAt: daysAgo(2) + 4 * 60 * 60 * 1000,
    category: 'Email',
    impact: 'Org-wide',
    urgency: 'Urgent (service down)',
    contactPreference: 'Email',
    device: 'Microsoft 365',
    description: 'Inbound messages delayed due to upstream filter issue. Resolved after vendor reset.',
    entries: [{ id: 'entry-6', type: 'note', author: 'Geoffrey Heller', time: 'Mon 4:12p', text: 'Vendor applied hotfix and queues drained.' }],
  },
];

const reportRanges = ['Last 7 days', 'Last 30 days', 'Quarter to date'];

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
  { id: 'CAT-404', name: 'Software install - Adobe', type: 'Software', eta: '2 days', approval: 'Cost center' },
];

const knowledgeArticles = [
  { id: 'KB-77', title: 'Resetting MFA device', category: 'Security', updated: 'Sep 4', views: 482 },
  { id: 'KB-103', title: 'VPN troubleshooting checklist', category: 'Network', updated: 'Aug 28', views: 305 },
  { id: 'KB-144', title: 'Setting up Teams voice', category: 'Collaboration', updated: 'Aug 20', views: 214 },
  { id: 'KB-188', title: 'Printer maintenance guide', category: 'Facilities', updated: 'Aug 8', views: 96 },
];

const problemRecords = [
  { id: 'PRB-19', title: 'Recurring VPN disconnects', status: 'Root cause analysis', impact: 'Multiple teams', linked: 6 },
  { id: 'PRB-22', title: 'Email delays with vendor relay', status: 'Known error', impact: 'Org-wide', linked: 3 },
  { id: 'PRB-25', title: 'Print server spooler crash', status: 'Workaround', impact: 'Single site', linked: 4 },
];

const releaseRecords = [
  { id: 'REL-12', title: 'Q4 Windows patch bundle', status: 'Scheduled', window: 'Oct 10', owner: 'Change Mgmt' },
  { id: 'REL-13', title: 'Teams client feature update', status: 'In Progress', window: 'Sep 28', owner: 'Unified Comms' },
  { id: 'REL-14', title: 'Firewall policy baseline', status: 'Planned', window: 'Nov 2', owner: 'Security' },
];

const projectRecords = [
  { id: 'PRJ-8', title: 'Remote worker hardening', status: 'On track', owner: 'Erik Lofgren', progress: 62 },
  { id: 'PRJ-11', title: 'Asset lifecycle refresh', status: 'At risk', owner: 'Paul Antic', progress: 38 },
  { id: 'PRJ-14', title: 'Service catalog expansion', status: 'On track', owner: 'Geoffrey Heller', progress: 71 },
];

const assetInventory = [
  { id: 'AST-1102', name: 'Dell Latitude 7420', user: 'Prem Acharya', status: 'In use', location: 'HQ' },
  { id: 'AST-1184', name: 'MacBook Pro 14', user: 'Nina Patel', status: 'In use', location: 'Remote' },
  { id: 'AST-1209', name: 'HP LaserJet M507', user: 'Facilities', status: 'Needs service', location: '3rd Floor' },
  { id: 'AST-1310', name: 'Surface Laptop 5', user: 'Open stock', status: 'In stock', location: 'IT Storage' },
];

const cmdbItems = [
  { id: 'CI-402', name: 'Exchange Online', type: 'Cloud service', status: 'Operational', owner: 'Messaging' },
  { id: 'CI-418', name: 'VPN Gateway - East', type: 'Network appliance', status: 'Degraded', owner: 'Network' },
  { id: 'CI-431', name: 'File Server FS-02', type: 'Server', status: 'Operational', owner: 'Infrastructure' },
  { id: 'CI-447', name: 'Print Server PS-01', type: 'Server', status: 'Investigating', owner: 'Workplace' },
];

const csatSurveys = [
  { id: 'CSAT-09', title: 'Ticket closure survey', status: 'Active', responses: 84, score: '4.6/5' },
  { id: 'CSAT-11', title: 'Hardware delivery feedback', status: 'Active', responses: 41, score: '4.4/5' },
  { id: 'CSAT-12', title: 'New hire onboarding survey', status: 'Draft', responses: 0, score: '-' },
];

const automationSeed = [
  {
    id: 'AUTO-12',
    name: 'High priority routing',
    when: 'Ticket created',
    condition: 'Priority is High',
    action: 'Assign to on-call lead',
    enabled: true,
  },
  {
    id: 'AUTO-18',
    name: 'Waiting on user reminder',
    when: 'Status idle 48h',
    condition: 'Status is Waiting on User',
    action: 'Send reminder email',
    enabled: true,
  },
];

const cannedSeed = [
  { id: 'CAN-01', title: 'Request received', body: 'Thanks for reaching out. We have received your request and will update you shortly.' },
  { id: 'CAN-02', title: 'Need more info', body: 'Could you please provide screenshots or the exact error message so we can continue?' },
  { id: 'CAN-03', title: 'Resolution summary', body: 'Issue resolved. We updated the configuration and verified service health. Let us know if it recurs.' },
];

const taskSeed = [
  { id: 'TSK-451', ticketId: 'INC-4921', title: 'Collect VPN logs', assignee: 'Paul Antic', status: 'In Progress', due: 'Today' },
  { id: 'TSK-452', ticketId: 'INC-4921', title: 'Schedule ISP check', assignee: 'Geoffrey Heller', status: 'Not started', due: 'Tomorrow' },
  { id: 'TSK-460', ticketId: 'REQ-4923', title: 'Validate replacement eligibility', assignee: 'Paul Antic', status: 'Completed', due: 'Today' },
];

const InlineTag = ({ children, className = '' }) => (
  <span className={`chip${className ? ` ${className}` : ''}`}>{children}</span>
);

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
  return (
    <div className="card metric-card reveal" style={style}>
      <span className="metric-icon">
        <Icon size={18} />
      </span>
      <div>
        <div className="metric-value">{item.value}</div>
        <div className="metric-label">{item.label}</div>
        <div className="metric-sub">{item.sub}</div>
      </div>
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
        <p className="work-meta">{item.requester}</p>
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
      <span className="work-time">Created {item.created}</span>
    </div>
  </button>
);

const TicketEntry = ({ entry }) => (
  <div className={`entry-item ${entry.type}`}>
    <div className="entry-header">
      <span className={`entry-pill ${entry.type}`}>{entry.type === 'note' ? 'Internal note' : 'Message to requester'}</span>
      <span className="timestamp">{entry.time}</span>
    </div>
    <p className="entry-author">{entry.author}</p>
    <p className="entry-text">{entry.text}</p>
  </div>
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
            <span>Created {ticket.created}</span>
            <span>Assignee: {ticket.assignee}</span>
          </div>
        </div>
        <h3 className="ticket-title">{ticket.title}</h3>
        <p className="work-meta">
          {ticket.requester} - {ticket.requesterEmail}
        </p>
        <p className="preview-description">{ticket.description}</p>
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


const AnnouncementCard = ({ item }) => (
  <div className="announcement-card">
    <div className="list-inline">
      <InlineTag>{item.tag}</InlineTag>
      <span className="timestamp">{item.date}</span>
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

const toKebabCase = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const getSlaPolicy = (priority) => SLA_POLICIES[priority] || SLA_POLICIES.Medium;

const formatDuration = (ms) => {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
};

const buildSlaDisplay = ({ startAt, targetMs, completedAt, now, warnMs }) => {
  const dueAt = startAt + targetMs;
  if (completedAt) {
    const met = completedAt <= dueAt;
    return {
      state: met ? 'met' : 'breached',
      label: met ? `Met in ${formatDuration(completedAt - startAt)}` : `Breached by ${formatDuration(completedAt - dueAt)}`,
      dueAt,
    };
  }
  const remaining = dueAt - now;
  if (remaining <= 0) {
    return {
      state: 'breached',
      label: `Breached by ${formatDuration(Math.abs(remaining))}`,
      dueAt,
    };
  }
  return {
    state: remaining <= warnMs ? 'at-risk' : 'on-track',
    label: `Due in ${formatDuration(remaining)}`,
    dueAt,
  };
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

const getStoredUser = () => {
  if (typeof window === 'undefined') return '';
  const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return '';
  return TECHNICIANS.some((tech) => tech.name === stored) ? stored : '';
};

function AppIT() {
  const [activeSection, setActiveSection] = useState('overview');
  const [search, setSearch] = useState('');
  const [workFilter, setWorkFilter] = useState('All');
  const [ticketFilter, setTicketFilter] = useState('All');
  const [approvals, setApprovals] = useState(() => approvalSeed);
  const [tickets, setTickets] = useState(() => ticketSeed);
  const [selectedTicketId, setSelectedTicketId] = useState(() => ticketSeed[0]?.id ?? '');
  const [noteDraft, setNoteDraft] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [reportRange, setReportRange] = useState(reportRanges[0]);
  const [tasks, setTasks] = useState(() => taskSeed);
  const [taskDraft, setTaskDraft] = useState({ title: '', assignee: ASSIGNEES[0], due: '' });
  const [showTasks, setShowTasks] = useState(false);
  const [automationRules, setAutomationRules] = useState(() => automationSeed);
  const [automationDraft, setAutomationDraft] = useState({
    name: '',
    when: 'Ticket created',
    condition: 'Priority is High',
    action: 'Assign to on-call lead',
  });
  const [automationLog, setAutomationLog] = useState([]);
  const [cannedResponses, setCannedResponses] = useState(() => cannedSeed);
  const [cannedDraft, setCannedDraft] = useState({ title: '', body: '' });
  const [selectedCannedId, setSelectedCannedId] = useState(cannedSeed[0]?.id ?? '');
  const [theme, setTheme] = useState('light');
  const [authEmail, setAuthEmail] = useState('');
  const [authError, setAuthError] = useState('');

  const employeeLookup = useMemo(() => {
    const map = new Map();
    employeeDirectory.forEach((record) => {
      if (record.email) {
        map.set(record.email.toLowerCase(), record);
      }
    });
    return map;
  }, []);

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

  const filteredApprovals = useMemo(() => {
    const term = search.trim().toLowerCase();
    return approvals.filter((item) => {
      if (!term) return true;
      return (
        item.title.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term) ||
        item.requester.toLowerCase().includes(term)
      );
    });
  }, [approvals, search]);

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tickets.filter((item) => {
      const matchesFilter = ticketFilter === 'All' || item.status === ticketFilter;
      const matchesTerm =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term) ||
        item.requester.toLowerCase().includes(term);
      return matchesFilter && matchesTerm;
    });
  }, [tickets, ticketFilter, search]);

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
  const reportData = reportDataByRange[reportRange];

  const activeTicket =
    tickets.find((item) => item.id === selectedTicketId) || filteredTickets[0] || tickets[0];
  const requesterRecord = activeTicket?.requesterEmail
    ? employeeLookup.get(activeTicket.requesterEmail.toLowerCase())
    : null;
  const requesterAssets = requesterRecord ? buildAssetList(requesterRecord) : [];
  const activeTasks = activeTicket ? tasks.filter((task) => task.ticketId === activeTicket.id) : [];
  const slaPolicy = activeTicket ? getSlaPolicy(activeTicket.priority) : null;
  const responseSla = activeTicket?.createdAt
    ? buildSlaDisplay({
        startAt: activeTicket.createdAt,
        targetMs: slaPolicy.responseMs,
        completedAt: activeTicket.respondedAt,
        now,
        warnMs: slaPolicy.responseWarnMs,
      })
    : null;
  const resolveSla = activeTicket?.createdAt
    ? buildSlaDisplay({
        startAt: activeTicket.createdAt,
        targetMs: slaPolicy.resolveMs,
        completedAt: activeTicket.resolvedAt,
        now,
        warnMs: slaPolicy.resolveWarnMs,
      })
    : null;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadData = async () => {
      try {
        const [ticketsFromDb, approvalsFromDb] = await Promise.all([fetchTickets(), fetchApprovals()]);
        if (!isActive) return;
        if (ticketsFromDb.length) setTickets(ticketsFromDb);
        if (approvalsFromDb.length) setApprovals(approvalsFromDb);
      } catch (error) {
        console.error('Failed to load Neon data', error);
      }
    };
    loadData();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!tickets.length) return;
    if (!selectedTicketId || !tickets.some((item) => item.id === selectedTicketId)) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
  }, [theme]);

  const handleApprovalDecision = (id, status) => {
    setApprovals((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
    updateApproval(id, { status }).catch((error) => {
      console.error('Failed to update approval', error);
    });
  };

  const handleTicketUpdate = (id, updates) => {
    let nextForRequest = null;
    setTickets((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...updates };
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
      updateTicket(id, nextForRequest).catch((error) => {
        console.error('Failed to update ticket', error);
      });
    }
  };

  const handleSelectTicket = (id) => {
    setSelectedTicketId(id);
    setNoteDraft('');
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
      setTickets((prev) => (prev.some((item) => item.id === newTicket.id) ? prev : [newTicket, ...prev]));
      setSelectedTicketId(newTicket.id);
      setNoteDraft('');
      setActiveSection('ticket-detail');
    }
  };

  const handleSignIn = (event) => {
    event.preventDefault();
    const email = authEmail.trim().toLowerCase();
    if (!email) {
      setAuthError('Enter your UDS email to continue.');
      return;
    }
    const record = employeeLookup.get(email);
    if (!record) {
      setAuthError('No matching employee record found.');
      return;
    }
    const fullName = `${record.firstName} ${record.lastName}`.trim();
    const allowed = TECHNICIANS.find((tech) => tech.name === fullName);
    if (!allowed) {
      setAuthError('This account is not authorized for IT Support access.');
      return;
    }
    setAuthError('');
    setCurrentUser(fullName);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_STORAGE_KEY, fullName);
    }
    setAuthEmail('');
  };

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setCurrentUser('');
    setAuthEmail('');
    setAuthError('');
  };

  const handleAddEntry = (type) => {
    const text = noteDraft.trim();
    if (!text || !activeTicket) return;
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const entry = { id: `entry-${Date.now()}`, type, author: currentUser, time, text };
    let nextForRequest = null;
    setTickets((prev) =>
      prev.map((item) =>
        item.id === activeTicket.id
          ? (() => {
              const next = {
                ...item,
                entries: [...(item.entries || []), entry],
              };
              nextForRequest = next;
              return next;
            })()
          : item,
      ),
    );
    if (nextForRequest) {
      updateTicket(activeTicket.id, nextForRequest).catch((error) => {
        console.error('Failed to append entry', error);
      });
    }
    setNoteDraft('');
  };

  const createId = (prefix) => `${prefix}-${Math.floor(100 + Math.random() * 900)}`;

  const handleAddTask = () => {
    if (!activeTicket || !taskDraft.title.trim()) return;
    const newTask = {
      id: createId('TSK'),
      ticketId: activeTicket.id,
      title: taskDraft.title.trim(),
      assignee: taskDraft.assignee,
      status: 'Not started',
      due: taskDraft.due || 'Unscheduled',
    };
    setTasks((prev) => [newTask, ...prev]);
    setTaskDraft({ title: '', assignee: ASSIGNEES[0], due: '' });
  };

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
  };

  const handleRunAutomation = () => {
    if (!automationRules.length) return;
    let updatedTickets = [...tickets];
    automationRules.forEach((rule) => {
      if (!rule.enabled) return;
      if (rule.condition === 'Priority is High') {
        updatedTickets = updatedTickets.map((ticket) =>
          ticket.priority === 'High' ? { ...ticket, assignee: 'Erik Lofgren' } : ticket,
        );
      }
      if (rule.condition === 'Status is Waiting on User') {
        updatedTickets = updatedTickets.map((ticket) =>
          ticket.status === 'Waiting on User' ? { ...ticket, status: 'In Review' } : ticket,
        );
      }
    });
    setTickets(updatedTickets);
    const timestamp = new Date().toLocaleString();
    setAutomationLog((prev) => [
      { id: `log-${Date.now()}`, text: `Automations applied at ${timestamp}.`, when: timestamp },
      ...prev,
    ]);
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
  };

  const handleInsertCanned = () => {
    const response = cannedResponses.find((item) => item.id === selectedCannedId);
    if (!response) return;
    setNoteDraft((prev) => (prev ? `${prev}\n\n${response.body}` : response.body));
  };

  const handleNavigate = (targetId) => {
    setActiveSection(targetId);
  };

  const openTicketCount = tickets.filter((item) => !['Resolved', 'Closed'].includes(item.status)).length;
  const unassignedCount = tickets.filter((item) => item.assignee === 'Unassigned').length;
  const pendingApprovalsCount = approvals.filter((item) => item.status === 'Pending').length;
  const openWorkCount = workQueue.filter((item) => item.status !== 'Completed').length;

  const metrics = [
    { label: 'Open tickets', value: openTicketCount, sub: 'Active incidents and requests', icon: Mail },
    { label: 'Unassigned', value: unassignedCount, sub: 'Needs ownership', icon: PenLine },
    { label: 'Approvals waiting', value: pendingApprovalsCount, sub: 'Needs review', icon: CheckCircle2 },
    { label: 'Tasks in flight', value: openWorkCount, sub: 'Assigned to your queue', icon: PenLine },
  ];

  const currentUserRole = TECHNICIANS.find((tech) => tech.name === currentUser)?.role || 'IT Support';

  if (!currentUser) {
    return (
      <div className="helpdesk-app auth">
        <div className="auth-shell">
          <div className="card auth-card">
            <div className="auth-header">
              <div className="brand-mark">
                <Sparkles size={18} />
              </div>
              <div>
                <h1>IT Support Sign In</h1>
                <p>Sign in with your UDS email to open the support workspace.</p>
              </div>
            </div>
            <form className="auth-form" onSubmit={handleSignIn}>
              <label className="label">
                Work email
                <input
                  className="input"
                  type="email"
                  value={authEmail}
                  onChange={(event) => {
                    setAuthEmail(event.target.value);
                    setAuthError('');
                  }}
                  placeholder="name@udservices.org"
                />
              </label>
              {authError && (
                <div className="form-alert error">
                  <div className="form-alert-message">{authError}</div>
                </div>
              )}
              <button className="btn btn-primary" type="submit">
                Sign in
              </button>
            </form>
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
              <Sparkles size={18} />
            </div>
            <div>
              <div className="brand-title">IT Support Hub</div>
              <div className="brand-subtitle">Operations workspace</div>
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
                      <div className="section-title">Service status</div>
                      {systemStatus.map((item) => (
                        <div key={item.name} className="status-row">
                          <span>{item.name}</span>
                          <span className="status-pill service-status-pill">
                            <span className="status-dot" style={{ background: item.color }} />
                            {item.state}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="card compact">
                      <div className="section-title">Announcements</div>
                      <div className="announcement-list">
                        {announcements.map((item) => (
                          <AnnouncementCard key={item.id} item={item} />
                        ))}
                      </div>
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
                    {filteredTickets.map((item) => (
                      <TicketRow
                        key={item.id}
                        item={item}
                        isActive={activeTicket?.id === item.id}
                        onSelect={handleSelectTicket}
                        onOpen={handleOpenTicket}
                      />
                    ))}
                    {filteredTickets.length === 0 && (
                      <div className="empty-state">
                        <p>No tickets match this filter. Try adjusting the search or filter.</p>
                      </div>
                    )}
                  </div>
                  <div className="ticket-preview-panel">
                    <TicketPreviewCard title="Quick preview" ticket={activeTicket} onOpen={handleOpenTicket} compact />
                    <p className="preview-footnote">Open the ticket workspace to edit status, ownership, and SLAs.</p>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'ticket-detail' && (
              <section className="card ticket-detail-page">
                <div className="ticket-detail-hero">
                  <div>
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => handleNavigate('tickets')}>
                      Back to tickets
                    </button>
                    <div className="section-title">Ticket workspace</div>
                    <h2 className="section-heading">
                      {activeTicket ? `${activeTicket.id} - ${activeTicket.title}` : 'Ticket details'}
                    </h2>
                    <p className="section-sub">Full-screen view with requester context, SLAs, and updates.</p>
                  </div>
                  {activeTicket && (
                    <div className="ticket-detail-hero-meta">
                      <InlineTag>{activeTicket.type}</InlineTag>
                      <span className={`priority-tag ${toKebabCase(activeTicket.priority)}`}>{activeTicket.priority}</span>
                      <span className={`status-pill status-${toKebabCase(activeTicket.status)}`}>{activeTicket.status}</span>
                    </div>
                  )}
                </div>

                {activeTicket ? (
                  <div className="ticket-detail">
                    <div className="ticket-detail-header">
                      <div>
                        <div className="list-inline">
                          <InlineTag>{activeTicket.type}</InlineTag>
                          <InlineTag className="mono">{activeTicket.id}</InlineTag>
                          <span className={`priority-tag ${toKebabCase(activeTicket.priority)}`}>{activeTicket.priority}</span>
                          <span className={`status-pill status-${toKebabCase(activeTicket.status)}`}>{activeTicket.status}</span>
                        </div>
                        <h3 className="ticket-title">{activeTicket.title}</h3>
                        <p className="work-meta">
                          {activeTicket.requester} - {activeTicket.requesterEmail}
                        </p>
                        <p className="work-meta">
                          {activeTicket.department} | Preferred contact: {activeTicket.contactPreference}
                        </p>
                      </div>
                      <div className="ticket-actions">
                        <button
                          className="btn btn-ghost btn-small"
                          type="button"
                          disabled={['Resolved', 'Closed'].includes(activeTicket.status)}
                          onClick={() => handleTicketUpdate(activeTicket.id, { assignee: currentUser })}
                        >
                          Assign to me
                        </button>
                        <button
                          className="btn btn-primary btn-small"
                          type="button"
                          disabled={['Resolved', 'Closed'].includes(activeTicket.status)}
                          onClick={() => handleTicketUpdate(activeTicket.id, { status: 'Resolved' })}
                        >
                          Resolve
                        </button>
                      </div>
                    </div>

                    <div className="ticket-detail-grid">
                      <div className="detail-card">
                        <div className="detail-label">Category</div>
                        <div className="detail-value">{activeTicket.category}</div>
                        <div className="detail-label">Impact</div>
                        <div className="detail-value">{activeTicket.impact}</div>
                        <div className="detail-label">Urgency</div>
                        <div className="detail-value">{activeTicket.urgency}</div>
                      </div>
                      <div className="detail-card">
                        <div className="detail-label">Device / Asset</div>
                        <div className="detail-value">{activeTicket.device}</div>
                        <div className="detail-label">Created</div>
                        <div className="detail-value">{activeTicket.created}</div>
                      </div>
                      <div className="detail-card">
                        <div className="detail-label">Intake</div>
                        <div className="detail-value">{INTAKE_SOURCE}</div>
                        <div className="detail-label">Inbox</div>
                        <div className="detail-value">{INTAKE_EMAIL}</div>
                      </div>
                      <div className="detail-card">
                        <label className="control-label">
                          <span>Assignee</span>
                          <select
                            className="control-select"
                            value={activeTicket.assignee}
                            onChange={(event) => handleTicketUpdate(activeTicket.id, { assignee: event.target.value })}
                          >
                            {ASSIGNEES.map((assignee) => (
                              <option key={assignee} value={assignee}>
                                {assignee}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="control-label">
                          <span>Status</span>
                          <select
                            className="control-select"
                            value={activeTicket.status}
                            onChange={(event) => handleTicketUpdate(activeTicket.id, { status: event.target.value })}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="ticket-profile">
                      <div className="detail-card">
                        <div className="detail-label">Requester profile</div>
                        {requesterRecord ? (
                          <div className="profile-grid">
                            <div>
                              <div className="detail-value">
                                {requesterRecord.firstName} {requesterRecord.lastName}
                              </div>
                              <div className="profile-meta">{requesterRecord.jobTitle}</div>
                              <div className="profile-meta">
                                {requesterRecord.department} - {requesterRecord.location}
                              </div>
                            </div>
                            <div>
                              <div className="detail-label">Supervisor</div>
                              <div className="detail-value">{requesterRecord.supervisor || 'Not listed'}</div>
                              <div className="detail-label">Start date</div>
                              <div className="detail-value">{requesterRecord.startDate || 'Not listed'}</div>
                            </div>
                            <div>
                              <div className="detail-label">Email</div>
                              <div className="detail-value">{requesterRecord.email}</div>
                              <div className="detail-label">Mobile</div>
                              <div className="detail-value">{requesterRecord.mobilePhone || 'Not listed'}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="detail-value">No employee record found in Employee Information Hub.</div>
                        )}
                      </div>
                      <div className="detail-card">
                        <div className="detail-label">Assigned assets</div>
                        {requesterRecord ? (
                          <div className="asset-grid">
                            {requesterAssets.map((asset) => (
                              <div key={asset.label} className="asset-chip">
                                <span>{asset.label}</span>
                                <strong>{asset.value}</strong>
                              </div>
                            ))}
                            {requesterAssets.length === 0 && <div className="detail-value">No assets listed.</div>}
                          </div>
                        ) : (
                          <div className="detail-value">No assets listed.</div>
                        )}
                      </div>
                    </div>

                    <div className="ticket-sla">
                      <div className="detail-card sla-card">
                        <div className="detail-label">Response SLA</div>
                        {responseSla && (
                          <>
                            <div className="sla-row">
                              <span className={`sla-state ${responseSla.state}`}>{SLA_STATE_LABELS[responseSla.state]}</span>
                              <span className="sla-value">{responseSla.label}</span>
                            </div>
                            <div className="sla-meta">Target: {formatDuration(slaPolicy.responseMs)}</div>
                          </>
                        )}
                      </div>
                      <div className="detail-card sla-card">
                        <div className="detail-label">Resolution SLA</div>
                        {resolveSla && (
                          <>
                            <div className="sla-row">
                              <span className={`sla-state ${resolveSla.state}`}>{SLA_STATE_LABELS[resolveSla.state]}</span>
                              <span className="sla-value">{resolveSla.label}</span>
                            </div>
                            <div className="sla-meta">Target: {formatDuration(slaPolicy.resolveMs)}</div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="detail-card escalation-card">
                      <div className="detail-label">Escalation rules ({activeTicket.priority})</div>
                      <ul className="escalation-list">
                        {slaPolicy.escalation.map((rule) => (
                          <li key={rule}>{rule}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="detail-card task-card">
                      <div className="task-header">
                        <div className="detail-label">Tasks</div>
                        <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowTasks((prev) => !prev)}>
                          {showTasks ? 'Hide tasks' : 'Show tasks'}
                        </button>
                      </div>
                      {showTasks && (
                        <>
                          <div className="task-list">
                            {activeTasks.length === 0 && <p className="empty-text">No tasks for this ticket yet.</p>}
                            {activeTasks.map((task) => (
                              <div key={task.id} className="task-row">
                                <div>
                                  <div className="list-inline">
                                    <InlineTag className="mono">{task.id}</InlineTag>
                                    <span className={`status-pill status-${toKebabCase(task.status)}`}>{task.status}</span>
                                  </div>
                                  <p className="work-title">{task.title}</p>
                                  <p className="work-meta">
                                    {task.assignee} - Due {task.due}
                                  </p>
                                </div>
                                <button
                                  className="btn btn-ghost btn-small"
                                  type="button"
                                  onClick={() =>
                                    setTasks((prev) =>
                                      prev.map((item) =>
                                        item.id === task.id
                                          ? {
                                              ...item,
                                              status: item.status === 'Completed' ? 'Not started' : 'Completed',
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                >
                                  {task.status === 'Completed' ? 'Reopen' : 'Complete'}
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="task-form">
                            <label className="label">
                              Task title
                              <input
                                className="input"
                                value={taskDraft.title}
                                onChange={(event) => setTaskDraft((prev) => ({ ...prev, title: event.target.value }))}
                                placeholder="e.g. Validate user access request"
                              />
                            </label>
                            <label className="label">
                              Assignee
                              <select
                                className="control-select"
                                value={taskDraft.assignee}
                                onChange={(event) => setTaskDraft((prev) => ({ ...prev, assignee: event.target.value }))}
                              >
                                {ASSIGNEES.map((assignee) => (
                                  <option key={assignee} value={assignee}>
                                    {assignee}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="label">
                              Due date
                              <input
                                className="input"
                                value={taskDraft.due}
                                onChange={(event) => setTaskDraft((prev) => ({ ...prev, due: event.target.value }))}
                                placeholder="e.g. Tomorrow 3:00p"
                              />
                            </label>
                            <button className="btn btn-primary btn-small" type="button" onClick={handleAddTask}>
                              Add task
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="ticket-description">
                      <div className="detail-label">Description</div>
                      <p>{activeTicket.description}</p>
                    </div>

                    <div className="ticket-activity">
                      <div className="activity-header">
                        <h4>Notes and messages</h4>
                        <span className="timestamp">{activeTicket.entries?.length || 0} updates</span>
                      </div>
                      <div className="entry-list">
                        {(activeTicket.entries || []).map((entry) => (
                          <TicketEntry key={entry.id} entry={entry} />
                        ))}
                        {(!activeTicket.entries || activeTicket.entries.length === 0) && (
                          <div className="empty-state">
                            <p>No updates yet. Add a note or message below.</p>
                          </div>
                        )}
                      </div>
                      <div className="entry-composer">
                        <div className="composer-row">
                          <label className="control-label">
                            <span>Canned response</span>
                            <select
                              className="control-select"
                              value={selectedCannedId}
                              onChange={(event) => setSelectedCannedId(event.target.value)}
                            >
                              {cannedResponses.map((response) => (
                                <option key={response.id} value={response.id}>
                                  {response.title}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button className="btn btn-ghost btn-small" type="button" onClick={handleInsertCanned}>
                            Insert
                          </button>
                        </div>
                        <label className="label">
                          Add update
                          <textarea
                            className="textarea"
                            value={noteDraft}
                            onChange={(event) => setNoteDraft(event.target.value)}
                            placeholder="Add troubleshooting notes or a response to the requester."
                          />
                        </label>
                        <div className="entry-actions">
                          <button
                            className="btn btn-ghost btn-small"
                            type="button"
                            disabled={!noteDraft.trim()}
                            onClick={() => handleAddEntry('note')}
                          >
                            Add internal note
                          </button>
                          <button
                            className="btn btn-primary btn-small"
                            type="button"
                            disabled={!noteDraft.trim()}
                            onClick={() => handleAddEntry('message')}
                          >
                            Send message to requester
                          </button>
                        </div>
                        <p className="entry-hint">Internal notes are only visible to IT. Messages go to the requester.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>Select a ticket from the queue to view details.</p>
                  </div>
                )}
              </section>
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
                  {filteredApprovals.map((item) => (
                    <ApprovalRow key={item.id} item={item} onDecision={handleApprovalDecision} />
                  ))}
                  {filteredApprovals.length === 0 && (
                    <div className="empty-state">
                      <p>No approvals match your search.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeSection === 'service-catalog' && (
              <section className="card">
                <div className="section-title">Service Catalog</div>
                <h2 className="section-heading">Standard requests and workflows</h2>
                <p className="section-sub">Launch new requests from predefined service offerings.</p>
                <div className="module-grid">
                  {serviceCatalog.map((item) => (
                    <div key={item.id} className="module-card">
                      <div className="list-inline">
                        <InlineTag>{item.type}</InlineTag>
                        <InlineTag className="mono">{item.id}</InlineTag>
                      </div>
                      <h3>{item.name}</h3>
                      <p>ETA: {item.eta}</p>
                      <p>Approval: {item.approval}</p>
                      <button className="btn btn-primary btn-small" type="button">
                        Request
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeSection === 'knowledge' && (
              <section className="card">
                <div className="section-title">Knowledge Base</div>
                <h2 className="section-heading">Articles and troubleshooting guides</h2>
                <p className="section-sub">Curated answers for common issues and workflows.</p>
                <div className="record-list">
                  {knowledgeArticles.map((article) => (
                    <div key={article.id} className="record-row">
                      <div>
                        <div className="list-inline">
                          <InlineTag>{article.category}</InlineTag>
                          <InlineTag className="mono">{article.id}</InlineTag>
                        </div>
                        <p className="work-title">{article.title}</p>
                        <p className="work-meta">
                          Updated {article.updated} - {article.views} views
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

            {activeSection === 'problems' && (
              <section className="card">
                <div className="section-title">Problems</div>
                <h2 className="section-heading">Root cause and known errors</h2>
                <p className="section-sub">Track recurring incidents and permanent fixes.</p>
                <div className="record-list">
                  {problemRecords.map((problem) => (
                    <div key={problem.id} className="record-row">
                      <div>
                        <div className="list-inline">
                          <InlineTag className="mono">{problem.id}</InlineTag>
                          <span className={`status-pill status-${toKebabCase(problem.status)}`}>{problem.status}</span>
                        </div>
                        <p className="work-title">{problem.title}</p>
                        <p className="work-meta">
                          Impact: {problem.impact} - Linked incidents: {problem.linked}
                        </p>
                      </div>
                      <button className="btn btn-ghost btn-small" type="button">
                        Review
                      </button>
                    </div>
                  ))}
                </div>
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
                      <button className="btn btn-ghost btn-small" type="button">
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
                  <TrendBars title="CSAT trend" items={reportData.csatTrend} hint="Average score over time." icon={TrendingUp} />
                  <ReportBarList
                    title="Change success rate"
                    items={reportData.changeSuccess}
                    hint="Outcome rate for scheduled changes."
                    icon={CheckCircle2}
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
                <div className="record-list">
                  {cmdbItems.map((item) => (
                    <div key={item.id} className="record-row">
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
                      <button className="btn btn-ghost btn-small" type="button">
                        Map
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeSection === 'changes' && (
              <section className="card">
                <div className="section-title">Change calendar</div>
                <p className="section-sub">Stay ahead of upcoming maintenance windows.</p>
                <div className="change-list">
                  {changeCalendar.map((item) => (
                    <ChangeRow key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}

            {activeSection === 'releases' && (
              <section className="card">
                <div className="section-title">Releases</div>
                <h2 className="section-heading">Planned rollouts and upgrades</h2>
                <p className="section-sub">Coordinate releases with change windows.</p>
                <div className="record-list">
                  {releaseRecords.map((release) => (
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
              </section>
            )}

            {activeSection === 'projects' && (
              <section className="card">
                <div className="section-title">Projects</div>
                <h2 className="section-heading">Cross-team initiatives</h2>
                <p className="section-sub">Track progress, owners, and delivery risk.</p>
                <div className="record-list">
                  {projectRecords.map((project) => (
                    <div key={project.id} className="record-row">
                      <div className="project-meta">
                        <div className="list-inline">
                          <InlineTag className="mono">{project.id}</InlineTag>
                          <span className={`status-pill status-${toKebabCase(project.status)}`}>{project.status}</span>
                        </div>
                        <p className="work-title">{project.title}</p>
                        <p className="work-meta">Owner: {project.owner}</p>
                        <div className="progress-track">
                          <span className="progress-fill" style={{ width: `${project.progress}%` }} />
                        </div>
                        <span className="progress-value">{project.progress}% complete</span>
                      </div>
                      <button className="btn btn-ghost btn-small" type="button">
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeSection === 'automation' && (
              <section className="card">
                <div className="section-title">Automation</div>
                <h2 className="section-heading">Workflow rules and triggers</h2>
                <p className="section-sub">Automate routing, notifications, and ticket updates.</p>
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
                        onClick={() =>
                          setAutomationRules((prev) =>
                            prev.map((item) => (item.id === rule.id ? { ...item, enabled: !item.enabled } : item)),
                          )
                        }
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
                          handleInsertCanned();
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
