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

/** 顶部强调色卡片（与 ToolWorkspace 视觉一致）
 * 设计说明：使用整条纯色 header 横幅（白色 icon + 白色标题），替代早期 borderTop:3px 细条，
 * 避免彩色细条在白卡顶部"孤立漂浮"。配置类中性卡片请直接用 antd Card，不走此组件。 */
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
      className={`ck-rise ck-accent-card ${className ?? ''}`}
      title={title}
      extra={extra}
      styles={{
        header: {
          background: accent,
          color: '#ffffff',
          borderBottom: 'none',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        },
        body: cardBodyStyle,
      }}
      style={{ overflow: 'hidden', height: '100%' }}
    >
      {children}
    </Card>
  );
}
