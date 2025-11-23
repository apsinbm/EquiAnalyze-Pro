import React, { useRef, useState } from 'react';

interface VideoUploaderProps {
  onFileSelect: (file: File) => void;
  onError?: (message: string) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onFileSelect, onError }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
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

  const handleFile = (file: File) => {
    setError(null);
    if (file.type.startsWith('video/')) {
      onFileSelect(file);
    } else {
      const message = "Please upload a valid video file.";
      setError(message);
      onError?.(message);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto text-center px-4">
      <div
        className={`relative h-44 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-colors cursor-pointer
          ${dragActive ? "border-equi-gold bg-equi-gold/5" : "border-equi-slate/30 bg-equi-navy/50 hover:border-equi-gold/50"}`}
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

      {error && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <p className="mt-3 text-xs text-equi-slate/60">Max recommended: 50MB</p>
    </div>
  );
};