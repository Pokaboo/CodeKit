import { useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Input, Switch, Upload, Typography } from 'antd';
import { Bolt, Copy, FileCode2, Image as ImageIcon, Lightbulb, UploadCloud, Wrench } from 'lucide-react';
import type { ToolConfig } from '../types';
import { toolIcons } from '../config/tools';
import InfoCard from './InfoCard';
import { highlightCode } from '../lib/highlight';

interface ToolWorkspaceProps {
  tool: ToolConfig;
}

/** 图片上传的 DataURL 结果 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const cardBodyStyle = { padding: 20 } as const;

/** 通用三栏工作台：输入 / 配置 / 输出。所有文本类工具共用。 */
export default function ToolWorkspace({ tool }: ToolWorkspaceProps) {
  const { message } = App.useApp();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [processing, setProcessing] = useState(false);

  const [options, setOptions] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((tool.options ?? []).map((o) => [o.key, o.defaultValue])),
  );
  useEffect(() => {
    setInput('');
    setOutput('');
    setImageDataUrl('');
    setOptions(Object.fromEntries((tool.options ?? []).map((o) => [o.key, o.defaultValue])));
  }, [tool]);

  const run = async () => {
    if (!tool.process) return;
    if (!input.trim()) {
      message.warning('请先输入数据');
      return;
    }
    setProcessing(true);
    try {
      const result = await tool.process(input, options);
      setOutput(result);
      message.success(`${tool.label} 处理完成`);
    } catch (e) {
      message.error(`${tool.label} 处理失败：${e instanceof Error ? e.message : '请检查输入格式'}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('请选择有效的图片文件');
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setImageDataUrl(dataUrl);
    setOutput(dataUrl);
    message.success('图片已转换为 Base64');
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败，请手动选择复制');
    }
  };

  const isImageMode = tool.accept === 'image';
  // 输出语法高亮（依据注册表 outputFile 推断语言）
  const highlighted = useMemo(
    () => highlightCode(output, tool.outputFile ?? 'output.txt'),
    [output, tool],
  );
  const panelTitle = (icon: React.ReactNode, text: string, color: string) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
      <span style={{ display: 'flex', color }}>{icon}</span>
      {text}
    </span>
  );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_260px_minmax(0,1fr)]">
      {/* 输入 */}
      <Card
        className="ck-rise lg:order-1 xl:order-1"
        title={panelTitle(<FileCode2 size={15} />, '输入数据', '#2563eb')}
        extra={
          <Button
            type="text"
            size="small"
            danger
            onClick={() => { setInput(''); setOutput(''); setImageDataUrl(''); }}
          >
            清空
          </Button>
        }
        styles={{ body: cardBodyStyle }}
        style={{ borderTop: '3px solid #2563eb' }}
      >
        {isImageMode ? (
          <Upload.Dragger
            accept="image/*"
            showUploadList={false}
            beforeUpload={() => false}
            onChange={({ file }) => {
              if (file.originFileObj) void handleImage(file.originFileObj as File);
            }}
            style={{ background: '#f8fafc' }}
          >
            {imageDataUrl ? (
              <img src={imageDataUrl} alt="预览" style={{ maxHeight: 180, maxWidth: '100%', borderRadius: 8 }} />
            ) : (
              <div style={{ padding: '12px 0' }}>
                <UploadCloud size={32} style={{ color: '#94a3b8' }} />
                <div style={{ marginTop: 8, fontSize: 13, color: '#475569' }}>拖放图片或点击选择</div>
                <div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8' }}>支持 PNG / JPG / GIF / WebP / SVG</div>
              </div>
            )}
          </Upload.Dragger>
        ) : (
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={tool.placeholder}
            autoSize={{ minRows: 10, maxRows: 22 }}
            className="ck-code"
            style={{ fontSize: 13, background: '#f8fafc', lineHeight: 1.7 }}
          />
        )}
        {isImageMode && imageDataUrl && (
          <div
            className="ck-code"
            style={{ marginTop: 10, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}
          >
            Base64 长度: {output.length.toLocaleString()} 字符
          </div>
        )}
      </Card>

      {/* 配置 */}
      <Card
        className="lg:order-3 lg:col-span-2 xl:order-2 xl:col-span-1"
        title={panelTitle(<Wrench size={15} />, '处理配置', '#2563eb')}
        styles={{ body: cardBodyStyle }}
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-8 lg:gap-y-2">
          {(tool.options ?? []).map((opt) => (
            <div
              key={opt.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '8px 0',
                minWidth: 150,
                flex: '0 0 auto',
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: '#0f172a' }}>{opt.label}</div>
                {opt.subLabel && <div style={{ fontSize: 11, color: '#94a3b8' }}>{opt.subLabel}</div>}
              </div>
              <Switch
                size="small"
                checked={options[opt.key]}
                onChange={(v) => setOptions((s) => ({ ...s, [opt.key]: v }))}
              />
            </div>
          ))}

          {tool.hint && (
            <div className="lg:flex-1 lg:min-w-[200px]">
              <InfoCard icon={<Lightbulb size={14} />} text={tool.hint.text} tone={tool.hint.tone} />
            </div>
          )}

          {!tool.process && (
            <div className="lg:flex-1 lg:min-w-[200px]">
              <InfoCard icon={<ImageIcon size={14} />} text="该工具为图片输入模式，上传后自动转换。" tone="info" />
            </div>
          )}

          {tool.process && (
            <Button
              type="primary"
              icon={<Bolt size={14} fill="currentColor" />}
              loading={processing}
              onClick={() => void run()}
              block
              className="ck-btn-rise"
              style={{ marginTop: 4, height: 38, flex: '0 0 auto' }}
            >
              立即执行
            </Button>
          )}
        </div>
      </Card>

      {/* 输出 */}
      <Card
        className="ck-rise lg:order-2 xl:order-3"
        title={panelTitle(<FileCode2 size={15} />, '处理结果', '#10b981')}
        extra={
          <Button size="small" icon={<Copy size={12} />} onClick={() => void copy()} style={{ fontSize: 12 }}>
            复制
          </Button>
        }
        styles={{ body: cardBodyStyle }}
        style={{ borderTop: '3px solid #10b981' }}
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
            {tool.outputFile ?? 'output.txt'}
          </div>
          {isImageMode && imageDataUrl && (
            <div
              style={{
                padding: 12,
                display: 'flex',
                justifyContent: 'center',
                background: '#111827',
                borderBottom: '1px solid #334155',
              }}
            >
              <img src={imageDataUrl} alt="Base64 预览" style={{ maxHeight: 120, borderRadius: 8 }} />
            </div>
          )}
          <Typography.Paragraph
            className="ck-code"
            style={{
              margin: 0,
              padding: 14,
              color: '#d1d5db',
              fontSize: 13,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              minHeight: 180,
              lineHeight: 1.7,
            }}
          >
            {output ? (
              <span className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
            ) : (
              '// 处理结果将在此呈现...'
            )}
          </Typography.Paragraph>
        </div>
      </Card>
    </div>
  );
}

export { toolIcons };
