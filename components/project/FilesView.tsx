
import React, { useState, useRef, useEffect } from 'react';
import type { UploadedFile, AnalyzedBQ, Document, BQItem } from '../../types';
import { analyzeFloorPlan } from '../../services/geminiService';
import Icon from '../ui/Icon';
import VisualPlanEditor from './VisualPlanEditor';

const fileToBas64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result); // Keep prefix for image src
        };
        reader.onerror = error => reject(error);
    });
};

const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const formatBqToMarkdown = (analysis: AnalyzedBQ): string => {
    let md = `# AI-Generated Bill of Quantities\n\n`;
    md += `## Summary\n`;
    md += `- **Total Estimated Cost:** ${formatCurrency(analysis.summary.totalEstimatedCostKES)}\n`;
    md += `- **Total Wastage Cost:** ${formatCurrency(analysis.summary.totalWastageCostKES)}\n`;
    md += `- **AI Confidence Score:** ${(analysis.summary.confidenceScore * 100).toFixed(1)}%\n\n`;

    md += `## Bill of Quantities\n`;
    md += `| Item No. | Description | Unit | Qty | Rate (KES) | Wastage | Total (KES) |\n`;
    md += `|---|---|---|---|---|---|---|\n`;
    analysis.billOfQuantities.forEach(item => {
        md += `| ${item.itemNumber} | ${item.description} | ${item.unit} | ${item.quantity.toFixed(2)} | ${item.unitRateKES.toLocaleString()} | ${(item.wastageFactor * 100).toFixed(1)}% | ${item.totalCostKES.toLocaleString()} |\n`;
    });
    md += `\n`;

    md += `## Intelligent Suggestions\n`;
    analysis.intelligentSuggestions.forEach(sugg => {
        md += `### ${sugg.suggestionType}: ${sugg.originalItem}\n`;
        md += `- **Suggestion:** ${sugg.suggestion}\n`;
        md += `- **Impact:** ${sugg.impact}\n\n`;
    });

    return md;
};

const AnalysisModal: React.FC<{ 
    analysisResult: AnalyzedBQ; 
    file: UploadedFile;
    onClose: () => void;
    onSave: (content: string) => void;
}> = ({ analysisResult, file, onClose, onSave }) => {
    const [editableAnalysis, setEditableAnalysis] = useState<AnalyzedBQ>(JSON.parse(JSON.stringify(analysisResult))); // Deep copy
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const image = new Image();
        image.src = `data:${file.type};base64,${file.base64}`;
        image.onload = () => {
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);

            editableAnalysis.billOfQuantities.forEach(item => {
                if (item.boundingBox) {
                    ctx.strokeStyle = item.itemNumber === hoveredItem ? '#FFC107' : 'rgba(239, 83, 80, 0.7)'; // Red or Yellow on hover
                    ctx.lineWidth = item.itemNumber === hoveredItem ? 6 : 4;
                    ctx.strokeRect(
                        item.boundingBox.x * image.width,
                        item.boundingBox.y * image.height,
                        item.boundingBox.width * image.width,
                        item.boundingBox.height * image.height
                    );
                }
            });
        };
    }, [file, editableAnalysis, hoveredItem]);

    const handleBqChange = (index: number, field: keyof BQItem, value: any) => {
        const newBq = [...editableAnalysis.billOfQuantities];
        const item = { ...newBq[index] };
        (item[field] as any) = value;
        
        // Recalculate total if quantity or rate changes
        if (field === 'quantity' || field === 'unitRateKES' || field === 'wastageFactor') {
            item.totalCostKES = (item.quantity * item.unitRateKES) * (1 + item.wastageFactor);
        }
        newBq[index] = item;
        
        // Recalculate summary totals
        const totalEstimatedCostKES = newBq.reduce((sum, i) => sum + i.totalCostKES, 0);
        const totalWastageCostKES = newBq.reduce((sum, i) => sum + (i.quantity * i.unitRateKES * i.wastageFactor), 0);

        setEditableAnalysis(prev => ({ 
            ...prev, 
            billOfQuantities: newBq,
            summary: { ...prev.summary, totalEstimatedCostKES, totalWastageCostKES }
        }));
    };

    const handleAddItem = () => {
        const newItem: BQItem = {
            itemNumber: (editableAnalysis.billOfQuantities.length + 1).toString(),
            description: 'New Item', unit: 'LS', quantity: 1, unitRateKES: 0, wastageFactor: 0.05, totalCostKES: 0
        };
        setEditableAnalysis(prev => ({ ...prev, billOfQuantities: [...prev.billOfQuantities, newItem]}));
    };

    const handleRemoveItem = (index: number) => {
        if (!window.confirm("Are you sure you want to remove this item?")) return;
        const newBq = editableAnalysis.billOfQuantities.filter((_, i) => i !== index);
        setEditableAnalysis(prev => ({ ...prev, billOfQuantities: newBq }));
    };

    const handleSave = () => {
        const markdownContent = formatBqToMarkdown(editableAnalysis);
        onSave(markdownContent);
    };

    if (analysisResult.error) { /* Error handling remains the same */ }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <h3 className="text-xl font-semibold text-[#424242]">Interactive AI Analysis</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
                    <div className="bg-gray-100 rounded-lg overflow-auto p-2 flex items-center justify-center">
                        <canvas ref={canvasRef} className="max-w-full max-h-full" />
                    </div>
                    <div className="flex flex-col gap-4 overflow-hidden">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white p-3 rounded-lg border"><p className="text-xs text-gray-500">Total Cost</p><p className="font-bold text-[#0D47A1]">{formatCurrency(editableAnalysis.summary.totalEstimatedCostKES)}</p></div>
                            <div className="bg-white p-3 rounded-lg border"><p className="text-xs text-gray-500">Wastage Cost</p><p className="font-bold text-amber-600">{formatCurrency(editableAnalysis.summary.totalWastageCostKES)}</p></div>
                            <div className="bg-white p-3 rounded-lg border"><p className="text-xs text-gray-500">AI Confidence</p><p className="font-bold text-green-600">{(editableAnalysis.summary.confidenceScore * 100).toFixed(1)}%</p></div>
                        </div>
                        <div className="flex-1 overflow-y-auto border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0"><tr className="text-left">
                                    <th className="p-2 font-semibold">Desc.</th><th className="p-2 font-semibold">Qty</th><th className="p-2 font-semibold">Unit</th><th className="p-2 font-semibold">Rate</th><th className="p-2 font-semibold">Total</th><th className="p-2"></th>
                                </tr></thead>
                                <tbody>{editableAnalysis.billOfQuantities.map((item, index) => (
                                    <tr key={index} onMouseEnter={() => setHoveredItem(item.itemNumber)} onMouseLeave={() => setHoveredItem(null)} className="border-t hover:bg-yellow-50">
                                        <td className="p-1"><input type="text" value={item.description} onChange={e => handleBqChange(index, 'description', e.target.value)} className="w-full p-1 border rounded"/></td>
                                        <td className="p-1"><input type="number" value={item.quantity} onChange={e => handleBqChange(index, 'quantity', parseFloat(e.target.value))} className="w-20 p-1 border rounded"/></td>
                                        <td className="p-1"><input type="text" value={item.unit} onChange={e => handleBqChange(index, 'unit', e.target.value)} className="w-12 p-1 border rounded"/></td>
                                        <td className="p-1"><input type="number" value={item.unitRateKES} onChange={e => handleBqChange(index, 'unitRateKES', parseFloat(e.target.value))} className="w-24 p-1 border rounded"/></td>
                                        <td className="p-1 font-semibold">{item.totalCostKES.toLocaleString()}</td>
                                        <td className="p-1"><button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700">&times;</button></td>
                                    </tr>))}
                                </tbody>
                            </table>
                            <button onClick={handleAddItem} className="m-2 text-sm font-medium text-blue-600 hover:text-blue-800">+ Add Item</button>
                        </div>
                    </div>
                </div>

                 <div className="p-4 bg-gray-100 border-t rounded-b-xl flex justify-end space-x-3 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-[#424242] rounded-lg hover:bg-gray-300">Close</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-[#0D47A1] text-white rounded-lg hover:bg-blue-800 flex items-center space-x-2">
                        <Icon name="document" className="w-5 h-5" /><span>Save as BQ Draft</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

interface FilesViewProps {
    files: UploadedFile[];
    setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
    setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
}

const FilesView: React.FC<FilesViewProps> = ({ files, setFiles, setDocuments }) => {
    const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalyzedBQ | null>(null);
    const [analyzedFile, setAnalyzedFile] = useState<UploadedFile | null>(null);
    const [editorFile, setEditorFile] = useState<UploadedFile | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const fileList = Array.from(event.target.files);
            const newUploads: UploadedFile[] = fileList.map(file => ({
                id: `file-${Date.now()}-${file.name}`, name: file.name, size: file.size, type: file.type,
                uploadedAt: new Date().toISOString(), base64: '', status: 'uploading'
            }));
            
            setFiles(prev => [...prev, ...newUploads]);

            for (const file of fileList) {
                const base64 = await fileToBas64(file);
                const id = `file-${Date.now()}-${file.name}`; // Find by name as ID is not stable yet
                setFiles(prev => prev.map(f => f.name === file.name && f.status === 'uploading' 
                    ? { ...f, id, base64: base64.split(',')[1], status: 'completed' } 
                    : f
                ));
            }
        }
    };
    
    const handleAnalyze = async (file: UploadedFile) => {
        if (!file.base64) {
            alert("File is still processing. Please wait.");
            return;
        }
        setIsAnalyzing(file.id);
        setAnalyzedFile(file);
        setAnalysisResult(null);
        try {
            const resultString = await analyzeFloorPlan(file.base64, file.type);
            setAnalysisResult(JSON.parse(resultString));
        } catch (error) {
            console.error("Analysis failed", error);
            setAnalysisResult({ error: "An unexpected error occurred during analysis." } as AnalyzedBQ);
        } finally {
            setIsAnalyzing(null);
        }
    };

    const handleSaveAnnotation = (newBase64DataUrl: string) => {
        if (!editorFile) return;
        const newBase64 = newBase64DataUrl.split(',')[1];
        setFiles(prevFiles => prevFiles.map(f => f.id === editorFile.id ? { ...f, base64: newBase64 } : f));
        setEditorFile(null);
    };

    const handleSaveAsDraft = (content: string) => {
        const newDoc: Document = {
            id: `doc-${Date.now()}`, name: `BQ Draft from ${analyzedFile?.name || 'AI Analysis'}`,
            type: 'BQ Draft', createdAt: new Date().toISOString(), content: content,
            versions: [{ version: 1, createdAt: new Date().toISOString(), content: content }]
        };
        setDocuments(prev => [...prev, newDoc]);
        setAnalysisResult(null);
        setAnalyzedFile(null);
        alert("Bill of Quantities draft has been saved to your Documents tab.");
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
                        <thead className="border-b-2 border-gray-200"><tr>
                            <th className="p-3 text-sm font-semibold text-[#616161]">File Name</th>
                            <th className="p-3 text-sm font-semibold text-[#616161]">Size</th>
                            <th className="p-3 text-sm font-semibold text-[#616161]">Status</th>
                            <th className="p-3 text-sm font-semibold text-[#616161] text-right">Actions</th>
                        </tr></thead>
                        <tbody>{files.map(file => (
                            <tr key={file.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="p-3 font-medium text-[#424242] flex items-center space-x-2">
                                    <Icon name="file" className="w-5 h-5 text-gray-400" /><span>{file.name}</span>
                                </td>
                                <td className="p-3 text-[#616161]">{(file.size / 1024).toFixed(2)} KB</td>
                                <td className="p-3 text-[#616161]">{file.status === 'uploading' ? 'Processing...' : 'Completed'}</td>
                                <td className="p-3 text-right space-x-2">
                                    {file.type.startsWith('image/') && (
                                        <button onClick={() => setEditorFile(file)} className="font-medium text-[#0D47A1] hover:underline">Annotate</button>
                                    )}
                                    <button onClick={() => handleAnalyze(file)} disabled={isAnalyzing === file.id || file.status === 'uploading'} className="bg-[#FFC107] text-[#424242] font-semibold py-1.5 px-3 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-wait">
                                        {isAnalyzing === file.id ? 'Analyzing...' : 'Analyze with AI'}
                                    </button>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            )}
            {analysisResult && analyzedFile && (
                <AnalysisModal analysisResult={analysisResult} file={analyzedFile} onClose={() => setAnalysisResult(null)} onSave={handleSaveAsDraft} />
            )}
            {editorFile && (
                <VisualPlanEditor file={editorFile} onClose={() => setEditorFile(null)} onSave={handleSaveAnnotation} />
            )}
        </div>
    );
};

export default FilesView;
