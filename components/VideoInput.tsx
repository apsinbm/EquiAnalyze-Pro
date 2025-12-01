'use client';

import { useRef, useState } from 'react';
import { downloadFromYouTube } from '@/lib/youtubeService';

interface VideoInputProps {
  onFileReady: (file: File) => void;
}

type InputMode = 'upload' | 'youtube';

const MAX_FILE_SIZE_MB = 100;
const MAX_DURATION_SECONDS = 300; // 5 minutes

export const VideoInput: React.FC<VideoInputProps> = ({ onFileReady }) => {
  const isYouTubeEnabled = process.env.NEXT_PUBLIC_ENABLE_YOUTUBE === 'true';
  const [mode, setMode] = useState<InputMode>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const url = URL.createObjectURL(file);
      video.src = url;
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(video.duration);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to read video'));
      };
    });
  };

  const handleFile = async (file: File) => {
    setError(null);

    if (!file.type.startsWith('video/')) {
      setError('Please upload a valid video file.');
      return;
    }

    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setError(`File too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB. Please compress your video or use a shorter clip.`);
      return;
    }

    try {
      const duration = await getVideoDuration(file);
      if (duration > MAX_DURATION_SECONDS) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        setError(`Video too long (${minutes}:${seconds.toString().padStart(2, '0')}). Maximum duration is 5 minutes. Longer videos increase API costs and processing time.`);
        return;
      }
      onFileReady(file);
    } catch {
      setError('Could not read video file. Please try a different format.');
    }
  };

  const handleYouTubeSubmit = async () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+/;
    if (!youtubeRegex.test(youtubeUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setError(null);
    setIsDownloading(true);

    try {
      const file = await downloadFromYouTube(youtubeUrl);
      onFileReady(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download video';
      setError(message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto text-center px-4">
      {/* Limits notice */}
      <div className="mb-6 p-3 bg-equi-navy/50 border border-equi-slate/20 rounded-xl">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-equi-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-equi-slate">
            <span className="text-white font-medium">Limits:</span> 100MB max file size, 5 minutes max duration
          </span>
        </div>
      </div>

      {/* Tab selector - only show if YouTube is enabled */}
      {isYouTubeEnabled && (
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-equi-navy/50 rounded-lg p-1">
            <button
              onClick={() => { setMode('upload'); setError(null); }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'upload'
                  ? 'bg-equi-gold text-equi-navy'
                  : 'text-equi-slate hover:text-white'
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => { setMode('youtube'); setError(null); }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'youtube'
                  ? 'bg-equi-gold text-equi-navy'
                  : 'text-equi-slate hover:text-white'
              }`}
            >
              YouTube URL
            </button>
          </div>
        </div>
      )}

      {/* File Upload Mode */}
      {mode === 'upload' && (
        <>
          <div
            className={`relative h-44 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-colors cursor-pointer
              ${dragActive ? 'border-equi-gold bg-equi-gold/5' : 'border-equi-slate/30 bg-equi-navy/50 hover:border-equi-gold/50'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              onChange={handleChange}
              className="hidden"
            />

            <div className="flex flex-col items-center pointer-events-none">
              <svg className="w-12 h-12 text-equi-gold mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-base font-medium text-white">Drag & drop your video here</p>
              <p className="text-sm text-equi-slate mt-1">or click to browse (MP4, MOV, WebM)</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-equi-slate/60">Videos over 720p will be automatically compressed</p>
        </>
      )}

      {/* YouTube URL Mode - only show if enabled */}
      {mode === 'youtube' && isYouTubeEnabled && (
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3 bg-equi-navy/50 border border-equi-slate/30 rounded-xl text-white placeholder:text-equi-slate/50 focus:outline-none focus:border-equi-gold/50 transition-colors"
              disabled={isDownloading}
            />
            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-equi-slate" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
            </svg>
          </div>

          <button
            onClick={handleYouTubeSubmit}
            disabled={isDownloading || !youtubeUrl.trim()}
            className="w-full py-3 bg-equi-gold text-equi-navy font-semibold rounded-xl hover:bg-equi-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDownloading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Downloading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download & Analyze
              </>
            )}
          </button>

          <p className="text-xs text-equi-slate/60">
            Paste a YouTube URL to download and analyze.
            <br />
            Downloads at 720p to optimize for analysis.
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};
