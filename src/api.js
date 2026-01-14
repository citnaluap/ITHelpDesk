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

export const fetchTickets = async () => {
  const data = await request('/api/tickets');
  return data.tickets || [];
};

export const fetchApprovals = async () => {
  const data = await request('/api/approvals');
  return data.approvals || [];
};

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
