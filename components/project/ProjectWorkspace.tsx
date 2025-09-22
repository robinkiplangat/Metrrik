
import React, { useState } from 'react';
import type { Project, ChatMessage, Document, UploadedFile } from '../../types';
import ChatView from './ChatView';
import DocumentsView from './DocumentsView';
import FilesView from './FilesView';
import SummaryReportView from './SummaryReportView';
import Icon from '../ui/Icon';

interface ProjectWorkspaceProps {
  project: Project;
}

type ActiveTab = 'chat' | 'documents' | 'files' | 'summary';

const TabButton: React.FC<{label: string; iconName: 'chat' | 'document' | 'file' | 'dashboard'; isActive: boolean; onClick: () => void;}> = ({label, iconName, isActive, onClick}) => {
    const activeClasses = 'bg-white text-[#0D47A1] shadow-sm';
    const inactiveClasses = 'text-[#616161] hover:bg-gray-100 hover:text-[#424242]';
    return (
        <button
            onClick={onClick}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${isActive ? activeClasses : inactiveClasses}`}>
            <Icon name={iconName} className="w-5 h-5"/>
            <span>{label}</span>
        </button>
    )
}

const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ project }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  
  // Lifted state for shared data between views
  const [messages, setMessages] = useState<ChatMessage[]>([
      { id: '1', sender: 'ai', text: `Hello! I'm Q-Scribe, your AI assistant for this project. How can I help you with "${project.name}" today? You can ask for a cost estimate, a draft proposal, or anything else.` }
  ]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);


  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 mb-6">
        <div className="inline-flex items-center bg-gray-200 p-1.5 rounded-xl">
            <TabButton label="AI Chat" iconName="chat" isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
            <TabButton label="Documents" iconName="document" isActive={activeTab === 'documents'} onClick={() => setActiveTab('documents')} />
            <TabButton label="Files" iconName="file" isActive={activeTab === 'files'} onClick={() => setActiveTab('files')} />
            <TabButton label="Summary" iconName="dashboard" isActive={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <ChatView project={project} messages={messages} setMessages={setMessages} />}
        {activeTab === 'documents' && <DocumentsView project={project} documents={documents} setDocuments={setDocuments} />}
        {activeTab === 'files' && <FilesView files={files} setFiles={setFiles} />}
        {activeTab === 'summary' && <SummaryReportView project={project} messages={messages} documents={documents} files={files} />}
      </div>
    </div>
  );
};

export default ProjectWorkspace;
