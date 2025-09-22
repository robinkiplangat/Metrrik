
import React from 'react';
import type { Project } from '../../types';
import Icon from '../ui/Icon';

interface HeaderProps {
  user: { name: string; company: string };
  project: Project | null;
  onBack: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, project, onBack }) => {
  return (
    <header className="flex-shrink-0 bg-white h-20 flex items-center justify-between px-8 border-b border-gray-200">
      <div>
        {project ? (
          <div className="flex items-center space-x-4">
            <button onClick={onBack} className="text-gray-500 hover:text-gray-800 transition-colors">
                <Icon name="arrow-left" className="w-6 h-6" />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-[#424242]">{project.name}</h1>
                <p className="text-sm text-[#616161]">Client: {project.client}</p>
            </div>
          </div>
        ) : (
          <h1 className="text-2xl font-bold text-[#424242]">Welcome back, {user.name.split(' ')[0]}!</h1>
        )}
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative">
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-green-400 ring-2 ring-white"></span>
            <Icon name="chat" className="w-6 h-6 text-gray-500" />
        </div>
        <div className="flex items-center space-x-3 bg-gray-100 p-2 rounded-full cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-[#0D47A1] flex items-center justify-center text-white font-bold text-lg">
            {user.name.charAt(0)}
          </div>
          <div className="pr-2 hidden sm:block">
            <p className="font-semibold text-sm text-[#424242]">{user.name}</p>
            <p className="text-xs text-[#616161]">{user.company}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
