import React, { useState, useRef, useEffect } from 'react';
import type { Project, ChatMessage, Document } from '../../types';
import { generateChatResponse } from '../../services/geminiService';
import Icon from '../ui/Icon';
import Logo from '../ui/Logo';

// A simple markdown parser
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

  return <div className="prose prose-sm max-w-none">{elements}</div>;
};


const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.sender === 'user';
  if (message.isTyping) {
    return (
        <div className="flex items-start space-x-3 py-4">
            <div className="w-10 h-10 rounded-full bg-[#0D47A1]/20 flex-shrink-0 flex items-center justify-center">
                <Icon name="chat" className="w-5 h-5 text-[#0D47A1]" />
            </div>
            <div className="bg-white p-4 rounded-lg rounded-tl-none shadow-sm animate-pulse">
                <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
            </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start space-x-3 py-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-full bg-[#0D47A1]/20 flex-shrink-0 flex items-center justify-center">
          <Icon name="chat" className="w-5 h-5 text-[#0D47A1]" />
        </div>
      )}
      <div className={`max-w-xl p-4 rounded-lg shadow-sm ${isUser ? 'bg-[#0D47A1] text-white rounded-br-none' : 'bg-white text-[#424242] rounded-tl-none'}`}>
        <SimpleMarkdown text={message.text} />
      </div>
       {isUser && (
        <div className="w-10 h-10 rounded-full bg-[#FFC107]/80 flex-shrink-0 flex items-center justify-center text-[#424242] font-bold">
            P
        </div>
      )}
    </div>
  );
};


interface ChatViewProps {
    project: Project;
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
}

const ALL_DOC_TYPES: Document['type'][] = ['Estimate', 'Proposal', 'BQ Draft', 'Documentation', 'Request'];

interface ExportChatModalProps {
    onClose: () => void;
    onSave: (title: string, type: Document['type']) => void;
}

const ExportChatModal: React.FC<ExportChatModalProps> = ({ onClose, onSave }) => {
    const [title, setTitle] = useState(`Chat Export - ${new Date().toLocaleDateString()}`);
    const [type, setType] = useState<Document['type']>('Documentation');

    const handleSave = () => {
        if (title.trim()) {
            onSave(title, type);
        } else {
            alert('Please provide a title for the document.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b">
                    <h3 className="text-xl font-semibold text-[#424242]">Export Chat to Document</h3>
                    <p className="text-sm text-gray-500 mt-1">Save the current conversation as a new project document.</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="docTitle" className="block text-sm font-medium text-gray-700">Document Title</label>
                        <input
                            type="text"
                            id="docTitle"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#29B6F6] focus:border-[#29B6F6]"
                        />
                    </div>
                    <div>
                        <label htmlFor="docType" className="block text-sm font-medium text-gray-700">Document Type</label>
                        <select
                            id="docType"
                            value={type}
                            onChange={(e) => setType(e.target.value as Document['type'])}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#29B6F6] focus:border-[#29B6F6]"
                        >
                            {ALL_DOC_TYPES.map(docType => (
                                <option key={docType} value={docType}>{docType}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t rounded-b-xl flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-[#424242] rounded-lg hover:bg-gray-300">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-[#0D47A1] text-white rounded-lg hover:bg-blue-800">Save Document</button>
                </div>
            </div>
        </div>
    );
};

const ChatView: React.FC<ChatViewProps> = ({ project, messages, setMessages, setDocuments }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (input.trim() === '' || isLoading) return;

        const newUserMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text: input
        };
        
        // FIX: Added missing 'text' property to conform to ChatMessage type.
        setMessages(prev => [...prev, newUserMessage, { id: 'typing', sender: 'ai', text: '', isTyping: true }]);
        setInput('');
        setIsLoading(true);

        try {
            const aiResponse = await generateChatResponse(input);
            const newAiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: aiResponse
            };
            setMessages(prev => [...prev.filter(m => !m.isTyping), newAiMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: 'I apologize, but I am having trouble connecting. Please try again later.'
            };
            setMessages(prev => [...prev.filter(m => !m.isTyping), errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportToDocument = (title: string, type: Document['type']) => {
        const relevantMessages = messages.filter(msg => !msg.isTyping && msg.text);
        if (relevantMessages.length === 0) {
            alert("Cannot export an empty chat.");
            return;
        }
    
        const chatContent = relevantMessages
            .map(msg => `### ${msg.sender === 'user' ? 'User' : 'Q-Sci'}\n\n${msg.text}`)
            .join('\n\n---\n\n');
        
        const fullContent = `# ${title}\n\n${chatContent}`;
        
        const newDoc: Document = {
            id: `doc-${Date.now()}`,
            name: title,
            type: type,
            // FIX: Removed extra 'new' keyword. `new Date().toISOString()` returns a string.
            createdAt: new Date().toISOString(),
            content: fullContent,
            versions: [{ version: 1, createdAt: new Date().toISOString(), content: fullContent }]
        };
    
        setDocuments(prev => [newDoc, ...prev]);
        setIsExportModalOpen(false);
        alert(`Document "${title}" has been saved to the Documents tab.`);
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-xl shadow-sm">
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-4">
                    {messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="p-4 border-t border-gray-200">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Ask for a preliminary cost estimate for a 4-bedroom maisonette in Kilimani..."
                        className="w-full p-4 pr-28 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29B6F6] focus:border-[#29B6F6] transition resize-none"
                        rows={2}
                        disabled={isLoading}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                         <button
                            onClick={() => setIsExportModalOpen(true)}
                            disabled={isLoading}
                            title="Export chat to document"
                            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 disabled:bg-gray-100 disabled:text-gray-400 transition-colors">
                            <Icon name="document" className="w-6 h-6" />
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="p-2 rounded-full bg-[#29B6F6] hover:bg-[#039BE5] text-white disabled:bg-gray-300 transition-colors">
                            <Icon name="send" className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
            {isExportModalOpen && (
                <ExportChatModal
                    onClose={() => setIsExportModalOpen(false)}
                    onSave={handleExportToDocument}
                />
            )}
        </div>
    );
};

export default ChatView;