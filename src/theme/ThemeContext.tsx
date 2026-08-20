import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ThemeConfig } from 'antd';

/**
 * 主题色上下文：预设色板 + 持久化。
 * - 主色可切换，刷新后从 localStorage 恢复。
 * - 成功/警告/错误保持固定语义色，仅「主色/信息」随主题变化，保证可读性。
 */
export interface ThemePreset {
  /** 中文名（切换器展示） */
  name: string;
  /** 主色（同时驱动 antd colorPrimary / Menu 选中 / 面包屑当前项 / 各类强调色） */
  primary: string;
  primaryHover: string;
  /** 浅色柔化背景，用于 Tag / 信息卡 */
  primarySoft: string;
  primaryBorder: string;
  primaryText: string;
  /** 信息提示卡的语义色（与主色同色系） */
  infoBg: string;
  infoBorder: string;
  infoText: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { name: '沉稳蓝', primary: '#2563eb', primaryHover: '#1d4ed8', primarySoft: '#eff6ff', primaryBorder: '#bfdbfe', primaryText: '#1d4ed8', infoBg: '#eff6ff', infoBorder: '#bfdbfe', infoText: '#1d4ed8' },
  { name: '优雅紫', primary: '#7c3aed', primaryHover: '#6d28d9', primarySoft: '#f5f3ff', primaryBorder: '#ddd6fe', primaryText: '#6d28d9', infoBg: '#f5f3ff', infoBorder: '#ddd6fe', infoText: '#6d28d9' },
  { name: '翠绿', primary: '#059669', primaryHover: '#047857', primarySoft: '#ecfdf5', primaryBorder: '#a7f3d0', primaryText: '#047857', infoBg: '#ecfdf5', infoBorder: '#a7f3d0', infoText: '#047857' },
  { name: '玫红', primary: '#e11d48', primaryHover: '#be123c', primarySoft: '#fff1f2', primaryBorder: '#fecdd3', primaryText: '#be123c', infoBg: '#fff1f2', infoBorder: '#fecdd3', infoText: '#be123c' },
  { name: '琥珀', primary: '#d97706', primaryHover: '#b45309', primarySoft: '#fffbeb', primaryBorder: '#fde68a', primaryText: '#b45309', infoBg: '#fffbeb', infoBorder: '#fde68a', infoText: '#b45309' },
  { name: '青碧', primary: '#0891b2', primaryHover: '#0e7490', primarySoft: '#ecfeff', primaryBorder: '#a5f3fc', primaryText: '#0e7490', infoBg: '#ecfeff', infoBorder: '#a5f3fc', infoText: '#0e7490' },
];

const STORAGE_KEY = 'codekit-theme-primary';

export function resolvePreset(primary?: string): ThemePreset {
  return (
    THEME_PRESETS.find((p) => p.primary.toLowerCase() === (primary ?? '').toLowerCase()) ??
    THEME_PRESETS[0]
  );
}

/** 由主色生成完整的 antd 主题配置（语义色固定，主色/信息色跟随） */
export function buildAntdTheme(primary: string): ThemeConfig {
  const preset = resolvePreset(primary);
  return {
    token: {
      colorPrimary: preset.primary,
      colorInfo: preset.primary,
      colorSuccess: '#10b981',
      colorWarning: '#f59e0b',
      colorError: '#ef4444',
      colorTextBase: '#0f172a',
      colorText: '#0f172a',
      colorTextSecondary: '#475569',
      colorTextTertiary: '#94a3b8',
      colorTextQuaternary: '#cbd5e1',
      colorBorder: '#e2e8f0',
      colorBorderSecondary: '#e2e8f0',
      colorBgLayout: '#f8fafc',
      colorBgContainer: '#ffffff',
      borderRadius: 8,
      fontSize: 14,
      fontFamily:
        'Outfit, "PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
    },
    components: {
      Menu: {
        darkItemBg: '#0f172a',
        darkSubMenuItemBg: '#111827',
        darkItemSelectedBg: preset.primary,
        darkItemSelectedColor: '#ffffff',
        darkItemColor: 'rgba(255,255,255,0.68)',
        darkItemHoverColor: '#ffffff',
        itemBorderRadius: 8,
        itemHeight: 40,
        itemMarginInline: 8,
      },
      Layout: {
        siderBg: '#0f172a',
        headerBg: '#ffffff',
        headerHeight: 48,
        headerPadding: '0 16px',
      },
      Table: {
        headerBg: '#f8fafc',
        headerColor: '#64748b',
        headerSplitColor: '#e2e8f0',
        borderColor: '#e2e8f0',
        rowHoverBg: '#f8fafc',
      },
      Button: {
        borderRadius: 8,
        controlHeight: 36,
        fontWeight: 500,
      },
      Input: {
        controlHeight: 36,
        borderRadius: 8,
      },
      Card: {
        borderRadiusLG: 12,
        borderRadiusSM: 8,
      },
      Tag: {
        borderRadiusSM: 6,
      },
      Breadcrumb: {
        itemColor: '#64748b',
        lastItemColor: preset.primary,
        separatorColor: '#cbd5e1',
      },
    },
  };
}

interface ThemeCtxValue {
  preset: ThemePreset;
  primary: string;
  setPrimary: (primary: string) => void;
}

const ThemeCtx = createContext<ThemeCtxValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [primary, setPrimaryState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || THEME_PRESETS[0].primary;
    } catch {
      return THEME_PRESETS[0].primary;
    }
  });

  // 运行时覆写 CSS 设计令牌，保证 Tailwind 工具类与 :root 变量一致
  useEffect(() => {
    const root = document.documentElement;
    const preset = resolvePreset(primary);
    root.style.setProperty('--color-primary', preset.primary);
    root.style.setProperty('--color-primary-hover', preset.primaryHover);
    root.style.setProperty('--color-primary-soft', preset.primarySoft);
  }, [primary]);

  const setPrimary = (p: string) => {
    setPrimaryState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* localStorage 不可用时静默降级 */
    }
  };

  const value = useMemo<ThemeCtxValue>(
    () => ({ preset: resolvePreset(primary), primary, setPrimary }),
    [primary],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeCtxValue {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useTheme 必须在 ThemeProvider 内部使用');
  return v;
}
