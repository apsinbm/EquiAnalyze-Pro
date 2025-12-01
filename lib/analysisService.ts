import type { AnalysisResult } from '@/types';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

type UploadProgressCallback = (stage: string, progress: number) => void;

export const uploadToGemini = async (
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ fileUri: string; mimeType: string }> => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  onProgress?.('Starting upload...', 10);

  // Step 1: Start resumable upload
  const startResponse = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': file.size.toString(),
        'X-Goog-Upload-Header-Content-Type': file.type,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: {
          display_name: file.name,
        },
      }),
    }
  );

  if (!startResponse.ok) {
    const errorText = await startResponse.text();
    console.error('Gemini upload start error:', startResponse.status, errorText);
    throw new Error(`Failed to start upload: ${startResponse.status}`);
  }

  const uploadUrl = startResponse.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) {
    throw new Error('No upload URL returned from Gemini');
  }

  onProgress?.('Uploading video...', 30);

  // Step 2: Upload the file data
  const fileBuffer = await file.arrayBuffer();
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': file.size.toString(),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: fileBuffer,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('Gemini upload error:', uploadResponse.status, errorText);
    throw new Error(`Failed to upload file: ${uploadResponse.status}`);
  }

  const fileInfo = await uploadResponse.json();
  console.log('File uploaded successfully:', fileInfo.file?.uri);

  onProgress?.('Processing video...', 60);

  // Step 3: Wait for file to be processed (state = ACTIVE)
  const fileName = fileInfo.file?.name;
  if (!fileName) {
    throw new Error('No file name returned from upload');
  }

  // Poll until file is active (max 60 seconds)
  let fileState = fileInfo.file?.state;
  let attempts = 0;
  while (fileState === 'PROCESSING' && attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const statusResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${GEMINI_API_KEY}`
    );

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      fileState = statusData.state;
      console.log('File state:', fileState, 'attempt:', attempts + 1);
      onProgress?.('Processing video...', 60 + Math.min(attempts, 30));
    }
    attempts++;
  }

  if (fileState !== 'ACTIVE') {
    throw new Error(`File processing failed or timed out. State: ${fileState}`);
  }

  return {
    fileUri: fileInfo.file?.uri,
    mimeType: fileInfo.file?.mimeType || file.type,
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
