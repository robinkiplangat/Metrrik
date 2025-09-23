import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className, showText = true }) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <img 
        src="/docs/imgs/Q-Sci_Logo_text_dark.png" 
        alt="Q-Sci Logo" 
        className="h-12 w-auto flex-shrink-0"
      />
      {showText && (
        <div>
          {/* <span className="text-3xl font-bold text-white">
            Q-Sci
          </span> */}
        </div>
      )}
    </div>
  );
};

export default Logo;