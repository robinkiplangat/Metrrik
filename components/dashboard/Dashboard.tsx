
import React from 'react';
import type { Project } from '../../types';
import ProjectCard from './ProjectCard';
import Icon from '../ui/Icon';

interface DashboardProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, onSelectProject, onNewProject }) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-[#424242]">Recent Projects</h2>
        <p className="text-[#616161] mt-1">Here are the projects you've worked on recently.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div 
          onClick={onNewProject}
          className="flex flex-col items-center justify-center bg-white p-6 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#29B6F6] hover:bg-blue-50 transition-all duration-300 cursor-pointer min-h-[200px]">
          <div className="w-14 h-14 rounded-full bg-[#29B6F6]/20 flex items-center justify-center mb-4">
            <Icon name="plus" className="w-7 h-7 text-[#0D47A1]" />
          </div>
          <h3 className="font-semibold text-lg text-[#0D47A1]">New Project</h3>
          <p className="text-sm text-center text-[#616161]">Start a new estimate or BQ from scratch.</p>
        </div>
        {projects.map(project => (
          <ProjectCard key={project.id} project={project} onSelectProject={onSelectProject} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
