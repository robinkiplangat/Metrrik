import React, { useState } from 'react';
import type { Project, ChatMessage, Document, UploadedFile } from '../../services/shared/types';
import ChatView from './ChatView';
import DocumentsView from './DocumentsView';
import FilesView from './FilesView';
import SummaryReportView from './SummaryReportView';
import Icon from '../ui/Icon';

interface ProjectWorkspaceProps {
  project: Project;
}

type ActiveTab = 'documents' | 'files' | 'summary';

const TabButton: React.FC<{label: string; iconName: 'chat' | 'document' | 'file' | 'dashboard'; isActive: boolean; onClick: () => void;}> = ({label, iconName, isActive, onClick}) => {
    const activeClasses = 'text-[#0D47A1] border-b-2 border-[#FFC107]';
    const inactiveClasses = 'text-[#616161] hover:text-[#424242] border-b-2 border-transparent';
    return (
        <button
            onClick={onClick}
            className={`flex items-center space-x-2 px-4 py-2.5 font-medium transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}>
            <Icon name={iconName} className="w-5 h-5"/>
            <span>{label}</span>
        </button>
    )
}

const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ project }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('documents');
  
  // Lifted state for shared data between views
  const [messages, setMessages] = useState<ChatMessage[]>([
      { id: '1', sender: 'ai', text: `Hello! I'm Q-Sci, your AI assistant for this project. How can I help you with "${project.name}" today? You can ask for a cost estimate, a draft proposal, or anything else.` }
  ]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);


  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 mb-6 border-b border-gray-200">
        <div className="flex items-center">
            <TabButton label="Documents" iconName="document" isActive={activeTab === 'documents'} onClick={() => setActiveTab('documents')} />
            <TabButton label="Plans to BQ" iconName="file" isActive={activeTab === 'files'} onClick={() => setActiveTab('files')} />
            <TabButton label="Summary" iconName="dashboard" isActive={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'documents' && <DocumentsView project={project} documents={documents} setDocuments={setDocuments} />}
        {activeTab === 'files' && <FilesView files={files} setFiles={setFiles} setDocuments={setDocuments} />}
        {activeTab === 'summary' && <SummaryReportView project={project} messages={messages} documents={documents} files={files} setDocuments={setDocuments} />}
      </div>
    </div>
  );
};

export default ProjectWorkspace;