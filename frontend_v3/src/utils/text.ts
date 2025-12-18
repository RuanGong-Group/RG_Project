
/**
 * 解析定义字符串 "English Definition ; Chinese Definition"
 */
export function parseDefinition(definition: string): { en: string; cn: string } {
  if (!definition) return { en: '', cn: '' };
  
  const parts = definition.split(' ; ');
  if (parts.length === 2) {
    return { en: parts[0], cn: parts[1] };
  }
  
  // Fallback for legacy or irregular data
  return { en: definition, cn: '' };
}

/**
 * 格式化发音对象
 */
export function formatPronunciation(pron: any): { us: string; uk: string } {
  if (!pron) return { us: '', uk: '' };
  
  if (typeof pron === 'string') {
    // 尝试解析 JSON 字符串
    try {
      const parsed = JSON.parse(pron);
      if (parsed.us || parsed.uk) {
        return { us: parsed.us || '', uk: parsed.uk || '' };
      }
    } catch (e) {
      // 不是 JSON，直接作为 US 发音返回 (Legacy behavior)
      return { us: pron, uk: '' };
    }
    return { us: pron, uk: '' };
  }
  
  return {
    us: pron.us || '',
    uk: pron.uk || ''
  };
}
