export const getTicketDescription = (ticket) => {
  if (!ticket) return '';
  return (
    ticket.description ||
    ticket.details ||
    ticket.notes ||
    ticket.body ||
    ticket.emailBody ||
    ticket.rawBody ||
    ''
  );
};
