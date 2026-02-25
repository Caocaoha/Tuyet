// lib/hooks/useRecorder.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { AudioRecorder } from '@/lib/audio/recorder';
import { saveAudio, saveTranscript, getDb } from '@/lib/audio/db';
import { transcribeAudio } from '@/lib/whisper/client';
import { saveNoteToObsidian } from '@/lib/obsidian/bridge';
import { detectTags, removeTagCommands } from '@/lib/tags/detector';

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'saved' | 'error';

const VOICE_STOP_KEYWORDS = ['save', 'stop'];

function getUsername(): string {
  if (typeof document === 'undefined') return 'default';
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('tuyet_user='))
    ?.split('=')[1] || 'default';
}

export function useRecorder() {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [obsidianSaved, setObsidianSaved] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [voiceCommandDetected, setVoiceCommandDetected] = useState<string | null>(null);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const stoppingRef = useRef(false);
  const voiceCommandRef = useRef(false);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      setDuration(0);
      setObsidianSaved(false);
      setOfflineSaved(false);
      setVoiceCommandDetected(null);
      stoppingRef.current = false;
      voiceCommandRef.current = false;

      const recorder = new AudioRecorder();
      await recorder.start();
      recorderRef.current = recorder;

      timerRef.current = window.setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

      if ('webkitSpeechRecognition' in window) {
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'vi-VN';
        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const text = event.results[i][0].transcript.toLowerCase().trim();
            if (!voiceCommandRef.current && VOICE_STOP_KEYWORDS.some(kw => text.includes(kw))) {
              voiceCommandRef.current = true;
              setVoiceCommandDetected(event.results[i][0].transcript.trim());
              setTimeout(() => stopRecording(), 300);
              return;
            }
            if (event.results[i].isFinal) {
              setTranscript(prev => (prev + ' ' + event.results[i][0].transcript).trim());
            }
          }
        };
        recognition.onerror = () => {};
        try { recognition.start(); } catch {}
        recognitionRef.current = recognition;
      }

      setStatus('recording');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (stoppingRef.current || !recorderRef.current) return;
    stoppingRef.current = true;
    setStatus('processing');

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;

    let blobData: { blob: Blob; duration: number; mimeType: string } | null = null;
    let timestamp = '';
    try {
      const result = await recorderRef.current.stop();
      blobData = result;
      recorderRef.current = null;

      const now = new Date();
      timestamp = now.toISOString();
      const username = getUsername();

      // Offline path — save audio locally and mark as pending
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await saveAudio(username, blobData.blob, blobData.mimeType, blobData.duration);
        setOfflineSaved(true);
        setStatus('saved');
        return;
      }

      // Online path
      const audioId = await saveAudio(username, blobData.blob, blobData.mimeType, blobData.duration);

      // Transcribe
      const whisperResult = await transcribeAudio(blobData.blob, blobData.mimeType);
      const detectedTags = detectTags(whisperResult.transcript);
      const cleanTranscript = removeTagCommands(whisperResult.transcript);
      setTranscript(cleanTranscript);

      const transcriptId = await saveTranscript(username, audioId, cleanTranscript, 'whisper');

      // Update transcript with intelligence data
      const db = await getDb(username);
      await db.transcripts.update(transcriptId, {
        autoTags: detectedTags,
        intelligenceApplied: true,
      });

      // Lưu vào Obsidian
      const obsidianResult = await saveNoteToObsidian(cleanTranscript, detectedTags, now);

      if (obsidianResult.success) {
        await db.transcripts.update(transcriptId, {
          savedToObsidian: true,
          obsidianFilePath: obsidianResult.filePath || '',
        });
        setObsidianSaved(true);
      } else {
        setError(`Đã lưu local. Obsidian lỗi: ${obsidianResult.error}`);
      }

      setStatus('saved');
    } catch (err) {
      const isNetworkError =
        !navigator.onLine ||
        (err as Error).message?.toLowerCase().includes('fetch') ||
        (err as Error).name === 'TypeError';
      if (blobData && isNetworkError) {
        const username = getUsername();
        await saveAudio(username, blobData.blob, blobData.mimeType, blobData.duration);
        setOfflineSaved(true);
        setStatus('saved');
      } else {
        setError('Lỗi: ' + (err as Error).message);
        setStatus('error');
        stoppingRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, []);

  return {
    isRecording: status === 'recording',
    isProcessing: status === 'processing',
    status, duration, transcript, error, obsidianSaved, offlineSaved,
    voiceCommandDetected,
    startRecording, stopRecording
  };
}
