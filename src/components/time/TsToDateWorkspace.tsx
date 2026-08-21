import { useMemo, useState } from 'react';
import { App, Button, Input, Segmented, Tag } from 'antd';
import { CalendarClock, Copy } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle } from '../compare/parts';
import { formatDate, tsToMs } from '../../lib/timeUtils';

const PRESETS = [
  'YYYY-MM-DD HH:mm:ss',
  'YYYY/MM/DD HH:mm:ss',
  'YYYY-MM-DD',
  'YYYY年MM月DD日 HH时mm分ss秒',
  'HH:mm:ss',
];

export default function TsToDateWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();
  const [ts, setTs] = useState('');
  const [unit, setUnit] = useState<'auto' | '秒' | '毫秒'>('auto');
  const [tz, setTz] = useState<'local' | 'utc'>('local');
  const [fmt, setFmt] = useState('YYYY-MM-DD HH:mm:ss');

  const ms = useMemo(() => tsToMs(ts, unit), [ts, unit]);
  const d = ms === null ? null : new Date(ms);
  const result = d ? formatDate(d, fmt || 'YYYY-MM-DD HH:mm:ss', tz) : '';
  const iso = d ? d.toISOString() : '';

  const copy = async (text: string, label: string) => {
    if (!text) {
      message.warning('暂无可复制内容');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      message.success(`${label} 已复制`);
    } catch {
      message.error('复制失败');
    }
  };

  const error = ts.trim() !== '' && ms === null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <AccentCard
        accent={primary}
        title={PanelTitle({ icon: <CalendarClock size={15} />, text: '时间戳 → 日期时间', color: '#fff' })}
      >
        <div className="flex flex-col gap-4">
          <div>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>时间戳</div>
            <Input
              value={ts}
              onChange={(e) => setTs(e.target.value)}
              placeholder="如 1755792000 或 1755792000000"
              className="ck-code"
              style={{ fontSize: 14 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
              单位
              <Segmented
                options={['自动', '秒', '毫秒']}
                value={unit}
                onChange={(v) => setUnit(v as 'auto' | '秒' | '毫秒')}
              />
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
              时区
              <Segmented
                options={[
                  { label: '本地', value: 'local' },
                  { label: 'UTC', value: 'utc' },
                ]}
                value={tz}
                onChange={(v) => setTz(v as 'local' | 'utc')}
              />
            </span>
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>自定义格式</div>
            <Input
              value={fmt}
              onChange={(e) => setFmt(e.target.value)}
              placeholder="YYYY-MM-DD HH:mm:ss"
              className="ck-code"
              style={{ fontSize: 14, marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESETS.map((p) => (
                <Tag
                  key={p}
                  className="ck-btn-rise"
                  style={{ cursor: 'pointer', borderRadius: 6, padding: '2px 10px', userSelect: 'none' }}
                  onClick={() => setFmt(p)}
                >
                  {p}
                </Tag>
              ))}
            </div>
          </div>
          {error && (
            <div style={{ fontSize: 12, color: '#be123c' }}>无法解析该时间戳，请检查数字是否合法。</div>
          )}
        </div>
      </AccentCard>

      <AccentCard
        accent={primary}
        title={PanelTitle({ icon: <CalendarClock size={15} />, text: '转换结果', color: '#fff' })}
      >
        {d ? (
          <div className="space-y-3">
            <div style={{ background: '#0f172a', borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                {tz === 'utc' ? 'UTC' : '本地'} · {fmt || 'YYYY-MM-DD HH:mm:ss'}
              </div>
              <div
                className="ck-code"
                style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 600, wordBreak: 'break-all' }}
              >
                {result}
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}
            >
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>ISO 8601 (UTC)</div>
                  <div className="ck-code" style={{ fontSize: 13 }}>{iso}</div>
                </div>
                <Button size="small" icon={<Copy size={13} />} onClick={() => copy(iso, 'ISO')}>
                  复制
                </Button>
              </div>
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>秒级时间戳</div>
                  <div className="ck-code" style={{ fontSize: 13 }}>{Math.floor((ms as number) / 1000)}</div>
                </div>
                <Button
                  size="small"
                  icon={<Copy size={13} />}
                  onClick={() => copy(String(Math.floor((ms as number) / 1000)), '秒级时间戳')}
                >
                  复制
                </Button>
              </div>
            </div>
            <Button type="primary" icon={<Copy size={14} />} onClick={() => copy(result, '格式化结果')}>
              复制结果
            </Button>
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: 13 }}>// 输入时间戳后显示转换结果...</div>
        )}
      </AccentCard>
    </div>
  );
}
