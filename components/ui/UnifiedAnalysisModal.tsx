import React, { useState, useEffect, useRef } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { analysisApi } from '../../services/client/apiService';
import type { AnalyzedBQ, BQItem, UploadedFile } from '../../services/shared/types';

interface UnifiedAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  file: File | UploadedFile;
  showDocumentPreview?: boolean;
  showEditableBreakdown?: boolean;
  title?: string;
}

const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatBqToMarkdown = (analysis: AnalyzedBQ): string => {
  let md = `# Draft | Bill of Quantities\n\n`;
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

// Helper to convert base64 to File
const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new File([ab], filename, { type: mimeType });
};

const UnifiedAnalysisModal: React.FC<UnifiedAnalysisModalProps> = ({
  isOpen,
  onClose,
  onSave,
  file,
  showDocumentPreview = true,
  showEditableBreakdown = true,
  title = "Metrrik Analysis Results"
}) => {
  const { user } = useUser();
  const clerk = useClerk();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzedBQ | null>(null);
  const [editableAnalysis, setEditableAnalysis] = useState<AnalyzedBQ | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Convert File to base64 for analysis
  const getFileBase64 = async (file: File | UploadedFile): Promise<string> => {
    if ('base64' in file && file.base64) {
      return file.base64;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 data
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file as File);
    });
  };

  // Draw document preview on canvas
  const drawDocumentPreview = async () => {
    if (!canvasRef.current || !file) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const base64 = await getFileBase64(file);
      const img = new Image();

      img.onload = () => {
        // Calculate dimensions to fit canvas while maintaining aspect ratio
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const imgAspect = img.width / img.height;
        const canvasAspect = canvasWidth / canvasHeight;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgAspect > canvasAspect) {
          // Image is wider than canvas
          drawWidth = canvasWidth;
          drawHeight = canvasWidth / imgAspect;
          offsetX = 0;
          offsetY = (canvasHeight - drawHeight) / 2;
        } else {
          // Image is taller than canvas
          drawHeight = canvasHeight;
          drawWidth = canvasHeight * imgAspect;
          offsetX = (canvasWidth - drawWidth) / 2;
          offsetY = 0;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Draw image
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // Draw bounding boxes for BQ items if analysis is available
        if (editableAnalysis && editableAnalysis.billOfQuantities) {
          editableAnalysis.billOfQuantities.forEach(item => {
            if (item.boundingBox && hoveredItem === item.itemNumber) {
              const { x, y, width, height } = item.boundingBox;
              const boxX = offsetX + (x * drawWidth);
              const boxY = offsetY + (y * drawHeight);
              const boxWidth = width * drawWidth;
              const boxHeight = height * drawHeight;

              // Draw bounding box
              ctx.strokeStyle = '#FF6B6B';
              ctx.lineWidth = 2;
              ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

              // Draw label
              ctx.fillStyle = '#FF6B6B';
              ctx.font = '12px Arial';
              ctx.fillText(item.itemNumber, boxX, boxY - 5);
            }
          });
        }
      };

      img.src = `data:${file.type};base64,${base64}`;
    } catch (error) {
      console.error('Error drawing document preview:', error);
    }
  };

  // Handle BQ item changes
  const handleBqChange = (index: number, field: keyof BQItem, value: any) => {
    if (!editableAnalysis) return;

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
      ...prev!,
      billOfQuantities: newBq,
      summary: { ...prev!.summary, totalEstimatedCostKES, totalWastageCostKES }
    }));
  };

  const handleAddItem = () => {
    if (!editableAnalysis) return;

    const newItem: BQItem = {
      itemNumber: (editableAnalysis.billOfQuantities.length + 1).toString(),
      description: 'New Item',
      unit: 'LS',
      quantity: 1,
      unitRateKES: 0,
      wastageFactor: 0.05,
      totalCostKES: 0
    };
    setEditableAnalysis(prev => ({
      ...prev!,
      billOfQuantities: [...prev!.billOfQuantities, newItem]
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (!editableAnalysis) return;
    if (!window.confirm("Are you sure you want to remove this item?")) return;

    const newBq = editableAnalysis.billOfQuantities.filter((_, i) => i !== index);
    setEditableAnalysis(prev => ({ ...prev!, billOfQuantities: newBq }));
  };

  const handleSave = async () => {
    if (!editableAnalysis) return;

    // Check Auth - if not signed in, save locally and prompt login
    if (!user) {
      try {
        localStorage.setItem('pendingAnalysis', JSON.stringify(editableAnalysis));
        // You might want to save file info too if needed for re-analysis or preview
        // localStorage.setItem('pendingAnalysisFile', ...); 
        clerk.openSignIn();
      } catch (e) {
        console.error("Failed to save pending analysis locally", e);
        alert("Please sign in to save your analysis.");
      }
      return;
    }

    // Save to backend if we have an ID (Draft BQ)
    if (analysisId) {
      try {
        await analysisApi.updateAnalysis(analysisId, editableAnalysis);
        alert('Draft BQ saved successfully!');
      } catch (error) {
        console.error('Failed to save draft:', error);
        alert('Failed to save draft. Please try again.');
        return;
      }
    } else {
      console.warn("No analysis ID found, cannot save to backend.");
    }

    const markdownContent = formatBqToMarkdown(editableAnalysis);
    onSave(markdownContent);
  };

  // Perform analysis when modal opens
  useEffect(() => {
    if (isOpen && file && !analysisResult) {
      const performAnalysis = async () => {
        setIsAnalyzing(true);
        try {
          let fileObj: File;

          if ('base64' in file && file.base64) {
            fileObj = base64ToFile(file.base64, file.name || 'document', file.type || 'application/pdf');
          } else if (file instanceof File) {
            fileObj = file;
          } else {
            throw new Error("Invalid file format");
          }

          // Call Backend API
          console.log("UnifiedAnalysisModal: Calling analyzeFloorPlan...");
          const response = await analysisApi.analyzeFloorPlan(fileObj, file.name || "Draft Project");
          console.log("UnifiedAnalysisModal: API Response:", response);

          if (response.success && response.data) {
            // ApiService wraps the backend response, so we need response.data.data
            const backendData = response.data as any;

            if (!backendData.data || !backendData.data.analysis) {
              console.error("UnifiedAnalysisModal: Missing analysis object in nested data", backendData);
              throw new Error("Invalid server response structure");
            }

            console.log("UnifiedAnalysisModal: Setting analysis result", backendData.data.analysis);
            setAnalysisResult(backendData.data.analysis);
            setEditableAnalysis(backendData.data.analysis);

            if (backendData.data.analysisId) {
              setAnalysisId(backendData.data.analysisId);
            }
          } else {
            console.error("UnifiedAnalysisModal: Analysis failed success=false", response.error);
            throw new Error(response.error?.message || "Analysis failed");
          }

        } catch (error: any) {
          console.error("Analysis failed", error);
          setAnalysisResult({
            error: error.message || "Failed to analyze the document. Please try again.",
            summary: {
              totalEstimatedCostKES: 0,
              totalWastageCostKES: 0,
              confidenceScore: 0
            },
            billOfQuantities: [],
            intelligentSuggestions: []
          } as AnalyzedBQ);
        } finally {
          setIsAnalyzing(false);
        }
      };

      performAnalysis();
    }
  }, [isOpen, file, analysisResult]);

  // Draw document preview when analysis changes
  useEffect(() => {
    if (isOpen && showDocumentPreview) {
      drawDocumentPreview();
    }
  }, [isOpen, showDocumentPreview, editableAnalysis, hoveredItem]);

  if (!isOpen) return null;

  // Loading state
  if (isAnalyzing) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-[#29B6F6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Analyzing Document...</h3>
                <p className="text-gray-600">Please wait while we analyze your floor plan</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (analysisResult?.error) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Analysis Failed</h3>
              </div>

              <p className="text-gray-600 mb-6">{analysisResult.error}</p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state with analysis results
  if (!editableAnalysis) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-7xl bg-white rounded-2xl shadow-2xl h-[95vh] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
            <h3 className="text-xl font-semibold text-[#424242]">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
            {/* Document Preview - Left Side */}
            {showDocumentPreview && (
              <div className="bg-gray-100 rounded-lg overflow-auto p-2 flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={500}
                  className="max-w-full max-h-full border border-gray-300 rounded"
                />
              </div>
            )}

            {/* Cost Breakdown - Right Side */}
            <div className="flex flex-col gap-4 overflow-hidden">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-3 rounded-lg border">
                  <p className="text-xs text-gray-500">Total Cost</p>
                  <p className="font-bold text-[#0D47A1]">{formatCurrency(editableAnalysis.summary.totalEstimatedCostKES)}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <p className="text-xs text-gray-500">Wastage Cost</p>
                  <p className="font-bold text-amber-600">{formatCurrency(editableAnalysis.summary.totalWastageCostKES)}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <p className="text-xs text-gray-500">AI Confidence</p>
                  <p className="font-bold text-green-600">{(editableAnalysis.summary.confidenceScore * 100).toFixed(1)}%</p>
                </div>
              </div>

              {/* Editable BQ Table */}
              {showEditableBreakdown ? (
                <div className="flex-1 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="text-left">
                        <th className="p-2 font-semibold">Desc.</th>
                        <th className="p-2 font-semibold">Qty</th>
                        <th className="p-2 font-semibold">Unit</th>
                        <th className="p-2 font-semibold">Rate</th>
                        <th className="p-2 font-semibold">Total</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editableAnalysis.billOfQuantities.map((item, index) => (
                        <tr
                          key={index}
                          onMouseEnter={() => setHoveredItem(item.itemNumber)}
                          onMouseLeave={() => setHoveredItem(null)}
                          className="border-t hover:bg-yellow-50"
                        >
                          <td className="p-1">
                            <input
                              type="text"
                              value={item.description}
                              onChange={e => handleBqChange(index, 'description', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={e => handleBqChange(index, 'quantity', parseFloat(e.target.value))}
                              className="w-20 p-1 border rounded"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={e => handleBqChange(index, 'unit', e.target.value)}
                              className="w-12 p-1 border rounded"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              value={item.unitRateKES}
                              onChange={e => handleBqChange(index, 'unitRateKES', parseFloat(e.target.value))}
                              className="w-24 p-1 border rounded"
                            />
                          </td>
                          <td className="p-1 font-semibold">{item.totalCostKES.toLocaleString()}</td>
                          <td className="p-1">
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              &times;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    onClick={handleAddItem}
                    className="m-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    + Add Item
                  </button>
                </div>
              ) : (
                /* Simple breakdown for landing page */
                <div className="flex-1 overflow-y-auto border rounded-lg p-4">
                  <div className="space-y-3">
                    {editableAnalysis.billOfQuantities.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.description}</div>
                          <div className="text-sm text-gray-600">Qty: {item.quantity} {item.unit}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{formatCurrency(item.totalCostKES)}</div>
                          <div className="text-sm text-gray-600">Rate: {formatCurrency(item.unitRateKES)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-gray-100 border-t rounded-b-xl flex justify-end space-x-3 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-[#424242] rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#29B6F6] text-white rounded-lg hover:bg-[#039BE5]"
            >
              Save Analysis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedAnalysisModal;
