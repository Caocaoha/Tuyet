// lib/hooks/useRecorder.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { AudioRecorder } from '@/lib/audio/recorder';
import { saveAudioRecord, saveTranscript, saveToOfflineQueue } from '@/lib/audio/db';
import { transcribeAudio } from '@/lib/whisper/client';
import { saveNoteToObsidian } from '@/lib/obsidian/bridge';
import { detectTags, removeTagCommands } from '@/lib/tags/detector';

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'saved' | 'error';

const VOICE_STOP_KEYWORDS = ['save', 'stop'];

export function useRecorder() {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [obsidianSaved, setObsidianSaved] = useState(false);
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
            // Voice command detection — scan all results (interim + final)
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

    try {
      const { blob, duration, mimeType } = await recorderRef.current.stop();
      recorderRef.current = null;

      const now = new Date();
      const timestamp = now.toISOString();

      // Offline path — queue for later processing
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await saveToOfflineQueue(blob, mimeType, duration, timestamp);
        setError('Offline — ghi âm đã lưu. Sẽ xử lý khi có mạng.');
        setStatus('saved');
        return;
      }

      // Online path
      const audioId = await saveAudioRecord({
        audioBlob: blob, duration,
        timestamp, status: 'processing', transcriptId: ''
      });

      // Transcribe
      const whisperResult = await transcribeAudio(blob, mimeType);
      const detectedTags = detectTags(whisperResult.transcript);
      const cleanTranscript = removeTagCommands(whisperResult.transcript);
      setTranscript(cleanTranscript);

      // Lưu transcript với createdAt
      const transcriptId = await saveTranscript({
        audioId,
        transcript: cleanTranscript,
        detectedLanguage: whisperResult.detectedLanguage,
        tags: detectedTags,
        lowConfidenceSegments: whisperResult.segments.filter(s => s.confidence < 0.7),
        savedToObsidian: false,
        obsidianFilePath: '',
        createdAt: timestamp,
      });

      const { db } = await import('@/lib/audio/db');
      await db.audioRecords.update(audioId, { transcriptId });

      // Lưu vào Obsidian
      const obsidianResult = await saveNoteToObsidian(cleanTranscript, detectedTags, now);

      if (obsidianResult.success) {
        await db.transcripts.update(transcriptId, {
          savedToObsidian: true,
          obsidianFilePath: obsidianResult.filePath || ''
        });
        await db.audioRecords.update(audioId, { status: 'saved' });
        setObsidianSaved(true);
      } else {
        await db.audioRecords.update(audioId, { status: 'saved' });
        setError(`Đã lưu local. Obsidian lỗi: ${obsidianResult.error}`);
      }

      setStatus('saved');
    } catch (err) {
      setError('Lỗi: ' + (err as Error).message);
      setStatus('error');
      stoppingRef.current = false;
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
    status, duration, transcript, error, obsidianSaved,
    voiceCommandDetected,
    startRecording, stopRecording
  };
}
