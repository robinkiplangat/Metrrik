
import React from 'react';
import Logo from '../ui/Logo';
import Icon from '../ui/Icon';

interface NavItemProps {
  icon: React.ReactElement;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active = false, onClick }) => {
  const baseClasses = "flex items-center space-x-3 px-4 py-3 rounded-lg cursor-pointer transition-colors duration-200";
  const activeClasses = "bg-[#0D47A1] text-white";
  const inactiveClasses = "text-[#424242] hover:bg-gray-200";

  return (
    <div className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`} onClick={onClick}>
      {icon}
      <span className="font-medium">{label}</span>
    </div>
  );
};

interface SidebarProps {
    onNewProject: () => void;
    onDashboardClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNewProject, onDashboardClick }) => {
  return (
    <aside className="w-72 bg-white flex-shrink-0 flex flex-col p-6 border-r border-gray-200">
      <div className="mb-10">
        <Logo />
      </div>
      <nav className="flex-1 space-y-2">
        <NavItem icon={<Icon name="dashboard" className="w-5 h-5" />} label="Dashboard" active onClick={onDashboardClick} />
        <NavItem icon={<Icon name="folder" className="w-5 h-5" />} label="Projects" />
        <NavItem icon={<Icon name="settings" className="w-5 h-5" />} label="Settings" />
      </nav>
      <div className="mt-auto">
        <button 
          onClick={onNewProject}
          className="w-full flex items-center justify-center space-x-2 bg-[#29B6F6] text-white font-semibold py-3 px-4 rounded-lg hover:bg-[#039BE5] transition-colors duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29B6F6]">
          <Icon name="plus" className="w-5 h-5" />
          <span>New Project</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
