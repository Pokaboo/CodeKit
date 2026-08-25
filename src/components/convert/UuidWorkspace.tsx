import { useState } from 'react';
import { App, Button, Select, Switch, Typography } from 'antd';
import { Copy, KeyRound, RefreshCw } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle } from '../compare/parts';
import { highlightCode } from '../../lib/highlight';

/** 生成符合 RFC 4122 的 UUID v4 */
function uuidV4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // 版本号 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // 变体位 10xx
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

const COUNT_OPTIONS = [1, 5, 10, 20, 50].map((n) => ({ value: n, label: `${n} 个` }));

export default function UuidWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();
  const [count, setCount] = useState(1);
  const [upper, setUpper] = useState(false);
  const [noHyphen, setNoHyphen] = useState(false);
  const [output, setOutput] = useState('');

  const generate = () => {
    const n = Math.min(Math.max(count, 1), 100);
    const list = Array.from({ length: n }, () => {
      let u = uuidV4();
      if (upper) u = u.toUpperCase();
      if (noHyphen) u = u.replace(/-/g, '');
      return u;
    });
    setOutput(list.join('\n'));
    message.success(`已生成 ${n} 个 UUID`);
  };

  const copy = async () => {
    if (!output) {
      message.warning('暂无可复制内容');
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败，请手动复制');
    }
  };

  const highlighted = highlightCode(output, 'uuid.txt');

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <AccentCard
        accent={primary}
        title={PanelTitle({ icon: <KeyRound size={15} />, text: 'UUID 生成配置', color: '#fff' })}
      >
        <div className="flex flex-col gap-4">
          <div>
            <div style={{ fontSize: 13, color: '#0f172a', marginBottom: 6 }}>生成数量</div>
            <Select
              value={count}
              onChange={setCount}
              style={{ width: '100%' }}
              options={COUNT_OPTIONS}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
            <div>
              <div style={{ fontSize: 13, color: '#0f172a' }}>大写字母</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>输出全大写格式</div>
            </div>
            <Switch size="small" checked={upper} onChange={setUpper} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
            <div>
              <div style={{ fontSize: 13, color: '#0f172a' }}>去除横线</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>紧凑无分隔符形式</div>
            </div>
            <Switch size="small" checked={noHyphen} onChange={setNoHyphen} />
          </div>
          <Button
            type="primary"
            icon={<RefreshCw size={14} />}
            onClick={generate}
            block
            className="ck-btn-rise"
            style={{ height: 38 }}
          >
            生成 UUID
          </Button>
        </div>
      </AccentCard>

      <AccentCard
        accent={primary}
        title={PanelTitle({ icon: <KeyRound size={15} />, text: '生成结果', color: '#fff' })}
        extra={
          <Button
            type="text"
            size="small"
            icon={<Copy size={12} />}
            style={{ color: '#ffffff' }}
            onClick={() => void copy()}
          >
            复制
          </Button>
        }
      >
        <div style={{ background: '#0f172a', borderRadius: 10, overflow: 'hidden' }}>
          <div
            className="ck-code"
            style={{
              background: '#1e293b',
              padding: '6px 14px',
              borderBottom: '1px solid #334155',
              color: '#93c5fd',
              fontSize: 12,
            }}
          >
            uuid.txt
          </div>
          <Typography.Paragraph
            className="ck-code"
            style={{
              margin: 0,
              padding: 14,
              color: '#d1d5db',
              fontSize: 13,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              minHeight: 180,
              lineHeight: 1.7,
            }}
          >
            {output ? (
              <span className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
            ) : (
              '// 点击「生成 UUID」后结果将在此呈现...'
            )}
          </Typography.Paragraph>
        </div>
      </AccentCard>
    </div>
  );
}
