import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const { fileName, fileSize, mimeType } = await req.json();

    if (!fileName || !fileSize || !mimeType) {
      return NextResponse.json(
        { error: 'fileName, fileSize, and mimeType are required' },
        { status: 400 }
      );
    }

    console.log('Starting upload:', fileName, fileSize, 'bytes', mimeType);

    // Start resumable upload with Gemini
    const startResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': fileSize.toString(),
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: {
            display_name: fileName,
          },
        }),
      }
    );

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      console.error('Gemini upload start error:', startResponse.status, errorText);
      return NextResponse.json(
        { error: `Failed to start upload: ${startResponse.status}` },
        { status: 500 }
      );
    }

    const uploadUrl = startResponse.headers.get('X-Goog-Upload-URL');
    if (!uploadUrl) {
      return NextResponse.json(
        { error: 'No upload URL returned from Gemini' },
        { status: 500 }
      );
    }

    return NextResponse.json({ uploadUrl });

  } catch (error) {
    console.error('Upload start error:', error);
    const message = error instanceof Error ? error.message : 'Upload start failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
