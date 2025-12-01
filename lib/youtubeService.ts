export const downloadFromYouTube = async (url: string): Promise<File> => {
  const response = await fetch('/api/youtube', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
    throw new Error(errorData.error || 'Failed to download video');
  }

  const blob = await response.blob();
  const filename = getFilenameFromUrl(url) || 'youtube-video.mp4';

  return new File([blob], filename, { type: 'video/mp4' });
};

const getFilenameFromUrl = (url: string): string | null => {
  const match = url.match(/[?&]v=([^&]+)/);
  if (match) {
    return `${match[1]}.mp4`;
  }

  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) {
    return `${shortMatch[1]}.mp4`;
  }

  return null;
};
