// ============================================================
// lib/obsidian/formatter.ts — Markdown Formatters
// ============================================================
export function formatVoiceNote(
  time: string,
  content: string,
  tags: string[]
): string {
  const tagStr = tags.length > 0 ? ' ' + tags.map(t => `#${t}`).join(' ') : '';
  return `## 🎙️ ${time}\n${content}${tagStr}\n\n`;
}

export function formatMeeting(
  startTime: string,
  speakers: Array<{ displayName: string; text: string }>,
  summary: string,
  actionItems: string[]
): string {
  let markdown = `## Cuộc họp — ${startTime}\n\n`;
  
  markdown += `### Tóm tắt\n${summary}\n\n`;
  
  markdown += `### Chi tiết\n`;
  speakers.forEach(speaker => {
    markdown += `**${speaker.displayName}:** ${speaker.text}\n\n`;
  });
  
  markdown += `### Action Items\n`;
  actionItems.forEach(item => {
    markdown += `- [ ] ${item}\n`;
  });
  
  markdown += '\n---\n\n';
  
  return markdown;
}

export function formatSearchReport(
  query: string,
  results: Array<{ path: string; snippet: string }>,
  timestamp: string
): string {
  let report = `## 📊 Báo cáo: ${query} - ${timestamp}\n\n`;
  
  if (results.length === 0) {
    report += '*Không tìm thấy kết quả phù hợp.*\n\n';
  } else {
    results.forEach((result, index) => {
      report += `### ${index + 1}. ${result.path}\n${result.snippet}\n\n`;
    });
  }
  
  report += '---\n\n';
  return report;
}
