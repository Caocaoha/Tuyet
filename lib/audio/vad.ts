// lib/audio/vad.ts
export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private silenceThreshold: number;
  private silenceDurationMs: number;
  private lastVoiceTime: number = 0;
  private checkInterval: number | null = null;
  private onSilenceDetected: (() => void) | null = null;
  private triggered: boolean = false; // ← chống gọi callback nhiều lần

  constructor(silenceDurationMs: number = 10000, silenceThreshold: number = 30) {
    this.silenceDurationMs = silenceDurationMs; // 10s mặc định
    this.silenceThreshold = silenceThreshold;
  }

  async start(stream: MediaStream, onSilence: () => void): Promise<void> {
    this.onSilenceDetected = onSilence;
    this.triggered = false;
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;

    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.lastVoiceTime = Date.now();

    this.checkInterval = window.setInterval(() => {
      this.checkVoiceActivity();
    }, 200); // check mỗi 200ms thay vì 100ms
  }

  stop(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.triggered = false;
  }

  private checkVoiceActivity(): void {
    if (!this.analyser || !this.dataArray || this.triggered) return;

    this.analyser.getByteTimeDomainData(this.dataArray);

    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += Math.abs(this.dataArray[i] - 128);
    }
    const average = sum / this.dataArray.length;

    if (average > this.silenceThreshold) {
      this.lastVoiceTime = Date.now();
    } else {
      const silenceDuration = Date.now() - this.lastVoiceTime;
      if (silenceDuration >= this.silenceDurationMs && this.onSilenceDetected) {
        this.triggered = true; // ← chỉ trigger 1 lần
        this.onSilenceDetected();
      }
    }
  }
}
