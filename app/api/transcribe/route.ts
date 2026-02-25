import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audio, mimeType, engine = 'soniox' } = body;

    if (!audio || typeof audio !== 'string') {
      return NextResponse.json(
        { error: 'Audio data (base64) is required' },
        { status: 400 }
      );
    }

    const enableSoniox = process.env.NEXT_PUBLIC_ENABLE_SONIOX === 'true';
    const actualEngine = enableSoniox && engine === 'soniox' ? 'soniox' : 'whisper';

    if (actualEngine === 'soniox') {
      const sonioxKey = process.env.SONIOX_API_KEY;
      if (!sonioxKey) {
        return NextResponse.json(
          { error: 'Soniox API key not configured' },
          { status: 500 }
        );
      }

      const audioBuffer = Buffer.from(audio, 'base64');

      let response: Response;
      try {
        response = await fetch('https://api.soniox.com/transcribe-async', {
          method: 'POST',
          headers: {
            'Authorization': `ApiKey ${sonioxKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio: audio,
            model: 'vi_v2',
            enable_streaming: false,
          }),
          signal: AbortSignal.timeout(60000),
        });
      } catch (fetchErr) {
        return NextResponse.json(
          { error: `Soniox unreachable: ${(fetchErr as Error).message}` },
          { status: 503 }
        );
      }

      if (!response.ok) {
        const text = await response.text();
        return NextResponse.json(
          { error: `Soniox error ${response.status}: ${text}` },
          { status: 502 }
        );
      }

      const result = await response.json();
      return NextResponse.json({
        transcript: result.transcript || result.text || '',
        engine: 'soniox',
        confidence: result.confidence,
      });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: openaiKey });

    const audioBuffer = Buffer.from(audio, 'base64');
    const file = new File([audioBuffer], 'audio.webm', { type: mimeType });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'vi',
    });

    return NextResponse.json({
      transcript: transcription.text,
      engine: 'whisper',
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Transcription failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
