import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className, showText = true }) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <svg width="48" height="48" viewBox="0 0 100 100" className="flex-shrink-0">
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#29B6F6' }} /> {/* Light Blue */}
            <stop offset="100%" style={{ stopColor: '#0288D1' }} /> {/* Deeper Blue */}
          </linearGradient>
          <filter id="text-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.3" />
          </filter>
        </defs>
        
        {/* Hexagon shape */}
        <path 
            d="M50 2.5 L95.5 26.25 L95.5 73.75 L50 97.5 L4.5 73.75 L4.5 26.25 Z" 
            fill="url(#logo-grad)" 
        />
        
        {/* The letter 'Q' */}
        <text 
          x="50" 
          y="68" 
          fontFamily="Poppins, sans-serif" 
          fontSize="60" 
          fontWeight="700" 
          fill="white" 
          textAnchor="middle"
          filter="url(#text-shadow)"
        >
          Q
        </text>
      </svg>
      {showText && (
        <div>
          <span className="text-3xl font-bold">
            Q-Sci
          </span>
          <p className="text-xs tracking-wider font-medium opacity-80">AI-POWERED QUANTITY SURVEYING</p>
        </div>
      )}
    </div>
  );
};

export default Logo;