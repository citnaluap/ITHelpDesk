export const toDisplayText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
};

export const getTicketSummary = (ticket, maxLength = 200) => {
  const raw = toDisplayText(
    ticket?.description ||
      ticket?.details ||
      ticket?.notes ||
      ticket?.body ||
      ticket?.emailBody ||
      ticket?.rawBody ||
      '',
  );
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  const sentenceEnd = normalized.slice(0, maxLength).search(/[.!?]\s/);
  if (sentenceEnd > 80) {
    return `${normalized.slice(0, sentenceEnd + 1).trim()}...`;
  }
  return `${normalized.slice(0, maxLength).trim()}...`;
};

export const getTicketDescription = (ticket) => {
  if (!ticket) return '';
  return toDisplayText(
    ticket.description ||
      ticket.details ||
      ticket.notes ||
      ticket.body ||
      ticket.emailBody ||
      ticket.rawBody ||
      '',
  );
};
