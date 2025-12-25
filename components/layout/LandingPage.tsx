import React, { useState, useEffect } from 'react';
import { SignInButton, useUser } from '@clerk/clerk-react';
import UnifiedAnalysisModal from '../ui/UnifiedAnalysisModal';
import { analysisApi } from '../../services/client/apiService';

interface LandingPageProps {
  onLogin: () => void;
}

interface AnalysisData {
  projectName: string;
  totalArea: string;
  totalCost: string;
  costPerSqm: string;
  breakdown: Array<{
    category: string;
    amount: string;
    percentage: string;
    description?: string;
  }>;
  metadata: {
    analysisDate: Date;
    fileType: string;
    fileName: string;
    confidence: number;
  };
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [hasUsedFreeAnalysis, setHasUsedFreeAnalysis] = useState(false);
  const { isSignedIn } = useUser();

  // Check if user has already used their free analysis
  useEffect(() => {
    // Developer override - check for bypass flag
    const isDeveloper = localStorage.getItem('metrrik_developer_mode') === 'true';
    let freeAnalysisUsed = localStorage.getItem('metrrik_free_analysis_used');

    // Migration logic: Check for old 'qsci' key if 'metrrik' key is missing
    if (freeAnalysisUsed === null) {
      const oldFreeAnalysisUsed = localStorage.getItem('qsci_free_analysis_used');
      if (oldFreeAnalysisUsed === 'true') {
        localStorage.setItem('metrrik_free_analysis_used', 'true');
        freeAnalysisUsed = 'true';
      }
    }

    // If in developer mode, always allow free analysis
    setHasUsedFreeAnalysis(isDeveloper ? false : freeAnalysisUsed === 'true');
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleAnalyze = async () => {
    if (!uploadedFile) {
      alert('Please upload a floor plan first');
      return;
    }

    // Check if user needs to login for subsequent analyses (unless in developer mode)
    const isDeveloper = localStorage.getItem('metrrik_developer_mode') === 'true';
    if (hasUsedFreeAnalysis && !isSignedIn && !isDeveloper) {
      alert('Please login to continue with more analyses. You\'ve used your free sample analysis.');
      return;
    }

    // Mark that user has used their free analysis (unless in developer mode)
    if (!hasUsedFreeAnalysis && !isDeveloper) {
      localStorage.setItem('metrrik_free_analysis_used', 'true');
      setHasUsedFreeAnalysis(true);
    }

    setShowAnalysisModal(true);
  };

  const handleSaveDocument = (content: string) => {
    // TODO: Implement save document functionality
    console.log('Saving document with content:', content);
    setShowAnalysisModal(false);
    setUploadedFile(null);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/assets/Landing_Page_BG.png)',
        }}
      >
        {/* Enhanced overlay for better text visibility with grayscale touch */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70 backdrop-grayscale-[0.4]"></div>
      </div>

      {/* Header with Logo and Login */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="flex items-center justify-between px-6 py-6">
          {/* Logo - Top Left */}
          <div className="flex-1">
            <img
              src="/assets/mettrik_light.png"
              alt="Metrrik Logo"
              className="h-20 w-auto drop-shadow-lg"
            />
          </div>

          {/* Login Link - Top Right */}
          <div className="flex-1 flex justify-end">
            <SignInButton mode="modal">
              <button className="text-white/80 hover:text-white text-sm font-medium transition-colors duration-200 hover:underline">
                Login to Dashboard
              </button>
            </SignInButton>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Content backdrop for better readability */}
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-white/10">

            {/* Main headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-8">
              Floor Plan to BQ
              <span className="block text-2xl sm:text-3xl lg:text-4xl font-light text-white/80 mt-6 h-12">
                For Residential • Commercial • Industrial
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl sm:text-2xl text-white/90 leading-relaxed max-w-3xl mx-auto mb-12">
              No more manual takeoffs, No more guesswork.
            </p>

            {/* How It Works Steps */}
            <div className="flex justify-center items-center space-x-2 sm:space-x-8 mb-10 text-white/90 overflow-x-auto pb-2 sm:pb-0">
              <div className="flex flex-col items-center group cursor-default min-w-[100px]">
                <div className="p-3 bg-white/10 rounded-xl mb-3 group-hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10 shadow-lg">
                  <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </div>
                <span className="text-sm font-medium">1. Upload Plan</span>
              </div>
              <div className="hidden sm:block">
                <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </div>
              <div className="flex flex-col items-center group cursor-default min-w-[100px]">
                <div className="p-3 bg-white/10 rounded-xl mb-3 group-hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10 shadow-lg">
                  <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <span className="text-sm font-medium">2. Takeoff</span>
              </div>
              <div className="hidden sm:block">
                <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </div>
              <div className="flex flex-col items-center group cursor-default min-w-[100px]">
                <div className="p-3 bg-white/10 rounded-xl mb-3 group-hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10 shadow-lg">
                  <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <span className="text-sm font-medium">3. Download BQ</span>
              </div>
            </div>

            {/* Analysis input area */}
            {!showAnalysisModal && (
              <div className="max-w-2xl mx-auto mb-12">
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-8 border border-white/30 shadow-2xl">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <input
                        type="file"
                        accept=".pdf,.dwg,.jpg,.png"
                        className="hidden"
                        id="floor-plan-upload"
                        onChange={handleFileUpload}
                      />
                      <label
                        htmlFor="floor-plan-upload"
                        className="block w-full px-6 py-4 bg-white/25 border-2 border-dashed border-white/50 rounded-xl text-white text-center cursor-pointer hover:bg-white/35 hover:scale-[1.02] hover:border-white transition-all duration-300 shadow-lg group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
                        <div className="flex items-center justify-center space-x-3">
                          <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-lg font-medium">
                            {uploadedFile ? uploadedFile.name : 'Upload Floor Plan'}
                          </span>
                        </div>
                        <p className="text-sm text-white/70 mt-2 group-hover:text-white/90 transition-colors">
                          {uploadedFile ? 'File ready for analysis' : 'PDF, DWG, JPG, PNG supported'}
                        </p>
                      </label>
                    </div>
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !uploadedFile}
                      className="px-8 py-4 bg-[#29B6F6] hover:bg-[#039BE5] disabled:bg-[#29B6F6]/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29B6F6] min-w-[140px]"
                    >
                      {isAnalyzing ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Analyzing...</span>
                        </div>
                      ) : hasUsedFreeAnalysis && !isSignedIn && localStorage.getItem('metrrik_developer_mode') !== 'true' ? (
                        'Login Required'
                      ) : localStorage.getItem('metrrik_developer_mode') === 'true' ? (
                        'Analyze (Dev Mode)'
                      ) : (
                        hasUsedFreeAnalysis ? 'Analyze Now' : 'Try Free Analysis'
                      )}
                    </button>
                  </div>
                </div>

                {/* Free analysis info */}
                {!hasUsedFreeAnalysis && (
                  <div className="mt-4 text-center">
                    <p className="text-white/70 text-sm">
                      ✨ Get your first analysis free - no signup required!
                    </p>
                  </div>
                )}

                {hasUsedFreeAnalysis && !isSignedIn && (
                  <div className="mt-4 text-center">
                    <p className="text-white/70 text-sm">
                      🔒 Login to continue with unlimited analyses
                    </p>
                  </div>
                )}

                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setShowSampleModal(true)}
                    className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors px-4 py-2 hover:bg-white/10 rounded-full text-sm font-medium border border-transparent hover:border-white/20"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    <span>See Sample BQ Output</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-full text-center pb-4 z-20">
          <p className="text-sm text-white/50 hover:text-white/70 transition-colors">&copy; {new Date().getFullYear()} Metrrik. All rights reserved.</p>
        </div>
      </div>

      {/* Unified Analysis Modal */}
      {uploadedFile && (
        <UnifiedAnalysisModal
          isOpen={showAnalysisModal}
          onClose={() => {
            setShowAnalysisModal(false);
            setUploadedFile(null);
          }}
          onSave={handleSaveDocument}
          file={uploadedFile}
          showDocumentPreview={true}
          showEditableBreakdown={false}
          title="Floor Plan Analysis"
        />
      )}

      {/* Sample Analysis Modal */}
      {showSampleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.target === e.currentTarget && setShowSampleModal(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col font-sans text-left">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Sample Analysis: Residential Unit</h3>
                <p className="text-sm text-gray-500 mt-1">Calculated using localized Kenyan rates (KES)</p>
              </div>
              <button onClick={() => setShowSampleModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-gray-50/30">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="text-sm text-blue-600 font-medium mb-1">Total Estimated Cost</div>
                  <div className="text-2xl font-bold text-blue-900">KES 4.2M</div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                  <div className="text-sm text-green-600 font-medium mb-1">Cost per sqm</div>
                  <div className="text-2xl font-bold text-green-900">KES 45,000</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                  <div className="text-sm text-purple-600 font-medium mb-1">Total Wastage</div>
                  <div className="text-2xl font-bold text-purple-900">5.2%</div>
                </div>
              </div>

              {/* Sample Output Table */}
              <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                      <tr>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-center">Qty</th>
                        <th className="py-3 px-4 text-center">Unit</th>
                        <th className="py-3 px-4 text-right">Rate (KES)</th>
                        <th className="py-3 px-4 text-right">Total (KES)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-3 px-4 font-medium text-gray-800">Substructure</td>
                        <td className="py-3 px-4 text-gray-600">Excavation of foundation trenches</td>
                        <td className="py-3 px-4 text-center">45</td>
                        <td className="py-3 px-4 text-center bg-gray-50/50">CM</td>
                        <td className="py-3 px-4 text-right">850</td>
                        <td className="py-3 px-4 text-right font-medium">38,250</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium text-gray-800">Superstructure</td>
                        <td className="py-3 px-4 text-gray-600">200mm thk natural stone walling</td>
                        <td className="py-3 px-4 text-center">120</td>
                        <td className="py-3 px-4 text-center bg-gray-50/50">SM</td>
                        <td className="py-3 px-4 text-right">2,400</td>
                        <td className="py-3 px-4 text-right font-medium">288,000</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium text-gray-800">Concrete Work</td>
                        <td className="py-3 px-4 text-gray-600">Reinforced concrete class 20/20</td>
                        <td className="py-3 px-4 text-center">25</td>
                        <td className="py-3 px-4 text-center bg-gray-50/50">CM</td>
                        <td className="py-3 px-4 text-right">18,500</td>
                        <td className="py-3 px-4 text-right font-medium">462,500</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium text-gray-800">Roofing</td>
                        <td className="py-3 px-4 text-gray-600">Gauge 28 pre-painted iron sheets</td>
                        <td className="py-3 px-4 text-center">150</td>
                        <td className="py-3 px-4 text-center bg-gray-50/50">SM</td>
                        <td className="py-3 px-4 text-right">1,200</td>
                        <td className="py-3 px-4 text-right font-medium">180,000</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="p-3 text-center bg-gray-50 border-t text-xs text-gray-500 italic">
                    * This is a sample extract. Full reports include 50+ line items and intelligent suggestions.
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowSampleModal(false)}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Close Sample
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;