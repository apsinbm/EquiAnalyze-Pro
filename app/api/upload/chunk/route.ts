import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const uploadUrl = formData.get('uploadUrl') as string;
    const chunk = formData.get('chunk') as Blob;
    const offset = parseInt(formData.get('offset') as string, 10);
    const totalSize = parseInt(formData.get('totalSize') as string, 10);
    const isLast = formData.get('isLast') === 'true';

    if (!uploadUrl || !chunk || isNaN(offset) || isNaN(totalSize)) {
      return NextResponse.json(
        { error: 'uploadUrl, chunk, offset, and totalSize are required' },
        { status: 400 }
      );
    }

    const chunkBuffer = await chunk.arrayBuffer();
    const chunkSize = chunkBuffer.byteLength;

    console.log(`Uploading chunk: offset=${offset}, size=${chunkSize}, isLast=${isLast}`);

    const command = isLast ? 'upload, finalize' : 'upload';

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': chunkSize.toString(),
        'X-Goog-Upload-Offset': offset.toString(),
        'X-Goog-Upload-Command': command,
      },
      body: chunkBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Gemini chunk upload error:', uploadResponse.status, errorText);
      return NextResponse.json(
        { error: `Failed to upload chunk: ${uploadResponse.status}` },
        { status: 500 }
      );
    }

    if (isLast) {
      const fileInfo = await uploadResponse.json();
      console.log('Upload complete:', fileInfo.file?.uri);

      return NextResponse.json({
        complete: true,
        fileUri: fileInfo.file?.uri,
        fileName: fileInfo.file?.name,
        mimeType: fileInfo.file?.mimeType,
        state: fileInfo.file?.state,
      });
    }

    return NextResponse.json({ complete: false, uploadedBytes: offset + chunkSize });

  } catch (error) {
    console.error('Chunk upload error:', error);
    const message = error instanceof Error ? error.message : 'Chunk upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
