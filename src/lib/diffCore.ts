/**
 * 对比类工具的统一差异模型与本地持久化。
 * 文本 / Excel / JSON 三个工作台共用：统计口径、Change 结构、最近对比、差异批注。
 */
export type ChangeKind = 'added' | 'removed' | 'changed' | 'context';

export interface Change {
  kind: ChangeKind;
  /** 定位用的路径：行号、$.a.b 或 关键值|列名 */
  path: string;
  before?: string;
  after?: string;
}

export interface ChangeSummary {
  added: number;
  removed: number;
  changed: number;
  total: number;
}

export function summarize(changes: Change[]): ChangeSummary {
  const summary: ChangeSummary = { added: 0, removed: 0, changed: 0, total: changes.length };
  changes.forEach((c) => {
    if (c.kind === 'added') summary.added += 1;
    else if (c.kind === 'removed') summary.removed += 1;
    else if (c.kind === 'changed') summary.changed += 1;
  });
  return summary;
}

export function changesToText(changes: Change[]): string {
  return changes
    .map((c) => {
      const label = c.kind === 'added' ? '新增' : c.kind === 'removed' ? '删除' : c.kind === 'changed' ? '修改' : '上下文';
      const before = c.before === undefined ? '' : ` ${c.before}`;
      const after = c.after === undefined ? '' : ` → ${c.after}`;
      return `[${label}] ${c.path}${before}${after}`;
    })
    .join('\n');
}

const PREFIX = 'codekit-diff';
const MAX_RECENT = 5;

export interface RecentPair {
  id: string;
  label: string;
  a: string;
  b: string;
  savedAt: number;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* localStorage 不可用时静默降级 */
  }
}

export function loadRecent(toolKey: string): RecentPair[] {
  return readJson<RecentPair[]>(`${PREFIX}:recent:${toolKey}`, []);
}

export function saveRecent(toolKey: string, a: string, b: string): RecentPair[] {
  const items = loadRecent(toolKey).filter((it) => !(it.a === a && it.b === b));
  items.unshift({
    id: `${Date.now()}`,
    label: `${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} · ${a.slice(0, 18).replace(/\n/g, ' ')}…`,
    a,
    b,
    savedAt: Date.now(),
  });
  const next = items.slice(0, MAX_RECENT);
  writeJson(`${PREFIX}:recent:${toolKey}`, next);
  return next;
}

export function clearRecent(toolKey: string): void {
  writeJson(`${PREFIX}:recent:${toolKey}`, []);
}

export function loadNotes(toolKey: string): Record<string, string> {
  return readJson<Record<string, string>>(`${PREFIX}:notes:${toolKey}`, {});
}

export function saveNote(toolKey: string, key: string, value: string): Record<string, string> {
  const next = { ...loadNotes(toolKey), [key]: value };
  writeJson(`${PREFIX}:notes:${toolKey}`, next);
  return next;
}
