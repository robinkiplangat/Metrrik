
import React from 'react';
import Logo from '../ui/Logo';
import Icon from '../ui/Icon';

type View = 'dashboard' | 'projects' | 'settings';

interface NavItemProps {
  iconName: 'dashboard' | 'folder' | 'settings';
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ iconName, label, active = false, onClick }) => {
  const baseClasses = "flex items-center space-x-4 px-6 py-3 cursor-pointer transition-colors duration-200 text-base font-medium relative";
  const activeClasses = "bg-white/10 text-white";
  const inactiveClasses = "text-gray-300 hover:bg-white/10 hover:text-white";

  return (
    <div className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`} onClick={onClick}>
      {active && <div className="absolute left-0 top-0 h-full w-1 bg-[#FFC107]"></div>}
      <Icon name={iconName} className="w-6 h-6" />
      <span>{label}</span>
    </div>
  );
};

interface SidebarProps {
    currentView: View;
    onSetView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onSetView }) => {
  const user = { name: 'Purity W.', company: 'PW Surveyors' };
  
  return (
    <aside className="w-72 bg-[#0D47A1] flex-shrink-0 flex flex-col text-white">
      <div className="py-6 px-4 mb-4">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1">
        <NavItem iconName="dashboard" label="Dashboard" active={currentView === 'dashboard'} onClick={() => onSetView('dashboard')} />
        <NavItem iconName="folder" label="Projects" active={currentView === 'projects'} onClick={() => onSetView('projects')} />
        <NavItem iconName="settings" label="Settings" active={currentView === 'settings'} onClick={() => onSetView('settings')} />
      </nav>
      <div className="mt-auto p-4 border-t border-white/20">
        <div onClick={() => alert('Open Clerk User Profile Modal...')} className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-white/10">
          <div className="w-10 h-10 rounded-full bg-[#FFC107] flex items-center justify-center text-[#0D47A1] font-bold text-lg">
            {user.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sm text-white">{user.name}</p>
            <p className="text-xs text-gray-300">{user.company}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
