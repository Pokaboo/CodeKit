import { type DragEvent as ReactDragEvent, useDeferredValue, useMemo, useState } from 'react';
import { App, Button, Card, Checkbox, Input, Segmented, Select, Switch, Tooltip } from 'antd';
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileText,
  GitCompareArrows,
  Trash2,
  Wand2,
} from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import {
  AccentCard,
  DiffEmptyState,
  DiffNotesPanel,
  DiffStatBar,
  PanelTitle,
  RecentComparisons,
  cardBodyStyle,
} from './parts';
import {
  buildSplitHtml,
  computeTextDiff,
  DEFAULT_NORMALIZE,
  type DiffRow,
  type InlineSegment,
  type NormalizeOptions,
  type UnifiedRow,
} from '../../lib/textDiff';

const SAMPLE_A = `const name = "CodeKit";
const ver = "2.0.0";
const tag = "json";
export default app;`;
const SAMPLE_B = `const name = "CodeKit";
const ver = "2.1.0";
const tag = "json";
const beta = true;
export default app;`;

const MAX_RENDER_ROWS = 2000;
const LARGE_TEXT_THRESHOLD = 3000;

const IGNORE_ITEMS: { key: keyof NormalizeOptions; label: string }[] = [
  { key: 'ignoreWhitespace', label: '首尾空白' },
  { key: 'ignoreCase', label: '大小写' },
  { key: 'ignoreEmptyLines', label: '空行' },
  { key: 'normalizeEol', label: 'CRLF' },
];

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function stamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
}

function SegmentText({ segments, side }: { segments: InlineSegment[]; side: 'a' | 'b' }) {
  return (
    <>
      {segments.map((s, i) =>
        s.kind === 'equal' ? (
          <span key={i}>{s.text}</span>
        ) : (
          <span key={i} className={side === 'a' ? 'ck-hl-a' : 'ck-hl-b'}>
            {s.text}
          </span>
        ),
      )}
    </>
  );
}

export default function TextCompareWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();

  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [opts, setOpts] = useState<NormalizeOptions>(DEFAULT_NORMALIZE);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [context, setContext] = useState(3);
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [cursor, setCursor] = useState(0);

  // 大文本输入时让渲染让位于输入，避免每次按键都做全量 diff
  const deferredA = useDeferredValue(textA);
  const deferredB = useDeferredValue(textB);

  const result = useMemo(
    () => computeTextDiff(deferredA, deferredB, opts, context),
    [deferredA, deferredB, opts, context],
  );

  const displayRows = useMemo<DiffRow[]>(() => {
    const rows = onlyDiff
      ? result.rows.filter((r) => r.kind !== 'equal' && r.kind !== 'collapsed')
      : result.rows;
    return rows.slice(0, MAX_RENDER_ROWS);
  }, [result.rows, onlyDiff]);

  const displayUnified = useMemo<UnifiedRow[]>(() => {
    const rows = onlyDiff ? result.unifiedRows.filter((r) => r.sign !== ' ') : result.unifiedRows;
    return rows.slice(0, MAX_RENDER_ROWS);
  }, [result.unifiedRows, onlyDiff]);

  const changeIndexes = useMemo(() => {
    if (viewMode === 'split') {
      return displayRows.reduce<number[]>((acc, r, i) => {
        if (r.kind !== 'equal' && r.kind !== 'collapsed') acc.push(i);
        return acc;
      }, []);
    }
    return displayUnified.reduce<number[]>((acc, r, i) => {
      if (r.sign !== ' ') acc.push(i);
      return acc;
    }, []);
  }, [displayRows, displayUnified, viewMode]);

  const truncated =
    result.rows.length > MAX_RENDER_ROWS || result.unifiedRows.length > MAX_RENDER_ROWS;
  const large = result.stats.linesA + result.stats.linesB > LARGE_TEXT_THRESHOLD;

  const jumpTo = (next: number) => {
    if (!changeIndexes.length) return;
    const total = changeIndexes.length;
    const idx = ((next % total) + total) % total;
    setCursor(idx);
    const anchor = viewMode === 'split'
      ? `ck-diff-row-${changeIndexes[idx]}`
      : `ck-diff-u-${changeIndexes[idx]}`;
    document.getElementById(anchor)?.scrollIntoView({ block: 'center' });
  };

  const unifiedText = useMemo(
    () => result.unifiedRows.map((r) => `${r.sign} ${r.text}`).join('\n'),
    [result.unifiedRows],
  );

  const copy = async () => {
    if (!unifiedText) {
      message.warning('暂无对比结果');
      return;
    }
    try {
      await navigator.clipboard.writeText(unifiedText);
      message.success('差异文本已复制');
    } catch {
      message.error('复制失败，请手动选择');
    }
  };

  const exportPatch = () => {
    if (!result.patch || result.stats.identical) {
      message.warning('暂无差异可导出');
      return;
    }
    download(`文本差异_${stamp()}.patch`, result.patch, 'text/plain;charset=utf-8');
    message.success('已下载标准 unified diff');
  };

  const exportHtml = () => {
    if (!result.rows.length) {
      message.warning('暂无对比结果');
      return;
    }
    download(`文本对照_${stamp()}.html`, buildSplitHtml(result), 'text/html;charset=utf-8');
    message.success('已下载并排 HTML 对照表');
  };

  const exportTxt = () => {
    if (!unifiedText) {
      message.warning('暂无对比结果');
      return;
    }
    download(`文本差异_${stamp()}.txt`, unifiedText, 'text/plain;charset=utf-8');
    message.success('已下载差异文本');
  };

  const readFile = async (file: File, setter: (v: string) => void) => {
    try {
      setter(await file.text());
      message.success(`已读取 ${file.name}`);
    } catch {
      message.error('文件读取失败');
    }
  };

  const dropProps = (setter: (v: string) => void) => ({
    onDragOver: (e: ReactDragEvent) => e.preventDefault(),
    onDrop: (e: ReactDragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) void readFile(file, setter);
    },
  });

  const inputCard = (
    side: 'A' | 'B',
    value: string,
    setter: (v: string) => void,
    placeholder: string,
  ) => (
    <div {...dropProps(setter)}>
      <AccentCard
        accent={primary}
        title={PanelTitle({ icon: <FileText size={15} />, text: side === 'A' ? '左侧原文' : '右侧对比文', color: '#fff' })}
      >
        <Input.TextArea
          value={value}
          onChange={(e) => setter(e.target.value)}
          placeholder={`${placeholder}（也可拖入 txt / json / 代码文件）`}
          autoSize={{ minRows: 9, maxRows: 18 }}
          className="ck-code"
          style={{ fontSize: 13, background: '#f8fafc', lineHeight: 1.7 }}
        />
      </AccentCard>
    </div>
  );

  const runHint = (!textA.trim() || !textB.trim()) && (textA || textB);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {inputCard('A', textA, setTextA, '在此粘贴原始文本...')}
        {inputCard('B', textB, setTextB, '在此粘贴用于对比的文本...')}
      </div>

      <Card className="ck-rise" styles={{ body: cardBodyStyle }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <DiffStatBar
            items={[
              { label: '新增行', value: result.stats.added, tone: 'add' },
              { label: '删除行', value: result.stats.removed, tone: 'del' },
              { label: '修改行', value: result.stats.modified, tone: 'mod' },
              { label: '差异行', value: result.stats.changes, tone: 'info' },
            ]}
            extra={
              result.stats.identical && textA && textB ? (
                <span className="ck-diff-tag ck-diff-tag-same">两段文本一致</span>
              ) : undefined
            }
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Tooltip title="填入示例">
              <Button icon={<Wand2 size={14} />} onClick={() => { setTextA(SAMPLE_A); setTextB(SAMPLE_B); }} />
            </Tooltip>
            <Tooltip title="交换左右">
              <Button icon={<ArrowLeftRight size={14} />} onClick={() => { setTextA(textB); setTextB(textA); }} />
            </Tooltip>
            <Tooltip title="清空">
              <Button icon={<Trash2 size={14} />} onClick={() => { setTextA(''); setTextB(''); }} />
            </Tooltip>
            <Button icon={<Copy size={14} />} onClick={() => void copy()} disabled={!result.rows.length}>
              复制差异
            </Button>
            <Button icon={<Download size={14} />} onClick={exportTxt} disabled={!result.rows.length}>
              差异 TXT
            </Button>
            <Button icon={<Download size={14} />} onClick={exportPatch} disabled={!result.rows.length}>
              Patch
            </Button>
            <Button type="primary" icon={<Download size={14} />} onClick={exportHtml} disabled={!result.rows.length}>
              HTML 对照
            </Button>
          </div>
        </div>

        <div style={{ height: 1, background: '#f1f5f9', margin: '14px 0' }} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#475569' }}>视图</span>
            <Segmented
              value={viewMode}
              onChange={(v) => setViewMode(v as 'split' | 'unified')}
              options={[
                { label: '并排', value: 'split' },
                { label: '统一', value: 'unified' },
              ]}
            />
            <span style={{ fontSize: 13, color: '#475569', marginLeft: 6 }}>忽略</span>
            {IGNORE_ITEMS.map((item) => (
              <Checkbox
                key={item.key}
                checked={opts[item.key]}
                onChange={(e) => setOpts((o) => ({ ...o, [item.key]: e.target.checked }))}
                style={{ fontSize: 13 }}
              >
                {item.label}
              </Checkbox>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#475569' }}>上下文</span>
            <Select
              value={String(context)}
              onChange={(v) => setContext(Number(v))}
              options={[
                { label: '±1 行', value: '1' },
                { label: '±3 行', value: '3' },
                { label: '±5 行', value: '5' },
                { label: '全部展开', value: '-1' },
              ]}
              style={{ width: 110 }}
            />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
              仅看差异
              <Switch size="small" checked={onlyDiff} onChange={setOnlyDiff} />
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <Button size="small" icon={<ChevronUp size={13} />} disabled={!changeIndexes.length} onClick={() => jumpTo(cursor - 1)}>
            上一处
          </Button>
          <Button size="small" icon={<ChevronDown size={13} />} disabled={!changeIndexes.length} onClick={() => jumpTo(cursor + 1)}>
            下一处
          </Button>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            差异 {changeIndexes.length ? cursor + 1 : 0} / {changeIndexes.length}
          </span>
          <div style={{ flex: 1 }} />
          <Button
            size="small"
            icon={<ArrowLeftRight size={13} />}
            disabled={!textB}
            onClick={() => { setTextA(textB); setCursor(0); }}
          >
            用右侧覆盖左侧
          </Button>
        </div>

        {runHint && <div style={{ marginTop: 10, fontSize: 12, color: '#b45309' }}>提示：请同时在左侧与右侧填入文本后再对比。</div>}
        {large && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#b45309' }}>
            文本较大（{result.stats.linesA} / {result.stats.linesB} 行），已启用延迟计算；结果区最多渲染 {MAX_RENDER_ROWS} 行，完整内容请导出 Patch 或 HTML。
          </div>
        )}
        {truncated && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#b45309' }}>
            结果超过 {MAX_RENDER_ROWS} 行，仅显示前 {MAX_RENDER_ROWS} 行。
          </div>
        )}
      </Card>

      <AccentCard
        accent={primary}
        title={PanelTitle({ icon: <GitCompareArrows size={15} />, text: viewMode === 'split' ? '并排差异结果' : '统一差异结果', color: '#fff' })}
        extra={<span style={{ color: 'rgba(255,255,255,0.88)', fontSize: 12 }}>红 = 左侧删除　绿 = 右侧新增　深色块 = 行内字符级差异</span>}
      >
        <div className="ck-diff-output">
          {viewMode === 'split' ? (
            displayRows.length === 0 ? (
              <DiffEmptyState text="// 两侧填入文本后自动对比..." />
            ) : (
              <>
                <div className="ck-diff-head">
                  <div>左侧原文（A）</div>
                  <div>右侧对比文（B）</div>
                </div>
                {displayRows.map((r, idx) =>
                  r.kind === 'collapsed' ? (
                    <div key={r.key} className="ck-diff-fold">
                      ⋯ 已折叠 {r.folded} 行未变更上下文
                      <a onClick={() => setContext(-1)} style={{ marginLeft: 10, color: primary, cursor: 'pointer' }}>全部展开</a>
                    </div>
                  ) : (
                    <div key={r.key} id={`ck-diff-row-${idx}`} className={`ck-diff-row ck-diff-${r.kind}`}>
                      <div className="ck-diff-cell">
                        <span className="ck-diff-no">{r.noA ?? ''}</span>
                        <span className="ck-diff-text"><SegmentText segments={r.segmentsA} side="a" /></span>
                      </div>
                      <div className="ck-diff-cell">
                        <span className="ck-diff-no">{r.noB ?? ''}</span>
                        <span className="ck-diff-text"><SegmentText segments={r.segmentsB} side="b" /></span>
                      </div>
                    </div>
                  ),
                )}
              </>
            )
          ) : displayUnified.length === 0 ? (
            <div className="ck-diff-empty">// 两侧填入文本后自动对比...</div>
          ) : (
            displayUnified.map((r, i) => (
              <div key={r.key} id={`ck-diff-u-${i}`} className={`ck-diff-u ck-diff-u-${r.sign === '+' ? 'add' : r.sign === '-' ? 'del' : 'eq'}`}>
                <span className="ck-diff-no">{r.no}</span>
                <span style={{ userSelect: 'none', opacity: 0.6, marginRight: 8 }}>{r.sign}</span>
                <span className="ck-diff-text">{r.text}</span>
              </div>
            ))
          )}
        </div>
      </AccentCard>

      <RecentComparisons
        toolKey="text"
        a={textA}
        b={textB}
        onRestore={(a, b) => { setTextA(a); setTextB(b); setCursor(0); }}
      />
      <DiffNotesPanel
        toolKey="text"
        entries={result.rows
          .filter((r) => r.kind !== 'equal' && r.kind !== 'collapsed')
          .slice(0, 100)
          .map((r) => ({
            key: `text-${r.key}`,
            label: `${r.noA ?? '-'} / ${r.noB ?? '-'} · ${(r.textA || r.textB).slice(0, 60)}`,
          }))}
      />
    </div>
  );
}
