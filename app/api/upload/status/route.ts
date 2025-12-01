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

    const { fileName } = await req.json();

    if (!fileName) {
      return NextResponse.json(
        { error: 'fileName is required' },
        { status: 400 }
      );
    }

    const statusResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${GEMINI_API_KEY}`
    );

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('Gemini status check error:', statusResponse.status, errorText);
      return NextResponse.json(
        { error: `Failed to check status: ${statusResponse.status}` },
        { status: 500 }
      );
    }

    const statusData = await statusResponse.json();
    console.log('File status:', statusData.state);

    return NextResponse.json({
      state: statusData.state,
      fileUri: statusData.uri,
      mimeType: statusData.mimeType,
    });

  } catch (error) {
    console.error('Status check error:', error);
    const message = error instanceof Error ? error.message : 'Status check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
