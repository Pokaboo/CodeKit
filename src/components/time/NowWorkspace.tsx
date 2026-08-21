import { useEffect, useState } from 'react';
import { App, Button } from 'antd';
import { Clock, Copy, RefreshCw } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle } from '../compare/parts';
import { formatDate } from '../../lib/timeUtils';

const COMMON_FORMATS = [
  'YYYY-MM-DD HH:mm:ss',
  'YYYY/MM/DD HH:mm:ss',
  'YYYY-MM-DD',
  'YYYY-MM-DD HH:mm',
  'YYYY年MM月DD日 HH时mm分ss秒',
  'HH:mm:ss',
  'dddd',
];

export default function NowWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const d = new Date(now);
  const sec = Math.floor(now / 1000);
  const ms = now;

  const copy = async (text: string, label: string) => {
    if (!text) {
      message.warning('暂无可复制内容');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      message.success(`${label} 已复制`);
    } catch {
      message.error('复制失败，请手动复制');
    }
  };

  const rows = [
    { label: '秒级时间戳', value: String(sec) },
    { label: '毫秒级时间戳', value: String(ms) },
    { label: 'ISO 8601 (UTC)', value: d.toISOString() },
    ...COMMON_FORMATS.map((f) => ({
      label: `本地格式 · ${f}`,
      value: formatDate(d, f, 'local'),
    })),
  ];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <AccentCard
        accent={primary}
        title={PanelTitle({ icon: <Clock size={15} />, text: '实时当前时间戳', color: '#fff' })}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 0 3px rgba(16,185,129,0.18)',
              animation: 'ck-pulse 1.4s infinite',
            }}
          />
          <span style={{ fontSize: 13, color: '#64748b' }}>每秒自动刷新</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
          }}
        >
          <div style={{ background: '#0f172a', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>秒级（10 位）</div>
            <div className="ck-code" style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 600 }}>
              {sec}
            </div>
          </div>
          <div style={{ background: '#0f172a', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>毫秒级（13 位）</div>
            <div className="ck-code" style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 600 }}>
              {ms}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Button icon={<Copy size={14} />} onClick={() => copy(String(sec), '秒级时间戳')}>
            复制秒级
          </Button>
          <Button
            type="primary"
            icon={<Copy size={14} />}
            onClick={() => copy(String(ms), '毫秒级时间戳')}
          >
            复制毫秒级
          </Button>
        </div>
      </AccentCard>

      <AccentCard
        accent={primary}
        title={PanelTitle({ icon: <RefreshCw size={15} />, text: '常用时间格式（本地时区）', color: '#fff' })}
      >
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {rows.map((r) => (
            <div
              key={r.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>{r.label}</div>
                <div
                  className="ck-code"
                  style={{
                    fontSize: 13,
                    color: '#0f172a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.value}
                </div>
              </div>
              <Button size="small" icon={<Copy size={13} />} onClick={() => copy(r.value, r.label)}>
                复制
              </Button>
            </div>
          ))}
        </div>
      </AccentCard>
    </div>
  );
}
