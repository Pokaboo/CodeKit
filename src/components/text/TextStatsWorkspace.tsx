import { useMemo, useState } from 'react';
import { App, Button, Card, Input } from 'antd';
import { BarChart3, Copy, FileText } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle, cardBodyStyle } from '../compare/parts';
import { computeTextStats, formatBytes } from '../../lib/textTools';

const SAMPLE = `CodeKit 是一个纯本地的程序员工具箱。
所有计算都在浏览器里完成，不会上传任何数据。

JSON / XML / SQL / Base64 / 正则 … 让开发更省心。`;

export default function TextStatsWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();
  const [text, setText] = useState('');

  const stats = useMemo(() => computeTextStats(text), [text]);

  const items = [
    { label: '字符数', value: stats.chars.toLocaleString(), hint: '含空格与换行' },
    { label: '字符数（不含空白）', value: stats.charsNoSpace.toLocaleString(), hint: '去除空格/换行/制表符' },
    { label: 'UTF-8 字节', value: formatBytes(stats.bytesUtf8), hint: `${stats.bytesUtf8.toLocaleString()} 字节` },
    { label: '行数', value: stats.lines.toLocaleString(), hint: '按换行切分' },
    { label: '段落数', value: stats.paragraphs.toLocaleString(), hint: '以空行分隔' },
    { label: '单词数', value: stats.words.toLocaleString(), hint: '按空白切分' },
    { label: '中文字符', value: stats.cjk.toLocaleString(), hint: '含中日韩字符' },
    { label: '英文字母', value: stats.letters.toLocaleString(), hint: 'A-Z / a-z' },
    { label: '数字', value: stats.digits.toLocaleString(), hint: '0-9' },
    { label: '标点符号', value: stats.punctuation.toLocaleString(), hint: '中英文标点' },
    { label: '最长行', value: `${stats.longestLine.toLocaleString()} 字符`, hint: '单行最大长度' },
    { label: 'UTF-16 字节', value: formatBytes(stats.bytesUtf16), hint: 'JS 字符串内部长度 ×2' },
  ];

  const summary = items.map((i) => `${i.label}: ${i.value}`).join('\n');

  const copy = async () => {
    if (!text) {
      message.warning('请先输入文本');
      return;
    }
    try {
      await navigator.clipboard.writeText(summary);
      message.success('统计结果已复制');
    } catch {
      message.error('复制失败，请手动选择');
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <FileText size={15} />, text: '待统计文本', color: '#fff' })}
          extra={
            <div style={{ display: 'flex', gap: 2 }}>
              <Button
                type="text"
                size="small"
                style={{ color: 'rgba(255,255,255,0.88)' }}
                onClick={() => setText(SAMPLE)}
              >
                示例
              </Button>
              <Button
                type="text"
                size="small"
                style={{ color: 'rgba(255,255,255,0.88)' }}
                onClick={() => setText('')}
              >
                清空
              </Button>
            </div>
          }
        >
          <Input.TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="粘贴或输入需要统计的文本，结果实时更新..."
            autoSize={{ minRows: 16, maxRows: 26 }}
            className="ck-code"
            style={{ fontSize: 13, background: '#f8fafc', lineHeight: 1.8 }}
          />
        </AccentCard>

        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <BarChart3 size={15} />, text: '统计结果', color: '#fff' })}
          extra={
            <Button
              type="text"
              size="small"
              icon={<Copy size={12} />}
              style={{ color: 'rgba(255,255,255,0.88)' }}
              onClick={() => void copy()}
            >
              复制
            </Button>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <div
                key={item.label}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{item.label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>{item.value}</div>
                <div style={{ fontSize: 11, color: '#cbd5e1' }}>{item.hint}</div>
              </div>
            ))}
          </div>
        </AccentCard>
      </div>

      <Card className="ck-rise" styles={{ body: cardBodyStyle }}>
        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.8 }}>
          说明：UTF-8 字节数按实际编码计算（中文通常占 3 字节，emoji 占 4 字节），常用于校验数据库字段长度或接口报文体积；
          UTF-16 字节数为 JS 字符串长度 ×2，仅作参考。粘贴大段文本时统计会随输入实时更新。
        </div>
      </Card>
    </div>
  );
}
