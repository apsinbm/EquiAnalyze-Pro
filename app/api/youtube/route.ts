import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

const MAX_DURATION_SECONDS = 300; // 5 minutes

const isValidYouTubeUrl = (url: string): boolean => {
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+/;
  return pattern.test(url);
};

const getVideoDuration = async (url: string): Promise<number> => {
  try {
    const { stdout } = await execAsync(
      `yt-dlp --get-duration "${url}"`,
      { timeout: 30000 }
    );
    const parts = stdout.trim().split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parts[0] || 0;
  } catch {
    return 0;
  }
};

export async function POST(req: NextRequest) {
  const tempFile = join(tmpdir(), `yt-${Date.now()}.mp4`);

  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!isValidYouTubeUrl(url)) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Check duration before downloading
    const duration = await getVideoDuration(url);
    if (duration > MAX_DURATION_SECONDS) {
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      return NextResponse.json(
        { error: `Video too long (${minutes}:${seconds.toString().padStart(2, '0')}). Maximum duration is 5 minutes to control API costs.` },
        { status: 400 }
      );
    }

    // Download at 720p max to reduce file size and API costs
    // Format: best video up to 720p + best audio, merged to mp4
    const command = `yt-dlp -f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best" --merge-output-format mp4 -o "${tempFile}" "${url}"`;

    await execAsync(command, { timeout: 120000 }); // 2 minute timeout

    // Read the downloaded file
    const videoBuffer = await readFile(tempFile);

    // Clean up temp file
    await unlink(tempFile).catch(() => {});

    // Extract video ID for filename
    const videoIdMatch = url.match(/(?:v=|youtu\.be\/|shorts\/)([^&?/]+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : 'video';

    return new NextResponse(videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${videoId}.mp4"`,
      },
    });
  } catch (error) {
    // Clean up temp file on error
    await unlink(tempFile).catch(() => {});

    console.error('YouTube download error:', error);
    const message = error instanceof Error ? error.message : 'Failed to download video';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
