import { useMemo, useState } from 'react';
import { Alert, App, Button, Card, Input, Select, Switch } from 'antd';
import { Code2, Copy, Download, Sparkles } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle, cardBodyStyle } from '../compare/parts';
import { highlightCode } from '../../lib/highlight';
import { LANGUAGE_OPTIONS, formatCode, placeholderFor, type CodeLang } from '../../lib/codeFormat';

const FILE_BY_LANG: Record<CodeLang, string> = {
  html: 'output.html',
  css: 'output.css',
  scss: 'output.scss',
  less: 'output.less',
  js: 'output.js',
  ts: 'output.ts',
  json: 'output.json',
  vue: 'output.vue',
};

const INDENT_OPTIONS = [
  { value: 2, label: '2 空格' },
  { value: 4, label: '4 空格' },
];

const WIDTH_OPTIONS = [80, 100, 120].map((v) => ({ value: v, label: `${v} 字符` }));

export default function CodeFormatWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();

  const [language, setLanguage] = useState<CodeLang>('html');
  const [input, setInput] = useState(placeholderFor('html'));
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [indent, setIndent] = useState(2);
  const [printWidth, setPrintWidth] = useState(100);
  const [semi, setSemi] = useState(true);
  const [singleQuote, setSingleQuote] = useState(true);
  const [bracketSpacing, setBracketSpacing] = useState(true);

  const highlighted = useMemo(() => highlightCode(output, FILE_BY_LANG[language]), [output, language]);

  const run = async () => {
    if (!input.trim()) {
      message.warning('请先输入需要美化的代码');
      return;
    }
    setBusy(true);
    setError('');
    try {
      // codeFormat 内部按语言动态 import prettier 插件，仅在首次美化时下载
      const result = await formatCode(input, { language, indent, printWidth, semi, singleQuote, bracketSpacing });
      setOutput(result);
      message.success('美化完成');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '格式化失败';
      setError(msg);
      message.error('代码存在语法错误，无法美化');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败，请手动选择');
    }
  };

  const download = () => {
    if (!output) return;
    const ext = FILE_BY_LANG[language].split('.').pop() ?? 'txt';
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formatted.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('已下载格式化结果');
  };

  const switchLang = (next: CodeLang) => {
    setLanguage(next);
    setInput(placeholderFor(next));
    setOutput('');
    setError('');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <Code2 size={15} />, text: '源代码', color: '#fff' })}
          extra={
            <Button
              type="text"
              size="small"
              style={{ color: 'rgba(255,255,255,0.88)' }}
              onClick={() => {
                setInput(placeholderFor(language));
                setOutput('');
                setError('');
              }}
            >
              示例
            </Button>
          }
        >
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="粘贴需要美化的代码..."
            autoSize={{ minRows: 14, maxRows: 26 }}
            className="ck-code"
            style={{ fontSize: 13, background: '#f8fafc', lineHeight: 1.7 }}
          />
        </AccentCard>

        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <Sparkles size={15} />, text: '美化结果', color: '#fff' })}
          extra={
            <div style={{ display: 'flex', gap: 2 }}>
              <Button
                type="text"
                size="small"
                icon={<Copy size={12} />}
                style={{ color: 'rgba(255,255,255,0.88)' }}
                onClick={() => void copy()}
              >
                复制
              </Button>
              <Button
                type="text"
                size="small"
                icon={<Download size={12} />}
                style={{ color: 'rgba(255,255,255,0.88)' }}
                onClick={download}
              >
                下载
              </Button>
            </div>
          }
        >
          <div style={{ background: '#0f172a', borderRadius: 10, overflow: 'hidden' }}>
            <div
              className="ck-code"
              style={{
                background: '#1e293b',
                padding: '6px 14px',
                borderBottom: '1px solid #334155',
                color: '#93c5fd',
                fontSize: 12,
              }}
            >
              {FILE_BY_LANG[language]}
              {output && ` · ${output.split('\n').length} 行`}
            </div>
            <pre
              className="ck-code hljs"
              style={{
                margin: 0,
                padding: 14,
                fontSize: 13,
                lineHeight: 1.7,
                minHeight: 360,
                maxHeight: 560,
                overflow: 'auto',
                color: '#d1d5db',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
              dangerouslySetInnerHTML={{ __html: highlighted || '// 美化结果将在此呈现...' }}
            />
          </div>
          {error && (
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 10, fontSize: 12, whiteSpace: 'pre-wrap' }}
              message="格式化失败"
              description={error}
            />
          )}
        </AccentCard>
      </div>

      <Card className="ck-rise" styles={{ body: cardBodyStyle }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ width: 150 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>语言</div>
              <Select
                value={language}
                onChange={(v) => switchLang(v)}
                style={{ width: '100%' }}
                options={LANGUAGE_OPTIONS.map((l) => ({ value: l.value, label: l.label }))}
              />
            </div>
            <div style={{ width: 110 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>缩进</div>
              <Select value={indent} onChange={setIndent} style={{ width: '100%' }} options={INDENT_OPTIONS} />
            </div>
            <div style={{ width: 120 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>行宽</div>
              <Select value={printWidth} onChange={setPrintWidth} style={{ width: '100%' }} options={WIDTH_OPTIONS} />
            </div>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', paddingBottom: 6 }}>
              {[
                { label: '分号', value: semi, set: setSemi },
                { label: '单引号', value: singleQuote, set: setSingleQuote },
                { label: '括号内空格', value: bracketSpacing, set: setBracketSpacing },
              ].map((item) => (
                <span key={item.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
                  {item.label}
                  <Switch size="small" checked={item.value} onChange={item.set} />
                </span>
              ))}
            </div>
          </div>

          <Button
            type="primary"
            icon={<Sparkles size={14} fill="currentColor" />}
            loading={busy}
            onClick={() => void run()}
            className="ck-btn-rise"
            style={{ height: 38, minWidth: 140 }}
          >
            立即美化
          </Button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
          prettier 引擎按需加载（独立 chunk），首次美化会有一次下载，之后走缓存。全部在本地完成，代码不会上传。
        </div>
      </Card>
    </div>
  );
}
