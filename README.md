<div align="center">

# ⚡ CodeKit

**让开发更省心**

一站式程序员在线工具箱，专注 JSON / XML / SQL 等常用数据格式的处理与转换。

全量本地运算，不上传任何数据，保护开发者隐私。

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 📸 预览

> 启动项目后访问 `http://localhost:3000` 即可体验

---

## ✨ 功能特性

### 🔷 JSON 工具

| 功能 | 说明 |
|------|------|
| **美化 (Format)** | 标准缩进格式化，自动对齐层级结构 |
| **压缩 (Compress)** | 移除所有空白字符，极限压缩体积 |
| **转 Java POJO** | 一键将 JSON 转为 Java 实体类，支持 Lombok `@Data`、驼峰命名转换 |
| **转 XML** | 基于 XML 1.0 规范，自动处理层级映射与格式缩进 |

### 🔷 XML 工具

| 功能 | 说明 |
|------|------|
| **美化 (Format)** | XML 结构美化输出 |
| **压缩 (Compress)** | XML 内容压缩 |
| **转 JSON** | 将 XML 文档解析为结构化 JSON 对象 |

### 🔷 SQL 工具

| 功能 | 说明 |
|------|------|
| **美化 (Format)** | SQL 语句标准缩进与关键字高亮格式化 |
| **压缩 (Compress)** | 合并多余空白，将 SQL 压缩为单行 |
| **转 IN 查询** | 将换行/逗号分隔的列表数据，自动转换为 `IN (...)` 子句 |

### 🔷 开发辅助工具

| 分类 | 工具 | 说明 |
|------|------|------|
| **在线测试** | **正则测试器** | 实时高亮命中、捕获分组明细与 `$1` 替换预览，内置常用表达式 |
| **加解密** | **文件转 Base64** | 上传任意文件，输出 Data URL 或纯 Base64（本地读取） |
| **前端** | **颜色工具** | HEX/RGB/HSL 互转、WCAG 对比度检测、Tailwind 色阶匹配与生成 |
| **前端** | **代码美化** | HTML / CSS / SCSS / Less / JS / TS / Vue / JSON（prettier 按需加载） |
| **数据对比** | **JSON 对比** | 对象按 key、数组按下标逐层对齐，输出 `$.user.name` 路径级差异 |
| **生成** | **二维码生成 / 解析** | 自定义尺寸、留白、容错等级与配色；拖入图片本地识别 |
| **生成** | **Mock 数据生成** | 按字段名语义或 JSON 模板生成假数据，支持中英文数据 |
| **文本** | **文本统计** | 字符数、UTF-8 字节、行数、段落数、词数与中英文占比实时统计 |
| **文本** | **转义工具** | Unicode（`\uXXXX`）、HTML 实体、JS 字符串、JSON 字符串双向转换 |

### 🔮 更多工具（规划中）

- JWT 调试器 (JWT Debugger)
- HTTP 请求测试（受 CORS 限制，需评估方案）
- JSONPath 查询 / JSON Schema 生成

---

## 🏗️ 项目架构

```
CodeKit/
├── index.html                  # 应用入口 HTML
├── vite.config.ts              # Vite 构建配置（含 Tailwind CSS 插件）
├── tsconfig.json               # TypeScript 编译配置
├── package.json                # 项目依赖与脚本
│
└── src/
    ├── main.tsx                # 入口：ConfigProvider（主题）+ antd App + 路由
    ├── App.tsx                 # 纯入口组件
    ├── index.css               # 全局样式 + 设计令牌
    ├── theme.ts                # Ant Design 主题令牌（视觉规范）
    ├── vite-env.d.ts           # Vite 客户端类型声明
    ├── types.ts                # 工具/分类类型定义
    │
    ├── config/
    │   └── tools.tsx           # 工具注册表（菜单/路由/页面的唯一数据源）
    │
    ├── lib/
    │   ├── utils.ts            # cn() 类名合并
    │   ├── processors.ts       # 纯函数处理器（json/xml/sql/crypto）
    │   ├── color.ts            # 颜色换算、WCAG 对比度、Tailwind 色阶
    │   ├── textTools.ts        # 文本统计与各类转义
    │   ├── jsonDiff.ts         # JSON 键级结构化对比
    │   ├── mock.ts             # 字段名语义推断与 Mock 数据生成
    │   ├── codeFormat.ts       # prettier 动态加载封装
    │   ├── cron.ts             # Cron 解析与执行时间推算
    │   └── timeUtils.ts        # 时间格式化与换算
    │
    ├── layouts/
    │   └── MainLayout.tsx      # 后台布局：Sider 菜单 + 顶栏面包屑 + 内容区
    │
    ├── components/
    │   ├── ToolWorkspace.tsx   # 通用三栏工作台（输入/配置/输出/文件上传）
    │   ├── InfoCard.tsx        # 统一提示卡片
    │   ├── compare/            # Excel / 文本 / JSON 结构化对比
    │   ├── time/               # 时间戳与日期互转
    │   ├── testing/            # Cron / WebSocket / 正则测试
    │   ├── convert/            # UUID 生成
    │   ├── text/               # 文本统计、转义工具
    │   ├── frontend/           # 颜色工具、代码美化（React.lazy）
    │   └── generator/          # 二维码、Mock 数据
    │
    ├── pages/
    │   ├── ComingSoon.tsx      # 规划中页面
    │   └── NotFound.tsx        # 404 页面
    │
    ├── router/
    │   └── index.tsx           # HashRouter，由注册表生成路由
    │
    └── assets/                 # 静态资源（图标等）
```

### 核心设计：注册表驱动

- **工具注册表 `config/tools.tsx`**：分类 → 子工具（图标、占位符、处理器、配置项、提示）全部集中定义
- **菜单 / 路由 / 面包屑三端联动**：菜单项 key = 路由 path，全部由注册表推导，刷新后 URL 自动恢复选中态
- **通用工作台 `ToolWorkspace`**：所有文本类工具共用同一三栏布局，新增工具只需在注册表 +1 条

### 数据流

```
用户输入 → 侧边栏选择工具（路由切换）
         → 配置开关（注册表 options）
         → 点击「立即执行」
         → processors 纯函数处理器
         → 输出结果 → 一键复制到剪贴板
```

---

## 🛠️ 技术栈

| 分类 | 技术 | 用途 |
|------|------|------|
| **框架** | React 19 | UI 组件化渲染 |
| **语言** | TypeScript 5.8 | 类型安全 |
| **构建** | Vite 6 | 极速 HMR 开发体验 |
| **样式** | Tailwind CSS 4 + Ant Design | 原子化样式 + 企业级组件库 |
| **主题** | antd ConfigProvider | 全局视觉规范（主色 #1677ff） |
| **路由** | React Router 7 | 菜单/页面一一对应的 Hash 路由 |
| **图标** | Lucide + @ant-design/icons | 轻量 SVG 图标库 |
| **反馈** | antd message | 操作提示 |
| **JSON→XML** | fast-xml-parser | XML 解析与构建 |
| **SQL 美化** | sql-formatter | SQL 语句标准格式化 |
| **代码美化** | prettier (standalone) | 按语言动态加载的 HTML/CSS/JS/TS 格式化 |
| **二维码** | qrcode / jsQR | 二维码生成与本地图片识别 |
| **哈希** | md5 | MD5 摘要 |

---

## 🚀 快速启动

### 环境要求

- **Node.js** ≥ 18
- **npm** ≥ 9

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/Pokaboo/CodeKit.git
cd CodeKit

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

启动后访问 `http://localhost:3000`

### 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（端口 3000，支持热更新） |
| `npm run build` | 构建生产包 |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | TypeScript 类型检查 |
| `npm run clean` | 清理构建产物 |

---

## 🎨 设计理念

- **Google Material 3 风格** — 采用 Google Material Design 3 设计规范，统一的圆角卡片、色彩令牌和阴影层次
- **Chrome DevTools 体验** — Header 导航参考 Chrome 开发者工具的标签页风格，工具切换丝滑流畅
- **三栏工作台布局** — 输入区 / 配置区 / 输出区 并排排列，所见即所得的处理流程
- **全量本地化** — 所有数据处理在浏览器端完成，不依赖后端接口，零数据泄露风险

---

## 📄 License

MIT © [Pokaboo](https://github.com/Pokaboo)
