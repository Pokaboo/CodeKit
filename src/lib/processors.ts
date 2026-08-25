import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { format as sqlFormat } from 'sql-formatter';
import md5 from 'md5';

/**
 * 纯函数处理器层：与 React 完全解耦，可直接单元测试。
 * 所有函数签名统一为 (input, options) => string | Promise<string>。
 */

export type Options = Record<string, boolean>;

/* ---------- JSON ---------- */

export function formatJson(input: string): string {
  return JSON.stringify(JSON.parse(input), null, 2);
}

export function compressJson(input: string): string {
  return JSON.stringify(JSON.parse(input));
}

export function jsonToXml(input: string): string {
  const obj = JSON.parse(input);
  const builder = new XMLBuilder({ format: true });
  return builder.build(obj);
}

export function jsonToJava(input: string, options: Options): string {
  const obj = JSON.parse(input);
  const useLombok = options.useLombok ?? true;
  const camelCase = options.camelCase ?? true;
  const jackson = options.jackson ?? false;

  let code = '';
  if (useLombok) code += '@Data\n';
  code += 'public class UserEntity {\n';

  const targetObj = Array.isArray(obj) ? obj[0] : obj;
  if (typeof targetObj === 'object' && targetObj !== null) {
    Object.keys(targetObj).forEach((key) => {
      const value = targetObj[key];
      let type = 'String';
      if (typeof value === 'number') type = Number.isInteger(value) ? 'Long' : 'Double';
      else if (typeof value === 'boolean') type = 'Boolean';
      else if (Array.isArray(value)) type = 'List<Object>';

      if (jackson) code += `    @JsonProperty("${key}")\n`;
      const fieldName = camelCase ? key.replace(/_([a-z])/g, (g) => g[1].toUpperCase()) : key;
      code += `    private ${type} ${fieldName};\n\n`;
    });
  }
  code += '    // 自动生成于 CodeKit\n}';
  return code;
}

/* ---------- XML ---------- */

export function formatXml(input: string): string {
  const parser = new XMLParser({ ignoreAttributes: false });
  const obj = parser.parse(input);
  const builder = new XMLBuilder({ format: true, ignoreAttributes: false });
  return builder.build(obj);
}

export function compressXml(input: string): string {
  const parser = new XMLParser({ ignoreAttributes: false });
  const obj = parser.parse(input);
  const builder = new XMLBuilder({ ignoreAttributes: false });
  return builder.build(obj);
}

export function xmlToJson(input: string): string {
  const parser = new XMLParser({ ignoreAttributes: false });
  return JSON.stringify(parser.parse(input), null, 2);
}

export function validateXml(input: string): string {
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
  parser.parse(input);
  return '// 验证通过：合法的 XML 文档';
}

/* ---------- SQL ---------- */

export function formatSql(input: string): string {
  return sqlFormat(input);
}

export function compressSql(input: string): string {
  // 保护单引号字符串字面量内的空白，避免压缩破坏内容
  const parts: string[] = [];
  let rest = input;
  let idx = 0;
  const tokenMap = new Map<string, string>();
  // 简单词法保护：将 '...' 字符串临时替换为占位符
  rest = rest.replace(/'[^']*'/g, (m) => {
    const token = `\u0000${idx++}\u0000`;
    tokenMap.set(token, m);
    return token;
  });
  const compressed = rest.replace(/\s+/g, ' ').trim();
  return compressed.replace(/\u0000\d+\u0000/g, (t) => tokenMap.get(t) ?? t);
}

export function toInClause(input: string): string {
  const lines = input
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter((l) => l !== '');
  if (lines.length === 0) throw new Error('请输入有效的列表数据');
  return `IN (${lines.map((l) => `'${l}'`).join(', ')})`;
}

/* ---------- CRYPTO ---------- */

export function md5Hash(input: string): string {
  return md5(input);
}

export function base64Encode(input: string): string {
  return btoa(unescape(encodeURIComponent(input)));
}

export function base64Decode(input: string): string {
  return decodeURIComponent(escape(atob(input.trim())));
}

/** UTF-8 文本 → GBK 字节 Hex（浏览器 Blob 编码，Chromium 系支持） */
export async function utf8ToGbk(input: string): Promise<string> {
  const blob = new Blob([input], { type: 'text/plain;charset=gbk' });
  const buf = (await blob.arrayBuffer()) as ArrayBuffer;
  const bytes = new Uint8Array(buf);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
  return `GBK Hex:\n${hex}\n\n字节数: ${bytes.length}`;
}

/** GBK Hex 字节序列 → UTF-8 文本 */
export function gbkToUtf8(input: string): string {
  const hexParts = input
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  const bytes = new Uint8Array(hexParts.map((h) => parseInt(h, 16)));
  return new TextDecoder('gbk').decode(bytes);
}

export function asciiEncode(input: string): string {
  return Array.from(input)
    .map((ch) => ch.codePointAt(0) as number)
    .join(' ');
}

export function asciiDecode(input: string): string {
  const codes = input.trim().split(/\s+/).map(Number);
  if (codes.some((n) => isNaN(n))) throw new Error('包含非法字符');
  return String.fromCodePoint(...codes);
}

/* ---------- CONVERT ---------- */

/** URL 编码：基于 encodeURIComponent 标准，覆盖查询参数与路径片段转义 */
export function urlEncode(input: string): string {
  return encodeURIComponent(input);
}

/** URL 解码：还原 encodeURIComponent 编码结果（非法序列会抛出错误） */
export function urlDecode(input: string): string {
  return decodeURIComponent(input.trim());
}

/**
 * 进制转换：自动识别 0x(十六) / 0b(二) / 0o(八) 前缀或纯十进制输入，
 * 输出十进制、二进制、八进制、十六进制的完整表示。
 */
export function baseConvert(input: string): string {
  const raw = input.trim();
  if (!raw) throw new Error('请输入需要转换的数值');

  let value: number;
  let detected = '';
  if (/^0x[0-9a-fA-F]+$/i.test(raw)) {
    value = parseInt(raw.slice(2), 16);
    detected = '十六进制 (0x)';
  } else if (/^0b[01]+$/i.test(raw)) {
    value = parseInt(raw.slice(2), 2);
    detected = '二进制 (0b)';
  } else if (/^0o[0-7]+$/i.test(raw)) {
    value = parseInt(raw.slice(2), 8);
    detected = '八进制 (0o)';
  } else if (/^-?\d+$/.test(raw)) {
    value = parseInt(raw, 10);
    detected = '十进制';
  } else {
    throw new Error('无法识别的进制格式，支持 0x / 0b / 0o 前缀或纯十进制整数');
  }

  if (!Number.isFinite(value)) throw new Error('数值超出可解析范围');

  return [
    `输入识别: ${detected}`,
    `十进制 (DEC): ${value}`,
    `二进制 (BIN): ${value.toString(2)}`,
    `八进制 (OCT): ${value.toString(8)}`,
    `十六进制 (HEX): 0x${value.toString(16).toUpperCase()}`,
  ].join('\n');
}
