
import React, { useState } from 'react';
import type { Project } from './types';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import ProjectWorkspace from './components/project/ProjectWorkspace';
import Header from './components/layout/Header';

// Mock data for initial projects
const initialProjects: Project[] = [
  { id: 'proj-1', name: 'Bungalow in Runda', client: 'Mr. & Mrs. Omondi', lastModified: '2024-07-22T10:00:00Z' },
  { id: 'proj-2', name: 'Kilimani Maisonette', client: 'Urban Developers', lastModified: '2024-07-21T14:30:00Z' },
  { id: 'proj-3', name: 'Karen Office Block', client: 'Corporate Holdings', lastModified: '2024-07-20T09:15:00Z' },
];

const App: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
  };

  const handleBackToDashboard = () => {
    setSelectedProject(null);
  };
  
  const handleCreateNewProject = () => {
    const newProject: Project = {
        id: `proj-${Date.now()}`,
        name: 'New Untitled Project',
        client: 'Unknown Client',
        lastModified: new Date().toISOString()
    };
    setSelectedProject(newProject);
  };


  return (
    <div className="flex h-screen bg-[#F5F5F5] text-[#616161]">
      <Sidebar onNewProject={handleCreateNewProject} onDashboardClick={handleBackToDashboard} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header user={{ name: 'Purity W.', company: 'PW Surveyors' }} project={selectedProject} onBack={handleBackToDashboard} />
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {selectedProject ? (
            <ProjectWorkspace project={selectedProject} />
          ) : (
            <Dashboard projects={initialProjects} onSelectProject={handleSelectProject} onNewProject={handleCreateNewProject} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
