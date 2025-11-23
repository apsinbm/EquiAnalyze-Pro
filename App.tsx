import React, { useState, useEffect, useRef } from 'react';
import { VideoUploader } from './components/VideoUploader';
import { AnalysisView } from './components/AnalysisView';
import { analyzeVideo, fetchComparisonImages, fileToGenerativePart } from './services/geminiService';
import type { AnalysisResult, AppState, ComparisonImage } from './types';
import { AppState as AppStateEnum } from './types';

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppStateEnum.UPLOAD);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [comparisonImages, setComparisonImages] = useState<ComparisonImage[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const previousUrlRef = useRef<string>('');

  useEffect(() => {
    // Cleanup previous video URL when a new one is set
    if (previousUrlRef.current && previousUrlRef.current !== videoUrl) {
      URL.revokeObjectURL(previousUrlRef.current);
    }
    previousUrlRef.current = videoUrl;

    return () => {
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
      }
    };
  }, [videoUrl]);

  const handleFileSelect = async (file: File) => {
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setAppState(AppStateEnum.ANALYZING);

    try {
      const base64Data = await fileToGenerativePart(file);
      const result = await analyzeVideo(base64Data, file.type);
      setAnalysisResult(result);

      const query = `${result.movementName} ${result.similarProRider} equestrian`;
      const images = await fetchComparisonImages(query);
      setComparisonImages(images);

      setAppState(AppStateEnum.RESULTS);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      setErrorMsg(`Failed to analyze video: ${message}`);
      setAppState(AppStateEnum.ERROR);
    }
  };

  const handleReset = () => {
    setVideoFile(null);
    setAnalysisResult(null);
    setComparisonImages([]);
    setAppState(AppStateEnum.UPLOAD);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-equi-dark text-white font-sans selection:bg-equi-gold/30">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-equi-accent/5 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-equi-gold/5 rounded-full blur-[100px]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full">
        {appState === AppStateEnum.UPLOAD && (
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
             <div className="mb-12 text-center">
                <div className="inline-block p-2 rounded-full bg-equi-navy/50 mb-6 ring-1 ring-equi-slate/20 overflow-hidden">
                  <img src="/EriHorse.png" alt="Horse logo" className="w-16 h-16 object-cover rounded-full" />
                </div>
                <h1 className="text-5xl font-extrabold text-white tracking-tight mb-2">
                  Patrick's Equi<span className="text-equi-gold">Analyze</span> Pro
                </h1>
                <p className="text-equi-slate text-lg max-w-md mx-auto">
                  Master your ride with AI-powered biomechanics analysis and world-class comparisons.
                </p>
             </div>
             <VideoUploader onFileSelect={handleFileSelect} />
          </div>
        )}

        {appState === AppStateEnum.ANALYZING && (
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-4 border-equi-slate/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-equi-gold rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-2xl">⚡</div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Analyzing Biomechanics...</h2>
            <p className="text-equi-slate text-sm animate-pulse">Detecting segments, calculating physics, and finding pro matches.</p>
          </div>
        )}

        {appState === AppStateEnum.RESULTS && analysisResult && (
          <AnalysisView 
            videoUrl={videoUrl}
            result={analysisResult}
            comparisonImages={comparisonImages}
            onReset={handleReset}
          />
        )}

        {appState === AppStateEnum.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/30 text-center max-w-md">
              <span className="text-4xl block mb-4">⚠️</span>
              <h2 className="text-xl font-bold text-white mb-2">Analysis Failed</h2>
              <p className="text-red-200 mb-6">{errorMsg}</p>
              <button 
                onClick={handleReset}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}