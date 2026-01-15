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

export const updateApproval = async (id, updates) =>
  request('/api/approvals', {
    method: 'PATCH',
    body: JSON.stringify({ id, updates }),
  });
