import type { AnalysisResult } from '@/types';

type UploadProgressCallback = (stage: string, progress: number) => void;

export const uploadToGemini = async (
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ fileUri: string; mimeType: string }> => {
  onProgress?.('Uploading video...', 10);

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(errorData.error || 'Failed to upload video');
  }

  onProgress?.('Processing video...', 60);

  const result = await response.json();

  if (!result.fileUri) {
    throw new Error('No file URI returned from upload');
  }

  return {
    fileUri: result.fileUri,
    mimeType: result.mimeType,
  };
};

export const analyzeVideo = async (
  fileUri: string,
  mimeType: string
): Promise<AnalysisResult> => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileUri,
      mimeType,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Analysis failed' }));
    throw new Error(errorData.error || 'Failed to analyze video');
  }

  const result = await response.json();

  if (!isValidAnalysisResult(result)) {
    throw new Error('Invalid response structure from analysis');
  }

  return result;
};

const isValidAnalysisResult = (data: unknown): data is AnalysisResult => {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.jumps) &&
    typeof d.overallSummary === 'string' &&
    Array.isArray(d.suggestedImprovements) &&
    typeof d.movementName === 'string' &&
    typeof d.similarProRider === 'string'
  );
};
