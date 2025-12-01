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

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    console.log('Uploading file to Gemini:', file.name, fileSizeMB, 'MB', file.type);

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

    // Step 2: Upload the entire file
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
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadResponse.status}` },
        { status: 500 }
      );
    }

    const fileInfo = await uploadResponse.json();
    console.log('File uploaded:', fileInfo.file?.uri, 'State:', fileInfo.file?.state);

    // Step 3: Wait for file to be processed (state = ACTIVE)
    const fileName = fileInfo.file?.name;
    let fileState = fileInfo.file?.state;
    let fileUri = fileInfo.file?.uri;
    let mimeType = fileInfo.file?.mimeType || file.type;
    let attempts = 0;

    while (fileState === 'PROCESSING' && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${GEMINI_API_KEY}`
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        fileState = statusData.state;
        fileUri = statusData.uri || fileUri;
        mimeType = statusData.mimeType || mimeType;
        console.log('File state:', fileState, 'attempt:', attempts + 1);
      }
      attempts++;
    }

    if (fileState !== 'ACTIVE') {
      return NextResponse.json(
        { error: `File processing failed. State: ${fileState}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      fileUri,
      mimeType,
    });

  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
