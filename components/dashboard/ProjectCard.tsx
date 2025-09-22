
import React from 'react';
import type { Project } from '../../types';
import Icon from '../ui/Icon';

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

  return (
    <div 
      onClick={() => onSelectProject(project)}
      className="bg-white p-6 rounded-xl shadow-sm hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer flex flex-col justify-between group min-h-[200px]">
      <div>
        <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-lg bg-[#0D47A1]/10 flex items-center justify-center mb-4">
                <Icon name="folder" className="w-6 h-6 text-[#0D47A1]" />
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 group-hover:bg-[#FFC107] transition-colors">
                <p className="font-bold text-sm text-[#424242]">{project.client.charAt(0)}</p>
            </div>
        </div>
        <h3 className="font-semibold text-lg text-[#424242] leading-tight">{project.name}</h3>
        <p className="text-sm text-[#616161]">{project.client}</p>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">Last updated {timeAgo(project.lastModified)}</p>
      </div>
    </div>
  );
};

export default ProjectCard;
