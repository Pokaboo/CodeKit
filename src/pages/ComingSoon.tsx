import { useTheme } from '../theme/ThemeContext';

const ACCENT = '#8b5cf6';

const STAGES = [
  { icon: '✅', label: '已上线' },
  { icon: '🚧', label: '进行中' },
  { icon: '💭', label: '规划中' },
];

export default function ComingSoon() {
  const { preset } = useTheme();
  const primary = preset.primary;

  return (
    <div
      style={{
        minHeight: '68vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(120% 120% at 50% 0%, #eef2ff 0%, #f8fafc 55%)',
        borderRadius: 16,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: 104,
            lineHeight: 1,
            display: 'inline-block',
            animation: 'ck-bounce 1.8s ease-in-out infinite',
            filter: 'drop-shadow(0 10px 18px rgba(37,99,235,.18))',
          }}
        >
          📦
        </div>
        <div
          style={{
            width: 96,
            height: 16,
            background: '#cbd5e1',
            borderRadius: '50%',
            margin: '6px auto 0',
            animation: 'ck-shadow 1.8s ease-in-out infinite',
          }}
        />
        <h1
          style={{
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: '-.5px',
            marginTop: 18,
            backgroundImage: `linear-gradient(90deg, ${primary}, ${ACCENT})`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          更多神器，在路上
        </h1>
        <div style={{ fontSize: 15, color: '#475569', marginTop: 6 }}>
          程序员正以蜗牛时速狂奔 🐌
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
            background: preset.primarySoft,
            color: primary,
            padding: '7px 16px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 0 4px rgba(16,185,129,.22)',
              animation: 'ck-blink 1.3s infinite',
            }}
          />
          在写了
        </div>

        <div
          style={{
            width: 260,
            height: 8,
            background: '#e2e8f0',
            borderRadius: 999,
            margin: '22px auto 0',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: '99%',
              borderRadius: 999,
              background: `linear-gradient(90deg, ${primary}, ${ACCENT})`,
              backgroundSize: '200% 100%',
              animation: 'ck-shimmer 1.4s linear infinite',
            }}
          />
        </div>
        <div
          style={{
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 12,
            color: '#94a3b8',
            marginTop: 8,
          }}
        >
          加载中… 99%
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 30, justifyContent: 'center' }}>
          {STAGES.map((s, i) => (
            <div
              key={s.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 999,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 500,
                animation: `ck-bob 2.4s ease-in-out ${i * 0.3}s infinite`,
              }}
            >
              <span>{s.icon}</span>
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
