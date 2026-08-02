# CodeKit Element 风格改造方案（React + Ant Design 主题定制）

> 日期：2026-08-02
> 路线决策：**保持 React 19 技术栈，引入 Ant Design，通过主题令牌定制为 Element UI 视觉风格**
> 前置文档：`docs/refactoring-report.md`（本方案吸收其中 P1 组件拆分 / P2 注册表化的内容，一并落地）

---

## 0. 路线说明与总体目标

Element UI / Element Plus 是 Vue 生态组件库，与现有 React 19 不兼容。经确认采用：**React + Ant Design 组件库 + 主题定制**方案——antd 提供 Menu / Layout / Table / Form / Switch 等完整组件体系，通过 `ConfigProvider` 主题令牌把主色、圆角、间距、控件高度全部调成 Element 规范，视觉上呈现经典 Element 后台风格。

**改造总目标**
1. 经典后台布局：左侧固定深色多级菜单 + 顶部栏（折叠按钮 + 面包屑）+ 内容工作区
2. 菜单 / 路由 / 面包屑三端由**单一数据源（menuConfig）**驱动，一一对应，刷新后由 URL 恢复状态
3. 17 个工具点从 App.tsx 单文件拆分为独立页面组件，挂载到各自路由
4. 全程保持"全量本地运算"产品特性不变

---

## 1. 总体布局架构

```
┌────────────────────────────────────────────────────────────┐
│ Layout (antd)                                              │
│  ┌───────────┬──────────────────────────────────────────┐ │
│  │  Sider    │  Header                                   │ │
│  │  (深色     │  [折叠按钮] [面包屑]          [GitHub]    │ │
│  │  #304156) │                                           │ │
│  │           ├──────────────────────────────────────────┤ │
│  │  Logo     │  Content (浅灰 #f0f2f5，Route Outlet)     │ │
│  │  Menu     │  ┌─────────┬─────────┬──────────────┐    │ │
│  │  一级模块  │  │ 输入面板 │ 配置面板 │  输出面板     │    │ │
│  │  └子功能   │  └─────────┴─────────┴──────────────┘    │ │
│  │  折叠按钮  │                                           │ │
│  └───────────┴──────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

- **Sider**：`breakpoint="lg"` 自动响应折叠，展开宽 220px / 折叠 64px
- **Header**：左侧折叠按钮 + 面包屑；右侧保留 GitHub 链接等
- **Content**：`<Outlet />` 渲染当前路由对应页面；保留三栏工作台（输入/配置/输出）为工具页通用布局

---

## 2. 侧边栏菜单：数据结构与配置（要点 1）

### 2.1 单一数据源 `src/config/menu.tsx`

菜单数据、路由表、面包屑全部由同一份配置推导，**key 直接作为路由 path**，保证一一对应：

```tsx
// src/config/menu.tsx
import { FileJson, Braces, Database, ShieldCheck, Wrench } from 'lucide-react';
import { JsonFormatPage } from '@/pages/json/Format';

export interface MenuItemConfig {
  key: string;              // 唯一标识，同时作为路由 path（叶子节点）
  label: string;            // 菜单文案
  icon?: React.ReactNode;   // 一级菜单图标
  children?: MenuItemConfig[]; // 子功能（二级）
  element?: React.ReactNode;   // 叶子节点对应页面组件
}

export const menuConfig: MenuItemConfig[] = [
  {
    key: 'json',
    label: 'JSON 工具',
    icon: <FileJson className="w-4 h-4" />,
    children: [
      { key: 'json/format',  label: 'JSON 美化',   element: <JsonFormatPage /> },
      { key: 'json/compress', label: 'JSON 压缩',  element: <JsonCompressPage /> },
      { key: 'json/to-java', label: 'JSON 转 Java', element: <JsonToJavaPage /> },
      { key: 'json/to-xml',  label: 'JSON 转 XML',  element: <JsonToXmlPage /> },
    ],
  },
  { key: 'xml',   label: 'XML 工具',    icon: <Braces />,     children: [/* xml/format, xml/compress, xml/to-json */] },
  { key: 'sql',   label: 'SQL 工具',    icon: <Database />,   children: [/* sql/format, sql/compress, sql/to-in */] },
  { key: 'crypto', label: '加解密工具', icon: <ShieldCheck />, children: [/* crypto/md5, crypto/base64-encode, ... */] },
  { key: 'more',  label: '更多规划中',  icon: <Wrench />,     element: <ComingSoonPage /> },
];
```

### 2.2 菜单渲染（antd Menu，多级展开/收起）

```tsx
// src/layouts/MainLayout.tsx（核心片段）
const [openKeys, setOpenKeys] = useState<string[]>(defaultOpenKeys);
const [selectedKeys, setSelectedKeys] = useState<string[]>(
  location.pathname.startsWith('/') ? [location.pathname] : []
);

<Layout.Sider trigger={null} collapsible collapsed={collapsed} breakpoint="lg"
  onBreakpoint={(broken) => setCollapsed(broken)}>
  <Menu
    theme="dark"
    mode="inline"
    items={menuItems}          // 由 menuConfig 转换（antd 要求 MenuItemType）
    openKeys={openKeys}
    selectedKeys={selectedKeys}
    onOpenChange={setOpenKeys}
    onClick={({ key }) => navigate(key)}   // 叶子 key 即路由 path
  />
</Layout.Sider>
```

- **展开/收起**：`openKeys` 受控；点击子菜单 `navigate(key)` 跳转路由
- **刷新定位**：`selectedKeys` 由 `useLocation().pathname` 推导；`openKeys` 初始值由当前路径的父级 key 计算（`useEffect` 中同步，避免受控循环）
- 折叠后 antd 自动转为图标悬浮子菜单（popup），多级结构无需额外处理

### 2.3 与既有重构报告的衔接

`menuConfig` 即上一份报告 P2 的"工具注册表"布局形态：图标、label、占位符、配置提示、处理器引用均可合并进同一配置对象，**本次改造直接产出注册表，不再单独做一轮组件拆分**（避免重复劳动）。

---

## 3. 顶部栏与面包屑（要点 2）

### 3.1 顶部栏 `Header`

| 区域 | 内容 |
|------|------|
| 左 | 折叠按钮（`MenuFoldOutlined` / `MenuUnfoldOutlined`，切换 `collapsed`）|
| 中 | `Breadcrumb` 面包屑（自动推导）|
| 右 | GitHub 链接按钮、版本徽标（保留现有元素）|

### 3.2 面包屑推导 `src/hooks/useBreadcrumb.ts`

```ts
// 输入当前 pathname，输出 [{label:'JSON 工具'}, {label:'JSON 美化'}]
export function useBreadcrumb(pathname: string): { label: string; key: string }[] {
  // 在 menuConfig 中递归查找 pathname 对应的叶子节点，
  // 收集从根到叶的 label 链返回；找不到返回 []（渲染 404 时为空）
}
```

- 面包屑每一项可点击跳转（一级项跳转第一个子项，叶子项跳转自身）
- 数据来源与菜单同一份 `menuConfig`，**不存在第二种路径文案来源**

---

## 4. 基于路由的页面切换机制（要点 3）

### 4.1 路由表由 menuConfig 生成

```tsx
// src/router/index.tsx
<BrowserRouter basename="/">   {/* 部署说明见 4.3 */}
  <Routes>
    <Route path="/" element={<MainLayout />}>
      <Route index element={<Navigate to="/json/format" replace />} />
      {buildRoutes(menuConfig)}   {/* 叶子: <Route path="json/format" element={...} /> */}
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
</BrowserRouter>
```

- 叶子节点 `key`（如 `json/format`）去掉前导 `/` 作为嵌套子路由相对 path
- **菜单项与功能页面一一对应**由同一份 `menuConfig` 保证，不会出现"菜单有、路由无"的漂移
- 根路径 `/` 重定向到首个工具页；未知路径进 404

### 4.2 刷新后恢复菜单状态

- 状态来源是 **URL**（`useLocation().pathname`），刷新天然不丢
- `MainLayout` 内 `useEffect` 监听 `location.pathname`：更新 `selectedKeys`、补齐 `openKeys`
- 组件内页面状态（输入内容）刷新即清空——如需要可后续加 `useState` 持久化到 `sessionStorage`（**本轮不做**，避免过度设计）

### 4.3 部署注意事项（重要）

| 场景 | 方案 |
|------|------|
| `npm run dev`（Vite 开发） | `BrowserRouter` 直接可用 |
| 静态托管（GitHub Pages / 对象存储） | 子路径刷新会 404 → 加 `basename` 或改用 **`HashRouter`**（最稳妥，URL 带 `#/json/format`）|
| 有服务端 rewrite 的环境 | `BrowserRouter` + 服务器统一回退到 index.html |

**务实建议**：默认使用 `HashRouter` 保证任意静态托管刷新可用；若确认部署环境支持 rewrite 再切 `BrowserRouter`。

---

## 5. Element 风格主题定制（要点 4）

### 5.1 `src/theme.ts` — 完整 token 配置

```ts
// src/theme.ts —— antd 主题令牌定制为 Element Plus 规范
import type { ThemeConfig } from 'antd';

export const elementTheme: ThemeConfig = {
  token: {
    colorPrimary: '#409EFF',      // Element 主蓝
    colorInfo: '#409EFF',
    colorSuccess: '#67C23A',
    colorWarning: '#E6A23C',
    colorError: '#F56C6C',
    colorTextBase: '#303133',     // 主文本
    colorTextSecondary: '#606266',// 常规文本
    colorTextTertiary: '#909399', // 次要文本
    colorTextQuaternary: '#C0C4CC', // 占位文本
    colorBorder: '#DCDFE6',       // 一级边框
    colorBorderSecondary: '#E4E7ED', // 细分隔线
    colorBgLayout: '#f0f2f5',     // 经典后台浅灰
    borderRadius: 4,              // Element 圆角 4px
    fontSize: 14,
    fontFamily: '"Helvetica Neue", Helvetica, "PingFang SC", "Microsoft YaHei", "Segoe UI", Arial, sans-serif',
  },
  components: {
    Button: { controlHeight: 40, borderRadius: 4 },        // Element 默认按钮高 40
    Input:  { controlHeight: 40 },                          // Element 输入框高 40
    Menu: {
      darkItemBg: '#304156',            // Element 侧边栏深蓝
      darkSubMenuItemBg: '#1f2d3d',     // 子菜单更深
      darkItemSelectedBg: '#409EFF',    // 选中项主蓝
      darkItemSelectedColor: '#ffffff',
      darkItemColor: 'rgba(255,255,255,0.65)',
      itemBorderRadius: 4,
    },
    Table: {
      headerBg: '#f5f7fa',
      headerColor: '#909399',
      headerSplitColor: '#ebeef5',
      borderColor: '#ebeef5',
      rowHoverBg: '#f5f7fa',
    },
    Modal: { borderRadiusLG: 4 },
    Card:  { borderRadiusLG: 4, borderRadiusSM: 4 },
  },
};
```

> 若希望界面更紧凑，可将 Button/Input `controlHeight` 调回 antd 默认 32。建议先按 40 落地以贴近 Element 观感，视觉验收时再统一微调。

### 5.2 接入方式

```tsx
// src/main.tsx
<ConfigProvider theme={elementTheme}>
  <App />
</ConfigProvider>
```

- antd v5 为 CSS-in-JS，无需手动 `import 'antd/dist/antd.css'`
- `index.css` 中 Tailwind 设计令牌**保留**（`cn()`、自定义工具类继续可用），antd 组件走 antd token；两者职责分离
- 工具页内输出区深色代码块（`#1e1e1e`）样式保留（编辑器观感，不强行套用 antd）

### 5.3 工具页组件替换对照

| 现有实现 | 替换为 |
|----------|--------|
| 原生 `<textarea>` | `antd Input.TextArea`（`autoSize` 自适应高度）|
| `ConfigToggle`（自绘开关）| `antd Switch`（或 `Radio.Group`）|
| 图片上传（自绘拖拽）| `antd Upload.Dragger`（`beforeUpload` 转 DataURL，保持全本地）|
| 提示卡片（renderConfig 8 分支）| 统一 `InfoCard` 组件（卡片 + 图标 + 文案，数据来自 menuConfig hint 字段）|
| 执行/复制按钮 | `antd Button type="primary"` / `Button type="text"` |
| Copy 提示 | 沿用 `react-hot-toast`（或统一 `App.useApp()` message，二选一，避免两套提示并存）|

---

## 6. 响应式处理方案（要点 5）

| 断点 | 行为 |
|------|------|
| ≥ 992px（lg） | Sider 展开 220px，内容区三栏工作台 |
| 768 – 991px（md） | Sider 自动折叠为 64px 图标栏（`breakpoint="lg"` + `onBreakpoint`），悬停弹出子菜单 |
| < 768px（sm/mobile） | 工作台转单列（输入 → 配置 → 输出纵向堆叠）；Sider 用 `Drawer` 承载（汉堡按钮唤起），避免占用视口 |

```tsx
// 移动端抽屉方案（MainLayout 片段）
const screens = Grid.useBreakpoint();
const isMobile = !screens.lg;

{isMobile ? (
  <Drawer open={drawerOpen} placement="left" width={220} closable={false}
    styles={{ body: { padding: 0 } }} onClose={() => setDrawerOpen(false)}>
    <Menu ... mode="inline" />
  </Drawer>
) : (
  <Layout.Sider ... />
)}
```

- 现有工具页 `grid-cols-1 xl:grid-cols-[...]` 断点保留，与 antd 布局叠加
- 顶部栏右侧元素窄屏隐藏文本只留图标（沿用现有 `hidden sm:inline` 手法）

---

## 7. 改动文件清单（要点 6）

### 7.1 新增依赖

```bash
npm install antd @ant-design/icons react-router-dom
```

> **React 19 兼容性**：antd ≥ 5.22 原生支持 React 19；若 npm 解析到更老版本，需安装补丁包 `npm install @ant-design/v5-patch-for-react-19` 并在入口 import 一次。

### 7.2 新增文件

| 文件 | 职责 |
|------|------|
| `src/theme.ts` | Element 风格主题令牌（§5.1）|
| `src/config/menu.tsx` | 菜单单一数据源（§2.1，含页面组件引用）|
| `src/router/index.tsx` | 路由表生成 + BrowserRouter/HashRouter（§4）|
| `src/hooks/useBreadcrumb.ts` | 面包屑推导（§3.2）|
| `src/layouts/MainLayout.tsx` | Layout 骨架：Sider + Menu + Header + Breadcrumb + Outlet + 折叠/抽屉（§2/3/6）|
| `src/pages/json/{Format,Compress,ToJava,ToXml}.tsx` | JSON 4 个工具页 |
| `src/pages/xml/{Format,Compress,ToJson}.tsx` | XML 3 个工具页 |
| `src/pages/sql/{Format,Compress,ToIn}.tsx` | SQL 3 个工具页 |
| `src/pages/crypto/{Md5,Base64Encode,Base64Decode,ImageToBase64,Utf8ToGbk,GbkToUtf8,AsciiEncode,AsciiDecode}.tsx` | CRYPTO 8 个工具页 |
| `src/pages/ComingSoon.tsx` | 规划中页 |
| `src/pages/NotFound.tsx` | 404 页 |
| `src/components/InfoCard.tsx` | 统一提示卡片（替换 renderConfig 分支）|
| `src/components/EditorPanel.tsx` | 输入面板（文本/图片双模式，antd 化）|
| `src/components/OutputPanel.tsx` | 输出面板（深色代码块 + 复制）|

### 7.3 修改文件

| 文件 | 改动 |
|------|------|
| `package.json` | 新增依赖、同步版本号 |
| `src/main.tsx` | 包 `ConfigProvider` + 路由 Provider |
| `src/App.tsx` | 逐步瘦身：布局职责移交 MainLayout，处理逻辑迁入各页面组件，最终删除（或保留为纯组合壳）|
| `src/index.css` | 保留 tokens；补充少量 antd 全局覆盖（如需）|
| `src/types.ts` | SubTool 按分类重组（伴随页面拆分同步）|
| `README.md` | 更新架构说明（目录结构、路由、主题）|

### 7.4 删除

- `App.tsx` 中 Header / Sidebar / Footer / CRYPTO 卡片 / ComingSoon / SidebarItem / ConfigToggle 等布局与子组件定义（由 layouts/pages/components 替代）

---

## 8. 分步实施顺序与注意事项（要点 6）

> 每步独立 commit、独立可回归；**先跑 `tsc --noEmit` 再手测**对应工具。

| 步骤 | 内容 | 验收标准 | 主要风险与注意点 |
|------|------|----------|------------------|
| **S1** 依赖与主题接入 | 安装 antd/icons/router；建 `theme.ts`；`main.tsx` 包 ConfigProvider；验证按钮/表格外观 | 页面外观变为 Element 配色，原功能不受影响 | ①React 19 兼容（补丁或 ≥5.22）②Tailwind preflight 与 antd 样式冲突（若按钮被重置，在 tailwind 层排除或加覆盖）③antd CSS-in-JS 无需手动引 css |
| **S2** 布局骨架 + 路由 | 建 `menuConfig`（先挂占位页）、`MainLayout`、`router/index.tsx`；`App.tsx` 整体暂时挂到一个路由下 | 侧边栏出现，点击切换空页面；面包屑随路由变化 | ①路由嵌套子 path 用相对形式 ②`openKeys` 受控避免点击循环（用 useEffect 单向同步）③部署形态未定前用 HashRouter |
| **S3** 页面拆分 | 把 App.tsx 中 CRYPTO 卡片视图、通用三栏视图、ComingSoon 依次拆为独立页面组件并挂路由 | 17 个路由全部可访问，行为与原版一致 | ①拆分是"搬移+参数传递"，不要顺手改业务逻辑 ②`EditorPanel/OutputPanel` 抽公共组件复用，避免第三遍复制 |
| **S4** 菜单数据驱动 + 面包屑 + 刷新定位 | 菜单 items 由 menuConfig 推导；`useBreadcrumb` 接入 Header；selectedKeys/openKeys 与 URL 同步 | 刷新任意工具页后菜单高亮与展开状态正确 | ①菜单 key 与路由 path 严格一致（唯一数据源）②404 路径下菜单无高亮属预期 |
| **S5** 组件 antd 化 | 逐页替换 `Input.TextArea / Switch / Upload.Dragger / Button`；renderConfig 分支换 InfoCard；统一 toast 或 message | 各工具页操作流程正常（执行/复制/图片预览） | ①Upload 保持 `beforeUpload={() => false}` 全本地 ②提示组件二选一不要双提示 |
| **S6** 响应式 + 收尾 | Sider breakpoint 折叠 + 移动端 Drawer；窄屏工作台单列；清理旧代码与未用导入；更新 README | 各断点手测通过；`tsc` 零错误 | ①折叠态菜单 icon 需显式设置（antd 折叠后只显图标）②删旧代码前先确认无引用 |

---

## 9. 风险与回退

| 风险 | 等级 | 缓解 |
|------|------|------|
| antd × React 19 兼容 | 中 | 锁定 antd ≥5.22 或打补丁包 |
| Tailwind preflight 干扰 antd 组件 | 低 | S1 阶段即验证按钮/输入框，冲突则按官方建议调整 |
| 大规模文件拆分引入回归 | 中 | S3 纯搬移 + 每步手测 + 分步 commit |
| HashRouter 与 BrowserRouter 切换成本 | 低 | 路由集中在 `router/index.tsx` 一处，可随时切换 |
| 视觉不完全等同 Element | 低 | token 集中可全局微调，验收后一次性校准 |

**回退策略**：S1/S2 完成后已具备独立价值（主题 + 布局），后续步骤若受阻可保留现状；每步独立 commit 保证可回退到任意节点。

---

## 10. 待确认事项

1. **路由模式**：默认 `HashRouter`（静态托管刷新无忧）还是 `BrowserRouter`（需确认部署环境支持 rewrite）？
2. **控件高度**：按 Element 默认 40px 落地，还是保持 antd 32px 更紧凑？
3. **提示组件**：统一改用 antd `message`（与全站风格一致）还是沿用现有 `react-hot-toast`？
4. **执行范围**：本方案 6 步全部执行，还是先执行 S1-S2（布局与路由骨架）评审后再继续？

*本方案未经批准不修改任何代码。批准并确认上述 4 项后，按 S1 → S6 逐步实施，每步完成后汇报进度。*
