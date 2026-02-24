// ============================================================
// components/TranscriptPreview.tsx
// ============================================================
interface TranscriptPreviewProps {
  text: string;
}

export default function TranscriptPreview({ text }: TranscriptPreviewProps) {
  if (!text) return null;

  return (
    <div className="mt-8 p-4 bg-white rounded-lg shadow-md">
      <p className="text-sm text-gray-500 mb-2">Xem trước:</p>
      <p className="text-gray-800 leading-relaxed">{text}</p>
    </div>
  );
}
