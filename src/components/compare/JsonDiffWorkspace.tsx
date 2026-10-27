import { useMemo, useState } from 'react';
import { App, Button, Card, Input, Switch, Tag } from 'antd';
import { Braces, Copy, GitCompareArrows, ListTree } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle, cardBodyStyle } from '../compare/parts';
import { changesToText, diffJson, summarize, type JsonChange } from '../../lib/jsonDiff';

const SAMPLE_A = `{
  "id": 1,
  "name": "CodeKit",
  "tags": ["json", "xml"],
  "owner": { "name": "Pokaboo", "email": "dev@codekit.dev" },
  "meta": { "visits": 120, "starred": false }
}`;

const SAMPLE_B = `{
  "id": 1,
  "name": "CodeKit Pro",
  "tags": ["json", "xml", "sql"],
  "owner": { "name": "Pokaboo", "email": "hi@codekit.dev" },
  "meta": { "visits": 135, "starred": true },
  "released": true
}`;

const KIND_STYLE: Record<JsonChange['kind'], { label: string; color: string; bg: string }> = {
  added: { label: '新增', color: '#059669', bg: '#ecfdf5' },
  removed: { label: '删除', color: '#dc2626', bg: '#fef2f2' },
  changed: { label: '修改', color: '#d97706', bg: '#fffbeb' },
};

export default function JsonDiffWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();

  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [expandArray, setExpandArray] = useState(true);

  const parsed = useMemo(() => {
    const result: { a: unknown; b: unknown; errorA: string; errorB: string } = {
      a: undefined,
      b: undefined,
      errorA: '',
      errorB: '',
    };
    if (textA.trim()) {
      try {
        result.a = JSON.parse(textA);
      } catch (e) {
        result.errorA = e instanceof Error ? e.message : 'JSON 解析失败';
      }
    }
    if (textB.trim()) {
      try {
        result.b = JSON.parse(textB);
      } catch (e) {
        result.errorB = e instanceof Error ? e.message : 'JSON 解析失败';
      }
    }
    return result;
  }, [textA, textB]);

  const changes = useMemo<JsonChange[]>(() => {
    if (!textA.trim() || !textB.trim() || parsed.errorA || parsed.errorB) return [];
    return diffJson(parsed.a, parsed.b, '$', { arrayMode: expandArray ? 'index' : 'whole' });
  }, [textA, textB, parsed, expandArray]);

  const summary = useMemo(() => summarize(changes), [changes]);
  const identical = textA.trim() && textB.trim() && !parsed.errorA && !parsed.errorB && changes.length === 0;

  const copy = async () => {
    if (!changes.length) {
      message.warning('暂无可复制的差异');
      return;
    }
    try {
      await navigator.clipboard.writeText(changesToText(changes));
      message.success('差异文本已复制');
    } catch {
      message.error('复制失败，请手动选择');
    }
  };

  const fillSample = () => {
    setTextA(SAMPLE_A);
    setTextB(SAMPLE_B);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <Braces size={15} />, text: 'JSON A（基准）', color: '#fff' })}
          extra={
            <Button type="text" size="small" style={{ color: 'rgba(255,255,255,0.88)' }} onClick={fillSample}>
              填入示例
            </Button>
          }
        >
          <Input.TextArea
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            placeholder="粘贴第一个 JSON..."
            autoSize={{ minRows: 12, maxRows: 22 }}
            className="ck-code"
            status={parsed.errorA ? 'error' : undefined}
            style={{ fontSize: 13, background: '#f8fafc', lineHeight: 1.7 }}
          />
          {parsed.errorA && <div style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>A 不是合法 JSON：{parsed.errorA}</div>}
        </AccentCard>

        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <Braces size={15} />, text: 'JSON B（对比）', color: '#fff' })}
          extra={
            <Button type="text" size="small" style={{ color: 'rgba(255,255,255,0.88)' }} onClick={fillSample}>
              填入示例
            </Button>
          }
        >
          <Input.TextArea
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
            placeholder="粘贴第二个 JSON..."
            autoSize={{ minRows: 12, maxRows: 22 }}
            className="ck-code"
            status={parsed.errorB ? 'error' : undefined}
            style={{ fontSize: 13, background: '#f8fafc', lineHeight: 1.7 }}
          />
          {parsed.errorB && <div style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>B 不是合法 JSON：{parsed.errorB}</div>}
        </AccentCard>
      </div>

      <Card className="ck-rise" styles={{ body: cardBodyStyle }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Tag color="success" style={{ borderRadius: 6, margin: 0 }}>新增 {summary.added}</Tag>
            <Tag color="error" style={{ borderRadius: 6, margin: 0 }}>删除 {summary.removed}</Tag>
            <Tag color="warning" style={{ borderRadius: 6, margin: 0 }}>修改 {summary.changed}</Tag>
            <span style={{ fontSize: 13, color: '#475569' }}>共 {summary.total} 处差异</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
              数组按下标展开
              <Switch size="small" checked={expandArray} onChange={setExpandArray} />
            </span>
          </div>
          <Button icon={<Copy size={14} />} onClick={() => void copy()} disabled={!changes.length}>
            复制差异
          </Button>
        </div>
      </Card>

      <AccentCard
        accent={primary}
        title={PanelTitle({ icon: <GitCompareArrows size={15} />, text: '键级差异（按路径对齐）', color: '#fff' })}
        extra={<span style={{ color: 'rgba(255,255,255,0.88)', fontSize: 12 }}>对象按 key、数组按下标递归比对</span>}
      >
        <div style={{ maxHeight: 520, overflow: 'auto' }}>
          {!textA.trim() || !textB.trim() ? (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>// 两侧都填入合法 JSON 后自动比对</div>
          ) : identical ? (
            <div style={{ color: '#10b981', fontSize: 13 }}>两个 JSON 完全一致，无任何差异。</div>
          ) : (
            changes.map((c, i) => {
              const style = KIND_STYLE[c.kind];
              return (
                <div
                  key={`${c.path}-${i}`}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    padding: '8px 10px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 11,
                      color: style.color,
                      background: style.bg,
                      borderRadius: 4,
                      padding: '1px 6px',
                      marginTop: 2,
                    }}
                  >
                    {style.label}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ck-code" style={{ fontSize: 12.5, color: '#0f172a', wordBreak: 'break-all' }}>
                      {c.path}
                    </div>
                    <div className="ck-code" style={{ fontSize: 12, marginTop: 2, wordBreak: 'break-all' }}>
                      {c.kind !== 'added' && (
                        <span style={{ color: '#dc2626', textDecoration: 'line-through', opacity: 0.85 }}>
                          {c.beforeText}
                        </span>
                      )}
                      {c.kind === 'changed' && <span style={{ color: '#94a3b8', margin: '0 6px' }}>→</span>}
                      {c.kind !== 'removed' && <span style={{ color: '#059669' }}>{c.afterText}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {changes.length > 0 && (
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: '#94a3b8',
            }}
          >
            <ListTree size={13} />
            数组默认按下标对齐；如果两个数组元素顺序被打乱，会显示为多处修改。
          </div>
        )}
      </AccentCard>
    </div>
  );
}
