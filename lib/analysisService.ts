import type { AnalysisResult } from '@/types';

export const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeVideo = async (
  base64Video: string,
  mimeType: string
): Promise<AnalysisResult> => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoData: base64Video,
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
