import type { ReactNode } from 'react';
import { Card } from 'antd';

/** 与本站通用工作台一致的面板标题 */
export function PanelTitle({ icon, text, color }: { icon: ReactNode; text: string; color: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
      <span style={{ display: 'flex', color }}>{icon}</span>
      {text}
    </span>
  );
}

export const cardBodyStyle = { padding: 20 } as const;

/** 顶部强调色卡片（与 ToolWorkspace 视觉一致） */
export function AccentCard({
  accent,
  title,
  extra,
  children,
  className,
}: {
  accent: string;
  title: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={`ck-rise ${className ?? ''}`}
      title={title}
      extra={extra}
      styles={{ body: cardBodyStyle }}
      style={{ borderTop: `3px solid ${accent}` }}
    >
      {children}
    </Card>
  );
}
