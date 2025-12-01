'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { VideoInput } from '@/components/VideoInput';
import { AnalysisView } from '@/components/AnalysisView';
import { CompressionProgress } from '@/components/CompressionProgress';
import { AnalysisProgress } from '@/components/AnalysisProgress';
import { analyzeVideo, fileToBase64 } from '@/lib/analysisService';
import { compressVideo, getCompressionStats } from '@/lib/videoCompressor';
import type { CompressionProgress as CompressionProgressType } from '@/lib/videoCompressor';
import type { AnalysisResult, AppState, ComparisonImage } from '@/types';
import { AppState as AppStateEnum } from '@/types';

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>(AppStateEnum.UPLOAD);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [comparisonImages, setComparisonImages] = useState<ComparisonImage[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgressType>({
    stage: 'loading',
    percent: 0,
    message: 'Initializing...',
  });
  const [analysisProgress, setAnalysisProgress] = useState({ percent: 0, message: 'Starting...' });
  const [originalFileSize, setOriginalFileSize] = useState<number>(0);
  const previousUrlRef = useRef<string>('');

  useEffect(() => {
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

  const handleFileReady = async (file: File) => {
    setOriginalFileSize(file.size);

    // Enable compression to reduce API costs (compresses to 720p)
    const SKIP_COMPRESSION = false;

    try {
      let videoFile = file;

      if (!SKIP_COMPRESSION) {
        setAppState(AppStateEnum.COMPRESSING);
        // Step 1: Compress video (skips if already optimized)
        const compressedFile = await compressVideo(file, setCompressionProgress);

        // Only log stats if compression actually happened
        if (compressedFile !== file) {
          const stats = getCompressionStats(file, compressedFile);
          console.log(`Compression: ${stats.originalMB}MB → ${stats.compressedMB}MB (${stats.reduction}% reduction)`);
        }
        videoFile = compressedFile;
      }

      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);

      // Step 2: Analyze video
      setAppState(AppStateEnum.ANALYZING);
      setAnalysisProgress({ percent: 10, message: 'Uploading video...' });

      const base64Data = await fileToBase64(videoFile);
      setAnalysisProgress({ percent: 30, message: 'Analyzing video with AI...' });

      const result = await analyzeVideo(base64Data, videoFile.type);
      setAnalysisProgress({ percent: 90, message: 'Processing results...' });

      setAnalysisResult(result);
      setComparisonImages([]);
      setAppState(AppStateEnum.RESULTS);
    } catch (err) {
      console.error('Analysis error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setCompressionProgress({ stage: 'error', percent: 0, message });
      setErrorMsg(`Failed to process video: ${message}`);
      setAppState(AppStateEnum.ERROR);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setComparisonImages([]);
    setAppState(AppStateEnum.UPLOAD);
    setErrorMsg('');
    setAnalysisProgress({ percent: 0, message: 'Starting...' });
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
            <div className="mb-6 text-center">
              <div className="inline-block p-5 rounded-full bg-equi-navy/50 mb-4 ring-1 ring-equi-slate/20 overflow-hidden">
                <Image
                  src="/EriHorse.png"
                  alt="Horse logo"
                  width={270}
                  height={270}
                  className="object-cover rounded-full"
                />
              </div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight mb-1">
                Patrick&apos;s Equi<span className="text-equi-gold">Analyze</span> Pro
              </h1>
              <p className="text-equi-slate text-base max-w-md mx-auto">
                Master your ride with AI-powered biomechanics analysis.
              </p>
            </div>
            <VideoInput onFileReady={handleFileReady} />
          </div>
        )}

        {appState === AppStateEnum.COMPRESSING && (
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <CompressionProgress
              progress={compressionProgress}
              originalSize={originalFileSize}
            />
          </div>
        )}

        {appState === AppStateEnum.ANALYZING && (
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <AnalysisProgress progress={analysisProgress} />
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
