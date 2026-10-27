import type { Plugin } from 'prettier';

/**
 * 代码美化：prettier standalone 按需动态加载。
 * 这样 prettier 及其插件会被拆成独立 chunk，只有用到代码美化时才下载，
 * 避免主包再增加 1MB+ 体积。
 */

export type CodeLang = 'html' | 'css' | 'scss' | 'less' | 'js' | 'ts' | 'json' | 'vue';

export interface FormatOptions {
  language: CodeLang;
  indent: number;
  printWidth: number;
  semi: boolean;
  singleQuote: boolean;
  bracketSpacing: boolean;
}

export const LANGUAGE_OPTIONS: { value: CodeLang; label: string; parser: string }[] = [
  { value: 'html', label: 'HTML', parser: 'html' },
  { value: 'css', label: 'CSS', parser: 'css' },
  { value: 'scss', label: 'SCSS', parser: 'scss' },
  { value: 'less', label: 'Less', parser: 'less' },
  { value: 'js', label: 'JavaScript', parser: 'babel' },
  { value: 'ts', label: 'TypeScript', parser: 'typescript' },
  { value: 'json', label: 'JSON', parser: 'json' },
  { value: 'vue', label: 'Vue SFC', parser: 'vue' },
];

const PLACEHOLDER: Record<CodeLang, string> = {
  html: '<div class="card"><h1>Hello</h1><p>CodeKit</p></div>',
  css: '.card{display:flex;gap:8px;color:#2563eb}',
  scss: '.card{&__title{font-weight:600;}&__body{margin:0}}',
  less: '.card{ .title{font-weight:600;} }',
  js: "const user={id:1,name:'CodeKit'};function greet(u){return `hi ${u.name}`}",
  ts: 'interface User{id:number;name:string} const u:User={id:1,name:"CodeKit"}',
  json: '{"id":1,"name":"CodeKit","tags":["a","b"]}',
  vue: '<template><div class="card">{{ title }}</div></template><script setup>const title = "CodeKit"</script>',
};

export function placeholderFor(lang: CodeLang): string {
  return PLACEHOLDER[lang];
}

/** 按语言动态加载对应插件，未涉及的语言不会进入产物 */
async function loadPlugins(lang: CodeLang): Promise<Plugin[]> {
  switch (lang) {
    case 'html':
    case 'vue': {
      const html = await import('prettier/plugins/html');
      return [html as unknown as Plugin];
    }
    case 'css':
    case 'scss':
    case 'less': {
      const postcss = await import('prettier/plugins/postcss');
      return [postcss as unknown as Plugin];
    }
    case 'ts': {
      const [typescript, estree] = await Promise.all([
        import('prettier/plugins/typescript'),
        import('prettier/plugins/estree'),
      ]);
      return [typescript as unknown as Plugin, estree as unknown as Plugin];
    }
    case 'js':
    case 'json':
    default: {
      const [babel, estree] = await Promise.all([
        import('prettier/plugins/babel'),
        import('prettier/plugins/estree'),
      ]);
      return [babel as unknown as Plugin, estree as unknown as Plugin];
    }
  }
}

/** 调用 prettier 格式化；prettier 本身也按需加载 */
export async function formatCode(code: string, opts: FormatOptions): Promise<string> {
  if (!code.trim()) throw new Error('请先输入需要美化的代码');

  const prettier = await import('prettier/standalone');
  const plugins = await loadPlugins(opts.language);
  const parser = LANGUAGE_OPTIONS.find((l) => l.value === opts.language)?.parser ?? 'babel';

  const base = {
    parser,
    plugins,
    tabWidth: opts.indent,
    printWidth: opts.printWidth,
    useTabs: false,
    semi: opts.semi,
    singleQuote: opts.singleQuote,
    bracketSpacing: opts.bracketSpacing,
  };

  try {
    return await prettier.format(code, base);
  } catch (e) {
    // JSON 解析器在不同 prettier 版本下命名不一致，做一次兜底
    if (parser === 'json') {
      return await prettier.format(code, { ...base, parser: 'json-stringify' });
    }
    throw e;
  }
}
