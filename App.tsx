
import React, { useState, useEffect } from 'react';
import type { Project, ChatMessage } from './types';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import ProjectWorkspace from './components/project/ProjectWorkspace';
import Header from './components/layout/Header';
import ProjectsView from './components/projects/ProjectsView';
import SettingsView from './components/settings/SettingsView';
import LandingPage from './components/layout/LandingPage';
import ChatBubble from './components/ui/ChatBubble';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';
// Database operations are now handled by the backend API

// Mock data for initial projects
const initialProjects: Project[] = [
  { id: 'proj-1', name: 'Bungalow in Runda', client: 'Mr. & Mrs. Omondi', lastModified: '2024-07-22T10:00:00Z', status: 'In Review' },
  { id: 'proj-2', name: 'Kilimani Maisonette', client: 'Urban Developers', lastModified: '2024-07-21T14:30:00Z', status: 'Draft' },
  { id: 'proj-3', name: 'Karen Office Block', client: 'Corporate Holdings', lastModified: '2024-07-20T09:15:00Z', status: 'Completed' },
  { id: 'proj-4', name: 'Mombasa Road Warehouse', client: 'Logistics Inc.', lastModified: '2024-07-19T11:00:00Z', status: 'Draft' },
  { id: 'proj-5', name: 'Lavington Apartment Fit-out', client: 'Private Investor', lastModified: '2024-07-18T16:45:00Z', status: 'Completed' },
];

type View = 'dashboard' | 'projects' | 'settings';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  // Database is now handled by the backend API
  
  // Global chat state for the copilot
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'ai', text: `Hello! I'm Q-Sci, your AI construction copilot. I can help you with cost estimates, project planning, quantity surveying, and more. How can I assist you today?` }
  ]);

  // Database initialization is now handled by the backend server

  const handleLogin = () => {
    // This will be handled by Clerk's SignInButton
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
  };
  
  const handleBackToProjects = () => {
    setSelectedProject(null);
    setCurrentView('projects');
  };

  const handleSetView = (view: View) => {
    setSelectedProject(null);
    setCurrentView(view);
  };
  
  const handleCreateNewProject = () => {
    const newProject: Project = {
        id: `proj-${Date.now()}`,
        name: 'New Untitled Project',
        client: 'Unknown Client',
        lastModified: new Date().toISOString(),
        status: 'Draft',
    };
    setProjects(prev => [newProject, ...prev]);
    setSelectedProject(newProject);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
    }
  };
  
  const renderContent = () => {
    if (selectedProject) {
      return <ProjectWorkspace project={selectedProject} />;
    }
    switch(currentView) {
      case 'dashboard':
        return <Dashboard projects={projects.slice(0, 4)} onSelectProject={handleSelectProject} onNewProject={handleCreateNewProject} />;
      case 'projects':
        return <ProjectsView projects={projects} onSelectProject={handleSelectProject} onDeleteProject={handleDeleteProject} />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard projects={projects.slice(0, 4)} onSelectProject={handleSelectProject} onNewProject={handleCreateNewProject} />;
    }
  };

  return (
    <>
      <SignedOut>
        <LandingPage onLogin={handleLogin} />
      </SignedOut>
      <SignedIn>
        <div className="flex h-screen bg-[#F5F5F5] text-[#616161]">
          <Sidebar 
            currentView={selectedProject ? 'projects' : currentView} 
            onSetView={handleSetView}
            onLogout={() => {}} // Clerk handles logout through UserButton
          />
          <main className="flex-1 flex flex-col overflow-hidden">
            <Header 
              currentView={currentView}
              project={selectedProject} 
              onBack={selectedProject ? handleBackToProjects : undefined} 
              onNewProject={handleCreateNewProject} 
            />
            <div className="flex-1 overflow-y-auto p-6 lg:p-8">
              {renderContent()}
            </div>
          </main>
        </div>
        
        {/* Floating AI Copilot */}
        <ChatBubble 
          project={selectedProject || undefined}
          messages={chatMessages}
          setMessages={setChatMessages}
        />
      </SignedIn>
    </>
  );
};

export default App;
