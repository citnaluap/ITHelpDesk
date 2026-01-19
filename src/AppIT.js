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
import { TECHNICIANS } from './data/technicians';
import {
  createAutomationRule,
  createAnnouncement,
  createCannedResponse,
  createCatalogItem,
  createChange,
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
import { formatTicketCreated, toKebabCase } from './utils/format';
import { getTicketDescription, getTicketSummary } from './utils/tickets';

const WORK_FILTERS = ['All', 'Incident', 'Request', 'Task'];
const TICKET_FILTERS = ['All', 'New', 'In Review', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'];
const STATUS_OPTIONS = ['New', 'In Review', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'];
const SERVICE_STATUS_OPTIONS = ['Operational', 'Degraded', 'Investigating', 'Maintenance', 'Outage'];
const TICKET_PAGE_SIZE = 12;
const APPROVAL_PAGE_SIZE = 8;
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

const problemRecords = [
  { id: 'PRB-19', title: 'Recurring VPN disconnects', status: 'Root cause analysis', impact: 'Multiple teams', linked: 6 },
  { id: 'PRB-22', title: 'Email delays with vendor relay', status: 'Known error', impact: 'Org-wide', linked: 3 },
  { id: 'PRB-25', title: 'Print server spooler crash', status: 'Workaround', impact: 'Single site', linked: 4 },
];
const PROBLEM_STATUS_OPTIONS = ['Investigation', 'Root cause analysis', 'Known error', 'Workaround', 'Resolved'];

const releaseRecords = [
  { id: 'REL-12', title: 'Q4 Windows patch bundle', status: 'Scheduled', window: 'Oct 10', owner: 'Change Mgmt' },
  { id: 'REL-13', title: 'Teams client feature update', status: 'In Progress', window: 'Sep 28', owner: 'Unified Comms' },
  { id: 'REL-14', title: 'Firewall policy baseline', status: 'Planned', window: 'Nov 2', owner: 'Security' },
];
const RELEASE_STATUS_OPTIONS = ['Planned', 'Scheduled', 'In Progress', 'Completed', 'Canceled'];

const projectRecords = [
  { id: 'PRJ-8', title: 'Remote worker hardening', status: 'On track', owner: 'Erik Lofgren', progress: 62 },
  { id: 'PRJ-11', title: 'Asset lifecycle refresh', status: 'At risk', owner: 'Paul Antic', progress: 38 },
  { id: 'PRJ-14', title: 'Service catalog expansion', status: 'On track', owner: 'Geoffrey Heller', progress: 71 },
];
const PROJECT_STATUS_OPTIONS = ['Planned', 'On track', 'At risk', 'In Progress', 'Blocked', 'Completed'];

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

function AppIT() {
  const isAuthRequired = process.env.NODE_ENV === 'production';
  const defaultDevUser = isAuthRequired ? '' : (TECHNICIANS[0]?.name || '');
  const [activeSection, setActiveSection] = useState('overview');
  const [search, setSearch] = useState('');
  const [workFilter, setWorkFilter] = useState('All');
  const [ticketFilter, setTicketFilter] = useState('All');
  const [approvals, setApprovals] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [ticketsMeta, setTicketsMeta] = useState({ total: 0, limit: TICKET_PAGE_SIZE, offset: 0 });
  const [approvalsMeta, setApprovalsMeta] = useState({ total: 0, limit: APPROVAL_PAGE_SIZE, offset: 0 });
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState('');
  const [approvalsError, setApprovalsError] = useState('');
  const [ticketPage, setTicketPage] = useState(0);
  const [approvalPage, setApprovalPage] = useState(0);
  const [currentUser, setCurrentUser] = useState(defaultDevUser);
  const [selectedUser, setSelectedUser] = useState(defaultDevUser);
  const [reportRange, setReportRange] = useState(reportRanges[0]);
  const [automationRules, setAutomationRules] = useState([]);
  const [catalogActiveId, setCatalogActiveId] = useState('');
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
  const [catalogDraft, setCatalogDraft] = useState({
    employeeName: '',
    employeeEmail: '',
    startDate: '',
    department: '',
    manager: '',
    role: '',
    location: '',
    deviceNeeds: '',
    accessNeeds: '',
    notes: '',
    vpnUser: '',
    vpnEmail: '',
    vpnReason: '',
    vpnStartDate: '',
    vpnEndDate: '',
    laptopUser: '',
    laptopEmail: '',
    laptopIssue: '',
    laptopAssetTag: '',
    laptopNeededBy: '',
    softwareUser: '',
    softwareEmail: '',
    softwareTitle: '',
    softwareJustification: '',
    softwareCostCenter: '',
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
  const [problems, setProblems] = useState(() => problemRecords);
  const [problemDraft, setProblemDraft] = useState({
    title: '',
    status: 'Investigation',
    impact: '',
    linked: '',
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
  const [theme, setTheme] = useState('light');
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

  const activeTicket = tickets.find((item) => item.id === selectedTicketId) || tickets[0] || null;
  const requesterRecord = activeTicket?.requesterEmail
    ? employeeLookup.get(activeTicket.requesterEmail.toLowerCase())
    : null;
  const requesterAssets = requesterRecord ? buildAssetList(requesterRecord) : [];
  const activeKnowledge =
    knowledgeArticles.find((article) => article.id === selectedKnowledgeId) || knowledgeArticles[0] || null;
  const knowledgeView = isEditingKnowledge && knowledgeDraft ? knowledgeDraft : activeKnowledge;

  const ticketQuery = useMemo(() => {
    const query = {
      limit: TICKET_PAGE_SIZE,
      offset: ticketPage * TICKET_PAGE_SIZE,
    };
    const term = search.trim();
    if (term) query.q = term;
    if (activeSection === 'my-work') {
      if (currentUser) query.assignee = currentUser;
    } else if (['tickets', 'ticket-detail'].includes(activeSection) && ticketFilter !== 'All') {
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
    const shouldLoad = ['tickets', 'ticket-detail', 'overview', 'my-work'].includes(activeSection);
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

  const handleAddEntry = (ticketId, entry) => {
    if (!ticketId || !entry) return;
    let nextForRequest = null;
    setTickets((prev) =>
      prev.map((item) => {
        if (item.id !== ticketId) return item;
        const next = {
          ...item,
          entries: [...(item.entries || []), entry],
        };
        nextForRequest = next;
        return next;
      }),
    );
    if (nextForRequest) {
      updateTicket(ticketId, nextForRequest).catch((error) => {
        console.error('Failed to append entry', error);
      });
      if (entry.type === 'message') {
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

  const handleRunAutomation = () => {
    if (!automationRules.length) return;
    let updatedTickets = [...tickets];
    const changedTickets = new Map();
    automationRules.forEach((rule) => {
      if (!rule.enabled) return;
      if (rule.condition === 'Priority is High') {
        updatedTickets = updatedTickets.map((ticket) =>
          ticket.priority === 'High'
            ? (() => {
                const next = { ...ticket, assignee: 'Erik Lofgren' };
                changedTickets.set(ticket.id, next);
                return next;
              })()
            : ticket,
        );
      }
      if (rule.condition === 'Status is Waiting on User') {
        updatedTickets = updatedTickets.map((ticket) =>
          ticket.status === 'Waiting on User'
            ? (() => {
                const next = { ...ticket, status: 'In Review' };
                changedTickets.set(ticket.id, next);
                return next;
              })()
            : ticket,
        );
      }
    });
    setTickets(updatedTickets);
    changedTickets.forEach((ticket) => {
      updateTicket(ticket.id, ticket).catch((error) => {
        console.error('Failed to apply automation update', error);
      });
    });
    const timestamp = new Date().toLocaleString();
    setAutomationLog((prev) => [
      { id: `log-${Date.now()}`, text: `Automations applied at ${timestamp}.`, when: timestamp },
      ...prev,
    ]);
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
    };
    try {
      const response = await createProblem(newProblem);
      const saved = response.problem || newProblem;
      setProblems((prev) => [saved, ...prev]);
      setProblemDraft({ title: '', status: 'Investigation', impact: '', linked: '' });
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
        catalogDraft.deviceNeeds.trim() ? `Device needs: ${catalogDraft.deviceNeeds.trim()}` : null,
        catalogDraft.accessNeeds.trim() ? `Access needs: ${catalogDraft.accessNeeds.trim()}` : null,
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
        catalogDraft.vpnStartDate.trim() ? `Start date: ${catalogDraft.vpnStartDate.trim()}` : null,
        catalogDraft.vpnEndDate.trim() ? `End date: ${catalogDraft.vpnEndDate.trim()}` : null,
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
    } else {
      return;
    }
    setCatalogSubmitting(true);
    setCatalogError('');
    try {
      const response = await createTicket(ticketPayload);
      const createdTicket = response.ticket || ticketPayload;
      setTickets((prev) => [createdTicket, ...prev]);
      setTicketsMeta((prev) => ({ ...prev, total: prev.total + 1 }));
      setSelectedTicketId(createdTicket.id);
      setActiveSection('ticket-detail');
      setCatalogDraft({
        employeeName: '',
        employeeEmail: '',
        startDate: '',
        department: '',
        manager: '',
        role: '',
        location: '',
        deviceNeeds: '',
        accessNeeds: '',
        notes: '',
        vpnUser: '',
        vpnEmail: '',
        vpnReason: '',
        vpnStartDate: '',
        vpnEndDate: '',
        laptopUser: '',
        laptopEmail: '',
        laptopIssue: '',
        laptopAssetTag: '',
        laptopNeededBy: '',
        softwareUser: '',
        softwareEmail: '',
        softwareTitle: '',
        softwareJustification: '',
        softwareCostCenter: '',
      });
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
                {catalogActiveId === 'CAT-101' && (
                  <form className="detail-card" onSubmit={handleCatalogSubmit}>
                    <div className="detail-label">New employee onboarding intake</div>
                    <label className="label">
                      Employee name
                      <input
                        className="input"
                        value={catalogDraft.employeeName}
                        onChange={(event) => setCatalogDraft((prev) => ({ ...prev, employeeName: event.target.value }))}
                        placeholder="e.g. Jamie Rivera"
                        required
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
                        required
                      />
                    </label>
                    <label className="label">
                      Start date
                      <input
                        className="input"
                        value={catalogDraft.startDate}
                        onChange={(event) => setCatalogDraft((prev) => ({ ...prev, startDate: event.target.value }))}
                        placeholder="e.g. 2026-02-01"
                        required
                      />
                    </label>
                    <label className="label">
                      Department
                      <input
                        className="input"
                        value={catalogDraft.department}
                        onChange={(event) => setCatalogDraft((prev) => ({ ...prev, department: event.target.value }))}
                        placeholder="e.g. HCBS"
                        required
                      />
                    </label>
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
                    <label className="label">
                      Device needs
                      <input
                        className="input"
                        value={catalogDraft.deviceNeeds}
                        onChange={(event) => setCatalogDraft((prev) => ({ ...prev, deviceNeeds: event.target.value }))}
                        placeholder="e.g. Laptop + docking station"
                      />
                    </label>
                    <label className="label">
                      Access needs
                      <input
                        className="input"
                        value={catalogDraft.accessNeeds}
                        onChange={(event) => setCatalogDraft((prev) => ({ ...prev, accessNeeds: event.target.value }))}
                        placeholder="e.g. Teams, Salesforce"
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
                    {catalogError && <div className="form-alert error">{catalogError}</div>}
                    <div className="list-inline">
                      <button className="btn btn-primary btn-small" type="submit" disabled={catalogSubmitting}>
                        {catalogSubmitting ? 'Submitting...' : 'Submit request'}
                      </button>
                      <button
                        className="btn btn-ghost btn-small"
                        type="button"
                        onClick={() => setCatalogActiveId('')}
                        disabled={catalogSubmitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                {catalogActiveId === 'CAT-203' && (
                  <form className="detail-card" onSubmit={handleCatalogSubmit}>
                    <div className="detail-label">VPN access request</div>
                    <label className="label">
                      Requester name
                      <input
                        className="input"
                        value={catalogDraft.vpnUser}
                        onChange={(event) => setCatalogDraft((prev) => ({ ...prev, vpnUser: event.target.value }))}
                        placeholder="e.g. Renee Alston"
                        required
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
                        required
                      />
                    </label>
                    <label className="label">
                      Reason for access
                      <textarea
                        className="textarea"
                        value={catalogDraft.vpnReason}
                        onChange={(event) => setCatalogDraft((prev) => ({ ...prev, vpnReason: event.target.value }))}
                        placeholder="Describe the remote access need."
                        required
                      />
                    </label>
                    <label className="label">
                      Start date
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
                    <label className="label">
                      Department (optional)
                      <input
                        className="input"
                        value={catalogDraft.department}
                        onChange={(event) => setCatalogDraft((prev) => ({ ...prev, department: event.target.value }))}
                        placeholder="e.g. HCBS"
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
                    {catalogError && <div className="form-alert error">{catalogError}</div>}
                    <div className="list-inline">
                      <button className="btn btn-primary btn-small" type="submit" disabled={catalogSubmitting}>
                        {catalogSubmitting ? 'Submitting...' : 'Submit request'}
                      </button>
                      <button
                        className="btn btn-ghost btn-small"
                        type="button"
                        onClick={() => setCatalogActiveId('')}
                        disabled={catalogSubmitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                {catalogActiveId === 'CAT-312' && (
                  <form className="detail-card" onSubmit={handleCatalogSubmit}>
                    <div className="detail-label">Laptop replacement request</div>
                    <label className="label">
                      Requester name
                      <input
                        className="input"
                        value={catalogDraft.laptopUser}
                        onChange={(event) => setCatalogDraft((prev) => ({ ...prev, laptopUser: event.target.value }))}
                        placeholder="e.g. Jamie Rivera"
                        required
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
                        required
                      />
                    </label>
                    <label className="label">
                      Issue summary
                      <textarea
                        className="textarea"
                        value={catalogDraft.laptopIssue}
                        onChange={(event) => setCatalogDraft((prev) => ({ ...prev, laptopIssue: event.target.value }))}
                        placeholder="Describe the performance or hardware issue."
                        required
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
                      Needed by (optional)
                      <input
                        className="input"
                        value={catalogDraft.laptopNeededBy}
                        onChange={(event) => setCatalogDraft((prev) => ({ ...prev, laptopNeededBy: event.target.value }))}
                        placeholder="e.g. Next Friday"
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
                    <label className="label">
                      Notes
                      <textarea
                        className="textarea"
                        value={catalogDraft.notes}
                        onChange={(event) => setCatalogDraft((prev) => ({ ...prev, notes: event.target.value }))}
                        placeholder="Anything else we should know."
                      />
                    </label>
                    {catalogError && <div className="form-alert error">{catalogError}</div>}
                    <div className="list-inline">
                      <button className="btn btn-primary btn-small" type="submit" disabled={catalogSubmitting}>
                        {catalogSubmitting ? 'Submitting...' : 'Submit request'}
                      </button>
                      <button
                        className="btn btn-ghost btn-small"
                        type="button"
                        onClick={() => setCatalogActiveId('')}
                        disabled={catalogSubmitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                {catalogActiveId === 'CAT-404' && (
                  <form className="detail-card" onSubmit={handleCatalogSubmit}>
                    <div className="detail-label">Software install request</div>
                    <label className="label">
                      Requester name
                      <input
                        className="input"
                        value={catalogDraft.softwareUser}
                        onChange={(event) => setCatalogDraft((prev) => ({ ...prev, softwareUser: event.target.value }))}
                        placeholder="e.g. Paul Antic"
                        required
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
                        required
                      />
                    </label>
                    <label className="label">
                      Software title
                      <input
                        className="input"
                        value={catalogDraft.softwareTitle}
                        onChange={(event) => setCatalogDraft((prev) => ({ ...prev, softwareTitle: event.target.value }))}
                        placeholder="e.g. Adobe Acrobat Pro"
                        required
                      />
                    </label>
                    <label className="label">
                      Justification
                      <textarea
                        className="textarea"
                        value={catalogDraft.softwareJustification}
                        onChange={(event) => setCatalogDraft((prev) => ({ ...prev, softwareJustification: event.target.value }))}
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
                      Department (optional)
                      <input
                        className="input"
                        value={catalogDraft.department}
                        onChange={(event) => setCatalogDraft((prev) => ({ ...prev, department: event.target.value }))}
                        placeholder="e.g. Resource Center"
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
                    {catalogError && <div className="form-alert error">{catalogError}</div>}
                    <div className="list-inline">
                      <button className="btn btn-primary btn-small" type="submit" disabled={catalogSubmitting}>
                        {catalogSubmitting ? 'Submitting...' : 'Submit request'}
                      </button>
                      <button
                        className="btn btn-ghost btn-small"
                        type="button"
                        onClick={() => setCatalogActiveId('')}
                        disabled={catalogSubmitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
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
                      <button className="btn btn-ghost btn-small" type="button" onClick={() => handleOpenKnowledge(article.id)}>
                        View
                      </button>
                    </div>
                  ))}
                </div>
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
                      <InlineTag>{knowledgeView.category}</InlineTag>
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
                          Impact: {problem.impact} - Linked incidents: {problem.linked}
                        </p>
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
                  {projects.map((project) => (
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
