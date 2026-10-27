import { useMemo, useState } from 'react';
import { Alert, App, Button, Card, Checkbox, Input, Tag } from 'antd';
import { Copy, Regex, Replace, Wand2 } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle, cardBodyStyle } from '../compare/parts';

const FLAGS = [
  { value: 'g', label: 'g 全局' },
  { value: 'i', label: 'i 忽略大小写' },
  { value: 'm', label: 'm 多行' },
  { value: 's', label: 's 点匹配换行' },
  { value: 'u', label: 'u Unicode' },
  { value: 'y', label: 'y 粘性' },
];

const PRESETS: { label: string; pattern: string; sample: string }[] = [
  { label: '手机号', pattern: '1[3-9]\\d{9}', sample: '联系方式：13800138000，备用 18912345678。' },
  {
    label: '邮箱',
    pattern: '[\\w.+-]+@[\\w-]+\\.[\\w.]+',
    sample: '请联系 admin@example.com 或 support@codekit.dev',
  },
  {
    label: 'URL',
    pattern: 'https?://[^\\s"\'<>]+',
    sample: '官网 https://codekit.dev/docs?from=github 已上线。',
  },
  {
    label: 'IPv4',
    pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',
    sample: '网关 192.168.1.1，DNS 8.8.8.8',
  },
  {
    label: '日期 YYYY-MM-DD',
    pattern: '(\\d{4})-(\\d{2})-(\\d{2})',
    sample: '创建于 2024-01-05，更新于 2025-11-30',
  },
  {
    label: '中文字符',
    pattern: '[\\u4e00-\\u9fa5]+',
    sample: 'CodeKit 让开发更省心，纯本地运算。',
  },
  { label: 'HTML 标签', pattern: '<\\/?([a-zA-Z][\\w-]*)[^>]*>', sample: '<div class="card"><span>Hello</span></div>' },
  { label: '十六进制颜色', pattern: '#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b', sample: '主色 #2563eb，背景 #fff，边框 #e2e8f0' },
];

const HIT_COLORS = [
  { bg: '#dbeafe', border: '#93c5fd' },
  { bg: '#dcfce7', border: '#86efac' },
  { bg: '#fef3c7', border: '#fcd34d' },
  { bg: '#fce7f3', border: '#f9a8d4' },
];

interface MatchItem {
  index: number;
  value: string;
  groups: string[];
}

export default function RegexTesterWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();

  const [pattern, setPattern] = useState('(\\d{4})-(\\d{2})-(\\d{2})');
  const [flagList, setFlagList] = useState<string[]>(['g']);
  const [text, setText] = useState(PRESETS[4].sample);
  const [replacement, setReplacement] = useState('$1年$2月$3日');

  const flags = flagList.join('');

  const compiled = useMemo(() => {
    if (!pattern) return { regex: null as RegExp | null, error: '' };
    try {
      // 测试场景统一按全局匹配，确保能列出全部命中
      const safeFlags = flags.includes('g') ? flags : `${flags}g`;
      return { regex: new RegExp(pattern, safeFlags), error: '' };
    } catch (e) {
      return { regex: null as RegExp | null, error: e instanceof Error ? e.message : '表达式不合法' };
    }
  }, [pattern, flags]);

  const matches = useMemo<MatchItem[]>(() => {
    if (!compiled.regex || !text) return [];
    const re = new RegExp(compiled.regex.source, compiled.regex.flags);
    const out: MatchItem[] = [];
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re.exec(text)) !== null && guard < 2000) {
      out.push({ index: m.index, value: m[0], groups: m.slice(1) });
      if (m[0] === '') re.lastIndex += 1;
      guard += 1;
    }
    return out;
  }, [compiled, text]);

  const segments = useMemo(() => {
    if (!matches.length) return [{ text, hit: -1 }];
    const segs: { text: string; hit: number }[] = [];
    let cursor = 0;
    matches.forEach((m, i) => {
      if (m.index > cursor) segs.push({ text: text.slice(cursor, m.index), hit: -1 });
      segs.push({ text: m.value, hit: i % HIT_COLORS.length });
      cursor = m.index + m.value.length;
    });
    if (cursor < text.length) segs.push({ text: text.slice(cursor), hit: -1 });
    return segs;
  }, [text, matches]);

  const replaced = useMemo(() => {
    if (!compiled.regex || !replacement) return '';
    try {
      return text.replace(new RegExp(compiled.regex.source, compiled.regex.flags), replacement);
    } catch {
      return '';
    }
  }, [compiled, text, replacement]);

  const copy = async (value: string, tip: string) => {
    if (!value) {
      message.warning('暂无可复制内容');
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      message.success(tip);
    } catch {
      message.error('复制失败，请手动选择');
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* 表达式 */}
        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <Regex size={15} />, text: '正则表达式', color: '#fff' })}
          extra={
            <span className="ck-code" style={{ color: 'rgba(255,255,255,0.88)', fontSize: 12 }}>
              /{pattern || '…'}/{flags}
            </span>
          }
        >
          <div className="flex flex-col gap-3">
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="输入正则表达式，例如 (\d{4})-(\d{2})"
              className="ck-code"
              style={{ fontSize: 13, background: '#f8fafc' }}
              status={compiled.error ? 'error' : undefined}
            />
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>修饰符</div>
              <Checkbox.Group
                value={flagList}
                onChange={(v) => setFlagList(v as string[])}
                options={FLAGS.map((f) => ({ value: f.value, label: <span style={{ fontSize: 12 }}>{f.label}</span> }))}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>常用表达式</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PRESETS.map((p) => (
                  <Tag
                    key={p.label}
                    style={{ cursor: 'pointer', margin: 0, borderRadius: 6 }}
                    onClick={() => {
                      setPattern(p.pattern);
                      setText(p.sample);
                    }}
                  >
                    {p.label}
                  </Tag>
                ))}
              </div>
            </div>
            {compiled.error && <Alert type="error" showIcon message={compiled.error} style={{ fontSize: 12 }} />}
          </div>
        </AccentCard>

        {/* 测试文本 */}
        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <Wand2 size={15} />, text: '测试文本', color: '#fff' })}
          extra={
            <Button
              type="text"
              size="small"
              style={{ color: 'rgba(255,255,255,0.88)' }}
              onClick={() => setText('')}
            >
              清空
            </Button>
          }
        >
          <Input.TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="粘贴待匹配的文本..."
            autoSize={{ minRows: 11, maxRows: 20 }}
            className="ck-code"
            style={{ fontSize: 13, background: '#f8fafc', lineHeight: 1.7 }}
          />
        </AccentCard>
      </div>

      {/* 匹配结果 */}
      <AccentCard
        accent={primary}
        title={PanelTitle({ icon: <Regex size={15} />, text: '匹配结果', color: '#fff' })}
        extra={
          <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: 12 }}>
            命中 {matches.length} 处
            {matches.length >= 2000 && '（已达上限，仅显示前 2000 处）'}
          </span>
        }
      >
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 14,
            minHeight: 140,
            maxHeight: 320,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontSize: 13,
            lineHeight: 1.9,
            color: '#0f172a',
          }}
          className="ck-code"
        >
          {text ? (
            segments.map((s, i) =>
              s.hit < 0 ? (
                <span key={i}>{s.text}</span>
              ) : (
                <span
                  key={i}
                  style={{
                    background: HIT_COLORS[s.hit].bg,
                    borderBottom: `2px solid ${HIT_COLORS[s.hit].border}`,
                    borderRadius: 3,
                    padding: '0 1px',
                  }}
                >
                  {s.text}
                </span>
              ),
            )
          ) : (
            <span style={{ color: '#94a3b8' }}>// 命中结果会在此高亮展示</span>
          )}
        </div>

        {matches.length > 0 && (
          <div style={{ marginTop: 12, maxHeight: 200, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '4px 8px', width: 48 }}>#</th>
                  <th style={{ padding: '4px 8px', width: 80 }}>位置</th>
                  <th style={{ padding: '4px 8px' }}>匹配内容</th>
                  <th style={{ padding: '4px 8px' }}>分组</th>
                </tr>
              </thead>
              <tbody className="ck-code">
                {matches.slice(0, 50).map((m, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '4px 8px', color: '#94a3b8' }}>{i + 1}</td>
                    <td style={{ padding: '4px 8px', color: '#94a3b8' }}>{m.index}</td>
                    <td style={{ padding: '4px 8px', color: '#0f172a' }}>{m.value || '（空匹配）'}</td>
                    <td style={{ padding: '4px 8px', color: '#475569' }}>
                      {m.groups.length ? m.groups.map((g, gi) => `$${gi + 1}=${g ?? 'undefined'}`).join('  ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {matches.length > 50 && (
              <div style={{ padding: '6px 8px', fontSize: 12, color: '#94a3b8' }}>
                仅展示前 50 条明细，完整结果请复制下方替换文本。
              </div>
            )}
          </div>
        )}
      </AccentCard>

      {/* 替换 */}
      <Card className="ck-rise" styles={{ body: cardBodyStyle }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Replace size={15} style={{ color: primary }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>替换预览</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>支持 $1 / $&lt;name&gt; 等占位符</span>
        </div>
        <Input
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          placeholder="替换为…（例如 $1年$2月$3日）"
          className="ck-code"
          style={{ fontSize: 13, background: '#f8fafc' }}
        />
        <div
          style={{
            marginTop: 10,
            background: '#0f172a',
            borderRadius: 10,
            padding: 14,
            minHeight: 88,
            maxHeight: 240,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontSize: 13,
            lineHeight: 1.7,
            color: '#d1d5db',
          }}
          className="ck-code"
        >
          {replaced || <span style={{ color: '#64748b' }}>// 填入替换内容后在此预览结果</span>}
        </div>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <Button icon={<Copy size={14} />} onClick={() => void copy(replaced, '已复制替换结果')}>
            复制替换结果
          </Button>
        </div>
      </Card>
    </div>
  );
}
