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

export const SLA_STATE_LABELS = {
  'on-track': 'On track',
  'at-risk': 'At risk',
  breached: 'Breached',
  met: 'Met',
};

export const getSlaPolicy = (priority) => SLA_POLICIES[priority] || SLA_POLICIES.Medium;

export const formatDuration = (ms) => {
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

export const buildSlaDisplay = ({ startAt, targetMs, completedAt, now, warnMs }) => {
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
