import type { ThemeConfig } from 'antd';

/**
 * CodeKit 全局主题 ——「简约现代」风格（方案 A）
 * 主色 #2563eb（沉稳蓝），中性色 slate 色阶，圆角 8/12，正文 14px。
 */
export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#2563eb',
    colorInfo: '#2563eb',
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
      darkItemSelectedBg: '#2563eb',
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
      lastItemColor: '#2563eb',
      separatorColor: '#cbd5e1',
    },
  },
};
