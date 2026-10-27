/**
 * 文本工具纯函数层：统计与各类转义 / 反转义。
 */

export interface TextStats {
  chars: number;
  charsNoSpace: number;
  words: number;
  lines: number;
  paragraphs: number;
  bytesUtf8: number;
  bytesUtf16: number;
  cjk: number;
  letters: number;
  digits: number;
  punctuation: number;
  longestLine: number;
}

/** 统计文本各项指标（实时调用，注意 text 较大时的开销可控） */
export function computeTextStats(text: string): TextStats {
  if (!text) {
    return {
      chars: 0,
      charsNoSpace: 0,
      words: 0,
      lines: 0,
      paragraphs: 0,
      bytesUtf8: 0,
      bytesUtf16: 0,
      cjk: 0,
      letters: 0,
      digits: 0,
      punctuation: 0,
      longestLine: 0,
    };
  }
  const chars = Array.from(text).length;
  const charsNoSpace = Array.from(text.replace(/\s/g, '')).length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const linesArr = text.split(/\r\n|\r|\n/);
  const cjk = (text.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]/g) ?? []).length;
  const letters = (text.match(/[A-Za-z]/g) ?? []).length;
  const digits = (text.match(/[0-9]/g) ?? []).length;
  const punctuation = (text.match(/[\u3000-\u303F\uFF00-\uFFEF!-/:-@[-`{-~]/g) ?? []).length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;

  return {
    chars,
    charsNoSpace,
    words,
    lines: linesArr.length,
    paragraphs,
    bytesUtf8: new TextEncoder().encode(text).length,
    bytesUtf16: text.length * 2,
    cjk,
    letters,
    digits,
    punctuation,
    longestLine: Math.max(...linesArr.map((l) => Array.from(l).length)),
  };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/* ---------- Unicode 转义 ---------- */

export type EscapeKind = 'unicode' | 'html' | 'js' | 'json';

const u4 = (code: number) => '\\u' + code.toString(16).padStart(4, '0');

/** 文本 → \uXXXX（非 BMP 字符输出代理对，与 Java / JS 一致） */
export function unicodeEscape(text: string, onlyNonAscii = false): string {
  return Array.from(text)
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (onlyNonAscii && code < 128) return ch;
      if (code > 0xffff) {
        const high = Math.floor((code - 0x10000) / 0x400) + 0xd800;
        const low = ((code - 0x10000) % 0x400) + 0xdc00;
        return u4(high) + u4(low);
      }
      return u4(code);
    })
    .join('');
}

/** \uXXXX / \u{XXXXX} / 常见转义 → 文本 */
export function unicodeUnescape(text: string): string {
  return text
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

/* ---------- HTML 实体 ---------- */

const HTML_NAMED: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
  ' ': '&nbsp;',
  '©': '&copy;',
  '®': '&reg;',
  '™': '&trade;',
  '€': '&euro;',
  '£': '&pound;',
  '¥': '&yen;',
  '°': '&deg;',
  '±': '&plusmn;',
  '×': '&times;',
  '÷': '&divide;',
  '—': '&mdash;',
  '…': '&hellip;',
  '←': '&larr;',
  '→': '&rarr;',
  '↑': '&uarr;',
  '↓': '&darr;',
};

const HTML_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(HTML_NAMED).map(([ch, entity]) => [entity.slice(1, -1), ch]),
);

/** 文本 → HTML 实体（命名实体优先，其余转数字实体） */
export function htmlEscape(text: string, encodeAll = false): string {
  return Array.from(text)
    .map((ch) => {
      if (HTML_NAMED[ch]) return HTML_NAMED[ch];
      const code = ch.codePointAt(0) ?? 0;
      if (code > 127 || (encodeAll && code >= 32)) return `&#${code};`;
      return ch;
    })
    .join('');
}

/** HTML 实体 → 文本（支持命名实体与 &#123; / &#x1F600;） */
export function htmlUnescape(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isNaN(code) ? whole : String.fromCodePoint(code);
    }
    return HTML_REVERSE[body] ?? whole;
  });
}

/* ---------- JS 字符串 ---------- */

/** 文本 → JS 字符串字面量内容（不含首尾引号） */
export function jsEscape(text: string): string {
  return text.replace(/[\\'"\n\r\t\b\f\v\u2028\u2029]/g, (ch) => {
    switch (ch) {
      case '\\':
        return '\\\\';
      case "'":
        return "\\'";
      case '"':
        return '\\"';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '\t':
        return '\\t';
      case '\b':
        return '\\b';
      case '\f':
        return '\\f';
      case '\v':
        return '\\v';
      default:
        return u4(ch.charCodeAt(0));
    }
  });
}

/** JS 字符串字面量 → 文本 */
export function jsUnescape(text: string): string {
  return text.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (whole, seq: string) => {
    if (seq.startsWith('u{')) return String.fromCodePoint(parseInt(seq.slice(2, -1), 16));
    if (seq[0] === 'u' && seq.length === 5) return String.fromCharCode(parseInt(seq.slice(1), 16));
    if (seq[0] === 'x' && seq.length === 3) return String.fromCharCode(parseInt(seq.slice(1), 16));
    switch (seq) {
      case 'n':
        return '\n';
      case 'r':
        return '\r';
      case 't':
        return '\t';
      case 'b':
        return '\b';
      case 'f':
        return '\f';
      case 'v':
        return '\v';
      case '0':
        return '\0';
      case '\n':
        return '';
      default:
        return seq;
    }
  });
}

/* ---------- JSON 字符串 ---------- */

/** 文本 → JSON 字符串内部内容（不含首尾引号） */
export function jsonEscape(text: string): string {
  const s = JSON.stringify(text);
  return s.slice(1, -1);
}

/** JSON 字符串内部内容 → 文本 */
export function jsonUnescape(text: string): string {
  try {
    return JSON.parse(`"${text.replace(/\\"/g, '"').replace(/"/g, '\\"')}"`);
  } catch {
    return jsUnescape(text);
  }
}

/* ---------- 统一入口 ---------- */

export function escapeText(text: string, kind: EscapeKind, decode: boolean): string {
  if (!text) return '';
  switch (kind) {
    case 'unicode':
      return decode ? unicodeUnescape(text) : unicodeEscape(text);
    case 'html':
      return decode ? htmlUnescape(text) : htmlEscape(text);
    case 'js':
      return decode ? jsUnescape(text) : jsEscape(text);
    case 'json':
      return decode ? jsonUnescape(text) : jsonEscape(text);
    default:
      return text;
  }
}
