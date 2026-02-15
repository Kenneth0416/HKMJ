import React from 'react';

export const MahjongLogo = ({ className = "", size = 40 }: { className?: string; size?: number }) => (
  <span 
    className={`inline-flex items-center justify-center select-none ${className}`} 
    style={{ 
        fontSize: size, 
        width: size, 
        height: size,
        lineHeight: 1 
    }}
    role="img" 
    aria-label="Mahjong Faat (Green Dragon)"
  >
    🀅
  </span>
);
