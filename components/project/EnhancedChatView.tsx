import React, { useState, useRef, useEffect } from 'react';
import type { Project, ChatMessage, Document } from '../../services/shared/types';
import { knowledgeBaseService } from '../../services/server/knowledgeBaseService';
import { knowledgeGraphService } from '../../services/server/knowledgeGraphService';
import { useVectorSearch } from '../../hooks/useVectorSearch';
import Icon from '../ui/Icon';
import Logo from '../ui/Logo';

// Enhanced markdown parser with better formatting
const EnhancedMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const formatText = (txt: string) => {
    return txt
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/`([^`]+)`/g, '<code class="bg-gray-200 text-sm rounded px-1 py-0.5">$1</code>') // Inline code
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>'); // Links
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

// Context information display component
const ContextInfo: React.FC<{ 
  context: {
    documentsUsed: string[];
    confidence: number;
    sources: string[];
    suggestions: string[];
  }
}> = ({ context }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (context.documentsUsed.length === 0 && context.sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center space-x-2">
          <Icon name="info" className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            Response Context (Confidence: {(context.confidence * 100).toFixed(0)}%)
          </span>
        </div>
        <Icon 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          className="w-4 h-4 text-blue-600" 
        />
      </button>
      
      {isExpanded && (
        <div className="mt-3 space-y-2">
          {context.sources.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-blue-700 mb-1">Sources:</h4>
              <ul className="text-xs text-blue-600 space-y-1">
                {context.sources.map((source, index) => (
                  <li key={index} className="flex items-center space-x-1">
                    <Icon name="document" className="w-3 h-3" />
                    <span>{source}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {context.suggestions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-blue-700 mb-1">Suggestions:</h4>
              <ul className="text-xs text-blue-600 space-y-1">
                {context.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-center space-x-1">
                    <Icon name="lightbulb" className="w-3 h-3" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Enhanced chat bubble with context
const EnhancedChatBubble: React.FC<{ 
  message: ChatMessage & { 
    context?: {
      documentsUsed: string[];
      confidence: number;
      sources: string[];
      suggestions: string[];
    }
  } 
}> = ({ message }) => {
  const isUser = message.sender === 'user';
  
  if (message.isTyping) {
    return (
      <div className="flex items-start space-x-3 py-4">
        <div className="w-10 h-10 rounded-full bg-[#0D47A1]/20 flex-shrink-0 flex items-center justify-center">
          <Icon name="chat" className="w-5 h-5 text-[#0D47A1]" />
        </div>
        <div className="flex-1">
          <div className="bg-gray-100 rounded-lg p-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start space-x-3 py-4 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
        isUser 
          ? 'bg-[#29B6F6]' 
          : 'bg-[#0D47A1]/20'
      }`}>
        {isUser ? (
          <Icon name="user" className="w-5 h-5 text-white" />
        ) : (
          <Icon name="chat" className="w-5 h-5 text-[#0D47A1]" />
        )}
      </div>
      
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`rounded-lg p-4 ${
          isUser 
            ? 'bg-[#29B6F6] text-white' 
            : 'bg-white border border-gray-200'
        }`}>
          {isUser ? (
            <p className="text-sm">{message.text}</p>
          ) : (
            <div>
              <EnhancedMarkdown text={message.text} />
              {message.context && <ContextInfo context={message.context} />}
            </div>
          )}
        </div>
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : ''}`}>
          {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

// Knowledge search component
const KnowledgeSearch: React.FC<{
  onSearch: (query: string) => void;
  isSearching: boolean;
}> = ({ onSearch, isSearching }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim());
      setQuery('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex space-x-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search knowledge base..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSearching}
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <Icon name="search" className="w-4 h-4" />
          <span>Search</span>
        </button>
      </div>
      
      {suggestions.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Suggestions:</div>
          <div className="flex flex-wrap gap-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setQuery(suggestion)}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main enhanced chat view component
interface EnhancedChatViewProps {
  project?: Project;
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  setDocuments?: (documents: Document[]) => void;
  isCompact?: boolean;
}

const EnhancedChatView: React.FC<EnhancedChatViewProps> = ({
  project,
  messages,
  setMessages,
  setDocuments,
  isCompact = false
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { searchDocuments, isSearching } = useVectorSearch();
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize knowledge graph for the project
  useEffect(() => {
    if (project?.id) {
      knowledgeGraphService.buildProjectGraph(project.id);
    }
  }, [project?.id]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: inputMessage.trim()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Generate enhanced response using knowledge base
      const enhancedResponse = await knowledgeBaseService.generateEnhancedResponse(
        inputMessage.trim(),
        project?.id,
        messages
      );

      const aiMessage: ChatMessage & { context?: any } = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: enhancedResponse.response,
        context: enhancedResponse.context
      };

      setMessages([...newMessages, aiMessage]);

      // Save chat message to database
      if (project?.id) {
        await knowledgeBaseService.updateKnowledgeBase(
          inputMessage.trim(),
          'chat',
          project.id
        );
      }

    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: 'I apologize, but I encountered an error while processing your request. Please try again.'
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKnowledgeSearch = async (query: string) => {
    try {
      const results = await searchDocuments(query, project?.id, 5);
      setSearchResults(results);
      
      // Create a message with search results
      const searchMessage: ChatMessage = {
        id: `search-${Date.now()}`,
        sender: 'ai',
        text: `Found ${results.length} relevant documents for "${query}":\n\n${results.map((result, index) => 
          `${index + 1}. **${result.document.name}** (${(result.similarity * 100).toFixed(1)}% match)\n   ${result.document.content.substring(0, 200)}...`
        ).join('\n\n')}`
      };
      
      setMessages([...messages, searchMessage]);
    } catch (error) {
      console.error('Knowledge search error:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full ${isCompact ? 'h-[600px]' : 'h-full'}`}>
      {/* Knowledge Search */}
      <KnowledgeSearch 
        onSearch={handleKnowledgeSearch}
        isSearching={isSearching}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Logo className="w-16 h-16 mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Welcome to Q-Sci AI</h3>
            <p className="text-sm text-center max-w-md">
              I'm your intelligent construction copilot. I can help you with cost estimates, 
              project analysis, document management, and more. Ask me anything about your project!
            </p>
            <div className="mt-4 text-xs text-gray-400">
              <p>Try asking:</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>"What are the current material costs in Nairobi?"</li>
                <li>"Help me create a cost estimate for a 3-bedroom house"</li>
                <li>"Analyze my project documents"</li>
              </ul>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <EnhancedChatBubble key={message.id} message={message} />
          ))
        )}
        
        {isTyping && (
          <EnhancedChatBubble 
            message={{
              id: 'typing',
              sender: 'ai',
              text: '',
              isTyping: true
            }}
          />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Q-Sci anything about your project..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={isTyping || !inputMessage.trim()}
            className="px-4 py-2 bg-[#29B6F6] text-white rounded-lg hover:bg-[#039BE5] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Icon name="send" className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedChatView;
