
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
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#29B6F6', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#0D47A1', stopOpacity: 1 }} />
          </linearGradient>
          <clipPath id="hexagon-clip">
            <path d="M50 2.5 L95.5 26.25 L95.5 73.75 L50 97.5 L4.5 73.75 L4.5 26.25 Z" />
          </clipPath>
        </defs>
        
        {/* Hexagon Outline */}
        <path d="M50 2.5 L95.5 26.25 L95.5 73.75 L50 97.5 L4.5 73.75 L4.5 26.25 Z" stroke="#424242" strokeWidth="2" fill="none" opacity="0.5" />
        <path d="M22 13.5 L78 13.5" stroke="#FFC107" strokeWidth="3" />

        {/* Ruler */}
        <path d="M25 80 L80 25 L70 15 L15 70 Z" fill="#0D47A1" />
        <path d="M70 15 L85 30 L80 25 Z" fill="#0D47A1" />
        
        {/* Ruler Markings */}
        {[...Array(9)].map((_, i) => (
          <line key={`l-${i}`} x1={29 + i * 5} y1={76 - i * 5} x2={31 + i * 5} y2={74 - i * 5} stroke="white" strokeWidth="1" />
        ))}
        {[...Array(4)].map((_, i) => (
           <line key={`b-${i}`} x1={25 + (i+1)*10} y1={80 - (i+1)*10} x2={29 + (i+1)*10} y2={76 - (i+1)*10} stroke="white" strokeWidth="1.5" />
        ))}

        {/* Nodes and Circuits */}
        <circle cx="20" cy="50" r="4" fill="#29B6F6" />
        <path d="M35 50 C28 50, 28 50, 24 50" stroke="#616161" strokeWidth="1" fill="none" />
        
        <circle cx="25" cy="65" r="4" fill="#29B6F6" />
        <path d="M38 58 C30 63, 30 63, 29 64" stroke="#616161" strokeWidth="1" fill="none" />

        <circle cx="35" cy="78" r="4" fill="#29B6F6" />
        <path d="M42 65 C38 72, 38 72, 39 76" stroke="#616161" strokeWidth="1" fill="none" />

        <circle cx="78" cy="40" r="4" fill="#29B6F6" />
        <path d="M60 48 C68 43, 68 43, 74 41" stroke="#616161" strokeWidth="1" fill="none" />

        <circle cx="85" cy="55" r="4" fill="#FFC107" />
        <path d="M65 52 C75 54, 75 54, 81 55" stroke="#616161" strokeWidth="1" fill="none" />

        <circle cx="40" cy="35" r="3" fill="#B0BEC5" />
        <path d="M45 45 C42 40, 42 40, 42 38" stroke="#616161" strokeWidth="1" fill="none" />

        <circle cx="70" cy="70" r="3" fill="#B0BEC5" />
        <path d="M62 60 C67 65, 67 65, 68 68" stroke="#616161" strokeWidth="1" fill="none" />

      </svg>
      {showText && (
        <div>
          <span className="text-3xl font-bold text-[#424242]">
            Q-Scribe
          </span>
          <p className="text-xs tracking-wider text-[#0D47A1] font-medium">AI-POWERED QUANTITY SURVEYING</p>
        </div>
      )}
    </div>
  );
};

export default Logo;
