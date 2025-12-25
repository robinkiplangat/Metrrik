import React from 'react';
import { SignInButton } from '@clerk/clerk-react';

interface CostBreakdown {
  category: string;
  amount: string;
  percentage: string;
  description?: string;
}

interface AnalysisData {
  projectName: string;
  totalArea: string;
  totalCost: string;
  costPerSqm: string;
  breakdown: CostBreakdown[];
  metadata: {
    analysisDate: Date;
    fileType: string;
    fileName: string;
    confidence: number;
  };
}

interface CostingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDocument: () => void;
  onStartNewProject: () => void;
  isAuthenticated: boolean;
  analysisData?: AnalysisData;
}

const CostingModal: React.FC<CostingModalProps> = ({
  isOpen,
  onClose,
  onSaveDocument,
  onStartNewProject,
  isAuthenticated,
  analysisData
}) => {
  if (!isOpen) return null;

  // Use real analysis data if available, otherwise show loading state
  if (!analysisData) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-[#29B6F6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Analysis...</h3>
                <p className="text-gray-600">Please wait while we analyze your floor plan</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const costing = analysisData;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Estimated Costing Analysis</h2>
              <p className="text-gray-600 mt-1">Detailed breakdown of {costing.metadata.fileName}</p>
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                <span>Confidence: {Math.round(costing.metadata.confidence * 100)}%</span>
                <span>•</span>
                <span>Analyzed: {new Date(costing.metadata.analysisDate).toLocaleDateString()}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {/* Project Summary */}
            <div className="bg-gradient-to-r from-[#29B6F6] to-[#039BE5] rounded-xl p-6 text-white mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{costing.projectName}</h3>
                  <p className="text-white/90">Total Area: {costing.totalArea}</p>
                </div>
                <div className="text-right mt-4 sm:mt-0">
                  <div className="text-3xl font-bold">{costing.totalCost}</div>
                  <p className="text-white/90 text-sm">Total Estimated Cost</p>
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h4>
              <div className="space-y-3">
                {costing.breakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.category}</div>
                      {item.description && (
                        <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{item.amount}</div>
                      <div className="text-sm text-gray-600">{item.percentage}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost per Square Meter */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Cost per Square Meter:</span>
                <span className="font-bold text-[#29B6F6]">{costing.costPerSqm}</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row gap-4 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            {!isAuthenticated ? (
              <>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm text-gray-600 mb-2">
                    Create an account to save this analysis and start managing your projects
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <SignInButton mode="modal">
                    <button className="px-6 py-3 bg-[#29B6F6] hover:bg-[#039BE5] text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29B6F6]">
                      Create Account & Save
                    </button>
                  </SignInButton>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-transparent border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold rounded-lg transition-colors duration-200"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm text-gray-600">
                    What would you like to do with this analysis?
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={onSaveDocument}
                    className="px-6 py-3 bg-[#29B6F6] hover:bg-[#039BE5] text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29B6F6]"
                  >
                    Save Document
                  </button>
                  <button
                    onClick={onStartNewProject}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600"
                  >
                    Start New Project
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-transparent border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold rounded-lg transition-colors duration-200"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostingModal;
