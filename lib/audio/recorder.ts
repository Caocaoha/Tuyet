// ============================================================
// lib/audio/recorder.ts — MediaRecorder Wrapper
// ============================================================
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Try preferred formats, fallback to browser default
      const mimeType = this.getSupportedMimeType();
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      this.audioChunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every 1 second
    } catch (error) {
      throw new Error('Không thể truy cập microphone: ' + (error as Error).message);
    }
  }

  stop(): Promise<{ blob: Blob; duration: number; mimeType: string }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recorder chưa được khởi tạo'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const duration = Math.floor((Date.now() - this.startTime) / 1000);
        const blob = new Blob(this.audioChunks, { 
          type: this.mediaRecorder!.mimeType 
        });
        
        this.cleanup();
        
        resolve({ 
          blob, 
          duration,
          mimeType: this.mediaRecorder!.mimeType
        });
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return ''; // Let browser choose default
  }

  getDuration(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}
