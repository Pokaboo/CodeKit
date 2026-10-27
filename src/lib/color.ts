/**
 * 颜色工具纯函数层：HEX / RGB / HSL 互转、WCAG 对比度、Tailwind 色阶匹配。
 * 与 React 解耦，可单独测试。
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/* ---------- 解析 ---------- */

/** 解析 #rgb / #rgba / #rrggbb / #rrggbbaa（忽略 alpha） */
export function hexToRgb(hex: string): RGB | null {
  let h = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]+$/.test(h)) return null;
  if (h.length === 3 || h.length === 4) {
    h = h
      .slice(0, 3)
      .split('')
      .map((c) => c + c)
      .join('');
  } else if (h.length === 6 || h.length === 8) {
    h = h.slice(0, 6);
  } else {
    return null;
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** 解析 rgb(255,0,0) / rgba(255 0 0 / 50%) / hsl(0,100%,50%) 等写法 */
export function parseColor(input: string): RGB | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  if (raw.startsWith('#')) return hexToRgb(raw);

  const rgbMatch = raw.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(/[,/\s]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const nums = parts.slice(0, 3).map((p) => (p.endsWith('%') ? (parseFloat(p) * 255) / 100 : parseFloat(p)));
    if (nums.some((n) => Number.isNaN(n))) return null;
    return { r: clamp(Math.round(nums[0]), 0, 255), g: clamp(Math.round(nums[1]), 0, 255), b: clamp(Math.round(nums[2]), 0, 255) };
  }

  const hslMatch = raw.match(/^hsla?\(([^)]+)\)$/);
  if (hslMatch) {
    const parts = hslMatch[1].split(/[,/\s]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]);
    const l = parseFloat(parts[2]);
    if ([h, s, l].some((n) => Number.isNaN(n))) return null;
    return hslToRgb({ h, s, l });
  }

  return null;
}

/* ---------- 转换 ---------- */

export function rgbToHex({ r, g, b }: RGB): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;
  let rgb: [number, number, number] = [0, 0, 0];
  if (hn < 60) rgb = [c, x, 0];
  else if (hn < 120) rgb = [x, c, 0];
  else if (hn < 180) rgb = [0, c, x];
  else if (hn < 240) rgb = [0, x, c];
  else if (hn < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
  };
}

export function formatRgb(rgb: RGB): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function formatHsl(hsl: HSL): string {
  return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
}

/* ---------- WCAG 对比度 ---------- */

/** 相对亮度（WCAG 2.1 定义） */
export function relativeLuminance({ r, g, b }: RGB): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** 对比度：1 ~ 21 */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

export interface WcagResult {
  ratio: number;
  /** 普通字号（< 18pt / 14pt bold） */
  aa: boolean;
  aaa: boolean;
  /** 大字号（≥ 18pt / 14pt bold） */
  aaLarge: boolean;
  aaaLarge: boolean;
  /** 界面用等级标签 */
  grade: 'AAA' | 'AA' | 'AA Large' | 'Fail';
}

export function wcagResult(ratio: number): WcagResult {
  const aaLarge = ratio >= 3;
  const aaaLarge = ratio >= 4.5;
  const aa = ratio >= 4.5;
  const aaa = ratio >= 7;
  const grade: WcagResult['grade'] = aaa ? 'AAA' : aa ? 'AA' : aaLarge ? 'AA Large' : 'Fail';
  return { ratio, aa, aaa, aaLarge, aaaLarge, grade };
}

/* ---------- Tailwind 色阶 ---------- */

export const TAILWIND_SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const;

/** Tailwind 默认调色板（sRGB 十六进制近似值，v3 / v4 通用） */
export const TAILWIND_PALETTE: Record<string, string[]> = {
  slate: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#020617'],
  gray: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827', '#030712'],
  zinc: ['#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b', '#09090b'],
  neutral: ['#fafafa', '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040', '#262626', '#171717', '#0a0a0a'],
  stone: ['#fafaf9', '#f5f5f4', '#e7e5e4', '#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#44403c', '#292524', '#1c1917', '#0c0a09'],
  red: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'],
  orange: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12', '#431407'],
  amber: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'],
  yellow: ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12', '#422006'],
  lime: ['#f7fee7', '#ecfccb', '#d9f99d', '#bef264', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212', '#365314', '#1a2e05'],
  green: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'],
  emerald: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'],
  teal: ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a', '#042f2e'],
  cyan: ['#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63', '#083344'],
  sky: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#082f49'],
  blue: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'],
  indigo: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#1e1b4b'],
  violet: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#2e1065'],
  purple: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87', '#3b0764'],
  fuchsia: ['#fdf4ff', '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75', '#4a044e'],
  pink: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843', '#500724'],
  rose: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337', '#4c0519'],
};

export interface TailwindMatch {
  name: string;
  shade: string;
  hex: string;
  /** 与目标色的 RGB 欧氏距离 */
  distance: number;
}

/** 找出最接近的 N 个 Tailwind 色阶 */
export function nearestTailwind(rgb: RGB, limit = 6): TailwindMatch[] {
  const all: TailwindMatch[] = [];
  Object.entries(TAILWIND_PALETTE).forEach(([name, shades]) => {
    shades.forEach((hex, i) => {
      const c = hexToRgb(hex);
      if (!c) return;
      all.push({
        name,
        shade: TAILWIND_SHADES[i],
        hex,
        distance: Math.sqrt((c.r - rgb.r) ** 2 + (c.g - rgb.g) ** 2 + (c.b - rgb.b) ** 2),
      });
    });
  });
  return all.sort((a, b) => a.distance - b.distance).slice(0, limit);
}

/** 生成同一色相的 50~950 色阶（保持 HSL 色相/饱和度，按亮度递减） */
export function generateScale(rgb: RGB): { shade: string; hex: string; textOn: string }[] {
  const { h, s } = rgbToHsl(rgb);
  const lightness = [97, 94, 86, 76, 66, 55, 46, 38, 30, 23, 15];
  return TAILWIND_SHADES.map((shade, i) => {
    const hex = rgbToHex(hslToRgb({ h, s: Math.min(s * 1.05, 100), l: lightness[i] }));
    const lum = relativeLuminance(hexToRgb(hex)!);
    return { shade, hex, textOn: lum > 0.5 ? '#0f172a' : '#ffffff' };
  });
}
