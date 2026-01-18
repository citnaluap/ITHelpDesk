import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Mail,
  PenLine,
  Plus,
  Search,
  Server,
  Sparkles,
} from 'lucide-react';
import employeeDirectory from './data/employeeDirectory.json';
import { TECHNICIANS } from './data/technicians';
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
  { id: 'ticket-detail', label: 'Ticket Focus', icon: Mail, targetId: 'ticket-detail' },
  { id: 'my-work', label: 'My Work', icon: PenLine, targetId: 'my-work' },
  { id: 'team-queue', label: 'Team Queue', icon: PenLine, targetId: 'team-queue' },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle2, targetId: 'approvals' },
  { id: 'assets', label: 'Assets', icon: Server, href: 'https://it-asset-management-ten.vercel.app' },
  { id: 'changes', label: 'Change Calendar', icon: CalendarClock, targetId: 'changes' },
];

const systemStatus = [
  { name: 'Email and MFA', state: 'Operational', color: '#008542' },
  { name: 'VPN / Remote Access', state: 'Degraded', color: '#f9a51a' },
  { name: 'File Shares', state: 'Operational', color: '#008542' },
  { name: 'Printing', state: 'Investigating', color: '#003551' },
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

const InlineTag = ({ children, className = '' }) => (
  <span className={`chip${className ? ` ${className}` : ''}`}>{children}</span>
);

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

const WorkItem = ({ item }) => (
  <div className="work-item">
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
    <button className="btn btn-ghost btn-small" type="button">
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
    onDoubleClick={() => onOpen?.(item.id)}
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

const buildPreviewText = (text) => {
  if (!text) return 'No description provided.';
  const trimmed = text.trim();
  if (trimmed.length <= 220) return trimmed;
  return `${trimmed.slice(0, 220)}...`;
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
  const [currentUser, setCurrentUser] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
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

  const triageTickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tickets.filter((item) => {
      const isNewOrUnassigned = item.status === 'New' || item.assignee === 'Unassigned' || !item.assignee;
      const matchesTerm =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term) ||
        item.requester.toLowerCase().includes(term);
      return isNewOrUnassigned && matchesTerm;
    });
  }, [tickets, search]);

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

  const activeTicket =
    tickets.find((item) => item.id === selectedTicketId) || filteredTickets[0] || tickets[0];
  const triageActiveTicket =
    triageTickets.find((item) => item.id === selectedTicketId) || triageTickets[0] || activeTicket;
  const requesterRecord = activeTicket?.requesterEmail
    ? employeeLookup.get(activeTicket.requesterEmail.toLowerCase())
    : null;
  const requesterAssets = requesterRecord ? buildAssetList(requesterRecord) : [];
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

  const handleOpenTicketDetail = (id) => {
    if (!id) return;
    setSelectedTicketId(id);
    setNoteDraft('');
    setActiveSection('ticket-detail');
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
              <button className="btn btn-primary" type="button" onClick={() => handleNavigate('tickets')}>
                <Plus size={16} />
                New ticket
              </button>
              <div className="topbar-user">
                <span className="badge">Signed in</span>
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
                <section className="card">
                  <div className="section-title">Queue triage</div>
                  <h2 className="section-heading">New and unassigned tickets</h2>
                  <p className="section-sub">
                    Focus on tickets that need an owner. Open the full workspace when you are ready to work the issue.
                  </p>
                  <p className="ticket-intake">
                    Intake: {INTAKE_EMAIL} via {INTAKE_SOURCE}
                  </p>
                  <div className="tickets-layout">
                    <div className="ticket-list">
                      {triageTickets.map((item) => (
                        <TicketRow
                          key={item.id}
                          item={item}
                          isActive={triageActiveTicket?.id === item.id}
                          onSelect={handleSelectTicket}
                          onOpen={handleOpenTicketDetail}
                        />
                      ))}
                      {triageTickets.length === 0 && (
                        <div className="empty-state">
                          <p>No new or unassigned tickets match your search.</p>
                        </div>
                      )}
                    </div>
                    <div className="ticket-detail ticket-preview">
                      {triageActiveTicket ? (
                        <>
                          <div className="ticket-detail-header">
                            <div>
                              <div className="list-inline">
                                <InlineTag>{triageActiveTicket.type}</InlineTag>
                                <InlineTag className="mono">{triageActiveTicket.id}</InlineTag>
                                <span className={`priority-tag ${toKebabCase(triageActiveTicket.priority)}`}>
                                  {triageActiveTicket.priority}
                                </span>
                                <span className={`status-pill status-${toKebabCase(triageActiveTicket.status)}`}>
                                  {triageActiveTicket.status}
                                </span>
                              </div>
                              <h3 className="ticket-title">{triageActiveTicket.title}</h3>
                              <p className="work-meta">
                                {triageActiveTicket.requester} - {triageActiveTicket.requesterEmail}
                              </p>
                            </div>
                            <div className="ticket-actions">
                              <button
                                className="btn btn-primary btn-small"
                                type="button"
                                onClick={() => handleOpenTicketDetail(triageActiveTicket.id)}
                              >
                                Open full ticket
                              </button>
                            </div>
                          </div>

                          <div className="ticket-detail-grid">
                            <div className="detail-card">
                              <div className="detail-label">Department</div>
                              <div className="detail-value">{triageActiveTicket.department || 'Not listed'}</div>
                              <div className="detail-label">Assignee</div>
                              <div className="detail-value">{triageActiveTicket.assignee || 'Unassigned'}</div>
                            </div>
                            <div className="detail-card">
                              <div className="detail-label">Created</div>
                              <div className="detail-value">{triageActiveTicket.created}</div>
                              <div className="detail-label">Contact preference</div>
                              <div className="detail-value">{triageActiveTicket.contactPreference}</div>
                            </div>
                          </div>

                          <div className="ticket-description">
                            <div className="detail-label">Summary</div>
                            <p>{buildPreviewText(triageActiveTicket.description)}</p>
                          </div>
                        </>
                      ) : (
                        <div className="empty-state">
                          <p>Select a ticket to preview it.</p>
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

                <section className="grid grid-two">
                  <div className="card compact">
                    <div className="section-title">Service status</div>
                    {systemStatus.map((item) => (
                      <div key={item.name} className="status-row">
                        <span>{item.name}</span>
                        <span className="status-pill" style={{ background: '#fff' }}>
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
                <div className="ticket-list">
                  {filteredTickets.map((item) => (
                    <TicketRow
                      key={item.id}
                      item={item}
                      isActive={activeTicket?.id === item.id}
                      onSelect={handleSelectTicket}
                      onOpen={handleOpenTicketDetail}
                    />
                  ))}
                  {filteredTickets.length === 0 && (
                    <div className="empty-state">
                      <p>No tickets match this filter. Try adjusting the search or filter.</p>
                    </div>
                  )}
                </div>
                <div className="ticket-queue-actions">
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    disabled={!activeTicket}
                    onClick={() => handleOpenTicketDetail(activeTicket?.id)}
                  >
                    Open ticket workspace
                  </button>
                </div>
              </section>
            )}

            {activeSection === 'ticket-detail' && (
              <section className="card">
                <div className="section-title">Ticket workspace</div>
                <h2 className="section-heading">Focused ticket view</h2>
                <p className="section-sub">Full context, SLA tracking, and responder tools in one place.</p>
                <div className="ticket-queue-actions ticket-focus-actions">
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => handleNavigate('tickets')}>
                    Back to queue
                  </button>
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
                    <p>No ticket selected yet. Choose a ticket from the queue to open it here.</p>
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
                        onOpen={handleOpenTicketDetail}
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
                      <WorkItem key={item.id} item={item} />
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
                    <WorkItem key={item.id} item={item} />
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
          </main>
        </div>
      </div>
    </div>
  );
}

export default AppIT;
