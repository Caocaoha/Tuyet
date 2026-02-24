// ============================================================
// components/MicButton.tsx
// ============================================================
interface MicButtonProps {
  onStart: () => void;
  size?: 'small' | 'large';
  disabled?: boolean;
}

export default function MicButton({ onStart, size = 'large', disabled = false }: MicButtonProps) {
  const sizeClasses = size === 'large' 
    ? 'w-32 h-32 text-6xl' 
    : 'w-16 h-16 text-3xl';

  return (
    <button
      onClick={onStart}
      disabled={disabled}
      className={`${sizeClasses} rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-all transform active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed`}
      aria-label="Start recording"
    >
      🎙️
    </button>
  );
}
