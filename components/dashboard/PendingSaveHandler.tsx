import React, { useEffect, useState } from 'react';
import { projectsApi, documentsApi } from '../../services/client/apiService';

const PendingSaveHandler: React.FC<{ onProjectCreated: () => void }> = ({ onProjectCreated }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [pendingData, setPendingData] = useState<any>(null);

    useEffect(() => {
        const data = localStorage.getItem('pendingAnalysis');
        if (data) {
            try {
                setPendingData(JSON.parse(data));
                setIsOpen(true);
            } catch (e) {
                console.error("Failed to parse pending analysis", e);
                localStorage.removeItem('pendingAnalysis');
            }
        }
    }, []);

    const handleSave = async () => {
        if (!projectName.trim() || !pendingData) return;

        setIsSaving(true);
        try {
            // 1. Create Project
            const projectRes = await projectsApi.createProject({
                name: projectName,
                type: 'residential', // Default or ask user? Defaulting for simpler flow
                description: 'Created from Draft Analysis'
            });

            if (!projectRes.success) throw new Error("Failed to create project");

            // Fix double-nesting from ApiService
            const backendData: any = projectRes.data;
            const projectId = backendData.data.project._id;

            // 2. Create Document (BQ)
            // We need to format the BQ data back to markdown or keep as JSON?
            // documentsApi.createDocument expects content string.
            // Let's assume we saved the generic "EditableAnalysis" object.
            // We'll simplisticly convert it to JSON string or Markdown if we have the helper. (Helper is in Modal, redundant code? Or import?)
            // For now, let's just JSON stringify it as the content, or a simple text representation.
            // Ideally, we'd use the same Markdown formatter. I'll duplicate the formatter here for simplicity or we can export it later.

            const docContent = JSON.stringify(pendingData, null, 2); // Saving raw JSON for now, or could format better.

            await documentsApi.createDocument({
                projectId,
                title: 'Draft Analysis BQ',
                content: docContent,
                type: 'other' // or 'report'
            });

            localStorage.removeItem('pendingAnalysis');
            setIsOpen(false);
            onProjectCreated();
            alert('Project created and analysis saved!');

        } catch (error) {
            console.error(error);
            alert('Failed to save project.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (window.confirm("Discard this draft analysis?")) {
            localStorage.removeItem('pendingAnalysis');
            setIsOpen(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Save Your Analysis</h2>
                <p className="text-gray-600 mb-6">Welcome back! Please give a name to your new project to save your draft analysis.</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Title</label>
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. Dream Home Renovation"
                            autoFocus
                        />
                    </div>

                    <div className="flex space-x-3 pt-2">
                        <button
                            onClick={handleCancel}
                            className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            disabled={isSaving}
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!projectName.trim() || isSaving}
                            className="flex-1 py-2 px-4 bg-[#29B6F6] text-white rounded-lg hover:bg-[#039BE5] disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Create Project'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PendingSaveHandler;
