
import React, { useState, useEffect } from 'react';
import type { Project, Document, Template, DocumentVersion } from '../../types';
import Icon from '../ui/Icon';

const initialDocuments: Document[] = [
    { id: 'doc-1', name: 'Preliminary Cost Estimate', type: 'Estimate', createdAt: '2024-07-22T11:30:00Z', content: 'Initial costings...', versions: [{version: 1, createdAt: '2024-07-22T11:30:00Z', content: 'Initial costings...' }] },
    { id: 'doc-2', name: 'Client Proposal V1', type: 'Proposal', createdAt: '2024-07-22T15:00:00Z', content: 'Proposal details...', versions: [{version: 1, createdAt: '2024-07-22T15:00:00Z', content: 'Proposal details...' }] },
    { id: 'doc-3', name: 'Floor Plan BQ Draft', type: 'BQ Draft', createdAt: '2024-07-23T09:00:00Z', content: 'BQ draft from plan...', versions: [{version: 1, createdAt: '2024-07-23T09:00:00Z', content: 'BQ draft from plan...' }] },
];

const documentTemplates: Template[] = [
    { id: 'temp-1', name: 'Standard Tender Document', description: 'A formal document for inviting bids for projects.', type: 'Proposal' },
    { id: 'temp-2', name: 'Site Inspection Report', description: 'Record observations and findings from a site visit.', type: 'Template' },
    { id: 'temp-3', name: 'Material Requisition Form', description: 'Formal request for construction materials.', type: 'Template' },
    { id: 'temp-4', name: 'Preliminary Estimate', description: 'Initial high-level cost estimation for a project.', type: 'Estimate' },
];

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

interface DocumentsViewProps {
    project: Project;
    documents: Document[];
    setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
}

const DocumentsView: React.FC<DocumentsViewProps> = ({ project, documents, setDocuments }) => {
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

    useEffect(() => {
        try {
            const savedDocsRaw = localStorage.getItem(`qscribe-docs-${project.id}`);
            if (savedDocsRaw) {
                setDocuments(JSON.parse(savedDocsRaw));
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
            localStorage.setItem(`qscribe-docs-${project.id}`, JSON.stringify(documents));
        }
    }, [documents, project.id]);

    const createFromTemplate = (template: Template) => {
        const newDoc: Document = {
            id: `doc-${Date.now()}`,
            name: `${template.name} (from template)`,
            type: 'Template',
            createdAt: new Date().toISOString(),
            content: `This document was generated from the '${template.name}' template.`,
            versions: [{ version: 1, createdAt: new Date().toISOString(), content: `This document was generated from the '${template.name}' template.` }]
        };
        setDocuments(prev => [...prev, newDoc]);
    };

    const handleRevert = (version: DocumentVersion) => {
        if (!selectedDoc) return;
        const updatedDoc = {
            ...selectedDoc,
            content: version.content,
            versions: [
                ...selectedDoc.versions,
                {
                    version: selectedDoc.versions.length + 1,
                    createdAt: new Date().toISOString(),
                    content: `Reverted to Version ${version.version}.`,
                }
            ]
        };
        setDocuments(docs => docs.map(d => d.id === updatedDoc.id ? updatedDoc : d));
        setSelectedDoc(null);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 h-full flex flex-col space-y-6">
            <div>
                 <h3 className="text-xl font-semibold text-[#424242] mb-4">Create from Template</h3>
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {documentTemplates.map(template => (
                        <div key={template.id} onClick={() => createFromTemplate(template)} className="bg-gray-50 p-4 rounded-lg hover:bg-blue-100 hover:shadow-md transition-all cursor-pointer border border-gray-200">
                           <h4 className="font-bold text-[#0D47A1]">{template.name}</h4>
                           <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                        </div>
                    ))}
                 </div>
            </div>

            <div className="flex-1 flex flex-col">
                <h3 className="text-xl font-semibold text-[#424242] mb-4">Project Documents</h3>
                <div className="overflow-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-gray-200 sticky top-0 bg-white">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-[#616161] tracking-wider">Document Name</th>
                                <th className="p-3 text-sm font-semibold text-[#616161] tracking-wider">Type</th>
                                <th className="p-3 text-sm font-semibold text-[#616161] tracking-wider">Created At</th>
                                <th className="p-3 text-sm font-semibold text-[#616161] tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map(doc => (
                                <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-3 font-medium text-[#424242]">{doc.name}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            doc.type === 'Estimate' ? 'bg-blue-100 text-blue-800' :
                                            doc.type === 'Proposal' ? 'bg-green-100 text-green-800' :
                                            doc.type === 'Template' ? 'bg-indigo-100 text-indigo-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {doc.type}
                                        </span>
                                    </td>
                                    <td className="p-3 text-[#616161]">{new Date(doc.createdAt).toLocaleDateString()}</td>
                                    <td className="p-3 text-right space-x-2">
                                        <button onClick={() => setSelectedDoc(doc)} className="font-medium text-[#0D47A1] hover:underline">History</button>
                                        <div className="relative inline-block">
                                            <details className="group">
                                                <summary className="font-medium text-[#0D47A1] hover:underline cursor-pointer list-none">Download</summary>
                                                <div className="absolute right-0 mt-2 w-32 bg-white border rounded-md shadow-lg z-10 hidden group-open:block">
                                                    <a onClick={() => alert('Downloading PDF...')} href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">As PDF</a>
                                                    <a onClick={() => alert('Downloading DOCX...')} href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">As DOCX</a>
                                                </div>
                                            </details>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {selectedDoc && <HistoryModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} onRevert={handleRevert} />}
        </div>
    );
};

export default DocumentsView;
