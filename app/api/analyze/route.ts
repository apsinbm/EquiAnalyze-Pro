import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ANALYSIS_PROMPT = `You are an expert equestrian biomechanics analyst specializing in show jumping.

Analyze this video and detect ALL jumps present. For each jump, break it down into phases and provide detailed analysis.

Return a JSON object with this exact structure:
{
  "jumps": [
    {
      "jumpNumber": 1,
      "startTime": 0.0,
      "endTime": 5.5,
      "phases": [
        {
          "startTime": 0.0,
          "endTime": 1.5,
          "phaseName": "Approach",
          "riderAnalysis": "Detailed rider position and technique...",
          "horseAnalysis": "Detailed horse movement and balance...",
          "physicsNote": "Physics explanation of this phase...",
          "score": 8
        }
      ],
      "overallScore": 7.5
    }
  ],
  "overallSummary": "Overall performance summary...",
  "suggestedImprovements": ["Improvement 1", "Improvement 2"],
  "movementName": "Show Jumping",
  "similarProRider": "Name of similar professional rider"
}

For each jump, include these phases as applicable:
- Approach (final strides before takeoff)
- Takeoff (moment of leaving the ground)
- Flight/Bascule (arc over the fence)
- Landing (front legs touch down)
- Getaway (first strides after landing)

Score each phase 1-10. Be specific about timing in seconds.`;

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { fileUri, mimeType } = body;

    if (!fileUri || !mimeType) {
      return NextResponse.json(
        { error: 'fileUri and mimeType are required' },
        { status: 400 }
      );
    }

    console.log('Analyzing file:', fileUri, mimeType);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: ANALYSIS_PROMPT },
                {
                  file_data: {
                    mime_type: mimeType,
                    file_uri: fileUri,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('No text in response:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: 'No response from Gemini' },
        { status: 500 }
      );
    }

    const result = JSON.parse(text);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
