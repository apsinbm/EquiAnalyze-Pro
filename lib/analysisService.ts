import type { AnalysisResult } from '@/types';

type UploadProgressCallback = (stage: string, progress: number) => void;

const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks (under Vercel's 4.5MB limit)

export const uploadToGemini = async (
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ fileUri: string; mimeType: string }> => {
  onProgress?.('Starting upload...', 5);

  // Step 1: Start the upload session (server-side, keeps API key secure)
  const startResponse = await fetch('/api/upload/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    }),
  });

  if (!startResponse.ok) {
    const errorData = await startResponse.json().catch(() => ({ error: 'Failed to start upload' }));
    throw new Error(errorData.error || 'Failed to start upload');
  }

  const { uploadUrl } = await startResponse.json();

  onProgress?.('Uploading video...', 10);

  // Step 2: Upload in chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let offset = 0;
  let fileName = '';
  let fileUri = '';
  let mimeType = file.type;

  for (let i = 0; i < totalChunks; i++) {
    const isLast = i === totalChunks - 1;
    const chunkEnd = Math.min(offset + CHUNK_SIZE, file.size);
    const chunk = file.slice(offset, chunkEnd);

    const formData = new FormData();
    formData.append('uploadUrl', uploadUrl);
    formData.append('chunk', chunk);
    formData.append('offset', offset.toString());
    formData.append('totalSize', file.size.toString());
    formData.append('isLast', isLast.toString());

    const chunkResponse = await fetch('/api/upload/chunk', {
      method: 'POST',
      body: formData,
    });

    if (!chunkResponse.ok) {
      const errorData = await chunkResponse.json().catch(() => ({ error: 'Chunk upload failed' }));
      throw new Error(errorData.error || 'Chunk upload failed');
    }

    const chunkResult = await chunkResponse.json();

    if (chunkResult.complete) {
      fileName = chunkResult.fileName;
      fileUri = chunkResult.fileUri;
      mimeType = chunkResult.mimeType || file.type;
    }

    offset = chunkEnd;
    const uploadProgress = 10 + Math.round((offset / file.size) * 40);
    onProgress?.('Uploading video...', uploadProgress);
  }

  onProgress?.('Processing video...', 55);

  // Step 3: Wait for file to be processed (state = ACTIVE)
  let state = 'PROCESSING';
  let attempts = 0;
  while (state === 'PROCESSING' && attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const statusResponse = await fetch('/api/upload/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName }),
    });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      state = statusData.state;
      fileUri = statusData.fileUri || fileUri;
      mimeType = statusData.mimeType || mimeType;
      console.log('File state:', state, 'attempt:', attempts + 1);
      onProgress?.('Processing video...', 55 + Math.min(attempts, 15));
    }
    attempts++;
  }

  if (state !== 'ACTIVE') {
    throw new Error(`File processing failed or timed out. State: ${state}`);
  }

  return { fileUri, mimeType };
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
