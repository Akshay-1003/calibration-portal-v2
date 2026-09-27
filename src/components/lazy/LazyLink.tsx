// src/components/lazy/LazyLink.tsx
import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { prefetchRoute } from '../../services/routePrefetch';

const LazyLink: React.FC<LinkProps> = ({ to, ...props }) => {
  const handleMouseEnter = () => {
    if (typeof to === 'string') {
      void prefetchRoute(to);
    }
  };

  return (
    <Link
      to={to}
      onMouseEnter={handleMouseEnter}
      onFocus={handleMouseEnter} // Preload on focus for keyboard navigation
      {...props}
    />
  );
};

export default LazyLink;
