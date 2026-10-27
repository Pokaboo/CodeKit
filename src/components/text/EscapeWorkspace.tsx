import { useMemo, useState } from 'react';
import { App, Button, Card, Input, Segmented, Switch } from 'antd';
import { ArrowLeftRight, Copy, FileCode2, FileType2 } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle, cardBodyStyle } from '../compare/parts';
import { escapeText, htmlEscape, unicodeEscape, type EscapeKind } from '../../lib/textTools';

const KINDS: { value: EscapeKind; label: string; encodeTip: string; decodeTip: string }[] = [
  {
    value: 'unicode',
    label: 'Unicode',
    encodeTip: '文本 → \\uXXXX（中文会变成转义序列）',
    decodeTip: '\\uXXXX → 文本',
  },
  {
    value: 'html',
    label: 'HTML 实体',
    encodeTip: '文本 → &amp; / &#123; 等实体',
    decodeTip: 'HTML 实体 → 文本',
  },
  {
    value: 'js',
    label: 'JS 字符串',
    encodeTip: '文本 → 单行 JS 字符串内容（\\n、\\" 等）',
    decodeTip: 'JS 转义序列 → 文本',
  },
  {
    value: 'json',
    label: 'JSON 字符串',
    encodeTip: '文本 → 可直接放进 JSON 双引号内的内容',
    decodeTip: 'JSON 转义内容 → 文本',
  },
];

export default function EscapeWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();

  const [kind, setKind] = useState<EscapeKind>('unicode');
  const [decode, setDecode] = useState(false);
  const [input, setInput] = useState('CodeKit 让开发更省心 🚀');
  const [onlyNonAscii, setOnlyNonAscii] = useState(true);

  const current = KINDS.find((k) => k.value === kind) ?? KINDS[0];

  const output = useMemo(() => {
    if (!input) return '';
    try {
      if (kind === 'unicode' && !decode) return unicodeEscape(input, onlyNonAscii);
      if (kind === 'html' && !decode) return htmlEscape(input, false);
      return escapeText(input, kind, decode);
    } catch (e) {
      return `// 转换失败：${e instanceof Error ? e.message : '请检查输入'}`;
    }
  }, [input, kind, decode, onlyNonAscii]);

  const copy = async () => {
    if (!output) {
      message.warning('暂无可复制内容');
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败，请手动选择');
    }
  };

  const swap = () => {
    setInput(output);
    setDecode((v) => !v);
  };

  return (
    <div className="space-y-5">
      <Card className="ck-rise" styles={{ body: cardBodyStyle }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Segmented
              value={kind}
              onChange={(v) => setKind(v as EscapeKind)}
              options={KINDS.map((k) => ({ value: k.value, label: k.label }))}
            />
            <Segmented
              value={decode ? 'decode' : 'encode'}
              onChange={(v) => setDecode(v === 'decode')}
              options={[
                { value: 'encode', label: '编码' },
                { value: 'decode', label: '解码' },
              ]}
            />
            {kind === 'unicode' && !decode && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
                仅转义非 ASCII
                <Switch size="small" checked={onlyNonAscii} onChange={setOnlyNonAscii} />
              </span>
            )}
          </div>
          <Button icon={<ArrowLeftRight size={14} />} onClick={swap} disabled={!output}>
            结果回填并反向
          </Button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
          {decode ? current.decodeTip : current.encodeTip}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <FileType2 size={15} />, text: decode ? '转义内容' : '原始文本', color: '#fff' })}
          extra={
            <Button
              type="text"
              size="small"
              style={{ color: 'rgba(255,255,255,0.88)' }}
              onClick={() => setInput('')}
            >
              清空
            </Button>
          }
        >
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={decode ? '粘贴需要解码的内容（如 \\u4e2d\\u6587）...' : '输入需要转义的文本...'}
            autoSize={{ minRows: 12, maxRows: 22 }}
            className="ck-code"
            style={{ fontSize: 13, background: '#f8fafc', lineHeight: 1.8 }}
          />
        </AccentCard>

        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <FileCode2 size={15} />, text: decode ? '还原结果' : '转义结果', color: '#fff' })}
          extra={
            <Button
              type="text"
              size="small"
              icon={<Copy size={12} />}
              style={{ color: 'rgba(255,255,255,0.88)' }}
              onClick={() => void copy()}
            >
              复制
            </Button>
          }
        >
          <div
            className="ck-code"
            style={{
              background: '#0f172a',
              borderRadius: 10,
              padding: 14,
              minHeight: 280,
              maxHeight: 480,
              overflow: 'auto',
              fontSize: 13,
              lineHeight: 1.8,
              color: '#d1d5db',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {output || '// 结果将在此实时呈现...'}
          </div>
        </AccentCard>
      </div>

      <Card styles={{ body: cardBodyStyle }} className="ck-rise">
        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.9 }}>
          Unicode：非 BMP 字符（如 emoji）会输出为代理对 <span className="ck-code">\ud83d\ude80</span>，与 Java / JS 行为一致，可直接还原。
          HTML：命名实体优先（<span className="ck-code">&amp;amp;</span>、<span className="ck-code">&amp;quot;</span>），中文等非 ASCII 输出为数字实体。
          JS 字符串：输出不含首尾引号，方便直接粘进代码；JSON 字符串同样不含引号。
        </div>
      </Card>
    </div>
  );
}
