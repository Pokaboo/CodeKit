import hljs from 'highlight.js';

/**
 * 代码语法高亮（highlight.js + atom-one-dark 主题）。
 * 输出文件名 → 语言映射：注册表中的 outputFile 即语言推断依据。
 */
const langByFile: Record<string, string> = {
  'output.json': 'json',
  'output.xml': 'xml',
  'output.sql': 'sql',
  'UserEntity.java': 'java',
  'output.txt': 'plaintext',
  'output.md5': 'plaintext',
  'output.b64': 'plaintext',
  'output.ascii': 'plaintext',
  'output.dataurl': 'plaintext',
};

/** 返回已转义的高亮 HTML（hljs 内部会 escape，可安全用于 dangerouslySetInnerHTML） */
export function highlightCode(code: string, outputFile: string): string {
  if (!code) return '';
  const language = langByFile[outputFile] ?? outputFile;
  try {
    if (language !== 'plaintext' && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value;
    }
  } catch {
    /* 忽略并回退到自动检测 */
  }
  return hljs.highlightAuto(code).value;
}
