
import React from 'react';
import type { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
  onSelectProject: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelectProject }) => {
    
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  }

  const getStatusClasses = (status: Project['status']) => {
    switch (status) {
        case 'Draft': return 'bg-gray-200 text-gray-800';
        case 'In Review': return 'bg-yellow-200 text-yellow-800';
        case 'Completed': return 'bg-green-200 text-green-800';
        default: return 'bg-gray-200 text-gray-800';
    }
  }

  return (
    <div 
      onClick={() => onSelectProject(project)}
      className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-xl hover:-translate-y-1 transform transition-all duration-300 cursor-pointer flex flex-col justify-between group min-h-[220px]">
      <div>
        <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-lg text-[#424242] leading-tight group-hover:text-[#0D47A1] transition-colors">{project.name}</h3>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusClasses(project.status)}`}>
                {project.status}
            </span>
        </div>
        <p className="text-base text-[#616161]">{project.client}</p>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-sm text-[#616161]">Last updated {timeAgo(project.lastModified)}</p>
      </div>
    </div>
  );
};

export default ProjectCard;
