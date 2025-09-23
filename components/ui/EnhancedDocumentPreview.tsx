import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import type { Document } from '../../types';

interface EnhancedDocumentPreviewProps {
  doc: Document;
  onClose: () => void;
  onSave?: (docId: string, newContent: string, newType: Document['type']) => void;
}

// Custom components for enhanced markdown rendering
const MarkdownComponents = {
  // Typography Hierarchy
  h1: ({ children, ...props }: any) => (
    <h1 
      className="font-bold text-[28px] leading-tight mb-8 mt-8 first:mt-0 text-gray-900"
      style={{ fontFamily: 'Poppins, sans-serif' }}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 
      className="font-semibold text-[24px] leading-tight mb-6 mt-6 text-gray-900"
      style={{ fontFamily: 'Poppins, sans-serif' }}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 
      className="font-medium text-[20px] leading-tight mb-4 mt-4 text-gray-900"
      style={{ fontFamily: 'Poppins, sans-serif' }}
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: any) => (
    <h4 
      className="font-medium text-[18px] leading-tight mb-3 mt-3 text-gray-900"
      style={{ fontFamily: 'Poppins, sans-serif' }}
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ children, ...props }: any) => (
    <h5 
      className="font-medium text-[16px] leading-tight mb-2 mt-2 text-gray-900"
      style={{ fontFamily: 'Poppins, sans-serif' }}
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, ...props }: any) => (
    <h6 
      className="font-medium text-[14px] leading-tight mb-2 mt-2 text-gray-900"
      style={{ fontFamily: 'Poppins, sans-serif' }}
      {...props}
    >
      {children}
    </h6>
  ),

  // Body Text
  p: ({ children, ...props }: any) => (
    <p 
      className="text-[16px] leading-[1.5] mb-4 text-gray-800"
      style={{ fontFamily: 'Inter, sans-serif' }}
      {...props}
    >
      {children}
    </p>
  ),

  // Lists with custom spacing
  ul: ({ children, ...props }: any) => (
    <ul className="mb-4 pl-6 space-y-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="mb-4 pl-6 space-y-2" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: any) => (
    <li 
      className="text-[16px] leading-[1.5] text-gray-800"
      style={{ fontFamily: 'Inter, sans-serif' }}
      {...props}
    >
      {children}
    </li>
  ),

  // Enhanced Tables
  table: ({ children, ...props }: any) => (
    <div className="my-6 overflow-x-auto">
      <table 
        className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: any) => (
    <thead className="bg-gray-50" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }: any) => (
    <tbody className="bg-white" {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }: any) => (
    <tr 
      className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150"
      {...props}
    >
      {children}
    </tr>
  ),
  th: ({ children, ...props }: any) => (
    <th 
      className="px-3 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200 last:border-r-0"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }: any) => (
    <td 
      className="px-3 py-3 text-sm text-gray-700 border-r border-gray-200 last:border-r-0"
      {...props}
    >
      {children}
    </td>
  ),

  // Code Blocks with Syntax Highlighting
  code: ({ node, inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    
    if (!inline && language) {
      return (
        <div className="my-6 relative group">
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => {
                navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                // You could add a toast notification here
              }}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border text-gray-600 hover:text-gray-800 transition-colors"
            >
              Copy
            </button>
          </div>
          <SyntaxHighlighter
            style={oneLight}
            language={language}
            PreTag="div"
            className="rounded-lg border border-gray-200"
            customStyle={{
              margin: 0,
              fontSize: '14px',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            }}
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      );
    }
    
    return (
      <code 
        className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    );
  },

  // Blockquotes as Callouts
  blockquote: ({ children, ...props }: any) => (
    <div 
      className="my-6 pl-4 border-l-4 border-blue-500 bg-blue-50 py-4 pr-4 rounded-r-lg"
      {...props}
    >
      <div className="text-gray-700 italic">
        {children}
      </div>
    </div>
  ),

  // Links with Tech Blue
  a: ({ children, href, ...props }: any) => (
    <a
      href={href}
      className="text-[#29B6F6] underline decoration-1 underline-offset-2 hover:decoration-2 transition-all duration-200"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),

  // Images with responsive behavior
  img: ({ src, alt, ...props }: any) => (
    <div className="my-6">
      <img
        src={src}
        alt={alt}
        className="max-w-full h-auto rounded border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow duration-200"
        onClick={() => {
          // You could implement a lightbox here
          window.open(src, '_blank');
        }}
        {...props}
      />
    </div>
  ),

  // Horizontal Rule
  hr: ({ ...props }: any) => (
    <hr className="my-8 border-gray-200" {...props} />
  ),

  // Strong and Emphasis
  strong: ({ children, ...props }: any) => (
    <strong className="font-semibold text-gray-900" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: any) => (
    <em className="italic text-gray-800" {...props}>
      {children}
    </em>
  ),
};

const EnhancedDocumentPreview: React.FC<EnhancedDocumentPreviewProps> = ({ 
  doc, 
  onClose, 
  onSave 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(doc.content);
  const [editedType, setEditedType] = useState(doc.type);

  const handleSave = () => {
    if (onSave) {
      onSave(doc.id, editedContent, editedType);
    }
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 
              className="text-2xl font-bold text-gray-900 mb-1"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {doc.name}
            </h2>
            <p 
              className="text-sm text-gray-500"
              style={{ fontFamily: 'Inter, sans-serif', opacity: 0.7 }}
            >
              {doc.type} • Created {new Date(doc.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit</span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <select 
                  value={editedType} 
                  onChange={(e) => setEditedType(e.target.value as Document['type'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Estimate">Estimate</option>
                  <option value="Proposal">Proposal</option>
                  <option value="BQ Draft">BQ Draft</option>
                  <option value="Documentation">Documentation</option>
                  <option value="Request">Request</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-96 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="Enter your document content in Markdown format..."
                />
              </div>
            </div>
          ) : (
            <div 
              className="max-w-none"
              style={{ 
                fontFamily: 'Inter, sans-serif',
                lineHeight: '1.6'
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={MarkdownComponents}
              >
                {doc.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
          {isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </>
          ) : (
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedDocumentPreview;
