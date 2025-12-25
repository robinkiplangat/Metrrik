import React, { useState } from 'react';
import { ChatMessage } from '../../services/shared/types';
import ChatView from '../project/ChatView';
import Icon from './Icon';

interface ChatBubbleProps {
  project?: { id: string; name: string };
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  setDocuments?: (documents: any[]) => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  project,
  messages,
  setMessages,
  setDocuments
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleChat}
          className="bg-[#29B6F6] hover:bg-[#039BE5] text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29B6F6] group"
          title="Metrrik AI Copilot"
        >
          <Icon name="chat" className="w-6 h-6" />
          {!isOpen && (
            <div className="absolute -top-2 -right-2 bg-[#FFC107] text-[#0D47A1] text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
              AI
            </div>
          )}
        </button>
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-[#0D47A1] text-white rounded-t-lg">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#FFC107] rounded-full flex items-center justify-center">
                <Icon name="chat" className="w-4 h-4 text-[#0D47A1]" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Metrrik Copilot</h3>
                <p className="text-xs text-blue-100">
                  {project ? `Project: ${project.name}` : 'General Assistant'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Content */}
          <div className="flex-1 overflow-hidden">
            {project ? (
              <ChatView
                project={project}
                messages={messages}
                setMessages={setMessages}
                setDocuments={setDocuments}
                isCompact={true}
              />
            ) : (
              <div className="p-4 h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Icon name="chat" className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Select a project to start chatting with Metrrik</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBubble;
