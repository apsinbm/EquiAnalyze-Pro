import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

type ProgressCallback = (progress: CompressionProgress) => void;

export type CompressionProgress = {
  stage: 'loading' | 'compressing' | 'done' | 'error' | 'skipped';
  percent: number;
  message: string;
};

const MAX_HEIGHT = 480;
const MAX_FILE_SIZE_MB = 3; // Keep under Vercel's 4.5MB limit after base64 encoding

let ffmpeg: FFmpeg | null = null;

type VideoMetadata = {
  width: number;
  height: number;
  duration: number;
};

const getVideoMetadata = (file: File): Promise<VideoMetadata> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video metadata'));
    };
  });
};

const shouldCompress = (metadata: VideoMetadata, fileSizeMB: number): boolean => {
  const isHighRes = metadata.height > MAX_HEIGHT;
  const isLargeFile = fileSizeMB > MAX_FILE_SIZE_MB;
  return isHighRes || isLargeFile;
};

const loadFFmpeg = async (onProgress: ProgressCallback): Promise<FFmpeg> => {
  if (ffmpeg && ffmpeg.loaded) {
    return ffmpeg;
  }

  ffmpeg = new FFmpeg();

  ffmpeg.on('log', ({ message }) => {
    console.log('[ffmpeg]', message);
  });

  onProgress({
    stage: 'loading',
    percent: 0,
    message: 'Loading video processor...',
  });

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';

  try {
    await ffmpeg.load({
      coreURL: `${baseURL}/ffmpeg-core.js`,
      wasmURL: `${baseURL}/ffmpeg-core.wasm`,
    });
  } catch (err) {
    console.error('FFmpeg load error:', err);
    throw new Error('Failed to load video processor. Your browser may not support this feature.');
  }

  onProgress({
    stage: 'loading',
    percent: 100,
    message: 'Video processor ready',
  });

  return ffmpeg;
};

export const compressVideo = async (
  file: File,
  onProgress: ProgressCallback
): Promise<File> => {
  const fileSizeMB = file.size / 1024 / 1024;

  onProgress({
    stage: 'loading',
    percent: 0,
    message: 'Checking video...',
  });

  const metadata = await getVideoMetadata(file);
  console.log(`Video: ${metadata.width}x${metadata.height}, ${fileSizeMB.toFixed(1)}MB`);

  if (!shouldCompress(metadata, fileSizeMB)) {
    console.log(`Skipping compression: ${metadata.height}p <= ${MAX_HEIGHT}p and ${fileSizeMB.toFixed(1)}MB <= ${MAX_FILE_SIZE_MB}MB`);
    onProgress({
      stage: 'skipped',
      percent: 100,
      message: `Video already optimized (${metadata.height}p, ${fileSizeMB.toFixed(1)}MB)`,
    });
    return file;
  }

  console.log(`Compressing: ${metadata.height}p > ${MAX_HEIGHT}p or ${fileSizeMB.toFixed(1)}MB > ${MAX_FILE_SIZE_MB}MB`);

  const ff = await loadFFmpeg(onProgress);

  const inputName = 'input' + getExtension(file.name);
  const outputName = 'output.mp4';

  onProgress({
    stage: 'compressing',
    percent: 0,
    message: 'Preparing video...',
  });

  await ff.writeFile(inputName, await fetchFile(file));

  let lastPercent = 0;
  ff.on('progress', ({ progress }) => {
    const percent = Math.round(progress * 100);
    if (percent > lastPercent) {
      lastPercent = percent;
      onProgress({
        stage: 'compressing',
        percent,
        message: `Compressing: ${percent}%`,
      });
    }
  });

  await ff.exec([
    '-i',
    inputName,
    '-vf',
    'scale=-2:480',
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-crf',
    '28',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    outputName,
  ]);

  const data = await ff.readFile(outputName);

  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  onProgress({
    stage: 'done',
    percent: 100,
    message: 'Compression complete',
  });

  const compressedBlob = new Blob([data], { type: 'video/mp4' });
  const compressedFile = new File(
    [compressedBlob],
    file.name.replace(/\.[^.]+$/, '_compressed.mp4'),
    { type: 'video/mp4' }
  );

  console.log(
    `Compressed ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB`
  );

  return compressedFile;
};

const getExtension = (filename: string): string => {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : '.mp4';
};

export const getCompressionStats = (
  original: File,
  compressed: File
): { originalMB: string; compressedMB: string; reduction: string } => {
  const originalMB = (original.size / 1024 / 1024).toFixed(1);
  const compressedMB = (compressed.size / 1024 / 1024).toFixed(1);
  const reduction = (
    ((original.size - compressed.size) / original.size) *
    100
  ).toFixed(0);
  return { originalMB, compressedMB, reduction };
};
