// ============================================================
// components/BridgeStatus.tsx
// ============================================================
interface BridgeStatusProps {
  connected: boolean;
}

export default function BridgeStatus({ connected }: BridgeStatusProps) {
  return (
    <div className="fixed bottom-4 right-4">
      <div className={`flex items-center space-x-2 px-4 py-2 rounded-full shadow-md ${
        connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        <span className={`w-2 h-2 rounded-full ${
          connected ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <span className="text-sm font-medium">
          {connected ? 'Bridge kết nối' : 'Bridge offline'}
        </span>
      </div>
    </div>
  );
}
