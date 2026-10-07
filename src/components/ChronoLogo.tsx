import React from 'react';

export const ChronoLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 28,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <rect width="32" height="32" rx="9" fill="#1F2937" />
      {/* Video timeline frame ring */}
      <circle cx="16" cy="16" r="9.5" stroke="#C9C2FF" strokeWidth="1.75" strokeDasharray="3 2" />
      {/* Intelligent central lens */}
      <circle cx="16" cy="16" r="5" fill="#FFFFFF" fillOpacity="0.9" />
      {/* Play / timeline focal needle */}
      <polygon points="15,13.5 19,16 15,18.5" fill="#1F2937" />
      {/* Temporal accent dot */}
      <circle cx="23" cy="9" r="2" fill="#BFE8D0" />
    </svg>
  );
};
