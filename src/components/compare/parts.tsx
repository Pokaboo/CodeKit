import { useCallback, useState, type ReactNode } from 'react';
import { Button, Card, Input } from 'antd';
import {
  clearRecent,
  loadNotes,
  loadRecent,
  saveNote,
  saveRecent,
  type RecentPair,
} from '../../lib/diffCore';

/** 与本站通用工作台一致的面板标题 */
export function PanelTitle({ icon, text, color }: { icon: ReactNode; text: string; color: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
      <span style={{ display: 'flex', color }}>{icon}</span>
      {text}
    </span>
  );
}

export const cardBodyStyle = { padding: 20 } as const;

/** 顶部强调色卡片（与 ToolWorkspace 视觉一致）
 * 设计说明：使用整条纯色 header 横幅（白色 icon + 白色标题），替代早期 borderTop:3px 细条，
 * 避免彩色细条在白卡顶部"孤立漂浮"。配置类中性卡片请直接用 antd Card，不走此组件。 */
export function AccentCard({
  accent,
  title,
  extra,
  children,
  className,
}: {
  accent: string;
  title: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={`ck-rise ck-accent-card ${className ?? ''}`}
      title={title}
      extra={extra}
      styles={{
        header: {
          background: accent,
          color: '#ffffff',
          borderBottom: 'none',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        },
        body: cardBodyStyle,
      }}
      style={{ overflow: 'hidden', height: '100%' }}
    >
      {children}
    </Card>
  );
}

/** 三个对比工具共用的统计条 */
export function DiffStatBar({
  items,
  extra,
}: {
  items: { label: string; value: number; tone?: 'add' | 'del' | 'mod' | 'same' | 'info' }[];
  extra?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {items.map((it) => (
        <span key={it.label} className={`ck-diff-tag ck-diff-tag-${it.tone ?? 'info'}`}>
          {it.label} {it.value}
        </span>
      ))}
      {extra}
    </div>
  );
}

/** 结果区空态 */
export function DiffEmptyState({ text }: { text: string }) {
  return <div className="ck-diff-empty">{text}</div>;
}

/** 数值统计卡（Excel 对比及后续工具共用） */
export function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="ck-stat-card">
      <div className="ck-stat-label">{label}</div>
      <div className="ck-stat-value" style={{ color }}>{value}</div>
    </div>
  );
}

/** 最近对比记录：保存在 localStorage，可一键恢复 A/B 文本 */
export function RecentComparisons({
  toolKey,
  a,
  b,
  onRestore,
}: {
  toolKey: string;
  a: string;
  b: string;
  onRestore: (a: string, b: string) => void;
}) {
  const [items, setItems] = useState<RecentPair[]>(() => loadRecent(toolKey));
  const canSave = Boolean(a.trim() || b.trim());
  if (!items.length && !canSave) return null;
  return (
    <Card styles={{ body: { padding: '10px 14px' } }} className="ck-rise">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: '#475569' }}>最近对比</span>
        <Button
          size="small"
          disabled={!canSave}
          onClick={() => setItems(saveRecent(toolKey, a, b))}
        >
          保存当前
        </Button>
        {items.length > 0 && (
          <Button size="small" type="text" onClick={() => { clearRecent(toolKey); setItems([]); }}>
            清空
          </Button>
        )}
        {items.map((it) => (
          <Button key={it.id} size="small" type="link" onClick={() => onRestore(it.a, it.b)}>
            {it.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}

/** 差异批注读写（三个工具共用同一套持久化） */
export function useDiffNotes(toolKey: string) {
  const [notes, setNotes] = useState<Record<string, string>>(() => loadNotes(toolKey));
  const setNote = useCallback(
    (key: string, value: string) => setNotes(saveNote(toolKey, key, value)),
    [toolKey],
  );
  return { notes, setNote };
}

/** 差异批注面板：按定位键给差异条目加备注 */
export function DiffNotesPanel({
  toolKey,
  entries,
  title = '差异批注',
}: {
  toolKey: string;
  entries: { key: string; label: string }[];
  title?: string;
}) {
  const { notes, setNote } = useDiffNotes(toolKey);
  const [open, setOpen] = useState(false);
  if (!entries.length) return null;
  const marked = entries.filter((e) => notes[e.key]).length;
  return (
    <Card styles={{ body: { padding: '10px 14px' } }} className="ck-rise">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, color: '#475569' }}>
          {title} · 已标注 {marked} / {entries.length}
        </span>
        <Button size="small" type="link" onClick={() => setOpen((v) => !v)}>
          {open ? '收起' : '展开'}
        </Button>
      </div>
      {open && (
        <div style={{ marginTop: 10, maxHeight: 260, overflow: 'auto' }}>
          {entries.slice(0, 100).map((e) => (
            <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span
                className="ck-code"
                style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={e.label}
              >
                {e.label}
              </span>
              <Input
                size="small"
                style={{ width: 220, flexShrink: 0 }}
                placeholder="添加批注"
                value={notes[e.key] ?? ''}
                onChange={(ev) => setNote(e.key, ev.target.value)}
              />
            </div>
          ))}
          {entries.length > 100 && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>仅显示前 100 条差异</div>
          )}
        </div>
      )}
    </Card>
  );
}
