'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateReport } from '@/lib/api-client';

export default function ReportsPage() {
  const router = useRouter();
  const [type, setType] = useState<'topic' | 'daily' | 'weekly'>('daily');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<{
    title: string;
    summary: string;
    details: string;
    sources: Array<{ title: string; url: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    setReport(null);

    try {
      const result = await generateReport({
        type,
        topic: type === 'topic' ? topic : undefined,
      });
      setReport(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const openInObsidian = (url: string) => {
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Báo cáo</h1>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded text-sm transition-colors"
          >
            ← Quay lại
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại báo cáo
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['daily', 'weekly', 'topic'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      type === t
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t === 'daily' ? 'Hôm nay' : t === 'weekly' ? 'Tuần này' : 'Chủ đề'}
                  </button>
                ))}
              </div>
            </div>

            {type === 'topic' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chủ đề
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required={type === 'topic'}
                  placeholder="VD: dự án X, meeting..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={generating || (type === 'topic' && !topic)}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {generating ? 'Đang tạo báo cáo...' : 'Tạo báo cáo'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {report && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{report.title}</h2>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-gray-800 italic">{report.summary}</p>
            </div>

            <div className="prose max-w-none mb-6">
              <div className="whitespace-pre-wrap text-gray-700">{report.details}</div>
            </div>

            {report.sources.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Nguồn</h3>
                <div className="space-y-2">
                  {report.sources.map((source, idx) => (
                    <button
                      key={idx}
                      onClick={() => openInObsidian(source.url)}
                      className="block w-full text-left bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors"
                    >
                      <span className="text-blue-600">📄 {source.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
