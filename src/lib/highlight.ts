import hljs from 'highlight.js';
import { ToolCategory, SubTool } from '../types';

const languageMap: Record<string, string> = {
  json: 'json',
  xml: 'xml',
  sql: 'sql',
  java: 'java',
};

export function highlightCode(code: string, language: string): string {
  if (!code) return '';
  const hljsLang = languageMap[language];
  if (hljsLang && hljs.getLanguage(hljsLang)) {
    const result = hljs.highlight(code, { language: hljsLang });
    return result.value;
  }
  const result = hljs.highlightAuto(code);
  return result.value;
}

export function getOutputLanguage(category: ToolCategory, subTool: SubTool): string | null {
  if (category === 'JSON') {
    if (subTool === 'TO_XML') return 'xml';
    if (subTool === 'TRANSFORM') return 'java';
    return 'json';
  }
  if (category === 'XML') {
    if (subTool === 'TRANSFORM') return 'json';
    return 'xml';
  }
  if (category === 'SQL') return 'sql';
  return null;
}
