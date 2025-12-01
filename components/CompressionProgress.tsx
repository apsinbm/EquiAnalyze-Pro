'use client';

import type { CompressionProgress as CompressionProgressType } from '@/lib/videoCompressor';

interface CompressionProgressProps {
  progress: CompressionProgressType;
  originalSize?: number;
}

export const CompressionProgress: React.FC<CompressionProgressProps> = ({
  progress,
  originalSize,
}) => {
  const { stage, percent, message } = progress;

  const isLoading = stage === 'loading';
  const isCompressing = stage === 'compressing';
  const isSkipped = stage === 'skipped';

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {/* Animated icon */}
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 border-4 border-equi-slate/20 rounded-full" />
        {!isSkipped && (
          <div
            className="absolute inset-0 border-4 border-equi-accent rounded-full border-t-transparent animate-spin"
            style={{
              animationDuration: isLoading ? '1.5s' : '1s',
            }}
          />
        )}
        {isSkipped && (
          <div className="absolute inset-0 border-4 border-green-500 rounded-full" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          {isSkipped ? (
            <span className="text-2xl">✓</span>
          ) : isLoading ? (
            <span className="text-2xl">📦</span>
          ) : (
            <span className="text-2xl">🎬</span>
          )}
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold text-white mb-2">
        {isSkipped ? 'Video Ready' : isLoading ? 'Checking Video...' : 'Compressing Video'}
      </h2>

      {/* Progress message */}
      <p className="text-equi-slate text-sm mb-4">{message}</p>

      {/* Progress bar */}
      {isCompressing && (
        <div className="w-full max-w-xs">
          <div className="h-2 bg-equi-navy rounded-full overflow-hidden">
            <div
              className="h-full bg-equi-accent transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-center text-equi-slate text-xs mt-2">
            {percent}% complete
          </p>
        </div>
      )}

      {/* Original file size info */}
      {originalSize && (
        <p className="text-equi-slate/60 text-xs mt-4">
          Original: {(originalSize / 1024 / 1024).toFixed(1)} MB
        </p>
      )}
    </div>
  );
};
