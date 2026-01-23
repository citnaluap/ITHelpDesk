import React from 'react';
import { toDisplayText } from '../utils/tickets';

const ENTRY_LABELS = {
  note: 'Internal note',
  message: 'Message to requester',
  status: 'Status update',
  approval: 'Approval',
  automation: 'Automation',
};

const TicketEntry = ({ entry }) => {
  const label = ENTRY_LABELS[entry.type] || 'Update';
  return (
    <div className={`entry-item ${entry.type}`}>
      <div className="entry-header">
        <span className={`entry-pill ${entry.type}`}>{label}</span>
        <span className="timestamp">{entry.time}</span>
      </div>
      <p className="entry-author">{toDisplayText(entry.author)}</p>
      <p className="entry-text">{toDisplayText(entry.text)}</p>
    </div>
  );
};

export default TicketEntry;
