import { useEffect, useState } from 'react';
import { App, Button, DatePicker, Tag } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { Timer, Copy } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle } from '../compare/parts';
import { breakdown, type Duration } from '../../lib/timeUtils';

function fmtDuration(d: Duration | null): string {
  if (!d) return '--';
  const sign = d.days < 0 ? '-' : '';
  const ad = Math.abs(d.days);
  return `${sign}${ad} 天 ${d.hours} 时 ${d.minutes} 分 ${d.seconds} 秒`;
}

export default function TimeDiffWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();
  const [start, setStart] = useState<Dayjs | null>(dayjs().subtract(1, 'day'));
  const [end, setEnd] = useState<Dayjs | null>(dayjs());
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startMs = start ? start.valueOf() : null;
  const endMs = end ? end.valueOf() : null;

  const diffRaw = startMs !== null && endMs !== null ? endMs - startMs : null;
  const diff = diffRaw === null ? null : breakdown(diffRaw);

  const countdownRaw = endMs !== null ? endMs - tick : null;
  const countdown = countdownRaw === null ? null : breakdown(countdownRaw);

  const copy = async (text: string, label: string) => {
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
        title={PanelTitle({ icon: <Timer size={15} />, text: '时间差 / 倒计时', color: '#fff' })}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>起始时间</div>
            <DatePicker
              showTime
              style={{ width: '100%' }}
              value={start}
              onChange={(v) => setStart(v)}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>结束 / 目标时间</div>
            <DatePicker showTime style={{ width: '100%' }} value={end} onChange={(v) => setEnd(v)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Button onClick={() => { setStart(dayjs()); setEnd(dayjs().add(1, 'day')); }}>
            示例：相差 1 天
          </Button>
        </div>
      </AccentCard>

      <div className="space-y-5">
        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <Timer size={15} />, text: '时间差（结束 − 起始）', color: '#fff' })}
        >
          {diff ? (
            <div className="space-y-3">
              <div style={{ background: '#0f172a', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>差值</div>
                <div className="ck-code" style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 600 }}>
                  {fmtDuration(diff)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Tag color="default" style={{ borderRadius: 6 }}>
                  总计 {diffRaw} 毫秒
                </Tag>
                <Tag color="default" style={{ borderRadius: 6 }}>
                  {(diffRaw! / 1000).toFixed(0)} 秒
                </Tag>
                <Tag color="default" style={{ borderRadius: 6 }}>
                  {(diffRaw! / 60000).toFixed(2)} 分钟
                </Tag>
                <Tag color="default" style={{ borderRadius: 6 }}>
                  {(diffRaw! / 3_600_000).toFixed(2)} 小时
                </Tag>
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: 13 }}>// 请选择起始与结束时间...</div>
          )}
        </AccentCard>

        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <Timer size={15} />, text: '倒计时到目标时间', color: '#fff' })}
        >
          {countdown ? (
            countdownRaw! > 0 ? (
              <div className="space-y-3">
                <div style={{ background: '#0f172a', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>剩余</div>
                  <div className="ck-code" style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 600 }}>
                    {fmtDuration(countdown)}
                  </div>
                </div>
                <Button icon={<Copy size={14} />} onClick={() => copy(fmtDuration(countdown), '倒计时')}>
                  复制剩余时间
                </Button>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: '#10b981' }}>✓ 目标时间已到达</div>
            )
          ) : (
            <div style={{ color: '#64748b', fontSize: 13 }}>// 请选择目标时间...</div>
          )}
        </AccentCard>
      </div>
    </div>
  );
}
