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

### 🔮 更多工具（规划中）

- 正则表达式语法树引擎 (Regex Engine)
- JWT 调试器 (JWT Debugger)
- Mock 数据服务器 (Mock Server)

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
    ├── main.tsx                # React 应用挂载入口
    ├── App.tsx                 # 核心应用组件（路由、布局、业务逻辑）
    ├── index.css               # 全局样式 + Material 3 设计令牌
    ├── types.ts                # TypeScript 类型定义
    │
    ├── assets/                 # 静态资源（图标等）
    │   └── codekit-icon.png    # 应用图标
    │
    └── lib/
        └── utils.ts            # 工具函数（cn 类名合并）
```

### 核心模块说明

```
┌──────────────────────────────────────────────────────┐
│                     App.tsx                           │
│                                                      │
│  ┌─────────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │   Header    │  │ Sidebar  │  │   Main Content   │ │
│  │  导航 + 分类 │  │ 子工具栏  │  │  输入 / 配置 / 输出│ │
│  └─────────────┘  └──────────┘  └─────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │              处理引擎 (handleProcess)             │ │
│  │  JSON.parse / XMLParser / sqlFormat / POJO生成   │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌──────────────┐  ┌────────────────────────────┐   │
│  │ SidebarItem  │  │      ConfigToggle          │   │
│  │  侧边栏按钮   │  │     配置开关组件             │   │
│  └──────────────┘  └────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### 数据流

```
用户输入 → 选择工具类型 (Category + SubTool)
         → 配置参数 (JavaConfig 等)
         → 点击「立即执行」
         → handleProcess() 路由到对应处理器
         → 输出结果 → 一键复制到剪贴板
```

---

## 🛠️ 技术栈

| 分类 | 技术 | 用途 |
|------|------|------|
| **框架** | React 19 | UI 组件化渲染 |
| **语言** | TypeScript 5.8 | 类型安全 |
| **构建** | Vite 6 | 极速 HMR 开发体验 |
| **样式** | Tailwind CSS 4 | 原子化 CSS + Material 3 设计令牌 |
| **动画** | Motion (Framer Motion) | 页面切换与交互动效 |
| **图标** | Lucide React | 轻量 SVG 图标库 |
| **通知** | React Hot Toast | 操作反馈提示 |
| **JSON→XML** | fast-xml-parser | XML 解析与构建 |
| **SQL 美化** | sql-formatter | SQL 语句标准格式化 |
| **类名工具** | clsx + tailwind-merge | 条件类名合并 |

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
