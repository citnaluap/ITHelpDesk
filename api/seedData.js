const BASE_TIME = Date.now();
const hoursAgo = (hours) => BASE_TIME - hours * 60 * 60 * 1000;
const daysAgo = (days) => BASE_TIME - days * 24 * 60 * 60 * 1000;

export const ticketSeed = [
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
    attachments: [
      {
        id: 'att-4921-1',
        name: 'vpn-log-screenshot.png',
        url: '/employee-pictures/Adrian Pope.png',
        type: 'image/png',
        size: 245812,
      },
    ],
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
    attachments: [
      {
        id: 'att-4923-1',
        name: 'battery-report.jpg',
        url: '/employee-pictures/Aimsley Shoffstall.jpg',
        type: 'image/jpeg',
        size: 182004,
      },
    ],
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
    impact: 'Multiple teams',
    urgency: 'High',
    contactPreference: 'Email',
    device: 'Email infrastructure',
    description: 'Messages delayed by ~10 minutes for multiple users. Monitoring SMTP queues and filters.',
    entries: [
      { id: 'entry-6', type: 'note', author: 'Geoffrey Heller', time: 'Mon 9:40a', text: 'Restarted connector services and observed queue drain.' },
      { id: 'entry-7', type: 'note', author: 'Geoffrey Heller', time: 'Mon 1:10p', text: 'Issue resolved; no further delays reported.' },
    ],
  },
];

export const approvalSeed = [
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
    due: 'Mon',
  },
  {
    id: 'APR-85',
    type: 'Account',
    title: 'Shared mailbox for operations',
    requester: 'Claire V.',
    status: 'Pending',
    due: 'Fri',
  },
];

export const taskSeed = [
  { id: 'TSK-451', ticketId: 'INC-4921', title: 'Collect VPN logs', assignee: 'Paul Antic', status: 'In Progress', due: 'Today' },
  { id: 'TSK-452', ticketId: 'INC-4921', title: 'Schedule ISP check', assignee: 'Geoffrey Heller', status: 'Not started', due: 'Tomorrow' },
  { id: 'TSK-460', ticketId: 'REQ-4923', title: 'Validate replacement eligibility', assignee: 'Paul Antic', status: 'Completed', due: 'Today' },
];

export const automationSeed = [
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
    when: 'Status updated',
    condition: 'Status is Waiting on User',
    action: 'Send reminder email',
    enabled: true,
  },
  {
    id: 'AUTO-23',
    name: 'SLA at-risk reminder',
    when: 'SLA at risk',
    condition: 'Priority is High',
    action: 'Send reminder email',
    enabled: true,
  },
];

export const serviceStatusSeed = [
  { id: 'STS-1', name: 'Email and MFA', state: 'Operational', color: '#008542' },
  { id: 'STS-2', name: 'VPN / Remote Access', state: 'Degraded', color: '#f9a51a' },
  { id: 'STS-3', name: 'File Shares', state: 'Operational', color: '#008542' },
  { id: 'STS-4', name: 'Printing', state: 'Investigating', color: '#003551' },
];

export const announcementSeed = [
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

export const cannedSeed = [
  {
    id: 'CAN-01',
    title: 'Request received',
    body: 'Thanks for reaching out. We have received your request and will update you shortly.',
  },
  {
    id: 'CAN-02',
    title: 'Need more info',
    body: 'Could you please provide screenshots or the exact error message so we can continue?',
  },
  {
    id: 'CAN-03',
    title: 'Resolution summary',
    body: 'Issue resolved. We updated the configuration and verified service health. Let us know if it recurs.',
  },
];

export const projectSeed = [
  { id: 'PRJ-8', title: 'Remote worker hardening', status: 'On track', owner: 'Erik Lofgren', progress: 62 },
  { id: 'PRJ-11', title: 'Asset lifecycle refresh', status: 'At risk', owner: 'Paul Antic', progress: 38 },
  { id: 'PRJ-14', title: 'Service catalog expansion', status: 'On track', owner: 'Geoffrey Heller', progress: 71 },
];

export const changeSeed = [
  {
    id: 'CHG-1',
    area: 'Network',
    title: 'VPN gateway upgrade',
    window: 'Fri 9:00p - 11:00p',
    status: 'Scheduled',
  },
  {
    id: 'CHG-2',
    area: 'Collaboration',
    title: 'Teams client patch rollout',
    window: 'Tue 6:00p - 8:00p',
    status: 'In Progress',
  },
  {
    id: 'CHG-3',
    area: 'Email',
    title: 'Exchange spam filter tuning',
    window: 'Wed 7:00p - 8:00p',
    status: 'Planned',
  },
];

export const problemSeed = [
  { id: 'PRB-19', title: 'Recurring VPN disconnects', status: 'Root cause analysis', impact: 'Multiple teams', linked: 6 },
  { id: 'PRB-22', title: 'Email delays with vendor relay', status: 'Known error', impact: 'Org-wide', linked: 3 },
  { id: 'PRB-25', title: 'Print server spooler crash', status: 'Workaround', impact: 'Single site', linked: 4 },
];

export const releaseSeed = [
  { id: 'REL-12', title: 'Q4 Windows patch bundle', status: 'Scheduled', window: 'Oct 10', owner: 'Change Mgmt' },
  { id: 'REL-13', title: 'Teams client feature update', status: 'In Progress', window: 'Sep 28', owner: 'Unified Comms' },
  { id: 'REL-14', title: 'Firewall policy baseline', status: 'Planned', window: 'Nov 2', owner: 'Security' },
];

export const serviceCatalogSeed = [
  { id: 'CAT-101', name: 'New employee onboarding', type: 'Workflow', eta: '3 days', approval: 'Manager approval' },
  { id: 'CAT-203', name: 'VPN access request', type: 'Access', eta: '1 day', approval: 'Security review' },
  { id: 'CAT-312', name: 'Laptop replacement', type: 'Hardware', eta: '5 days', approval: 'IT approval' },
  { id: 'CAT-404', name: 'Software Install', type: 'Software', eta: '2 days', approval: 'Cost center' },
];
