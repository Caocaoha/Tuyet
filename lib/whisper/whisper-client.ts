// lib/whisper/client.ts
import type { TranscriptRecord, ConfidenceSegment } from '@/lib/audio/db';
import { getAuthHeaders } from '@/lib/api-client';

export interface WhisperResponse {
  transcript: string;
  detectedLanguage: 'vi' | 'en';
  segments: ConfidenceSegment[];
}

export async function transcribeAudio(
  audioBlob: Blob,
  mimeType: string
): Promise<WhisperResponse> {
  const base64Audio = await blobToBase64(audioBlob);

  let response: Response;
  try {
    response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),    // ← auth header
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ audio: base64Audio, mimeType }),
      signal: AbortSignal.timeout(30000)  // 30s timeout cho transcription
    });
  } catch (fetchError) {
    throw new Error(`Network error: ${(fetchError as Error).message}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Transcription failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
