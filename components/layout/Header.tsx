
import React from 'react';
import type { Project } from '../../services/shared/types';
import Icon from '../ui/Icon';
import { UserButton } from '@clerk/clerk-react';

type View = 'dashboard' | 'projects' | 'settings';

interface HeaderProps {
  currentView: View;
  project: Project | null;
  onBack?: () => void;
  onNewProject: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, project, onBack, onNewProject }) => {

  const getTitle = () => {
    if (project) {
      return (
        <div className="flex items-center space-x-2 text-[#616161] text-xl">
           <button onClick={onBack} className="hover:text-[#424242] transition-colors font-semibold">
              <p>Projects</p>
          </button>
          <span className="font-semibold">&gt;</span>
          <h1 className="text-2xl font-semibold text-[#424242]">{project.name}</h1>
        </div>
      );
    }
    switch (currentView) {
      case 'dashboard':
        return <h1 className="text-2xl font-semibold text-[#424242]">Dashboard</h1>;
      case 'projects':
        return <h1 className="text-2xl font-semibold text-[#424242]">Projects</h1>;
      case 'settings':
        return <h1 className="text-2xl font-semibold text-[#424242]">Settings</h1>;
      default:
        return null;
    }
  };

  return (
    <header className="flex-shrink-0 bg-white h-20 flex items-center justify-between px-8 border-b border-[#F5F5F5]">
      <div>{getTitle()}</div>
      <div className="flex items-center space-x-6">
        {(currentView === 'dashboard' || currentView === 'projects') && !project && (
          <button 
            onClick={onNewProject}
            className="flex items-center justify-center space-x-2 bg-[#29B6F6] text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-[#039BE5] transition-colors duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29B6F6]">
            <Icon name="plus" className="w-5 h-5" />
            <span>New Project</span>
          </button>
        )}
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
};

export default Header;
