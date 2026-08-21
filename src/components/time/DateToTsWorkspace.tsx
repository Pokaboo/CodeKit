import { useState } from 'react';
import { App, Button, DatePicker, Segmented } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { Calendar, Copy } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle } from '../compare/parts';

export default function DateToTsWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();
  const [value, setValue] = useState<Dayjs | null>(null);
  const [tz, setTz] = useState<'local' | 'utc'>('local');

  let ms: number | null = null;
  if (value) {
    if (tz === 'local') ms = value.valueOf();
    else
      ms = Date.UTC(
        value.year(),
        value.month(),
        value.date(),
        value.hour(),
        value.minute(),
        value.second(),
        value.millisecond(),
      );
  }
  const sec = ms === null ? null : Math.floor(ms / 1000);

  const copy = async (text: string | null, label: string) => {
    if (text === null) {
      message.warning('请先选择日期时间');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      message.success(`${label} 已复制`);
    } catch {
      message.error('复制失败');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <AccentCard
        accent={primary}
        title={PanelTitle({ icon: <Calendar size={15} />, text: '日期时间 → 时间戳', color: '#fff' })}
      >
        <div className="flex flex-col gap-4">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
            解析时区
            <Segmented
              options={[
                { label: '本地', value: 'local' },
                { label: 'UTC', value: 'utc' },
              ]}
              value={tz}
              onChange={(v) => setTz(v as 'local' | 'utc')}
            />
          </div>
          <DatePicker
            showTime
            style={{ width: '100%', maxWidth: 360 }}
            value={value}
            onChange={(v) => setValue(v)}
            placeholder="选择日期时间"
          />
          <div>
            <Button onClick={() => setValue(dayjs())} style={{ marginRight: 8 }}>
              填入当前时间
            </Button>
            <Button onClick={() => setValue(null)}>清空</Button>
          </div>
        </div>
      </AccentCard>

      <AccentCard
        accent={primary}
        title={PanelTitle({ icon: <Calendar size={15} />, text: '转换结果', color: '#fff' })}
      >
        {ms === null ? (
          <div style={{ color: '#64748b', fontSize: 13 }}>// 选择日期时间后显示对应时间戳...</div>
        ) : (
          <div className="space-y-3">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}
            >
              <div style={{ background: '#0f172a', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>秒级（10 位）</div>
                <div className="ck-code" style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 600 }}>
                  {sec}
                </div>
              </div>
              <div style={{ background: '#0f172a', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>毫秒级（13 位）</div>
                <div className="ck-code" style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 600 }}>
                  {ms}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
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
          </div>
        )}
      </AccentCard>
    </div>
  );
}
