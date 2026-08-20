import type { ReactNode } from 'react';
import type { HintTone } from '../types';
import { useTheme } from '../theme/ThemeContext';

/** 语义色（与 antd 色板一致）：success / warning / danger 为固定语义色；info 跟随主题主色 */
const staticTones: Record<Exclude<HintTone, 'info'>, { bg: string; border: string; text: string }> = {
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
  const { preset } = useTheme();
  const s =
    tone === 'info'
      ? { bg: preset.infoBg, border: preset.infoBorder, text: preset.infoText }
      : staticTones[tone];
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
