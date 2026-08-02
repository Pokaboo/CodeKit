import type { ReactNode } from 'react';
import type { HintTone } from '../types';

/** 四类语义色（与 antd 色板一致）：info / success / warning / danger */
const toneStyles: Record<HintTone, { bg: string; border: string; text: string }> = {
  info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857' },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
  danger: { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' },
};

interface InfoCardProps {
  icon: ReactNode;
  text: string;
  tone?: HintTone;
}

/** 统一提示卡片：注册表中的 hint 由此渲染 */
export default function InfoCard({ icon, text, tone = 'info' }: InfoCardProps) {
  const s = toneStyles[tone];
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '10px 12px',
        borderRadius: 8,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
        fontSize: 12,
        lineHeight: 1.6,
      }}
    >
      <span style={{ flexShrink: 0, marginTop: 1, display: 'flex' }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
