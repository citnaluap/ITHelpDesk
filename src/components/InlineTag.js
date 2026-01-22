import React from 'react';

const InlineTag = ({ children, className = '', style }) => (
  <span className={`chip${className ? ` ${className}` : ''}`} style={style}>
    {children}
  </span>
);

export default InlineTag;
