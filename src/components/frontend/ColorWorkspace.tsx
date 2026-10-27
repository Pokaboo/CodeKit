import { useMemo, useState } from 'react';
import { App, Button, Card, Input, Tag } from 'antd';
import { Copy, Palette, Contrast, SwatchBook } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle, cardBodyStyle } from '../compare/parts';
import {
  contrastRatio,
  formatHsl,
  formatRgb,
  generateScale,
  nearestTailwind,
  parseColor,
  rgbToHex,
  rgbToHsl,
  wcagResult,
} from '../../lib/color';

function useCopy() {
  const { message } = App.useApp();
  return async (value: string, tip = '已复制') => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(tip);
    } catch {
      message.error('复制失败，请手动选择');
    }
  };
}

function ValueRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 12px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
      }}
    >
      <span style={{ fontSize: 12, color: '#94a3b8', width: 44, flexShrink: 0 }}>{label}</span>
      <span className="ck-code" style={{ flex: 1, fontSize: 13, color: '#0f172a' }}>
        {value}
      </span>
      <Button type="text" size="small" icon={<Copy size={12} />} onClick={onCopy} />
    </div>
  );
}

function Swatch({ hex, label, sub }: { hex: string; label?: string; sub?: string }) {
  const rgb = parseColor(hex);
  const light = rgb ? rgbToHsl(rgb).l > 60 : true;
  return (
    <div
      style={{
        background: hex,
        borderRadius: 8,
        height: 56,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: light ? '#0f172a' : '#ffffff',
        border: '1px solid rgba(15,23,42,0.06)',
        fontSize: 11,
        lineHeight: 1.4,
      }}
    >
      {label && <span style={{ fontWeight: 600 }}>{label}</span>}
      {sub && <span style={{ opacity: 0.75 }}>{sub}</span>}
    </div>
  );
}

export default function ColorWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();
  const copy = useCopy();

  const [hex, setHex] = useState('#2563eb');
  const [fg, setFg] = useState('#0f172a');
  const [bg, setBg] = useState('#ffffff');

  const rgb = useMemo(() => parseColor(hex), [hex]);
  const hsl = useMemo(() => (rgb ? rgbToHsl(rgb) : null), [rgb]);
  const tailwind = useMemo(() => (rgb ? nearestTailwind(rgb, 6) : []), [rgb]);
  const scale = useMemo(() => (rgb ? generateScale(rgb) : []), [rgb]);

  const fgRgb = parseColor(fg);
  const bgRgb = parseColor(bg);
  const ratio = fgRgb && bgRgb ? contrastRatio(fgRgb, bgRgb) : 0;
  const wcag = wcagResult(ratio);

  const applyColor = (next: string) => {
    setHex(next);
    message.success(`已应用 ${next}`);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 颜色输入 */}
        <AccentCard accent={primary} title={PanelTitle({ icon: <Palette size={15} />, text: '颜色值', color: '#fff' })}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <input
              type="color"
              value={rgb ? rgbToHex(rgb) : '#000000'}
              onChange={(e) => setHex(e.target.value)}
              style={{
                width: 56,
                height: 56,
                padding: 0,
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                background: 'transparent',
                cursor: 'pointer',
              }}
            />
            <Input
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              placeholder="#2563eb / rgb(37,99,235) / hsl(221,83%,53%)"
              className="ck-code"
              status={!rgb && hex ? 'error' : undefined}
              style={{ fontSize: 13, background: '#f8fafc' }}
            />
          </div>

          {rgb && hsl ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ValueRow label="HEX" value={rgbToHex(rgb)} onCopy={() => void copy(rgbToHex(rgb))} />
              <ValueRow label="RGB" value={formatRgb(rgb)} onCopy={() => void copy(formatRgb(rgb))} />
              <ValueRow label="HSL" value={formatHsl(hsl)} onCopy={() => void copy(formatHsl(hsl))} />
              <ValueRow
                label="CSS"
                value={`color: ${rgbToHex(rgb)};`}
                onCopy={() => void copy(`color: ${rgbToHex(rgb)};`)}
              />
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#ef4444' }}>无法识别该颜色，请使用 HEX / RGB / HSL 格式</div>
          )}
        </AccentCard>

        {/* 对比度 */}
        <AccentCard accent={primary} title={PanelTitle({ icon: <Contrast size={15} />, text: 'WCAG 对比度', color: '#fff' })}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>文字色</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="color"
                  value={fgRgb ? rgbToHex(fgRgb) : '#000000'}
                  onChange={(e) => setFg(e.target.value)}
                  style={{ width: 36, height: 32, padding: 0, border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}
                />
                <Input size="small" value={fg} onChange={(e) => setFg(e.target.value)} className="ck-code" />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>背景色</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="color"
                  value={bgRgb ? rgbToHex(bgRgb) : '#ffffff'}
                  onChange={(e) => setBg(e.target.value)}
                  style={{ width: 36, height: 32, padding: 0, border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}
                />
                <Input size="small" value={bg} onChange={(e) => setBg(e.target.value)} className="ck-code" />
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 30, fontWeight: 600, color: wcag.ratio >= 4.5 ? '#10b981' : '#ef4444' }}>
              {ratio.toFixed(2)}
            </span>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
              <div>对比度（1 ~ 21，≥ 4.5 为 AA）</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                <Tag color={wcag.aaa ? 'success' : 'default'} style={{ margin: 0 }}>AAA 7:1</Tag>
                <Tag color={wcag.aa ? 'success' : 'default'} style={{ margin: 0 }}>AA 4.5:1</Tag>
                <Tag color={wcag.aaLarge ? 'success' : 'default'} style={{ margin: 0 }}>大字 3:1</Tag>
              </div>
            </div>
          </div>

          <div
            style={{
              background: bgRgb ? bg : '#ffffff',
              color: fgRgb ? fg : '#0f172a',
              borderRadius: 10,
              padding: 14,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: 14 }}>普通正文 14px：让开发更省心 CodeKit</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>大号标题 20px Sample</div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
            当前等级：<strong style={{ color: wcag.grade === 'Fail' ? '#ef4444' : '#10b981' }}>{wcag.grade}</strong>
          </div>
        </AccentCard>
      </div>

      {/* Tailwind */}
      <AccentCard accent={primary} title={PanelTitle({ icon: <SwatchBook size={15} />, text: 'Tailwind 色阶', color: '#fff' })}>
        <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>最接近的官方色阶（点击应用）</div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {tailwind.map((t) => (
            <div key={`${t.name}-${t.shade}`} onClick={() => applyColor(t.hex)} style={{ cursor: 'pointer' }}>
              <Swatch hex={t.hex} label={`${t.name}-${t.shade}`} sub={t.hex} />
            </div>
          ))}
        </div>

        <div style={{ fontSize: 13, color: '#475569', margin: '16px 0 8px' }}>
          由当前颜色生成的 50 ~ 950 色阶（点击应用）
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-11">
          {scale.map((s) => (
            <div key={s.shade} onClick={() => applyColor(s.hex)} style={{ cursor: 'pointer' }}>
              <Swatch hex={s.hex} label={s.shade} sub={s.hex} />
            </div>
          ))}
        </div>
      </AccentCard>

      <Card styles={{ body: cardBodyStyle }} className="ck-rise">
        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.8 }}>
          说明：Tailwind 色阶匹配按 RGB 欧氏距离排序，仅作近似参考；生成的色阶保持当前色相与饱和度，按亮度阶梯递减。
          WCAG 2.1 中 AA 要求普通文本对比度 ≥ 4.5:1，大字（≥ 18pt 或 14pt 加粗）≥ 3:1，AAA 分别为 7:1 与 4.5:1。
        </div>
      </Card>
    </div>
  );
}
