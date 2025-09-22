
import React, { useState } from 'react';
import type { UploadedFile } from '../../types';
import { analyzeFloorPlan } from '../../services/geminiService';
import Icon from '../ui/Icon';
import VisualPlanEditor from './VisualPlanEditor';

const fileToBas64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // remove "data:mime/type;base64," prefix
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};

const AnalysisModal: React.FC<{ analysisResult: any; onClose: () => void }> = ({ analysisResult, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-[#424242]">AI Analysis Result</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {analysisResult.suggestions && (
                        <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                            <h4 className="font-bold text-blue-800">AI Suggestions</h4>
                            <ul className="list-disc list-inside mt-2 text-blue-700">
                                {analysisResult.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                    )}
                    <pre className="bg-gray-100 p-4 rounded-lg text-sm whitespace-pre-wrap break-words">
                        {JSON.stringify(analysisResult.billOfQuantities || analysisResult, null, 2)}
                    </pre>
                </div>
                 <div className="p-4 bg-gray-50 border-t rounded-b-xl flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-[#424242] rounded-lg hover:bg-gray-300">Close</button>
                    <button className="px-4 py-2 bg-[#0D47A1] text-white rounded-lg hover:bg-blue-800 flex items-center space-x-2">
                        <Icon name="document" className="w-5 h-5" />
                        <span>Save as BQ Draft</span>
                    </button>
                </div>
            </div>
        </div>
    );
};


interface FilesViewProps {
    files: UploadedFile[];
    setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
}

const FilesView: React.FC<FilesViewProps> = ({ files, setFiles }) => {
    const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<any | null>(null);
    const [editorFile, setEditorFile] = useState<UploadedFile | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFiles = await Promise.all(
                Array.from(event.target.files).map(async (file: File) => {
                    const base64 = await fileToBas64(file);
                    return {
                        id: `file-${Date.now()}-${file.name}`,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        uploadedAt: new Date().toISOString(),
                        base64: base64,
                    };
                })
            );
            setFiles(prev => [...prev, ...newFiles]);
        }
    };
    
    const handleAnalyze = async (file: UploadedFile) => {
        setIsAnalyzing(file.id);
        setAnalysisResult(null);
        try {
            const resultString = await analyzeFloorPlan(file.base64, file.type);
            setAnalysisResult(JSON.parse(resultString));
        } catch (error) {
            console.error("Analysis failed", error);
            setAnalysisResult({ error: "An unexpected error occurred during analysis." });
        } finally {
            setIsAnalyzing(null);
        }
    };

    const handleSaveAnnotation = (newBase64DataUrl: string) => {
        if (!editorFile) return;
        const newBase64 = newBase64DataUrl.split(',')[1];
        setFiles(prevFiles => prevFiles.map(f =>
            f.id === editorFile.id ? { ...f, base64: newBase64 } : f
        ));
        setEditorFile(null);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-[#424242]">Source Files</h3>
                <label className="cursor-pointer flex items-center space-x-2 bg-[#29B6F6] text-white font-medium py-2 px-4 rounded-lg hover:bg-[#039BE5] transition-colors">
                    <Icon name="upload" className="w-5 h-5" />
                    <span>Upload Files</span>
                    <input type="file" multiple className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, application/pdf" />
                </label>
            </div>
            
            {files.length === 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-lg">
                    <Icon name="upload" className="w-16 h-16 text-gray-300 mb-4" />
                    <h4 className="font-semibold text-lg text-[#424242]">Upload Your Drawings</h4>
                    <p className="text-[#616161] max-w-xs">Upload PDF or image files of your floor plans to get started with an AI-generated Bill of Quantities.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-gray-200">
                             <tr>
                                <th className="p-3 text-sm font-semibold text-[#616161] tracking-wider">File Name</th>
                                <th className="p-3 text-sm font-semibold text-[#616161] tracking-wider">Size</th>
                                <th className="p-3 text-sm font-semibold text-[#616161] tracking-wider">Date Uploaded</th>
                                <th className="p-3 text-sm font-semibold text-[#616161] tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map(file => (
                                <tr key={file.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-3 font-medium text-[#424242] flex items-center space-x-2">
                                        <Icon name="file" className="w-5 h-5 text-gray-400" />
                                        <span>{file.name}</span>
                                    </td>
                                    <td className="p-3 text-[#616161]">{(file.size / 1024).toFixed(2)} KB</td>
                                    <td className="p-3 text-[#616161]">{new Date(file.uploadedAt).toLocaleDateString()}</td>
                                    <td className="p-3 text-right space-x-2">
                                        {file.type.startsWith('image/') && (
                                             <button 
                                                onClick={() => setEditorFile(file)}
                                                className="font-medium text-[#0D47A1] hover:underline">
                                                Annotate
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleAnalyze(file)}
                                            disabled={isAnalyzing === file.id}
                                            className="bg-[#FFC107] text-[#424242] font-semibold py-1.5 px-3 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-wait">
                                            {isAnalyzing === file.id ? 'Analyzing...' : 'Analyze with AI'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
             {analysisResult && (
                <AnalysisModal analysisResult={analysisResult} onClose={() => setAnalysisResult(null)} />
            )}
            {editorFile && (
                <VisualPlanEditor
                    file={editorFile}
                    onClose={() => setEditorFile(null)}
                    onSave={handleSaveAnnotation}
                />
            )}
        </div>
    );
};

export default FilesView;
