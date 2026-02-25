'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface MicButtonProps {
  onRecordingComplete: (blob: Blob, mimeType: string, duration: number) => void;
  onError: (error: string) => void;
}

export default function MicButton({ onRecordingComplete, onError }: MicButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const stoppingRef = useRef(false);
  const recorderRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current) {
        recorderRef.current.cleanup?.();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const { AudioRecorder } = await import('@/lib/recorder');
      const recorder = new AudioRecorder();
      await recorder.start();
      
      recorderRef.current = recorder;
      setIsRecording(true);
      setDuration(0);
      stoppingRef.current = false;

      timerRef.current = setInterval(() => {
        if (recorderRef.current) {
          setDuration(recorderRef.current.getDuration());
        }
      }, 1000);
    } catch (err) {
      onError(`Failed to start recording: ${(err as Error).message}`);
    }
  }, [onError]);

  const pauseRecording = useCallback(() => {
    if (recorderRef.current && !isPaused) {
      recorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isPaused]);

  const resumeRecording = useCallback(() => {
    if (recorderRef.current && isPaused) {
      recorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        if (recorderRef.current) {
          setDuration(recorderRef.current.getDuration());
        }
      }, 1000);
    }
  }, [isPaused]);

  const stopRecording = useCallback(async () => {
    if (stoppingRef.current || !recorderRef.current) return;
    
    stoppingRef.current = true;
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const { blob, mimeType, duration } = await recorderRef.current.stop();
      recorderRef.current = null;
      onRecordingComplete(blob, mimeType, duration);
    } catch (err) {
      onError(`Failed to stop recording: ${(err as Error).message}`);
    }
  }, [onRecordingComplete, onError]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording) {
    return (
      <button
        onClick={startRecording}
        className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 text-white flex items-center justify-center shadow-lg transition-colors"
        aria-label="Start recording"
      >
        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
        </svg>
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-2xl font-mono text-gray-700">
        {formatDuration(duration)}
      </div>
      
      <div className="flex gap-4">
        {!isPaused ? (
          <button
            onClick={pauseRecording}
            className="w-16 h-16 rounded-full bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white flex items-center justify-center shadow-lg transition-colors"
            aria-label="Pause recording"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <button
            onClick={resumeRecording}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white flex items-center justify-center shadow-lg transition-colors"
            aria-label="Resume recording"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        
        <button
          onClick={stopRecording}
          className="w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-colors"
          aria-label="Stop recording"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
