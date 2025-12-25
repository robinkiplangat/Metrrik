import React, { useState, useEffect, useMemo } from 'react';
import type { Project, Document, Template, DocumentVersion } from '../../services/shared/types';
import { generateDocumentContent } from '../../services/client/geminiService';
import Icon from '../ui/Icon';
import ConfirmationDialog from '../ui/ConfirmationDialog';
import NewDocumentModal from './NewDocumentModal';
import EnhancedDocumentPreview from '../ui/EnhancedDocumentPreview';

const initialDocuments: Document[] = [
    {
        id: 'doc-1',
        name: 'Preliminary Cost Estimate',
        type: 'Estimate',
        createdAt: '2024-07-22T11:30:00Z',
        content: `# Preliminary Cost Estimate

## Project Summary
- **Project Name:** Runda Residential Development
- **Client:** Mr. & Mrs. Omondi
- **Location:** Runda, Nairobi
- **Estimate Date:** July 22, 2024

## Cost Breakdown

### Substructure
| Item | Description | Unit | Quantity | Rate (KES) | Total (KES) |
|------|-------------|------|----------|------------|-------------|
| 1.1 | Excavation for foundations | m³ | 45.5 | 2,500 | 113,750 |
| 1.2 | Foundation concrete (1:2:4) | m³ | 12.8 | 8,500 | 108,800 |
| 1.3 | Reinforcement steel | kg | 1,200 | 180 | 216,000 |

**Substructure Subtotal:** KES 438,550

### Superstructure
| Item | Description | Unit | Quantity | Rate (KES) | Total (KES) |
|------|-------------|------|----------|------------|-------------|
| 2.1 | Blockwork (6 inch) | m² | 180 | 1,200 | 216,000 |
| 2.2 | Roofing (GCI sheets) | m² | 120 | 2,800 | 336,000 |
| 2.3 | Windows (Aluminum) | No. | 8 | 25,000 | 200,000 |

**Superstructure Subtotal:** KES 752,000

## Summary
- **Total Estimated Cost:** KES 1,190,550
- **Contingency (10%):** KES 119,055
- **Grand Total:** KES 1,309,605

> **Note:** This is a preliminary estimate based on current market rates. Final costs may vary based on actual site conditions and material availability.

## Next Steps
1. Client review and approval
2. Detailed design development
3. Final cost estimation
4. Construction planning`,
        versions: [{ version: 1, createdAt: '2024-07-22T11:30:00Z', content: 'Initial costings...' }]
    },
    {
        id: 'doc-2',
        name: 'Client Proposal V1',
        type: 'Proposal',
        createdAt: '2024-07-22T15:00:00Z',
        content: `# Client Proposal

## Project Overview
This document outlines the scope of work, timeline, and payment schedule for the **Kilimani Maisonette** project.

### Scope of Work
- Architectural design and planning
- Structural engineering
- Quantity surveying and cost estimation
- Project management and supervision

### Timeline
- **Phase 1:** Design and Planning (4 weeks)
- **Phase 2:** Documentation (2 weeks)  
- **Phase 3:** Construction (16 weeks)

### Payment Schedule
- 30% upon contract signing
- 40% at project midpoint
- 30% upon completion

---

*For any questions, please contact our team.*`,
        versions: [{ version: 1, createdAt: '2024-07-22T15:00:00Z', content: 'Proposal details...' }]
    },
    {
        id: 'doc-3',
        name: 'Floor Plan BQ Draft',
        type: 'BQ Draft',
        createdAt: '2024-07-23T09:00:00Z',
        content: `# Bill of Quantities - Floor Plan Analysis

## AI-Generated Analysis

### Summary
- **Total Estimated Cost:** KES 2,450,000
- **AI Confidence Score:** 85%
- **Analysis Date:** July 23, 2024

### Key Findings

#### Structural Elements
- **Foundation:** Strip foundation with reinforced concrete
- **Walls:** 6-inch blockwork with platform finish
- **Roof:** GCI roofing with timber trusses

#### Cost Breakdown
| Category | Amount (KES) | Percentage |
|----------|--------------|------------|
| Substructure | 650,000 | 26.5% |
| Superstructure | 1,200,000 | 49.0% |
| Finishes | 400,000 | 16.3% |
| Services | 200,000 | 8.2% |

### Recommendations
1. **Material Optimization:** Consider alternative roofing materials
2. **Cost Savings:** Bulk purchasing for major materials
3. **Timeline:** Allow 20% buffer for weather delays

\`\`\`javascript
// Sample calculation function
function calculateTotalCost(items) {
  return items.reduce((total, item) => {
    return total + (item.quantity * item.rate);
  }, 0);
}
\`\`\`

> **Disclaimer:** This analysis is based on AI interpretation of the provided floor plan. Manual verification is recommended.`,
        versions: [{ version: 1, createdAt: '2024-07-23T09:00:00Z', content: 'BQ draft from plan...' }]
    },
];

const documentTemplates: Template[] = [
    { id: 'temp-1', name: 'Standard Tender Document', description: 'A formal document for inviting bids for projects.', type: 'Proposal' },
    { id: 'temp-2', name: 'Site Inspection Report', description: 'Record observations and findings from a site visit.', type: 'Documentation' },
    { id: 'temp-3', name: 'Material Requisition Form', description: 'Formal request for construction materials.', type: 'Request' },
    { id: 'temp-4', name: 'Preliminary Estimate', description: 'Initial high-level cost estimation for a project.', type: 'Estimate' },
];

const ALL_DOC_TYPES: Document['type'][] = ['Estimate', 'Proposal', 'BQ Draft', 'Documentation', 'Request'];

type SortableKeys = keyof Pick<Document, 'name' | 'type' | 'createdAt'>;

interface HistoryModalProps {
    doc: Document;
    onClose: () => void;
    onRevert: (version: DocumentVersion) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ doc, onClose, onRevert }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-xl font-semibold text-[#424242]">Version History: {doc.name}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
                <ul className="space-y-3">
                    {doc.versions.slice().reverse().map(version => (
                        <li key={version.version} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-[#424242]">Version {version.version}</p>
                                <p className="text-sm text-gray-500">Saved on: {new Date(version.createdAt).toLocaleString()}</p>
                            </div>
                            <button onClick={() => onRevert(version)} className="text-sm font-medium bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200">Revert to this version</button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="p-4 bg-gray-50 border-t rounded-b-xl flex justify-end">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-[#424242] rounded-lg hover:bg-gray-300">Close</button>
            </div>
        </div>
    </div>
);

const getTypeColorClasses = (type: Document['type']) => {
    switch (type) {
        case 'Estimate': return 'bg-blue-100 text-blue-800';
        case 'Proposal': return 'bg-green-100 text-green-800';
        case 'BQ Draft': return 'bg-yellow-100 text-yellow-800';
        case 'Documentation': return 'bg-purple-100 text-purple-800';
        case 'Request': return 'bg-red-100 text-red-800';
        default: return 'bg-indigo-100 text-indigo-800';
    }
};

interface DocumentsViewProps {
    project: Project;
    documents: Document[];
    setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
}

const DocumentsView: React.FC<DocumentsViewProps> = ({ project, documents, setDocuments }) => {
    const [historyDoc, setHistoryDoc] = useState<Document | null>(null);
    const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
    const [activeTag, setActiveTag] = useState<string>('All');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'createdAt', direction: 'descending' });
    const [aiDocPrompt, setAiDocPrompt] = useState('');
    const [aiDocType, setAiDocType] = useState<Document['type']>('Estimate');
    const [isGenerating, setIsGenerating] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; doc: Document | null }>({ isOpen: false, doc: null });
    const [showNewDocumentModal, setShowNewDocumentModal] = useState(false);

    useEffect(() => {
        try {
            const savedDocsRaw = localStorage.getItem(`metrrik-docs-${project.id}`);
            if (savedDocsRaw) {
                const savedDocs = JSON.parse(savedDocsRaw);
                const docsWithVersions = savedDocs.map((d: any) => d.versions ? d : { ...d, versions: [{ version: 1, createdAt: d.createdAt, content: d.content }] });
                setDocuments(docsWithVersions);
            } else {
                setDocuments(initialDocuments);
            }
        } catch (e) {
            console.error("Failed to load documents:", e);
            setDocuments(initialDocuments);
        }
    }, [project.id, setDocuments]);

    useEffect(() => {
        if (documents.length > 0) {
            localStorage.setItem(`metrrik-docs-${project.id}`, JSON.stringify(documents));
        }
    }, [documents, project.id]);

    const sortedAndFilteredDocuments = useMemo(() => {
        let sortableItems = [...documents];
        if (activeTag !== 'All') {
            sortableItems = sortableItems.filter(doc => doc.type === activeTag);
        }

        sortableItems.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        return sortableItems;
    }, [documents, activeTag, sortConfig]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleGenerateWithAI = async () => {
        if (!aiDocPrompt.trim()) {
            alert("Please enter a prompt for the document.");
            return;
        }
        setIsGenerating(true);
        try {
            const content = await generateDocumentContent(aiDocPrompt, aiDocType);
            const newDoc: Document = {
                id: `doc-${Date.now()}`,
                name: `AI Generated ${aiDocType}`,
                type: aiDocType,
                createdAt: new Date().toISOString(),
                content: content,
                versions: [{ version: 1, createdAt: new Date().toISOString(), content: content }]
            };
            setDocuments(prev => [newDoc, ...prev]);
            setAiDocPrompt('');
        } catch (error) {
            alert("Failed to generate document. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const createFromTemplate = (template: Template) => {
        const newDoc: Document = {
            id: `doc-${Date.now()}`,
            name: `${template.name}`,
            type: template.type,
            createdAt: new Date().toISOString(),
            content: template.content || `This document was generated from the '${template.name}' template.`,
            versions: [{ version: 1, createdAt: new Date().toISOString(), content: template.content || `This document was generated from the '${template.name}' template.` }]
        };
        setDocuments(prev => [newDoc, ...prev]);
    };

    const handleRevert = (version: DocumentVersion) => {
        if (!historyDoc) return;
        if (!window.confirm(`Are you sure you want to revert to Version ${version.version}? This will create a new version with the old content.`)) return;

        const updatedDoc = {
            ...historyDoc,
            content: version.content,
            versions: [
                ...historyDoc.versions,
                {
                    version: historyDoc.versions.length + 1,
                    createdAt: new Date().toISOString(),
                    content: version.content,
                }
            ]
        };
        setDocuments(docs => docs.map(d => d.id === updatedDoc.id ? updatedDoc : d));
        setHistoryDoc(null);
    };

    const handleDeleteDoc = (doc: Document) => {
        setDeleteConfirm({ isOpen: true, doc });
    };

    const confirmDeleteDoc = () => {
        if (deleteConfirm.doc) {
            setDocuments(docs => docs.filter(d => d.id !== deleteConfirm.doc!.id));
        }
        setDeleteConfirm({ isOpen: false, doc: null });
    };

    const cancelDeleteDoc = () => {
        setDeleteConfirm({ isOpen: false, doc: null });
    };

    const handleCreateNewDocument = (newDocument: Document) => {
        setDocuments(prev => [newDocument, ...prev]);
    };

    const handleSaveFromPreview = (docId: string, newContent: string, newType: Document['type']) => {
        setDocuments(prevDocs => prevDocs.map(doc => {
            if (doc.id === docId) {
                const newVersion = {
                    version: doc.versions.length + 1,
                    createdAt: new Date().toISOString(),
                    content: newContent,
                };
                return {
                    ...doc,
                    content: newContent,
                    type: newType,
                    versions: [...doc.versions, newVersion],
                };
            }
            return doc;
        }));
        setPreviewDoc(null);
    };

    const allTags = ['All', ...Array.from(new Set(documents.map(d => d.type)))];

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 h-full flex flex-col space-y-6 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI Generation */}
                <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-[#0D47A1]">Generate Document with AI</h3>
                    <select value={aiDocType} onChange={e => setAiDocType(e.target.value as Document['type'])} className="w-full p-2 border border-gray-300 rounded-md">
                        {ALL_DOC_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <textarea
                        value={aiDocPrompt}
                        onChange={e => setAiDocPrompt(e.target.value)}
                        placeholder={`e.g., "A preliminary cost estimate for a 3-bedroom bungalow..."`}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        rows={2}
                    />
                    <button onClick={handleGenerateWithAI} disabled={isGenerating} className="w-full bg-[#0D47A1] text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-800 disabled:bg-gray-400">
                        {isGenerating ? 'Generating...' : 'Generate'}
                    </button>
                </div>
                {/* Templates */}
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-[#424242]">Create from Template</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {documentTemplates.map(template => (
                            <div key={template.id} onClick={() => createFromTemplate(template)} className="bg-white p-3 rounded-md hover:bg-gray-100 hover:shadow-sm transition-all cursor-pointer border">
                                <h4 className="font-bold text-sm text-[#0D47A1]">{template.name}</h4>
                                <p className="text-xs text-gray-600 mt-1 truncate">{template.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-row gap-6 overflow-hidden">
                {/* Filter Sidebar */}
                <div className="w-48 flex-shrink-0">
                    <h4 className="font-semibold text-gray-600 mb-3">Filter by Type</h4>
                    <div className="space-y-2">
                        {allTags.map(tag => (
                            <button key={tag} onClick={() => setActiveTag(tag)} className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${activeTag === tag ? 'bg-[#0D47A1] text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Documents Table */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-[#424242]">Project Documents</h3>
                        <button
                            onClick={() => setShowNewDocumentModal(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-[#0D47A1] text-white rounded-lg hover:bg-blue-800 transition-colors"
                        >
                            <Icon name="document" className="w-4 h-4" />
                            <span>New Document</span>
                        </button>
                    </div>
                    <div className="overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="border-b-2 border-gray-200 sticky top-0 bg-white z-10">
                                <tr>
                                    {[{ label: 'Document Name', key: 'name' }, { label: 'Type', key: 'type' }, { label: 'Created At', key: 'createdAt' }].map(({ label, key }) => (
                                        <th key={key} className="p-3 text-sm font-semibold text-[#616161] tracking-wider">
                                            <button onClick={() => requestSort(key as SortableKeys)} className="flex items-center space-x-1">
                                                <span>{label}</span>
                                                {sortConfig.key === key && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                                            </button>
                                        </th>
                                    ))}
                                    <th className="p-3 text-sm font-semibold text-[#616161] tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAndFilteredDocuments.map(doc => (
                                    <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="p-3 font-medium text-[#424242]">{doc.name}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColorClasses(doc.type)}`}>
                                                {doc.type}
                                            </span>
                                        </td>
                                        <td className="p-3 text-[#616161]">{new Date(doc.createdAt).toLocaleDateString()}</td>
                                        <td className="p-3 text-right space-x-3">
                                            <button onClick={() => setPreviewDoc(doc)} className="font-medium text-[#0D47A1] hover:underline">Preview</button>
                                            <button onClick={() => setHistoryDoc(doc)} className="font-medium text-[#0D47A1] hover:underline">History</button>
                                            <button onClick={() => handleDeleteDoc(doc)} className="font-medium text-red-600 hover:underline">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {sortedAndFilteredDocuments.length === 0 && <p className="text-center text-gray-500 py-8">No documents match the current filter.</p>}
                    </div>
                </div>
            </div>
            {historyDoc && <HistoryModal doc={historyDoc} onClose={() => setHistoryDoc(null)} onRevert={handleRevert} />}
            {previewDoc && <EnhancedDocumentPreview doc={previewDoc} onClose={() => setPreviewDoc(null)} onSave={handleSaveFromPreview} />}

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={deleteConfirm.isOpen}
                title="Delete Document"
                message={`Are you sure you want to delete "${deleteConfirm.doc?.name}"? This action cannot be undone and will permanently remove the document and all its versions.`}
                confirmText="Delete Document"
                cancelText="Cancel"
                onConfirm={confirmDeleteDoc}
                onCancel={cancelDeleteDoc}
                variant="danger"
            />

            {/* New Document Modal */}
            <NewDocumentModal
                isOpen={showNewDocumentModal}
                onClose={() => setShowNewDocumentModal(false)}
                onCreateDocument={handleCreateNewDocument}
            />
        </div>
    );
};

export default DocumentsView;