
import React from 'react';
import Logo from '../ui/Logo';

interface LandingPageProps {
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-inter">
      {/* Left side content */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-12 lg:p-16">
        <Logo showText={true} />
        
        <div className="my-16 lg:my-0">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#424242] font-poppins leading-tight">
            Your Co-Pilot for Construction Intelligence.
          </h1>
          <p className="mt-4 text-lg text-[#616161]">
            Streamline quantity surveying with AI-powered precision, efficiency, and expert insight.
          </p>
          <div className="mt-8 flex items-center space-x-6">
            <button 
              onClick={onLogin}
              className="bg-[#29B6F6] text-white font-semibold py-3 px-8 rounded-lg hover:bg-[#039BE5] transition-colors duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29B6F6]">
              Discover Q-Scribe
            </button>
             <a href="#" className="font-semibold text-[#29B6F6] hover:underline">
                Learn More
            </a>
          </div>
        </div>
        
        <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Q-Scribe. All rights reserved.</p>
      </div>
      
      {/* Right side image */}
      <div 
        className="w-full lg:w-1/2 bg-[#0D47A1] bg-cover bg-center min-h-[50vh] lg:min-h-screen flex items-center justify-center p-8"
        // This is a placeholder for the hero image.
        // I am using a CSS-generated blueprint grid to mimic the style from the mockup.
        // You can replace this with `backgroundImage: 'url(path/to/image.jpg)'`
        style={{
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 2px, transparent 2px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 2px, transparent 2px), linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
            backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px',
            backgroundPosition: '-2px -2px, -2px -2px, -1px -1px, -1px -1px',
        }}
      >
        <div className="text-center">
            {/* The mockup shows an architectural drawing here. This SVG is a placeholder. */}
            <svg className="w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 text-white/50" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <path d="M 30 170 L 30 70 L 100 20 L 170 70 L 170 170 L 30 170 Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M 30 70 L 80 70 L 80 170" stroke="currentColor" strokeWidth="1" strokeDasharray="4" fill="none" />
                <path d="M 120 170 L 120 70 L 170 70" stroke="currentColor" strokeWidth="1" strokeDasharray="4" fill="none" />
                <rect x="50" y="120" width="30" height="50" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <rect x="120" y="90" width="30" height="40" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <circle cx="100" cy="110" r="15" stroke="currentColor" strokeWidth="1" fill="none" />
                <path d="M 100 95 L 100 125 M 85 110 L 115 110" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
