import React from 'react';
import { toDisplayText } from '../utils/tickets';

const TicketEntry = ({ entry }) => (
  <div className={`entry-item ${entry.type}`}>
    <div className="entry-header">
      <span className={`entry-pill ${entry.type}`}>{entry.type === 'note' ? 'Internal note' : 'Message to requester'}</span>
      <span className="timestamp">{entry.time}</span>
    </div>
    <p className="entry-author">{toDisplayText(entry.author)}</p>
    <p className="entry-text">{toDisplayText(entry.text)}</p>
  </div>
);

export default TicketEntry;
