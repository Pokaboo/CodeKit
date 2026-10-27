/**
 * 结构化 JSON 对比：按 key / 数组下标逐层对齐，输出路径级差异。
 * 与服务端或第三方库无关，纯函数实现，便于测试。
 */

export type JsonChangeKind = 'added' | 'removed' | 'changed';

export interface JsonChange {
  /** JSONPath 风格路径，如 $.user.tags[0] */
  path: string;
  kind: JsonChangeKind;
  before?: unknown;
  after?: unknown;
  /** 值类型（对象 / 数组 / 值） */
  type: 'object' | 'array' | 'value';
  /** 便于展示的一行摘要 */
  beforeText?: string;
  afterText?: string;
}

function typeOf(v: unknown): 'object' | 'array' | 'value' {
  if (Array.isArray(v)) return 'array';
  if (v !== null && typeof v === 'object') return 'object';
  return 'value';
}

function preview(v: unknown): string {
  if (v === undefined) return 'undefined';
  const t = typeOf(v);
  if (t === 'array') return `Array(${(v as unknown[]).length})`;
  if (t === 'object') return `Object(${Object.keys(v as object).length})`;
  if (typeof v === 'string') return JSON.stringify(v.length > 80 ? `${v.slice(0, 80)}…` : v);
  return String(v);
}

const keyPath = (base: string, key: string) => (/^[A-Za-z_$][\w$]*$/.test(key) ? `${base}.${key}` : `${base}[${JSON.stringify(key)}]`);

export interface DiffOptions {
  /** index：数组逐下标展开；whole：数组整体作为一个值比较（大数组更清爽） */
  arrayMode?: 'index' | 'whole';
}

/**
 * 逐层比两个 JSON 值。
 * - 对象：按 key 并集递归；
 * - 数组：默认按下标对齐（与后端接口返回顺序一致时最直观）；
 * - 基础类型：严格比较（NaN 视为相等）。
 */
export function diffJson(a: unknown, b: unknown, base = '$', options: DiffOptions = {}): JsonChange[] {
  const arrayMode = options.arrayMode ?? 'index';
  const out: JsonChange[] = [];

  const walk = (left: unknown, right: unknown, path: string) => {
    const lt = typeOf(left);
    const rt = typeOf(right);

    if (left === undefined && right !== undefined) {
      out.push({ path, kind: 'added', after: right, type: rt, afterText: preview(right) });
      return;
    }
    if (left !== undefined && right === undefined) {
      out.push({ path, kind: 'removed', before: left, type: lt, beforeText: preview(left) });
      return;
    }
    if (lt !== rt) {
      out.push({
        path,
        kind: 'changed',
        before: left,
        after: right,
        type: rt,
        beforeText: preview(left),
        afterText: preview(right),
      });
      return;
    }

    if (lt === 'object') {
      const lo = left as Record<string, unknown>;
      const ro = right as Record<string, unknown>;
      const keys = Array.from(new Set([...Object.keys(lo), ...Object.keys(ro)]));
      keys.forEach((k) => walk(lo[k], ro[k], keyPath(path, k)));
      return;
    }

    if (lt === 'array') {
      if (arrayMode === 'whole') {
        if (JSON.stringify(left) !== JSON.stringify(right)) {
          out.push({
            path,
            kind: 'changed',
            before: left,
            after: right,
            type: 'array',
            beforeText: preview(left),
            afterText: preview(right),
          });
        }
        return;
      }
      const la = left as unknown[];
      const ra = right as unknown[];
      const max = Math.max(la.length, ra.length);
      for (let i = 0; i < max; i += 1) walk(la[i], ra[i], `${path}[${i}]`);
      return;
    }

    const same = Object.is(left, right) || (Number.isNaN(left) && Number.isNaN(right));
    if (!same) {
      out.push({
        path,
        kind: 'changed',
        before: left,
        after: right,
        type: 'value',
        beforeText: preview(left),
        afterText: preview(right),
      });
    }
  };

  walk(a, b, base);
  return out;
}

export interface JsonDiffSummary {
  added: number;
  removed: number;
  changed: number;
  total: number;
}

export function summarize(changes: JsonChange[]): JsonDiffSummary {
  const summary: JsonDiffSummary = { added: 0, removed: 0, changed: 0, total: changes.length };
  changes.forEach((c) => {
    summary[c.kind] += 1;
  });
  return summary;
}

/** 把差异导出为可读文本（便于复制到工单 / PR 描述） */
export function changesToText(changes: JsonChange[]): string {
  if (!changes.length) return '两个 JSON 完全一致，无差异。';
  return changes
    .map((c) => {
      if (c.kind === 'added') return `+ ${c.path}: ${c.afterText}`;
      if (c.kind === 'removed') return `- ${c.path}: ${c.beforeText}`;
      return `~ ${c.path}: ${c.beforeText} → ${c.afterText}`;
    })
    .join('\n');
}
