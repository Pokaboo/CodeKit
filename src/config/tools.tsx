import { lazy, type ComponentType, type ReactNode } from 'react';
import {
  FileJson,
  Braces,
  Database,
  ShieldCheck,
  Wrench,
  AlignLeft,
  Minimize2,
  Terminal,
  Code2,
  ArrowLeftRight,
  Hash,
  Lock,
  Unlock,
  Image as ImageIcon,
  Languages,
  Binary,
  GitCompare,
  Sheet,
  FileText,
  Clock,
  CalendarClock,
  Calendar,
  Timer,
  FlaskConical,
  TimerReset,
  Webhook,
  Repeat,
  Link,
  Unlink,
  Calculator,
  KeyRound,
  Regex,
  FileUp,
  Palette,
  FileCode2,
  GitCompareArrows,
  QrCode,
  Shuffle,
  BarChart3,
  FileType2,
  Type,
  Wand2,
} from 'lucide-react';
import type { CategoryConfig, ToolConfig } from '../types';
import ExcelCompareWorkspace from '../components/compare/ExcelCompareWorkspace';
import TextCompareWorkspace from '../components/compare/TextCompareWorkspace';
import JsonDiffWorkspace from '../components/compare/JsonDiffWorkspace';
import NowWorkspace from '../components/time/NowWorkspace';
import TsToDateWorkspace from '../components/time/TsToDateWorkspace';
import DateToTsWorkspace from '../components/time/DateToTsWorkspace';
import TimeDiffWorkspace from '../components/time/TimeDiffWorkspace';
import CronWorkspace from '../components/testing/CronWorkspace';
import WebSocketWorkspace from '../components/testing/WebSocketWorkspace';
import RegexTesterWorkspace from '../components/testing/RegexTesterWorkspace';
import UuidWorkspace from '../components/convert/UuidWorkspace';
import ColorWorkspace from '../components/frontend/ColorWorkspace';
import QrWorkspace from '../components/generator/QrWorkspace';
import MockWorkspace from '../components/generator/MockWorkspace';
import TextStatsWorkspace from '../components/text/TextStatsWorkspace';
import EscapeWorkspace from '../components/text/EscapeWorkspace';

// 代码美化：prettier 体量较大，整个工作台按需加载（React.lazy + 路由 Suspense）
const CodeFormatWorkspace = lazy(() => import('../components/frontend/CodeFormatWorkspace'));
import {
  formatJson,
  compressJson,
  jsonToXml,
  jsonToJava,
  formatXml,
  compressXml,
  xmlToJson,
  validateXml,
  formatSql,
  compressSql,
  toInClause,
  md5Hash,
  base64Encode,
  base64Decode,
  utf8ToGbk,
  gbkToUtf8,
  asciiEncode,
  asciiDecode,
  urlEncode,
  urlDecode,
  baseConvert,
} from '../lib/processors';

/**
 * 工具注册表：菜单、路由、页面组件的唯一数据源。
 * 新增工具 = 此处 +1 条记录（必要时在 lib/processors.ts 加处理器）。
 */
export const categories: CategoryConfig[] = [
  {
    id: 'json',
    label: 'JSON 工具',
    description: 'JSON 美化、压缩、转换与 Java 实体生成',
    tools: [
      {
        key: 'format',
        label: 'JSON 美化',
        description: '标准缩进格式化，自动对齐层级结构',
        placeholder: '{\n  "id": 1,\n  "name": "CodeKit"\n}',
        process: formatJson,
        hint: { text: '使用标准代码缩进，自动对齐属性与层级结构。', tone: 'info' },
        outputFile: 'output.json',
      },
      {
        key: 'compress',
        label: 'JSON 压缩',
        description: '移除所有空白字符，极限压缩体积',
        placeholder: '{\n  "id": 1,\n  "name": "CodeKit"\n}',
        process: compressJson,
        hint: { text: '移除冗余字符，极限压缩文件大小。', tone: 'warning' },
        outputFile: 'output.json',
      },
      {
        key: 'to-java',
        label: 'JSON 转 Java',
        description: '一键生成 Java 实体类，支持 Lombok',
        placeholder: '{\n  "id": 1,\n  "user_name": "CodeKit",\n  "active": true\n}',
        process: jsonToJava,
        options: [
          { key: 'useLombok', label: '使用 Lombok', subLabel: '添加 @Data 注解', defaultValue: true },
          { key: 'camelCase', label: '驼峰命名', subLabel: '自动转换下划线', defaultValue: true },
          { key: 'jackson', label: 'Jackson 注解', subLabel: '添加 @JsonProperty', defaultValue: false },
        ],
        hint: { text: '基于 JSON 结构生成标准化的 Java 实体类骨架。', tone: 'info' },
        outputFile: 'UserEntity.java',
      },
      {
        key: 'to-xml',
        label: 'JSON 转 XML',
        description: '基于 XML 1.0 规范自动映射层级',
        placeholder: '{\n  "root": {\n    "id": 1,\n    "name": "CodeKit"\n  }\n}',
        process: jsonToXml,
        hint: { text: '采用标准 XML 1.0 规范，自动处理层级映射与格式缩进。', tone: 'success' },
        outputFile: 'output.xml',
      },
    ],
  },
  {
    id: 'xml',
    label: 'XML 工具',
    description: 'XML 美化、压缩、验证与 JSON 互转',
    tools: [
      {
        key: 'format',
        label: 'XML 美化',
        description: 'XML 结构美化输出',
        placeholder: '<root><id>1</id><name>CodeKit</name></root>',
        process: formatXml,
        hint: { text: '解析并重建 XML，输出缩进规范的格式。', tone: 'info' },
        outputFile: 'output.xml',
      },
      {
        key: 'compress',
        label: 'XML 压缩',
        description: 'XML 内容压缩为单行',
        placeholder: '<root>\n  <id>1</id>\n</root>',
        process: compressXml,
        hint: { text: '移除多余空白与换行，压缩 XML 体积。', tone: 'warning' },
        outputFile: 'output.xml',
      },
      {
        key: 'to-json',
        label: 'XML 转 JSON',
        description: '将 XML 文档解析为结构化 JSON',
        placeholder: '<root>\n  <id>1</id>\n  <name>CodeKit</name>\n</root>',
        process: xmlToJson,
        hint: { text: '将 XML 文档解析为结构化 JSON 对象，保留属性与文本节点。', tone: 'success' },
        outputFile: 'output.json',
      },
      {
        key: 'validate',
        label: 'XML 验证',
        description: '校验 XML 文档合法性',
        placeholder: '<root>\n  <id>1</id>\n</root>',
        process: validateXml,
        hint: { text: '校验 XML 语法与结构是否合法，非法文档将报错提示。', tone: 'danger' },
        outputFile: 'output.txt',
      },
    ],
  },
  {
    id: 'sql',
    label: 'SQL 工具',
    description: 'SQL 美化、压缩与列表转换',
    tools: [
      {
        key: 'format',
        label: 'SQL 美化',
        description: 'SQL 语句标准缩进与格式化',
        placeholder: 'SELECT id, name FROM users WHERE status = 1 ORDER BY id;',
        process: formatSql,
        hint: { text: '基于词法解析的 SQL 标准格式化，关键字自动对齐。', tone: 'info' },
        outputFile: 'output.sql',
      },
      {
        key: 'compress',
        label: 'SQL 压缩',
        description: '合并多余空白为单行',
        placeholder: 'SELECT id, name\nFROM users\nWHERE status = 1;',
        process: compressSql,
        hint: { text: '压缩为单行，自动保护字符串字面量内的空白。', tone: 'warning' },
        outputFile: 'output.sql',
      },
      {
        key: 'to-in',
        label: '列表转 IN',
        description: '换行/逗号列表转换为 IN 子句',
        placeholder: '1001\n1002\n1003',
        process: toInClause,
        hint: { text: '将换行、逗号分隔的原始数据列表，自动转换为可用于 WHERE 子句的 IN (...) 集合。', tone: 'warning' },
        outputFile: 'output.sql',
      },
    ],
  },
  {
    id: 'crypto',
    label: '加解密工具',
    description: 'MD5、Base64、GBK 与 ASCII 编解码',
    tools: [
      {
        key: 'md5',
        label: 'MD5 加密',
        description: '单向不可逆哈希，输出 32 位摘要',
        placeholder: '请输入需要加密的文本...',
        process: md5Hash,
        hint: { text: 'MD5 为单向不可逆哈希算法，输出固定 32 位十六进制字符串。', tone: 'info' },
        outputFile: 'output.md5',
      },
      {
        key: 'base64-encode',
        label: 'Base64 编码',
        description: '文本 → Base64 字符串，支持中文',
        placeholder: '请输入需要编码的原始文本（支持中文）...',
        process: base64Encode,
        hint: { text: '将任意文本（含中文）编码为标准 Base64 字符串，支持 UTF-8 全字符集。', tone: 'info' },
        outputFile: 'output.b64',
      },
      {
        key: 'base64-decode',
        label: 'Base64 解码',
        description: 'Base64 字符串 → 原始文本',
        placeholder: '请输入需要解码的 Base64 字符串...',
        process: base64Decode,
        hint: { text: '将 Base64 字符串还原为原始文本，自动处理 UTF-8 编码。', tone: 'success' },
        outputFile: 'output.txt',
      },
      {
        key: 'image-to-base64',
        label: '图片转 Base64',
        description: '上传图片，输出 Base64 Data URL',
        placeholder: '',
        accept: 'image',
        hint: { text: '将图片文件转换为 Base64 Data URL，可嵌入 HTML/CSS 使用。', tone: 'info' },
        outputFile: 'output.dataurl',
      },
      {
        key: 'utf8-to-gbk',
        label: 'UTF-8 → GBK',
        description: '文本编码为 GBK 字节（Hex）',
        placeholder: '请输入中文文本，将输出 GBK Hex 字节序列...',
        process: utf8ToGbk,
        hint: { text: '使用浏览器编码能力将文本转为 GBK 字节并以 Hex 展示。', tone: 'warning' },
        outputFile: 'output.txt',
      },
      {
        key: 'gbk-to-utf8',
        label: 'GBK → UTF-8',
        description: 'GBK Hex 字节序列解码为文本',
        placeholder: '请输入 GBK Hex 字节（空格分隔，例: D6 D0 CE C4）...',
        process: gbkToUtf8,
        hint: { text: '将空格分隔的 GBK Hex 字节序列解码为 UTF-8 文本。', tone: 'warning' },
        outputFile: 'output.txt',
      },
      {
        key: 'ascii-encode',
        label: 'ASCII 编码',
        description: '文本 → 十进制 ASCII / Unicode 码点',
        placeholder: '请输入文本，将转为十进制码点序列...',
        process: asciiEncode,
        hint: { text: '将文本转换为十进制 ASCII 码，非 ASCII 字符输出 Unicode 码点。', tone: 'info' },
        outputFile: 'output.ascii',
      },
      {
        key: 'ascii-decode',
        label: 'ASCII 解码',
        description: '十进制码点序列 → 原始文本',
        placeholder: '请输入空格分隔的十进制码点（例: 72 101 108 108 111）...',
        process: asciiDecode,
        hint: { text: '将空格分隔的十进制码点序列还原为原始文本。', tone: 'success' },
        outputFile: 'output.txt',
      },
      {
        key: 'file-to-base64',
        label: '文件转 Base64',
        description: '上传任意文件，输出 Data URL 或纯 Base64',
        placeholder: '',
        accept: 'file',
        hint: {
          text: '支持图片、PDF、压缩包、字体等任意文件，读取与转换全部在浏览器本地完成，不会上传。',
          tone: 'info',
        },
        outputFile: 'output.base64',
      },
    ],
  },
  {
    id: 'convert',
    label: '转换工具',
    description: 'URL 编解码、进制转换与 UUID 生成',
    tools: [
      {
        key: 'url-encode',
        label: 'URL 编码',
        description: '对文本进行 URL 编码（encodeURIComponent）',
        placeholder: 'https://example.com/搜索?q=测试',
        process: urlEncode,
        hint: {
          text: '基于 encodeURIComponent 标准编码，适合对查询参数、路径片段进行转义。',
          tone: 'info',
        },
        outputFile: 'output.txt',
      },
      {
        key: 'url-decode',
        label: 'URL 解码',
        description: '将 URL 编码字符串还原为原始文本',
        placeholder: 'https%3A%2F%2Fexample.com%2F%E6%90%9C%E7%B4%A2%3Fq%3D%E6%B5%8B%E8%AF%95',
        process: urlDecode,
        hint: { text: '还原 encodeURIComponent 编码结果，非法序列将提示错误。', tone: 'success' },
        outputFile: 'output.txt',
      },
      {
        key: 'base-convert',
        label: '进制转换',
        description: '十进制 / 二进制 / 八进制 / 十六进制互转',
        placeholder: '255\n0xFF\n0b1010\n0o17',
        process: baseConvert,
        hint: {
          text: '支持 0x(十六) / 0b(二) / 0o(八) 前缀或纯十进制输入，自动识别并输出四种进制表示。',
          tone: 'info',
        },
        outputFile: 'output.txt',
      },
      {
        key: 'uuid',
        label: 'UUID 生成器',
        description: '生成符合 RFC 4122 的 UUID v4',
        placeholder: '',
        customWorkspace: UuidWorkspace,
        hint: {
          text: '基于 crypto.getRandomValues 生成 UUID v4，支持批量、大写与去横线。',
          tone: 'info',
        },
      },
    ],
  },
  {
    id: 'text',
    label: '文本工具',
    description: '文本统计与 Unicode / HTML / JS / JSON 转义',
    tools: [
      {
        key: 'stats',
        label: '文本统计',
        description: '字符数、UTF-8 字节、行数、词数实时统计',
        placeholder: '',
        customWorkspace: TextStatsWorkspace,
        hint: {
          text: '边输入边统计字符数、UTF-8 字节数、行数、段落数与中英文占比，适合校验字段长度限制。',
          tone: 'info',
        },
      },
      {
        key: 'escape',
        label: '转义工具',
        description: 'Unicode / HTML 实体 / JS / JSON 字符串互转',
        placeholder: '',
        customWorkspace: EscapeWorkspace,
        hint: {
          text: '支持 Unicode（\\uXXXX）、HTML 实体、JS 字符串与 JSON 字符串的双向转换，编码/解码一键切换。',
          tone: 'info',
        },
      },
    ],
  },
  {
    id: 'frontend',
    label: '前端工具',
    description: '颜色换算、WCAG 对比度、HTML/CSS/JS 美化',
    tools: [
      {
        key: 'color',
        label: '颜色工具',
        description: 'HEX / RGB / HSL 互转、对比度检测与 Tailwind 色阶',
        placeholder: '',
        customWorkspace: ColorWorkspace,
        hint: {
          text: '输入任意颜色，实时得到 HEX / RGB / HSL 三种表示，并给出 WCAG 对比度等级与最接近的 Tailwind 色阶。',
          tone: 'info',
        },
      },
      {
        key: 'code-format',
        label: '代码美化',
        description: 'HTML / CSS / SCSS / JS / TS / Vue 格式化',
        placeholder: '',
        customWorkspace: CodeFormatWorkspace as unknown as ComponentType<{ tool: ToolConfig }>,
        hint: {
          text: '基于 prettier 本地格式化，引擎按需加载（独立 chunk）；支持缩进、行宽、分号与引号风格配置。',
          tone: 'info',
        },
      },
    ],
  },
  {
    id: 'generator',
    label: '生成工具',
    description: '二维码生成解析与 Mock 数据生成',
    tools: [
      {
        key: 'qr',
        label: '二维码生成 / 解析',
        description: '文本转二维码，或从图片中识别二维码内容',
        placeholder: '',
        customWorkspace: QrWorkspace,
        hint: {
          text: '生成支持容错等级、尺寸、留白与配色自定义；解析支持拖入图片本地识别，内容不出浏览器。',
          tone: 'info',
        },
      },
      {
        key: 'mock',
        label: 'Mock 数据生成',
        description: '按字段名或 JSON 模板生成模拟数据',
        placeholder: '',
        customWorkspace: MockWorkspace,
        hint: {
          text: '按字段名语义（name / email / phone / price…）生成假数据，也可粘贴 JSON 模板批量复制结构。',
          tone: 'info',
        },
      },
    ],
  },
  {
    id: 'compare',
    label: '数据对比工具',
    description: 'Excel、文本与 JSON 的差异比对，可导出结果',
    tools: [
      {
        key: 'excel',
        label: 'Excel 对比',
        description: '上传两份列结构相同的 Excel，按关键列匹配并导出差异',
        placeholder: '',
        customWorkspace: ExcelCompareWorkspace,
        hint: {
          text: '选择关键列（如 ID）对齐两表，系统逐列比对并生成差异明细，可一键导出 Excel。',
          tone: 'info',
        },
      },
      {
        key: 'text',
        label: '文本对比',
        description: '粘贴两段文本，输出不一致的行级差异',
        placeholder: '',
        customWorkspace: TextCompareWorkspace,
        hint: {
          text: '左侧原文、右侧对比文，点击对比后以红/绿标注新增与删除的行。',
          tone: 'info',
        },
      },
      {
        key: 'json',
        label: 'JSON 对比',
        description: '按 key 与数组下标逐层对齐，输出路径级差异',
        placeholder: '',
        customWorkspace: JsonDiffWorkspace,
        hint: {
          text: '结构化比对两个 JSON：对象按 key、数组按下标递归展开，直接给出 $.user.name 这类路径级差异。',
          tone: 'info',
        },
      },
    ],
  },
  {
    id: 'time',
    label: '时间转换工具',
    description: '时间戳与日期互转、时区切换、时间差与倒计时',
    tools: [
      {
        key: 'now',
        label: '当前时间戳',
        description: '实时显示秒级/毫秒级时间戳与常用格式',
        placeholder: '',
        customWorkspace: NowWorkspace,
        hint: {
          text: '实时刷新当前时间戳（秒级/毫秒级）及多种本地化格式，支持一键复制。',
          tone: 'info',
        },
      },
      {
        key: 'ts-to-date',
        label: '时间戳转日期',
        description: '时间戳按自定义格式与 UTC/本地时区转为日期',
        placeholder: '',
        customWorkspace: TsToDateWorkspace,
        hint: {
          text: '输入时间戳，选择单位与 UTC/本地时区，使用 YYYY-MM-DD HH:mm:ss 等自定义格式输出。',
          tone: 'info',
        },
      },
      {
        key: 'date-to-ts',
        label: '日期转时间戳',
        description: '选择日期时间并输出对应秒级/毫秒级时间戳',
        placeholder: '',
        customWorkspace: DateToTsWorkspace,
        hint: {
          text: '选择日期时间（可切换本地/UTC 解析），一键得到对应的秒级与毫秒级时间戳。',
          tone: 'info',
        },
      },
      {
        key: 'diff',
        label: '时间差 / 倒计时',
        description: '计算两时间差值并实时倒计时到目标时间',
        placeholder: '',
        customWorkspace: TimeDiffWorkspace,
        hint: {
          text: '选择起止时间计算差值（天/时/分/秒），并可实时倒计时到目标时间。',
          tone: 'info',
        },
      },
    ],
  },
  {
    id: 'testing',
    label: '在线测试工具',
    description: 'Cron 表达式生成与 WebSocket 连接测试',
    tools: [
      {
        key: 'cron',
        label: 'Cron 表达式生成器',
        description: '可视化配置字段，实时校验并推算执行时间',
        placeholder: '',
        customWorkspace: CronWorkspace,
        hint: {
          text: '通过下拉与输入配置秒/分/时/日/月/周，实时预览表达式，支持合法性校验与后续执行时间推算。',
          tone: 'info',
        },
      },
      {
        key: 'websocket',
        label: 'WebSocket 测试',
        description: '连接测试、消息收发日志与心跳检测',
        placeholder: '',
        customWorkspace: WebSocketWorkspace,
        hint: {
          text: '输入 WebSocket 地址即可连接测试，支持自定义消息、心跳检测与自动重连。',
          tone: 'info',
        },
      },
      {
        key: 'regex',
        label: '正则测试器',
        description: '实时高亮匹配、分组明细与替换预览',
        placeholder: '',
        customWorkspace: RegexTesterWorkspace,
        hint: {
          text: '输入表达式与测试文本，实时高亮命中位置、列出捕获分组，并支持 $1 等占位符的替换预览。',
          tone: 'info',
        },
      },
    ],
  },
  {
    id: 'more',
    label: '更多规划中',
    description: 'JWT 调试器、HTTP 请求测试、JSONPath 等持续更新',
    tools: [],
  },
];

/** 分类 → 图标映射（一级菜单图标） */
export const categoryIcons: Record<string, ReactNode> = {
  json: <FileJson size={16} />,
  xml: <Braces size={16} />,
  sql: <Database size={16} />,
  crypto: <ShieldCheck size={16} />,
  convert: <Repeat size={16} />,
  text: <Type size={16} />,
  frontend: <Palette size={16} />,
  generator: <Wand2 size={16} />,
  compare: <GitCompare size={16} />,
  time: <Clock size={16} />,
  testing: <FlaskConical size={16} />,
  more: <Wrench size={16} />,
};

/** 工具 → 图标映射（二级菜单图标） */
export const toolIcons: Record<string, ReactNode> = {
  format: <AlignLeft size={14} />,
  compress: <Minimize2 size={14} />,
  'to-java': <Terminal size={14} />,
  'to-xml': <Code2 size={14} />,
  'to-json': <ArrowLeftRight size={14} />,
  'to-in': <ArrowLeftRight size={14} />,
  validate: <ShieldCheck size={14} />,
  md5: <Hash size={14} />,
  'base64-encode': <Lock size={14} />,
  'base64-decode': <Unlock size={14} />,
  'image-to-base64': <ImageIcon size={14} />,
  'utf8-to-gbk': <Languages size={14} />,
  'gbk-to-utf8': <Languages size={14} />,
  'ascii-encode': <Binary size={14} />,
  'ascii-decode': <Binary size={14} />,
  excel: <Sheet size={14} />,
  text: <FileText size={14} />,
  now: <Clock size={14} />,
  'ts-to-date': <CalendarClock size={14} />,
  'date-to-ts': <Calendar size={14} />,
  diff: <Timer size={14} />,
  cron: <TimerReset size={14} />,
  websocket: <Webhook size={14} />,
  'url-encode': <Link size={14} />,
  'url-decode': <Unlink size={14} />,
  'base-convert': <Calculator size={14} />,
  uuid: <KeyRound size={14} />,
  'file-to-base64': <FileUp size={14} />,
  stats: <BarChart3 size={14} />,
  escape: <FileType2 size={14} />,
  color: <Palette size={14} />,
  'code-format': <FileCode2 size={14} />,
  qr: <QrCode size={14} />,
  mock: <Shuffle size={14} />,
  json: <GitCompareArrows size={14} />,
  regex: <Regex size={14} />,
};

/** 全量工具 key → 所属分类 查找（路由/面包屑用） */
export function findCategory(catId: string): CategoryConfig | undefined {
  return categories.find((c) => c.id === catId);
}

export function findTool(pathname: string): { category: CategoryConfig; tool: CategoryConfig['tools'][number] } | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 2) return null;
  const category = findCategory(parts[0]);
  if (!category) return null;
  const tool = category.tools.find((t) => t.key === parts[1]);
  return tool ? { category, tool } : null;
}
