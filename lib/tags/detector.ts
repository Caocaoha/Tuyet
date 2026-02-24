// ============================================================
// lib/tags/detector.ts — Voice Tag Detection (FR-008)
// ============================================================
export function detectTags(transcript: string): string[] {
  const tags: string[] = [];
  
  // Pattern: "tag [name]" or "gắn tag [name]"
  const patterns = [
    /tag\s+([a-zàáảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ\-]+)/gi,
    /gắn\s+tag\s+([a-zàáảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ\-]+)/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = transcript.matchAll(pattern);
    for (const match of matches) {
      const tag = match[1].trim().toLowerCase().replace(/\s+/g, '-');
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }
  });
  
  return tags;
}

export function removeTagCommands(transcript: string): string {
  return transcript
    .replace(/tag\s+[a-zàáảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ\-]+/gi, '')
    .replace(/gắn\s+tag\s+[a-zàáảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ\-]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}
