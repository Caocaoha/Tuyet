// lib/hooks/useOfflineQueue.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getOfflineQueue,
  removeFromOfflineQueue,
  incrementRetryCount,
  saveTranscript,
} from '@/lib/audio/db';
import { transcribeAudio } from '@/lib/whisper/client';
import { saveNoteToObsidian } from '@/lib/obsidian/bridge';
import { detectTags, removeTagCommands } from '@/lib/tags/detector';

const MAX_RETRIES = 5;

export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    const queue = await getOfflineQueue();
    setPendingCount(queue.length);
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const queue = await getOfflineQueue();
    if (queue.length === 0) return;

    isProcessingRef.current = true;
    setIsProcessing(true);

    for (const item of queue) {
      try {
        // Transcribe
        const whisperResult = await transcribeAudio(item.audioBlob, item.mimeType);
        const detectedTags = detectTags(whisperResult.transcript);
        const cleanTranscript = removeTagCommands(whisperResult.transcript);

        // Save transcript to IndexedDB
        const transcriptId = await saveTranscript({
          audioId: item.audioId,
          transcript: cleanTranscript,
          detectedLanguage: whisperResult.detectedLanguage,
          tags: detectedTags,
          lowConfidenceSegments: whisperResult.segments.filter(s => s.confidence < 0.7),
          savedToObsidian: false,
          obsidianFilePath: '',
          createdAt: item.timestamp,
        });

        // Update audio record
        const { db } = await import('@/lib/audio/db');
        await db.audioRecords.update(item.audioId, { transcriptId, status: 'processing' });

        // Sync to Obsidian
        const obsidianResult = await saveNoteToObsidian(
          cleanTranscript, detectedTags, new Date(item.timestamp)
        );

        if (obsidianResult.success) {
          await db.transcripts.update(transcriptId, {
            savedToObsidian: true,
            obsidianFilePath: obsidianResult.filePath || '',
          });
        }
        await db.audioRecords.update(item.audioId, { status: 'saved' });

        await removeFromOfflineQueue(item.id);
      } catch {
        if (item.retryCount >= MAX_RETRIES - 1) {
          await removeFromOfflineQueue(item.id);
          const { db } = await import('@/lib/audio/db');
          await db.audioRecords.update(item.audioId, { status: 'error' });
        } else {
          await incrementRetryCount(item.id);
        }
      }
    }

    isProcessingRef.current = false;
    setIsProcessing(false);
    refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();
    window.addEventListener('online', processQueue);
    return () => window.removeEventListener('online', processQueue);
  }, [refreshCount, processQueue]);

  return { pendingCount, isProcessing, processQueue };
}
