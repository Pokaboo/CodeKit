import { useState } from 'react';
import { App, Button, Card, Input, InputNumber, Select, Tabs } from 'antd';
import { Copy, Download, Shuffle, Sparkles } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle, cardBodyStyle } from '../compare/parts';
import { generateByFields, generateByTemplate, MOCK_TYPES } from '../../lib/mock';

const DEFAULT_FIELDS = `id
name
email
phone
city
address
company
age
price
status
isActive
createdAt`;

const DEFAULT_TEMPLATE = `{
  "id": 1,
  "name": "",
  "email": "",
  "profile": {
    "city": "",
    "avatar": ""
  },
  "tags": ["tag"],
  "isActive": true,
  "createdAt": ""
}`;

export default function MockWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();

  const [mode, setMode] = useState('fields');
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [count, setCount] = useState(3);
  const [locale, setLocale] = useState<'zh' | 'en'>('zh');
  const [output, setOutput] = useState('');

  const generate = () => {
    try {
      const result =
        mode === 'fields'
          ? generateByFields(fields, { count, locale })
          : generateByTemplate(template, { count, locale });
      setOutput(result);
      const parsed = JSON.parse(result) as unknown;
      const n = Array.isArray(parsed) ? parsed.length : 1;
      message.success(`已生成 ${n} 条模拟数据`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '生成失败');
    }
  };

  const copy = async () => {
    if (!output) {
      message.warning('暂无可复制内容');
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败，请手动选择');
    }
  };

  const download = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mock-data.json';
    a.click();
    URL.revokeObjectURL(url);
    message.success('已下载 mock-data.json');
  };

  const fieldsPanel = (
    <div className="flex flex-col gap-3">
      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.8 }}>
        一行一个字段名，支持 <span className="ck-code">key:type</span> 指定类型；不指定时按字段名自动推断。
      </div>
      <Input.TextArea
        value={fields}
        onChange={(e) => setFields(e.target.value)}
        autoSize={{ minRows: 12, maxRows: 22 }}
        className="ck-code"
        style={{ fontSize: 13, background: '#f8fafc', lineHeight: 1.7 }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {MOCK_TYPES.slice(0, 14).map((t) => (
          <span
            key={t}
            onClick={() => setFields((prev) => `${prev.trimEnd()}\nfield:${t}`.trimStart())}
            className="ck-code"
            style={{
              fontSize: 11,
              color: '#64748b',
              background: '#f1f5f9',
              borderRadius: 4,
              padding: '1px 6px',
              cursor: 'pointer',
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );

  const templatePanel = (
    <div className="flex flex-col gap-3">
      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.8 }}>
        粘贴一份 JSON 模板，字段名相同但值会按语义重新生成；数组结构保留（最多 3 个元素）。
      </div>
      <Input.TextArea
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        autoSize={{ minRows: 14, maxRows: 24 }}
        className="ck-code"
        style={{ fontSize: 13, background: '#f8fafc', lineHeight: 1.7 }}
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <AccentCard accent={primary} title={PanelTitle({ icon: <Shuffle size={15} />, text: '生成配置', color: '#fff' })}>
          <Tabs
            size="small"
            activeKey={mode}
            onChange={setMode}
            items={[
              { key: 'fields', label: '按字段名', children: fieldsPanel },
              { key: 'template', label: '按 JSON 模板', children: templatePanel },
            ]}
          />
        </AccentCard>

        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <Sparkles size={15} />, text: '生成结果', color: '#fff' })}
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
              mock-data.json
            </div>
            <pre
              className="ck-code"
              style={{
                margin: 0,
                padding: 14,
                fontSize: 13,
                lineHeight: 1.7,
                minHeight: 320,
                maxHeight: 560,
                overflow: 'auto',
                color: '#d1d5db',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {output || '// 点击「生成数据」后结果将在此呈现...'}
            </pre>
          </div>
        </AccentCard>
      </div>

      <Card className="ck-rise" styles={{ body: cardBodyStyle }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ width: 110 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>生成条数</div>
              <InputNumber min={1} max={100} value={count} onChange={(v) => setCount(v ?? 1)} style={{ width: '100%' }} />
            </div>
            <div style={{ width: 140 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>数据语言</div>
              <Select
                value={locale}
                onChange={setLocale}
                style={{ width: '100%' }}
                options={[
                  { value: 'zh', label: '中文' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </div>
            <span style={{ fontSize: 12, color: '#94a3b8', paddingBottom: 10 }}>
              纯前端生成，不上传任何字段信息
            </span>
          </div>
          <Button
            type="primary"
            icon={<Shuffle size={14} fill="currentColor" />}
            onClick={generate}
            className="ck-btn-rise"
            style={{ height: 38, minWidth: 140 }}
          >
            生成数据
          </Button>
        </div>
      </Card>
    </div>
  );
}
