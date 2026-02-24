// ============================================================
// components/StatusToast.tsx
// ============================================================
interface StatusToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function StatusToast({ message, type }: StatusToastProps) {
  const bgColor = {
    success: 'bg-green-100 border-green-200 text-green-800',
    error: 'bg-red-100 border-red-200 text-red-800',
    info: 'bg-blue-100 border-blue-200 text-blue-800'
  }[type];

  return (
    <div className={`p-4 rounded-lg border ${bgColor} shadow-md animate-fade-in`}>
      <p className="font-medium">{message}</p>
    </div>
  );
}
