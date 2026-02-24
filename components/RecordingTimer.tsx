// ============================================================
// components/RecordingTimer.tsx
// ============================================================
interface RecordingTimerProps {
  duration: number; // in seconds
}

export default function RecordingTimer({ duration }: RecordingTimerProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="text-center">
      <div className="inline-flex items-center space-x-3 px-6 py-3 bg-white rounded-full shadow-md">
        <span className="text-red-500 text-2xl animate-pulse">🔴</span>
        <span className="text-3xl font-mono font-bold text-gray-800">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
