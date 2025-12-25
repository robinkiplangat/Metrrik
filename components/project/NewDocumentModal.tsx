import React, { useState, useEffect } from 'react';
import type { Document, Template } from '../../services/shared/types';
import { 
  createNewDocument, 
  getClients, 
  getDocumentTemplates, 
  getTemplatesByType,
  createClient,
  DOCUMENT_TYPES,
  COMMON_TAGS,
  type NewDocumentData,
  type Client
} from '../../services/server/documentService';

interface NewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDocument: (document: Document) => void;
}

const NewDocumentModal: React.FC<NewDocumentModalProps> = ({
  isOpen,
  onClose,
  onCreateDocument
}) => {
  const [formData, setFormData] = useState<NewDocumentData>({
    name: '',
    type: 'Estimate',
    client: '',
    tags: [],
    description: ''
  });
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newClientName, setNewClientName] = useState('');
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setClients(getClients());
      setTemplates(getDocumentTemplates());
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter templates when document type changes
    if (formData.type) {
      const filteredTemplates = getTemplatesByType(formData.type);
      setTemplates(filteredTemplates);
      setSelectedTemplate(null); // Reset selected template when type changes
    }
  }, [formData.type]);

  const handleInputChange = (field: keyof NewDocumentData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...(prev.tags || []), tag]
    }));
  };

  const handleAddNewClient = () => {
    if (newClientName.trim()) {
      const newClient = createClient(newClientName);
      setClients(prev => [...prev, newClient]);
      setFormData(prev => ({
        ...prev,
        client: newClient.name
      }));
      setNewClientName('');
      setShowNewClientInput(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Document name is required';
    }

    if (!formData.type) {
      newErrors.type = 'Document type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const documentData: NewDocumentData = {
      ...formData,
      template: selectedTemplate || undefined
    };

    const newDocument = createNewDocument(documentData);
    onCreateDocument(newDocument);
    
    // Reset form
    setFormData({
      name: '',
      type: 'Estimate',
      client: '',
      tags: [],
      description: ''
    });
    setSelectedTemplate(null);
    setNewClientName('');
    setShowNewClientInput(false);
    setErrors({});
    
    onClose();
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
      name: '',
      type: 'Estimate',
      client: '',
      tags: [],
      description: ''
    });
    setSelectedTemplate(null);
    setNewClientName('');
    setShowNewClientInput(false);
    setErrors({});
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900">Create New Document</h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Document Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter document name"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value as Document['type'])}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.type ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {DOCUMENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
          </div>

          {/* Associated Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Associated Client
            </label>
            <div className="space-y-2">
              <select
                value={formData.client || ''}
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    setShowNewClientInput(true);
                  } else {
                    handleInputChange('client', e.target.value);
                    setShowNewClientInput(false);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.name}>{client.name}</option>
                ))}
                <option value="new">+ Add new client</option>
              </select>
              
              {showNewClientInput && (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Enter new client name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewClient}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    formData.tags?.includes(tag)
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                Selected: {formData.tags.join(', ')}
              </p>
            )}
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template
            </label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="blank"
                  name="template"
                  checked={!selectedTemplate}
                  onChange={() => setSelectedTemplate(null)}
                  className="text-blue-600"
                />
                <label htmlFor="blank" className="text-sm text-gray-700">
                  Start from blank document
                </label>
              </div>
              
              {templates.map(template => (
                <div key={template.id} className="flex items-start space-x-2">
                  <input
                    type="radio"
                    id={template.id}
                    name="template"
                    checked={selectedTemplate?.id === template.id}
                    onChange={() => setSelectedTemplate(template)}
                    className="text-blue-600 mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor={template.id} className="text-sm font-medium text-gray-700">
                      {template.name}
                    </label>
                    <p className="text-xs text-gray-500">{template.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Optional description for the document"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewDocumentModal;
