import { useMemo, useState } from 'react';
import { App, Button, Card, Input, Switch, Tag } from 'antd';
import { Copy, FileText, Download, GitCompareArrows } from 'lucide-react';
import { diffLines } from 'diff';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle, cardBodyStyle } from './parts';

interface DiffLine {
  key: string;
  sign: '+' | '-' | ' ';
  color: string;
  text: string;
  changed: boolean;
}

export default function TextCompareWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();

  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [onlyDiff, setOnlyDiff] = useState(false);

  const { lines, added, removed, changes } = useMemo(() => {
    if (!textA && !textB) {
      return { lines: [] as DiffLine[], added: 0, removed: 0, changes: 0 };
    }
    const parts = diffLines(textA, textB);
    const out: DiffLine[] = [];
    let addedCount = 0;
    let removedCount = 0;
    parts.forEach((p, idx) => {
      const sign = p.added ? '+' : p.removed ? '-' : ' ';
      const color = p.added ? '#10b981' : p.removed ? '#ef4444' : '#94a3b8';
      const rawLines = p.value.replace(/\n+$/, '').split('\n');
      rawLines.forEach((ln, li) => {
        out.push({
          key: `${idx}-${li}`,
          sign,
          color,
          text: ln === '' ? ' ' : ln,
          changed: p.added || p.removed,
        });
      });
      if (p.added) addedCount += rawLines.length;
      if (p.removed) removedCount += rawLines.length;
    });
    return { lines: out, added: addedCount, removed: removedCount, changes: addedCount + removedCount };
  }, [textA, textB]);

  const visibleLines = onlyDiff ? lines.filter((l) => l.changed) : lines;

  const unifiedText = useMemo(
    () => lines.map((l) => `${l.sign} ${l.text}`).join('\n'),
    [lines],
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

  const download = () => {
    if (!unifiedText) {
      message.warning('暂无对比结果');
      return;
    }
    const blob = new Blob([unifiedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `文本差异_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('已下载差异文本');
  };

  const runHint = (!textA.trim() || !textB.trim()) && (textA || textB);

  return (
    <div className="space-y-5">
      {/* 输入区 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <FileText size={15} />, text: '左侧原文', color: '#fff' })}
        >
          <Input.TextArea
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            placeholder="在此粘贴原始文本..."
            autoSize={{ minRows: 10, maxRows: 22 }}
            className="ck-code"
            style={{ fontSize: 13, background: '#f8fafc', lineHeight: 1.7 }}
          />
        </AccentCard>
        <AccentCard
          accent="#10b981"
          title={PanelTitle({ icon: <FileText size={15} />, text: '右侧对比文', color: '#fff' })}
        >
          <Input.TextArea
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
            placeholder="在此粘贴用于对比的文本..."
            autoSize={{ minRows: 10, maxRows: 22 }}
            className="ck-code"
            style={{ fontSize: 13, background: '#f8fafc', lineHeight: 1.7 }}
          />
        </AccentCard>
      </div>

      {/* 配置 / 操作区 */}
      <Card className="ck-rise" styles={{ body: cardBodyStyle }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {lines.length > 0 ? (
              <>
                <Tag color="success" style={{ borderRadius: 6 }}>新增 {added} 行</Tag>
                <Tag color="error" style={{ borderRadius: 6 }}>删除 {removed} 行</Tag>
                <Tag color="default" style={{ borderRadius: 6 }}>共 {changes} 处差异</Tag>
              </>
            ) : (
              <span style={{ fontSize: 13, color: '#94a3b8' }}>粘贴两段文本后自动对比</span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
              仅看差异
              <Switch size="small" checked={onlyDiff} onChange={setOnlyDiff} />
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<Copy size={14} />} onClick={copy} disabled={!lines.length}>
              复制差异
            </Button>
            <Button type="primary" icon={<Download size={14} />} onClick={download} disabled={!lines.length}>
              下载差异
            </Button>
          </div>
        </div>
        {runHint && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#b45309' }}>
            提示：请同时在左侧与右侧填入文本后再对比。
          </div>
        )}
      </Card>

      {/* 输出区 */}
      <AccentCard
        accent="#10b981"
        title={PanelTitle({ icon: <GitCompareArrows size={15} />, text: '差异结果', color: '#fff' })}
      >
        <div
          style={{
            background: '#0f172a',
            borderRadius: 10,
            padding: 14,
            minHeight: 180,
            maxHeight: 520,
            overflow: 'auto',
          }}
        >
          {visibleLines.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>// 差异结果将在此呈现...</div>
          ) : (
            <pre
              className="ck-code"
              style={{ margin: 0, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
            >
              {visibleLines.map((l) => (
                <div key={l.key} style={{ color: l.color }}>
                  <span style={{ userSelect: 'none', opacity: 0.6 }}>{l.sign} </span>
                  {l.text}
                </div>
              ))}
            </pre>
          )}
        </div>
      </AccentCard>
    </div>
  );
}
