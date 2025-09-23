import React from 'react';

interface LandingPageProps {
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-inter">
      {/* Left side - Blueprint themed section (2/3 width) */}
      <div 
        className="w-full lg:w-2/3 flex flex-col justify-between p-8 sm:p-12 lg:p-16 min-h-screen"
        style={{
          backgroundImage: 'url(/docs/imgs/Landing_Page_BG.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Header content positioned in upper left */}
        <div className="flex flex-col items-start">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            CONSTRUCTION INTELLIGENCE.
          </h1>
          <p className="text-lg sm:text-xl text-white leading-relaxed max-w-2xl">
            For precision, efficiency, and expert insight.
          </p>
        </div>

        {/* Architectural illustration area - positioned in center/lower */}
        <div className="flex-1 flex items-center justify-center mt-8">
          {/* This area would contain the architectural drawing from the design */}
          {/* For now, we'll use a placeholder that matches the blueprint theme */}
          <div className="text-white/80">
            <svg className="w-80 h-80 lg:w-96 lg:h-96" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
              {/* Modern building outline */}
              <path d="M 50 350 L 50 150 L 120 100 L 280 100 L 350 150 L 350 350 L 50 350 Z" stroke="white" strokeWidth="2" fill="none" />
              
              {/* Building sections */}
              <path d="M 50 150 L 120 150 L 120 350" stroke="white" strokeWidth="1.5" strokeDasharray="4" fill="none" />
              <path d="M 280 350 L 280 150 L 350 150" stroke="white" strokeWidth="1.5" strokeDasharray="4" fill="none" />
              
              {/* Windows and details */}
              <rect x="70" y="180" width="30" height="40" stroke="white" strokeWidth="1" fill="none" />
              <rect x="110" y="180" width="30" height="40" stroke="white" strokeWidth="1" fill="none" />
              <rect x="200" y="140" width="30" height="40" stroke="white" strokeWidth="1" fill="none" />
              <rect x="250" y="140" width="30" height="40" stroke="white" strokeWidth="1" fill="none" />
              <rect x="300" y="140" width="30" height="40" stroke="white" strokeWidth="1" fill="none" />
              
              {/* Pool area */}
              <rect x="150" y="280" width="80" height="40" stroke="white" strokeWidth="1.5" fill="none" />
              <rect x="160" y="290" width="60" height="20" stroke="white" strokeWidth="1" fill="rgba(255,255,255,0.1)" />
              
              {/* Data flow elements */}
              <circle cx="80" cy="120" r="3" fill="#29B6F6" />
              <circle cx="120" cy="110" r="3" fill="#29B6F6" />
              <circle cx="160" cy="115" r="3" fill="#FFC107" />
              <path d="M 80 120 Q 100 110 120 110" stroke="#29B6F6" strokeWidth="1.5" fill="none" />
              <path d="M 120 110 Q 140 112 160 115" stroke="#29B6F6" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>

        {/* Footer */}
        <p className="text-sm text-white/60 mt-8">&copy; {new Date().getFullYear()} Q-Sci. All rights reserved.</p>
      </div>
      
      {/* Right side - Light gray section (1/3 width) */}
      <div className="w-full lg:w-1/3 bg-gray-100 flex flex-col items-center justify-center p-8 lg:p-12 min-h-screen">
        {/* Logo section */}
        <div className="flex flex-col items-center mb-16">
          <div className="flex items-center mb-4">
            <img 
              src="/docs/imgs/Q-Sci_Logo_clear.png" 
              alt="Q-Sci Logo" 
              className="h-32 w-auto"
            />
          </div>
          <p className="text-sm text-gray-500 tracking-wider uppercase font-medium">
            AI-POWERED QUANTITY SURVEYING
          </p>
        </div>

        {/* Call to Action Button */}
        <button 
          onClick={onLogin}
          className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-4 px-12 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
        >
          Discover Q-Sci
        </button>
      </div>
    </div>
  );
};

export default LandingPage;