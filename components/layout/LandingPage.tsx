import React, { useState } from 'react';
import { SignInButton, useUser } from '@clerk/clerk-react';
import CostingModal from '../ui/CostingModal';

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
  const [showCostingModal, setShowCostingModal] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { isSignedIn } = useUser();

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

    setIsAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append('floorPlan', uploadedFile);
      formData.append('projectName', `Analysis - ${new Date().toLocaleDateString()}`);
      formData.append('projectType', 'residential');

      const response = await fetch('/api/analysis/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      setAnalysisData(result.data.analysis);
      setShowCostingModal(true);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze floor plan. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveDocument = () => {
    // TODO: Implement save document functionality
    console.log('Saving document...');
    setShowCostingModal(false);
  };

  const handleStartNewProject = () => {
    // TODO: Implement start new project functionality
    console.log('Starting new project...');
    setShowCostingModal(false);
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
        {/* Subtle overlay */}
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-12">
            <img 
              src="/assets/Q-Sci_Logo_clear.png" 
              alt="Q-Sci Logo" 
              className="h-16 w-auto mx-auto mb-6"
            />
          </div>

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
          {!showCostingModal && (
            <div className="max-w-2xl mx-auto mb-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
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
                      className="block w-full px-6 py-4 bg-white/20 border-2 border-dashed border-white/40 rounded-xl text-white text-center cursor-pointer hover:bg-white/30 transition-colors duration-200"
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
                    ) : (
                      'Analyze Now'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Social proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-12 text-white/80">
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
          <p className="text-sm text-white/60">&copy; {new Date().getFullYear()} Q-Sci. All rights reserved.</p>
        </div>
      </div>

      {/* Costing Modal */}
      <CostingModal
        isOpen={showCostingModal}
        onClose={() => {
          setShowCostingModal(false);
          setAnalysisData(null);
          setUploadedFile(null);
        }}
        onSaveDocument={handleSaveDocument}
        onStartNewProject={handleStartNewProject}
        isAuthenticated={isSignedIn || false}
        analysisData={analysisData || undefined}
      />
    </div>
  );
};

export default LandingPage;