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
