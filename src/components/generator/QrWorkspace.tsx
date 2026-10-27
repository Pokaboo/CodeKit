import { useCallback, useEffect, useRef, useState } from 'react';
import { App, Button, Input, Select, Slider, Tabs, Upload } from 'antd';
import { Copy, Download, QrCode, ScanLine, UploadCloud } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle } from '../compare/parts';

const ECC_OPTIONS = [
  { value: 'L', label: 'L · 约 7% 容错' },
  { value: 'M', label: 'M · 约 15% 容错' },
  { value: 'Q', label: 'Q · 约 25% 容错' },
  { value: 'H', label: 'H · 约 30% 容错' },
];

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 36, height: 32, padding: 0, border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}
        />
        <Input size="small" value={value} onChange={(e) => onChange(e.target.value)} className="ck-code" />
      </div>
    </div>
  );
}

export default function QrWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();

  const [text, setText] = useState('https://github.com/Pokaboo/CodeKit');
  const [size, setSize] = useState(280);
  const [margin, setMargin] = useState(2);
  const [ecc, setEcc] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [dark, setDark] = useState('#0f172a');
  const [light, setLight] = useState('#ffffff');
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [decodeSrc, setDecodeSrc] = useState('');
  const [decodeText, setDecodeText] = useState('');
  const [decodeError, setDecodeError] = useState('');
  const [decoding, setDecoding] = useState(false);

  const seqRef = useRef(0);

  // 生成：防抖 + 丢弃过期结果
  useEffect(() => {
    if (!text.trim()) {
      setDataUrl('');
      setError('');
      return;
    }
    const seq = ++seqRef.current;
    const timer = window.setTimeout(async () => {
      setBusy(true);
      setError('');
      try {
        // 动态加载：qrcode 库独立成 chunk，仅本工具使用
        const QRCode = (await import('qrcode')).default;
        const url = await QRCode.toDataURL(text, {
          width: size,
          margin,
          errorCorrectionLevel: ecc,
          color: { dark, light },
        });
        if (seq === seqRef.current) setDataUrl(url);
      } catch (e) {
        if (seq === seqRef.current) {
          setError(e instanceof Error ? e.message : '生成失败，请检查内容长度');
          setDataUrl('');
        }
      } finally {
        if (seq === seqRef.current) setBusy(false);
      }
    }, 260);
    return () => window.clearTimeout(timer);
  }, [text, size, margin, ecc, dark, light]);

  const copy = async (value: string, tip: string) => {
    if (!value) {
      message.warning('暂无可复制内容');
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      message.success(tip);
    } catch {
      message.error('复制失败，请手动选择');
    }
  };

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'qrcode.png';
    a.click();
    message.success('已下载二维码图片');
  };

  const decodeImage = useCallback(
    async (file: File) => {
      setDecoding(true);
      setDecodeError('');
      setDecodeText('');
      const url = URL.createObjectURL(file);
      setDecodeSrc(url);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error('图片读取失败'));
          el.src = url;
        });
        // 大图缩放到 1200px 内，避免解码耗时过长
        const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('当前浏览器不支持 Canvas');
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);

        const jsQR = (await import('jsqr')).default;
        const result = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
        if (result?.data) {
          setDecodeText(result.data);
          message.success('识别成功');
        } else {
          setDecodeError('未识别到二维码，请换一张更清晰、完整的图片');
        }
      } catch (e) {
        setDecodeError(e instanceof Error ? e.message : '识别失败');
      } finally {
        setDecoding(false);
      }
    },
    [message],
  );

  const encodePanel = (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <AccentCard accent={primary} title={PanelTitle({ icon: <QrCode size={15} />, text: '二维码内容', color: '#fff' })}>
        <div className="flex flex-col gap-4">
          <Input.TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入文本、链接、Wi-Fi 配置等任意内容..."
            autoSize={{ minRows: 5, maxRows: 10 }}
            className="ck-code"
            style={{ fontSize: 13, background: '#f8fafc', lineHeight: 1.7 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>
                图片尺寸：{size}px
              </div>
              <Slider min={120} max={600} step={20} value={size} onChange={setSize} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>留白边距：{margin}</div>
              <Slider min={0} max={8} step={1} value={margin} onChange={setMargin} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>容错等级</div>
              <Select value={ecc} onChange={setEcc} options={ECC_OPTIONS} style={{ width: '100%' }} />
            </div>
            <ColorInput label="前景色" value={dark} onChange={setDark} />
            <ColorInput label="背景色" value={light} onChange={setLight} />
          </div>
          {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            内容长度 {new TextEncoder().encode(text).length} 字节 · 前景/背景对比度过低时可能无法识别
          </div>
        </div>
      </AccentCard>

      <AccentCard
        accent={primary}
        title={PanelTitle({ icon: <QrCode size={15} />, text: '预览', color: '#fff' })}
        extra={
          <div style={{ display: 'flex', gap: 2 }}>
            <Button
              type="text"
              size="small"
              icon={<Copy size={12} />}
              style={{ color: 'rgba(255,255,255,0.88)' }}
              onClick={() => void copy(dataUrl, '已复制图片 Data URL')}
            >
              URL
            </Button>
            <Button
              type="text"
              size="small"
              icon={<Download size={12} />}
              style={{ color: 'rgba(255,255,255,0.88)' }}
              onClick={download}
            >
              PNG
            </Button>
          </div>
        }
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 280,
            background: '#f8fafc',
            border: '1px dashed #e2e8f0',
            borderRadius: 10,
            padding: 12,
          }}
        >
          {busy && !dataUrl ? (
            <span style={{ fontSize: 13, color: '#94a3b8' }}>正在生成…</span>
          ) : dataUrl ? (
            <img src={dataUrl} alt="二维码" style={{ maxWidth: '100%', borderRadius: 6 }} />
          ) : (
            <span style={{ fontSize: 13, color: '#94a3b8' }}>输入内容后自动生成</span>
          )}
        </div>
      </AccentCard>
    </div>
  );

  const decodePanel = (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <AccentCard accent={primary} title={PanelTitle({ icon: <ScanLine size={15} />, text: '上传二维码图片', color: '#fff' })}>
        <Upload.Dragger
          accept="image/*"
          showUploadList={false}
          beforeUpload={() => false}
          onChange={({ file }) => {
            if (file.originFileObj) void decodeImage(file.originFileObj as File);
          }}
          style={{ background: '#f8fafc' }}
        >
          {decodeSrc ? (
            <img src={decodeSrc} alt="待识别" style={{ maxHeight: 220, maxWidth: '100%', borderRadius: 8 }} />
          ) : (
            <div style={{ padding: '16px 0' }}>
              <UploadCloud size={32} style={{ color: '#94a3b8' }} />
              <div style={{ marginTop: 8, fontSize: 13, color: '#475569' }}>拖放二维码图片或点击选择</div>
              <div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8' }}>支持 PNG / JPG / WebP</div>
            </div>
          )}
        </Upload.Dragger>
        {decoding && <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>正在识别…</div>}
        {decodeError && <div style={{ marginTop: 10, fontSize: 12, color: '#ef4444' }}>{decodeError}</div>}
      </AccentCard>

      <AccentCard
        accent={primary}
        title={PanelTitle({ icon: <ScanLine size={15} />, text: '识别结果', color: '#fff' })}
        extra={
          <Button
            type="text"
            size="small"
            icon={<Copy size={12} />}
            style={{ color: 'rgba(255,255,255,0.88)' }}
            onClick={() => void copy(decodeText, '已复制识别结果')}
          >
            复制
          </Button>
        }
      >
        <div
          className="ck-code"
          style={{
            background: '#0f172a',
            borderRadius: 10,
            padding: 14,
            minHeight: 180,
            maxHeight: 400,
            overflow: 'auto',
            fontSize: 13,
            lineHeight: 1.7,
            color: decodeText ? '#d1d5db' : '#64748b',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {decodeText || '// 识别到的二维码内容将在此呈现...'}
        </div>
      </AccentCard>
    </div>
  );

  return (
    <Tabs
      defaultActiveKey="encode"
      items={[
        { key: 'encode', label: '生成二维码', children: encodePanel },
        { key: 'decode', label: '解析二维码', children: decodePanel },
      ]}
    />
  );
}
