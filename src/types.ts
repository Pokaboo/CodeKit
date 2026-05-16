export type ToolCategory = 'JSON' | 'XML' | 'SQL' | 'OTHER';

export type JsonSubTool = 'FORMAT' | 'COMPRESS' | 'TO_XML' | 'TO_JAVA';
export type XmlSubTool = 'FORMAT' | 'COMPRESS' | 'TO_JSON' | 'TO_JAVA';
export type SqlSubTool = 'FORMAT' | 'COMPRESS' | 'TO_IN';

export type SubTool = JsonSubTool | XmlSubTool | SqlSubTool;

export interface JavaConfig {
  useLombok: boolean;
  getterSetter: boolean;
  camelCase: boolean;
  jackson: boolean;
}

export interface ToolDefinition {
  id: SubTool;
  label: string;
  description: string;
  icon: string;
}

export interface CategoryConfig {
  category: ToolCategory;
  label: string;
  tools: ToolDefinition[];
}
