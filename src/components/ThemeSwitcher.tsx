import { Popover } from 'antd';
import { Check } from 'lucide-react';
import { THEME_PRESETS, useTheme } from '../theme/ThemeContext';

/** 顶栏主题切换器：Popover 内展示预设色板，点击即换并持久化 */
export default function ThemeSwitcher() {
  const { preset, setPrimary } = useTheme();

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      content={
        <div style={{ width: 224 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>选择主题色</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
            }}
          >
            {THEME_PRESETS.map((p) => {
              const active = p.primary === preset.primary;
              return (
                <button
                  key={p.primary}
                  type="button"
                  title={p.name}
                  onClick={() => setPrimary(p.primary)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: p.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: active
                        ? '0 0 0 2px #fff, 0 0 0 4px ' + p.primary
                        : '0 1px 3px rgba(15,23,42,0.15)',
                      transition: 'box-shadow 0.15s ease',
                    }}
                  >
                    {active && <Check size={14} color="#fff" />}
                  </span>
                  <span style={{ fontSize: 11, color: '#475569' }}>{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      }
    >
      <button
        type="button"
        title="切换主题色"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: '1px solid #e2e8f0',
          background: '#fff',
          borderRadius: 8,
          height: 32,
          padding: '0 10px',
          cursor: 'pointer',
          fontSize: 13,
          color: '#475569',
        }}
      >
        <span style={{ width: 14, height: 14, borderRadius: 4, background: preset.primary }} />
        <span>主题</span>
      </button>
    </Popover>
  );
}
