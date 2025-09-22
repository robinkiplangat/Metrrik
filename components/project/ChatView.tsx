
import React, { useState, useRef, useEffect } from 'react';
import type { Project, ChatMessage } from '../../types';
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
}

const ChatView: React.FC<ChatViewProps> = ({ project, messages, setMessages }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
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
                        className="w-full p-4 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29B6F6] focus:border-[#29B6F6] transition resize-none"
                        rows={2}
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#29B6F6] hover:bg-[#039BE5] text-white disabled:bg-gray-300 transition-colors">
                        <Icon name="send" className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatView;