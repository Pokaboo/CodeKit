import hljs from 'highlight.js';

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
