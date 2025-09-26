import React, { useState } from 'react';
import type { UploadedFile, Document } from '../../services/shared/types';
import UnifiedAnalysisModal from '../ui/UnifiedAnalysisModal';
import Icon from '../ui/Icon';
import VisualPlanEditor from './VisualPlanEditor';

const fileToBas64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
    });
};

interface FilesViewProps {
    files: UploadedFile[];
    setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
    setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
}

const FilesView: React.FC<FilesViewProps> = ({ files, setFiles, setDocuments }) => {
    const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
    const [analyzedFile, setAnalyzedFile] = useState<UploadedFile | null>(null);
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (!selectedFiles) return;

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const base64 = await fileToBas64(file);
            
            const newFile: UploadedFile = {
                id: Date.now().toString() + i,
                name: file.name,
                type: file.type,
                size: file.size,
                base64: base64,
                uploadedAt: new Date().toISOString()
            };

            setFiles(prev => [...prev, newFile]);
        }
    };
    
    const handleAnalyze = async (file: UploadedFile) => {
        if (!file.base64) {
            alert("File is still processing. Please wait.");
            return;
        }
        setIsAnalyzing(file.id);
        setAnalyzedFile(file);
        setShowAnalysisModal(true);
    };

    const handleSaveAnalysis = (content: string) => {
        if (!analyzedFile) return;

        const newDocument: Document = {
            id: Date.now().toString(),
            name: `BQ Analysis - ${analyzedFile.name}`,
            type: 'BQ Draft',
            createdAt: new Date().toISOString(),
            content: content,
            versions: [{
                version: 1,
                createdAt: new Date().toISOString(),
                content: content
            }]
        };

        setDocuments(prev => [...prev, newDocument]);
        setShowAnalysisModal(false);
        setAnalyzedFile(null);
        setIsAnalyzing(null);
    };

    const handleRemoveFile = (fileId: string) => {
        setFiles(prev => prev.filter(f => f.id !== fileId));
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Plans to BQ</h2>
                    <p className="text-gray-600 mt-1">Upload floor plans and generate Bills of Quantities with AI</p>
                </div>
                <div className="flex items-center space-x-3">
                    <label className="px-4 py-2 bg-[#29B6F6] text-white rounded-lg hover:bg-[#039BE5] cursor-pointer transition-colors duration-200 shadow-lg hover:shadow-xl">
                        <Icon name="upload" className="w-4 h-4 inline mr-2" />
                        Upload Files
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.dwg,.jpg,.png,.jpeg"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            {/* Files Grid */}
            <div className="flex-1 overflow-y-auto">
                {files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Icon name="file" className="w-12 h-12 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No files uploaded yet</h3>
                        <p className="text-gray-600 mb-6 max-w-md">
                            Upload your floor plans, architectural drawings, or PDFs to get started with AI-powered analysis.
                        </p>
                        <label className="px-6 py-3 bg-[#29B6F6] text-white rounded-lg hover:bg-[#039BE5] cursor-pointer transition-colors duration-200 shadow-lg hover:shadow-xl">
                            <Icon name="upload" className="w-5 h-5 inline mr-2" />
                            Upload Your First File
                            <input
                                type="file"
                                multiple
                                accept=".pdf,.dwg,.jpg,.png,.jpeg"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {files.map((file) => (
                            <div key={file.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <Icon name="file" className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-gray-900 truncate">{file.name}</h4>
                                                <p className="text-xs text-gray-500">
                                                    {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveFile(file.id)}
                                            className="text-gray-400 hover:text-red-500 transition-colors duration-200"
                                        >
                                            <Icon name="close" className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <button
                                            onClick={() => handleAnalyze(file)}
                                            disabled={isAnalyzing === file.id}
                                            className="w-full px-3 py-2 bg-[#29B6F6] text-white text-sm font-medium rounded-lg hover:bg-[#039BE5] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
                                        >
                                            {isAnalyzing === file.id ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span>Analyzing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Icon name="file" className="w-4 h-4" />
                                                    <span>Analyze with AI</span>
                                                </>
                                            )}
                                        </button>
                                        
                                        <button
                                            onClick={() => {
                                                // Open VisualPlanEditor for this file
                                                // This would be implemented based on your VisualPlanEditor component
                                                console.log('Open visual editor for:', file.name);
                                            }}
                                            className="w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center space-x-2"
                                        >
                                            <Icon name="file" className="w-4 h-4" />
                                            <span>Edit Plan</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Unified Analysis Modal */}
            {analyzedFile && (
                <UnifiedAnalysisModal
                    isOpen={showAnalysisModal}
                    onClose={() => {
                        setShowAnalysisModal(false);
                        setAnalyzedFile(null);
                        setIsAnalyzing(null);
                    }}
                    onSave={handleSaveAnalysis}
                    file={analyzedFile}
                    showDocumentPreview={true}
                    showEditableBreakdown={true}
                    title="AI Analysis Results"
                />
            )}
        </div>
    );
};

export default FilesView;