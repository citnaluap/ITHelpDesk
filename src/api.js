const request = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return response.json();
};

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'All') return;
    searchParams.set(key, String(value));
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export const fetchTickets = async (params) => {
  const data = await request(`/api/tickets${buildQuery(params)}`);
  return { tickets: data.tickets || [], meta: data.meta || {} };
};

export const fetchApprovals = async (params) => {
  const data = await request(`/api/approvals${buildQuery(params)}`);
  return { approvals: data.approvals || [], meta: data.meta || {} };
};

export const fetchTasks = async (params) => {
  const data = await request(`/api/tasks${buildQuery(params)}`);
  return { tasks: data.tasks || [], meta: data.meta || {} };
};

export const createTask = async (task) =>
  request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ task }),
  });

export const updateTask = async (id, updates) =>
  request('/api/tasks', {
    method: 'PATCH',
    body: JSON.stringify({ id, updates }),
  });

export const fetchAutomationRules = async () => {
  const data = await request('/api/automation-rules');
  return data.rules || [];
};

export const createAutomationRule = async (rule) =>
  request('/api/automation-rules', {
    method: 'POST',
    body: JSON.stringify({ rule }),
  });

export const updateAutomationRule = async (id, updates) =>
  request('/api/automation-rules', {
    method: 'PATCH',
    body: JSON.stringify({ id, updates }),
  });

export const fetchCannedResponses = async () => {
  const data = await request('/api/canned-responses');
  return data.responses || [];
};

export const createCannedResponse = async (response) =>
  request('/api/canned-responses', {
    method: 'POST',
    body: JSON.stringify({ response }),
  });

export const updateCannedResponse = async (id, updates) =>
  request('/api/canned-responses', {
    method: 'PATCH',
    body: JSON.stringify({ id, updates }),
  });

export const updateTicket = async (id, updates) =>
  request('/api/tickets', {
    method: 'PATCH',
    body: JSON.stringify({ id, updates }),
  });

export const createTicket = async (ticket) =>
  request('/api/tickets', {
    method: 'POST',
    body: JSON.stringify({ ticket }),
  });

export const updateApproval = async (id, updates) =>
  request('/api/approvals', {
    method: 'PATCH',
    body: JSON.stringify({ id, updates }),
  });

export const sendTicketMessage = async (payload) =>
  request('/api/ticket-message', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchProjects = async () => {
  const data = await request('/api/projects');
  return data.projects || [];
};

export const createProject = async (project) =>
  request('/api/projects', {
    method: 'POST',
    body: JSON.stringify({ project }),
  });

export const fetchChanges = async () => {
  const data = await request('/api/changes');
  return data.changes || [];
};

export const createChange = async (change) =>
  request('/api/changes', {
    method: 'POST',
    body: JSON.stringify({ change }),
  });

export const fetchProblems = async () => {
  const data = await request('/api/problems');
  return data.problems || [];
};

export const createProblem = async (problem) =>
  request('/api/problems', {
    method: 'POST',
    body: JSON.stringify({ problem }),
  });

export const fetchReleases = async () => {
  const data = await request('/api/releases');
  return data.releases || [];
};

export const createRelease = async (release) =>
  request('/api/releases', {
    method: 'POST',
    body: JSON.stringify({ release }),
  });

export const fetchCatalogItems = async () => {
  const data = await request('/api/service-catalog');
  return data.items || [];
};

export const createCatalogItem = async (item) =>
  request('/api/service-catalog', {
    method: 'POST',
    body: JSON.stringify({ item }),
  });

export const fetchServiceStatus = async () => {
  const data = await request('/api/service-status');
  return data.statuses || [];
};

export const createServiceStatus = async (item) =>
  request('/api/service-status', {
    method: 'POST',
    body: JSON.stringify({ item }),
  });

export const updateServiceStatus = async (id, updates) =>
  request('/api/service-status', {
    method: 'PATCH',
    body: JSON.stringify({ id, updates }),
  });

export const deleteServiceStatus = async (id) =>
  request('/api/service-status', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });

export const fetchAnnouncements = async () => {
  const data = await request('/api/announcements');
  return data.announcements || [];
};

export const createAnnouncement = async (item) =>
  request('/api/announcements', {
    method: 'POST',
    body: JSON.stringify({ item }),
  });

export const updateAnnouncement = async (id, updates) =>
  request('/api/announcements', {
    method: 'PATCH',
    body: JSON.stringify({ id, updates }),
  });

export const deleteAnnouncement = async (id) =>
  request('/api/announcements', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
