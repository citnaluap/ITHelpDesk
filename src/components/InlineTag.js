import React from 'react';

const InlineTag = ({ children, className = '' }) => (
  <span className={`chip${className ? ` ${className}` : ''}`}>{children}</span>
);

export default InlineTag;
