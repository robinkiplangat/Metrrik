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
        {/* Enhanced overlay for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/50"></div>
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
              <span className="block text-3xl sm:text-4xl lg:text-5xl font-light text-white/90 mt-4">
                In Minutes, Not Days
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl sm:text-2xl text-white/90 leading-relaxed max-w-3xl mx-auto mb-12">
              Transform your architectural drawings into detailed Bills of Quantities instantly.
              No more manual takeoffs, no more guesswork.
            </p>

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
                        className="block w-full px-6 py-4 bg-white/25 border-2 border-dashed border-white/50 rounded-xl text-white text-center cursor-pointer hover:bg-white/35 transition-all duration-200 shadow-lg"
                      >
                        <div className="flex items-center justify-center space-x-3">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-lg font-medium">
                            {uploadedFile ? uploadedFile.name : 'Upload Floor Plan'}
                          </span>
                        </div>
                        <p className="text-sm text-white/70 mt-2">
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
              </div>
            )}
          </div>

          {/* Social proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-12 text-white/80 mt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">2025</div>
              <div className="text-sm">Editor's Pick</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">10K+</div>
              <div className="text-sm">Plans Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">98%</div>
              <div className="text-sm">Accuracy Rate</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <p className="text-sm text-white/60">&copy; {new Date().getFullYear()} Metrrik. All rights reserved.</p>
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
    </div>
  );
};

export default LandingPage;