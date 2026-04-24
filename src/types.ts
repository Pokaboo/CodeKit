export type ToolCategory = 'JSON' | 'XML' | 'SQL' | 'OTHER';

export type SubTool = 'FORMAT' | 'COMPRESS' | 'VALIDATE' | 'TRANSFORM' | 'SCHEMA' | 'TO_XML';

export interface JavaConfig {
  useLombok: boolean;
  getterSetter: boolean;
  camelCase: boolean;
  jackson: boolean;
}
