
import React from 'react';
import type { Project } from '../../services/shared/types';
import ProjectCard from './ProjectCard';
import Icon from '../ui/Icon';
import { useUser } from '@clerk/clerk-react';

interface DashboardProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, onSelectProject, onNewProject }) => {
  const { user } = useUser();
  const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'User';

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-5xl font-bold text-[#424242]">Welcome back, {firstName}!</h1>
        <p className="text-[#616161] mt-2 text-base">Here's a look at your recent activity. Let's get started.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div 
          onClick={onNewProject}
          className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-pointer flex items-center space-x-6 border border-gray-200">
          <div className="w-16 h-16 rounded-full bg-[#29B6F6]/10 flex items-center justify-center">
            <Icon name="plus" className="w-8 h-8 text-[#29B6F6]" />
          </div>
          <div>
            <h3 className="font-semibold text-xl text-[#424242]">Create New Project</h3>
            <p className="text-[#616161] mt-1">Start a new estimate or BQ from scratch.</p>
          </div>
        </div>
        <div 
          onClick={onNewProject}
          className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-pointer flex items-center space-x-6 border border-gray-200">
          <div className="w-16 h-16 rounded-full bg-[#29B6F6]/10 flex items-center justify-center">
            <Icon name="chat" className="w-8 h-8 text-[#29B6F6]" />
          </div>
          <div>
            <h3 className="font-semibold text-xl text-[#424242]">Start a Quick Estimate</h3>
            <p className="text-[#616161] mt-1">Jump directly into the AI chat for a quick estimate.</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-[#424242]">Recent Projects</h2>
         {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4">
            {projects.map(project => (
                <ProjectCard key={project.id} project={project} onSelectProject={onSelectProject} />
            ))}
            </div>
        ) : (
            <div className="mt-4 text-center py-16 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-[#424242]">You don't have any projects yet.</h3>
                <p className="text-[#616161]">Click 'Create New Project' to get started!</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
