/**
 * Cron 表达式解析与执行时间推算（纯逻辑，不依赖第三方库）。
 * 与 timeUtils.ts 风格一致：纯函数，便于在 React 组件外复用与测试。
 *
 * 支持：
 * - 标准 5 段（分 时 日 月 周）与 6 段（秒 分 时 日 月 周）
 * - 通配符 * 、?（仅日/周）、逗号列表、区间 a-b、步长（斜杠间隔，如 * /5）
 * - 周字段 0-7（0 与 7 均表示周日）
 * - 日/周同时受限时按 OR 语义匹配（crontab(5) 标准行为）
 */

/** 单个字段的解析结果（kind 与原始结构信息，供 UI 精确还原控件状态） */
export interface CronField {
  kind: 'all' | 'step' | 'range' | 'list' | 'single' | 'none';
  /** 步长模式：起点（默认字段最小值） */
  stepFrom?: number;
  /** 步长模式：终点（默认字段最大值） */
  stepTo?: number;
  /** 步长模式：间隔 */
  stepInterval?: number;
  /** 区间模式：起点 */
  rangeFrom?: number;
  /** 区间模式：终点 */
  rangeTo?: number;
  /** list / single 模式：值列表 */
  list?: number[];
  /** 该字段最终匹配的数值集合（none 为空集） */
  values: Set<number>;
  /** 原始文本片段 */
  raw: string;
}

export interface CronParseResult {
  hasSeconds: boolean;
  /** 按顺序：秒?, 分, 时, 日, 月, 周 */
  fields: CronField[];
  /** 人类可读的执行描述 */
  description: string;
}

export interface FieldSpec {
  name: string;
  short: string;
  min: number;
  max: number;
  /** 是否允许 ?（仅日/周） */
  allowNone?: boolean;
  /** 值标签（周字段用） */
  labels?: string[];
}

/** 字段定义（含秒共 6 段；5 段时从索引 1 起取） */
export const CRON_FIELD_SPECS: FieldSpec[] = [
  { name: '秒', short: '秒', min: 0, max: 59 },
  { name: '分钟', short: '分', min: 0, max: 59 },
  { name: '小时', short: '时', min: 0, max: 23 },
  { name: '日', short: '日', min: 1, max: 31, allowNone: true },
  { name: '月', short: '月', min: 1, max: 12 },
  {
    name: '周',
    short: '周',
    min: 0,
    max: 7,
    allowNone: true,
    labels: ['周日', '周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  },
];

/** 周字段 7 → 0 归一化（0 与 7 均为周日） */
function norm(v: number, spec: FieldSpec): number {
  return v === 7 && spec.max === 7 ? 0 : v;
}

function fullValues(spec: FieldSpec): Set<number> {
  const s = new Set<number>();
  for (let v = spec.min; v <= spec.max; v++) s.add(norm(v, spec));
  return s;
}

function parseNum(token: string, spec: FieldSpec): number {
  if (!/^\d+$/.test(token)) {
    throw new Error(`「${token}」不是合法的数字`);
  }
  const v = Number(token);
  if (v < spec.min || v > spec.max) {
    throw new Error(`「${token}」超出「${spec.name}」范围 ${spec.min}-${spec.max}`);
  }
  return v;
}

/** 解析不含逗号的单个 token：a / a-b / a-b\/n / *\/n / a\/n / ? */
function parseSingle(token: string, spec: FieldSpec): CronField {
  // 步长
  const slashIdx = token.indexOf('/');
  if (slashIdx >= 0) {
    const base = token.slice(0, slashIdx);
    const step = Number(token.slice(slashIdx + 1));
    if (!Number.isInteger(step) || step <= 0) {
      throw new Error(`步长「${token.slice(slashIdx + 1)}」必须为正整数`);
    }
    let from = spec.min;
    let to = spec.max;
    if (base !== '*' && base !== '') {
      if (base.includes('-')) {
        const [a, b] = base.split('-');
        from = parseNum(a, spec);
        to = parseNum(b, spec);
      } else {
        from = parseNum(base, spec);
      }
    }
    if (from > to) {
      throw new Error(`步长区间 ${from}-${to} 起始值大于结束值`);
    }
    const values = new Set<number>();
    for (let v = from; v <= to; v += step) values.add(norm(v, spec));
    return { kind: 'step', stepFrom: from, stepTo: to, stepInterval: step, values, raw: token };
  }

  // 区间
  if (token.includes('-')) {
    const parts = token.split('-');
    if (parts.length !== 2) {
      throw new Error(`区间「${token}」格式错误，应为 a-b 形式`);
    }
    const from = parseNum(parts[0], spec);
    const to = parseNum(parts[1], spec);
    if (from > to) {
      throw new Error(`区间 ${from}-${to} 起始值大于结束值`);
    }
    const values = new Set<number>();
    for (let v = from; v <= to; v++) values.add(norm(v, spec));
    return { kind: 'range', rangeFrom: from, rangeTo: to, values, raw: token };
  }

  // 单值
  const v = parseNum(token, spec);
  return { kind: 'single', list: [v], values: new Set([norm(v, spec)]), raw: token };
}

/** 解析单个字段 token（含逗号列表展开） */
function parseFieldToken(raw: string, spec: FieldSpec): CronField {
  const token = raw.trim();
  if (token === '*') {
    return { kind: 'all', values: fullValues(spec), raw };
  }
  if (token === '?') {
    if (!spec.allowNone) {
      throw new Error(`「${spec.name}」字段不支持 ?（仅「日」「周」可用）`);
    }
    return { kind: 'none', values: new Set<number>(), raw };
  }
  if (token.includes(',')) {
    const values = new Set<number>();
    let list: number[] = [];
    for (const part of token.split(',')) {
      const sub = parseSingle(part, spec);
      sub.values.forEach((v) => values.add(v));
      list = [...list, ...(sub.list ?? [])];
    }
    return { kind: 'list', list: [...new Set(list)].sort((a, b) => a - b), values, raw };
  }
  const f = parseSingle(token, spec);
  f.raw = raw;
  return f;
}

/**
 * 解析 Cron 表达式。非法输入抛错（中文错误信息，可直接展示给用户）。
 */
export function parseCron(expr: string): CronParseResult {
  const tokens = expr.trim().split(/\s+/);
  if (tokens.length !== 5 && tokens.length !== 6) {
    throw new Error(`表达式需为 5 段（分 时 日 月 周）或 6 段（秒 分 时 日 月 周），当前 ${tokens.length} 段`);
  }
  const hasSeconds = tokens.length === 6;
  const specs = hasSeconds ? CRON_FIELD_SPECS : CRON_FIELD_SPECS.slice(1);
  const fields = tokens.map((tk, i) => parseFieldToken(tk, specs[i]));

  const dayF = fields[hasSeconds ? 3 : 2];
  const weekF = fields[hasSeconds ? 5 : 4];
  if (dayF.kind === 'none' && weekF.kind === 'none') {
    throw new Error('「日」与「周」不能同时设为 ?，请至少指定其中一个');
  }

  return { hasSeconds, fields, description: describe(fields, hasSeconds) };
}

function sortedValues(f: CronField): number[] {
  return [...f.values].sort((a, b) => a - b);
}

/** 生成人类可读描述（尽力而为的规则式拼接） */
function describe(fields: CronField[], hasSeconds: boolean): string {
  const specs = hasSeconds ? CRON_FIELD_SPECS : CRON_FIELD_SPECS.slice(1);
  const parts: string[] = [];
  fields.forEach((f, i) => {
    const spec = specs[i];
    if (f.kind === 'all') {
      parts.push(`每${spec.short}`);
    } else if (f.kind === 'none') {
      parts.push(`${spec.short}=不指定`);
    } else if (f.kind === 'step') {
      const from = f.stepFrom === spec.min ? '' : `从${f.stepFrom}`;
      parts.push(`${from}每${f.stepInterval}${spec.short}`);
    } else if (f.kind === 'range') {
      parts.push(`${f.rangeFrom}-${f.rangeTo}${spec.short}`);
    } else if (f.kind === 'list' && f.list) {
      parts.push(`${f.list.join(',')}${spec.short}`);
    } else {
      parts.push(`${[...f.values].join(',')}${spec.short}`);
    }
  });
  const text = parts.join('，');
  if (fields.every((f) => f.kind === 'all')) {
    return hasSeconds ? '每秒执行' : '每分钟执行';
  }
  return text.length > 0 ? `${text}执行` : '表达式';
}

function matchValues(f: CronField, v: number): boolean {
  return f.kind === 'none' || f.values.has(v);
}

/**
 * 日 / 周匹配：两者均受限（非 * 非 ?）时按 OR 语义；否则按 AND。
 * 即 `0 0 1 * 1` 表示「每月 1 号 或 每周一」的 0 点执行。
 */
function matchDayMonth(dayF: CronField, weekF: CronField, d: Date): boolean {
  const dayAll = dayF.kind === 'all' || dayF.kind === 'none';
  const weekAll = weekF.kind === 'all' || weekF.kind === 'none';
  const dayMatch = dayAll || dayF.values.has(d.getDate());
  const weekMatch = weekAll || weekF.values.has(d.getDay());
  if (!dayAll && !weekAll) return dayMatch || weekMatch;
  return dayMatch && weekMatch;
}

/**
 * 推算从 from 之后（严格晚于 from）的接下来 count 次执行时间。
 * 算法：逐分钟前进，6 段表达式额外在分钟内定位匹配的秒；
 * 日/月/周不匹配时整分钟跳过，最多向前搜索约 6 年以防死循环。
 */
export function nextRunTimes(expr: string, from: Date, count = 5): Date[] {
  const { hasSeconds, fields } = parseCron(expr);
  const hasSec = hasSeconds;
  const secF = hasSeconds ? fields[0] : null;
  const minF = fields[hasSeconds ? 1 : 0];
  const hourF = fields[hasSeconds ? 2 : 1];
  const dayF = fields[hasSeconds ? 3 : 2];
  const monthF = fields[hasSeconds ? 4 : 3];
  const weekF = fields[hasSeconds ? 5 : 4];

  const results: Date[] = [];
  const t = new Date(from);
  t.setMilliseconds(0);
  t.setSeconds(0);
  t.setMinutes(t.getMinutes() + 1);

  const MAX_ITER = 60 * 24 * 366 * 6;
  let iter = 0;

  while (results.length < count && iter < MAX_ITER) {
    iter++;

    // 6 段：定位本分钟内匹配的秒（当前秒已匹配则直接用，否则取下一个更大的）
    if (hasSec && secF) {
      if (!secF.values.has(t.getSeconds())) {
        const secs = sortedValues(secF);
        let nextSec: number | null = null;
        for (const s of secs) {
          if (s > t.getSeconds()) {
            nextSec = s;
            break;
          }
        }
        if (nextSec === null) {
          t.setSeconds(0);
          t.setMinutes(t.getMinutes() + 1);
          continue;
        }
        t.setSeconds(nextSec);
      }
    }

    const matched =
      matchValues(minF, t.getMinutes()) &&
      matchValues(hourF, t.getHours()) &&
      matchValues(monthF, t.getMonth() + 1) &&
      matchDayMonth(dayF, weekF, t);

    if (matched && t.getTime() > from.getTime()) {
      results.push(new Date(t));
      // 同一分钟内继续尝试更大的秒（6 段），否则进入下一分钟
      if (hasSec && secF) {
        const secs = sortedValues(secF);
        const next = secs.find((s) => s > t.getSeconds());
        if (next !== undefined) {
          t.setSeconds(next);
          continue;
        }
      }
    }

    t.setSeconds(0);
    t.setMinutes(t.getMinutes() + 1);
  }
  return results;
}
