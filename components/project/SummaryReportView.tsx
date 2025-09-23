
import React, { useState } from 'react';
import type { Project, ChatMessage, Document, UploadedFile } from '../../types';
import { generateProjectSummary } from '../../services/geminiService';
import Icon from '../ui/Icon';
import ConfirmationDialog from '../ui/ConfirmationDialog';

// A simple markdown parser - copied from ChatView
const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const formatText = (txt: string) => {
    return txt
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/`([^`]+)`/g, '<code class="bg-gray-200 text-sm rounded px-1 py-0.5">$1</code>'); // Inline code
  };

  const lines = text.split('\n');
  const elements = lines.map((line, index) => {
    if (line.startsWith('### ')) {
      return <h3 key={index} className="text-lg font-semibold mt-4 mb-2" dangerouslySetInnerHTML={{ __html: formatText(line.substring(4)) }} />;
    }
    if (line.startsWith('## ')) {
      return <h2 key={index} className="text-xl font-bold mt-6 mb-3" dangerouslySetInnerHTML={{ __html: formatText(line.substring(3)) }} />;
    }
    if (line.startsWith('# ')) {
      return <h1 key={index} className="text-2xl font-bold mt-8 mb-4" dangerouslySetInnerHTML={{ __html: formatText(line.substring(2)) }} />;
    }
    if (line.startsWith('* ')) {
      return <li key={index} className="ml-5 list-disc" dangerouslySetInnerHTML={{ __html: formatText(line.substring(2)) }} />;
    }
    if (line.match(/^\d+\.\s/)) {
        const content = line.replace(/^\d+\.\s/, '');
        return <li key={index} className="ml-5 list-decimal" dangerouslySetInnerHTML={{ __html: formatText(content) }} />;
    }
    if (line.trim() === '') {
      return <br key={index} />;
    }
    return <p key={index} dangerouslySetInnerHTML={{ __html: formatText(line) }} />;
  });

  return <div className="prose max-w-none text-[#424242]">{elements}</div>;
};


interface SummaryReportViewProps {
    project: Project;
    messages: ChatMessage[];
    documents: Document[];
    files: UploadedFile[];
    setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
}

const SummaryReportView: React.FC<SummaryReportViewProps> = ({ project, messages, documents, files, setDocuments }) => {
    const [report, setReport] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

    const handleGenerateReport = async () => {
        setIsLoading(true);
        setReport('');
        try {
            const result = await generateProjectSummary(messages, documents, files);
            setReport(result);
        } catch (error) {
            setReport("Failed to generate report. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveAsBQDocument = () => {
        if (!report.trim()) {
            alert("No report to save. Please generate a summary first.");
            return;
        }
        setShowSaveConfirm(true);
    };

    const confirmSaveDocument = async () => {
        setIsSaving(true);
        setShowSaveConfirm(false);
        
        try {
            const newDocument: Document = {
                id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: `Project Summary - ${project.name}`,
                type: 'BQ Draft',
                createdAt: new Date().toISOString(),
                content: report,
                versions: [
                    {
                        version: 1,
                        createdAt: new Date().toISOString(),
                        content: report
                    }
                ]
            };

            setDocuments(prev => [newDocument, ...prev]);
            
            // Show success message
            alert("Project summary has been saved as a BQ Document in your Documents tab.");
        } catch (error) {
            console.error("Error saving document:", error);
            alert("Failed to save the document. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const cancelSaveDocument = () => {
        setShowSaveConfirm(false);
    };
    
    return (
        <div className="bg-white rounded-xl shadow-sm p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-[#424242]">Project Summary Report</h3>
                <div className="flex items-center space-x-3">
                    {report && (
                        <button 
                            onClick={handleSaveAsBQDocument}
                            disabled={isSaving}
                            className="flex items-center space-x-2 bg-[#FFC107] text-[#424242] font-medium py-2 px-4 rounded-lg hover:bg-yellow-500 transition-colors disabled:bg-gray-400 disabled:cursor-wait">
                            <Icon name="document" className="w-5 h-5" />
                            <span>{isSaving ? 'Saving...' : 'Save as BQ Document'}</span>
                        </button>
                    )}
                    <button 
                        onClick={handleGenerateReport}
                        disabled={isLoading}
                        className="flex items-center space-x-2 bg-[#0D47A1] text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-800 transition-colors disabled:bg-gray-400 disabled:cursor-wait">
                        <Icon name="dashboard" className="w-5 h-5" />
                        <span>{isLoading ? 'Generating...' : 'Generate Summary'}</span>
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-6 bg-gray-50/50">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Icon name="chat" className="w-12 h-12 text-gray-400 animate-pulse mb-4" />
                        <h4 className="font-semibold text-lg text-[#424242]">Synthesizing Project Data...</h4>
                        <p className="text-[#616161]">The AI is reviewing chats, documents, and files to create your summary.</p>
                    </div>
                )}
                {report ? (
                    <SimpleMarkdown text={report} />
                ) : !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Icon name="document" className="w-16 h-16 text-gray-300 mb-4" />
                        <h4 className="font-semibold text-lg text-[#424242]">Generate a Project Summary</h4>
                        <p className="text-[#616161] max-w-md">Click the "Generate Summary" button to get an AI-powered overview of the project's status, key decisions, and generated documents.</p>
                    </div>
                )}
            </div>
            
            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={showSaveConfirm}
                title="Save Project Summary"
                message={`Are you sure you want to save this project summary as a BQ Document? The document will be added to your Documents tab and can be edited later.`}
                confirmText="Save Document"
                cancelText="Cancel"
                onConfirm={confirmSaveDocument}
                onCancel={cancelSaveDocument}
                variant="info"
            />
        </div>
    );
};

export default SummaryReportView;
