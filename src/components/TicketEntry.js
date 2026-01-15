import React from 'react';

const TicketEntry = ({ entry }) => (
  <div className={`entry-item ${entry.type}`}>
    <div className="entry-header">
      <span className={`entry-pill ${entry.type}`}>{entry.type === 'note' ? 'Internal note' : 'Message to requester'}</span>
      <span className="timestamp">{entry.time}</span>
    </div>
    <p className="entry-author">{entry.author}</p>
    <p className="entry-text">{entry.text}</p>
  </div>
);

export default TicketEntry;
