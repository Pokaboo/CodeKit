/** 工具分类（一级菜单） */
export type CategoryId = 'json' | 'xml' | 'sql' | 'crypto' | 'more';

/** 工具选项（配置面板的开关项） */
export interface ToolOption {
  key: string;
  label: string;
  subLabel?: string;
  defaultValue: boolean;
}

/** 提示卡片的色调（收敛为 4 种 antd 语义色） */
export type HintTone = 'info' | 'success' | 'warning' | 'danger';

/** 工具定义（叶子节点，与菜单/路由一一对应） */
export interface ToolConfig {
  /** 工具 key，与分类组合为路由 path，如 format → json/format */
  key: string;
  label: string;
  description: string;
  placeholder: string;
  /** 输入模式：文本或图片上传 */
  accept?: 'text' | 'image';
  /** 纯函数处理器：input + options → output。返回 Promise 以支持异步（如 GBK 编码） */
  process?: (input: string, options: Record<string, boolean>) => string | Promise<string>;
  /** 配置面板开关项 */
  options?: ToolOption[];
  /** 提示卡片 */
  hint?: { text: string; tone: HintTone };
  /** 输出面板 tab 名 */
  outputFile?: string;
}

/** 分类定义（一级菜单） */
export interface CategoryConfig {
  id: CategoryId;
  label: string;
  description: string;
  tools: ToolConfig[];
}
