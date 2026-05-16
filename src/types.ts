export type ToolCategory = 'JSON' | 'XML' | 'SQL' | 'CRYPTO' | 'OTHER';

export type SubTool = 'FORMAT' | 'COMPRESS' | 'VALIDATE' | 'TRANSFORM' | 'SCHEMA' | 'TO_XML' | 'MD5' | 'BASE64_ENCODE' | 'BASE64_DECODE' | 'IMG_TO_BASE64' | 'UTF8_TO_GBK' | 'GBK_TO_UTF8' | 'ASCII_ENCODE' | 'ASCII_DECODE';

export interface JavaConfig {
  useLombok: boolean;
  getterSetter: boolean;
  camelCase: boolean;
  jackson: boolean;
}
