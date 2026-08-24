import { useEffect, useMemo, useRef, useState } from 'react';
import { App, Button, Card, Input, InputNumber, Segmented, Switch } from 'antd';
import {
  Cable,
  Copy,
  Eraser,
  HeartPulse,
  Lightbulb,
  Plug,
  PlugZap,
  Send,
} from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle, cardBodyStyle } from '../compare/parts';
import InfoCard from '../InfoCard';

type WsStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';
type LogDir = 'send' | 'recv' | 'sys' | 'error';

interface LogEntry {
  id: number;
  time: string;
  dir: LogDir;
  content: string;
}

const STATUS_META: Record<WsStatus, { label: string; dot: string }> = {
  idle: { label: '未连接', dot: '#94a3b8' },
  connecting: { label: '连接中', dot: '#f59e0b' },
  open: { label: '已连接', dot: '#10b981' },
  closed: { label: '已断开', dot: '#94a3b8' },
  error: { label: '连接错误', dot: '#ef4444' },
};

const DIR_LABEL: Record<LogDir, string> = {
  send: '发送',
  recv: '接收',
  sys: '系统',
  error: '错误',
};

/** 深色日志区内的方向色（发送蓝 / 接收绿 / 系统灰 / 错误红） */
const DIR_COLOR: Record<LogDir, string> = {
  send: '#93c5fd',
  recv: '#6ee7b7',
  sys: '#94a3b8',
  error: '#fca5a5',
};

const DIR_TEXT_COLOR: Record<LogDir, string> = {
  send: '#dbeafe',
  recv: '#d1fae5',
  sys: '#cbd5e1',
  error: '#fecaca',
};

/** 规范化 WebSocket 地址：补全缺失的 ws:// 前缀 */
function normalizeWsUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^wss?:\/\//i.test(s)) return s;
  // host[:port][/path] 形式自动补全 ws://
  if (/^[\w-]+(\.[\w-]+)*(:\d+)?([/?#][^\s]*)?$/.test(s)) return `ws://${s}`;
  return null;
}

export default function WebSocketWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();

  const [urlText, setUrlText] = useState('');
  const [status, setStatus] = useState<WsStatus>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [msgText, setMsgText] = useState('');
  const [sendMode, setSendMode] = useState<'text' | 'json'>('text');

  // 自动重连
  const [autoReconnect, setAutoReconnect] = useState(false);
  const [reconnectTimes, setReconnectTimes] = useState(3);
  const [reconnectInterval, setReconnectInterval] = useState(3);
  // 心跳
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(false);
  const [heartbeatInterval, setHeartbeatInterval] = useState(15);
  const [heartbeatContent, setHeartbeatContent] = useState('ping');

  const wsRef = useRef<WebSocket | null>(null);
  const manualCloseRef = useRef(false);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idRef = useRef(0);
  const logBoxRef = useRef<HTMLDivElement | null>(null);

  const addLog = (dir: LogDir, content: string) => {
    setLogs((prev) => [
      ...prev.slice(-499),
      {
        id: ++idRef.current,
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        dir,
        content,
      },
    ]);
  };

  const stopHeartbeat = () => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    if (!heartbeatEnabled) return;
    const payload = heartbeatContent || 'ping';
    const interval = Math.max(1, heartbeatInterval) * 1000;
    heartbeatTimerRef.current = setInterval(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload);
          addLog('send', `[心跳] ${payload}`);
        } catch {
          /* 发送失败交由 onclose 处理 */
        }
      }
    }, interval);
  };

  const connect = () => {
    const url = normalizeWsUrl(urlText);
    if (!url) {
      message.error('请输入有效的 WebSocket 地址，如 ws://localhost:8080 或 wss://example.com/ws');
      return;
    }
    // 关闭可能存在的旧连接
    const prev = wsRef.current;
    if (prev) {
      prev.onopen = prev.onmessage = prev.onerror = prev.onclose = null;
      try {
        prev.close();
      } catch {
        /* noop */
      }
      wsRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    manualCloseRef.current = false;
    reconnectCountRef.current = 0;

    setStatus('connecting');
    addLog('sys', `正在连接 ${url} ...`);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (wsRef.current !== ws) return;
      setStatus('open');
      addLog('sys', '连接已建立');
      startHeartbeat();
    };
    ws.onmessage = (ev) => {
      if (wsRef.current !== ws) return;
      addLog('recv', typeof ev.data === 'string' ? ev.data : '[二进制数据]');
    };
    ws.onerror = () => {
      if (wsRef.current !== ws) return;
      addLog('error', '连接出错（网络不可达或服务端拒绝）');
    };
    ws.onclose = (ev) => {
      if (wsRef.current !== ws) return;
      stopHeartbeat();
      setStatus('closed');
      const reason = ev.reason ? `：${ev.reason}` : `（code=${ev.code}）`;
      addLog('sys', `连接已关闭${reason}`);

      if (!manualCloseRef.current && autoReconnect) {
        if (reconnectCountRef.current < reconnectTimes) {
          reconnectCountRef.current += 1;
          const delay = Math.max(1, reconnectInterval) * 1000;
          addLog('sys', `${delay / 1000}s 后自动重连（第 ${reconnectCountRef.current}/${reconnectTimes} 次）`);
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          addLog('sys', '已达最大重连次数，停止自动重连');
        }
      }
    };
  };

  const disconnect = () => {
    manualCloseRef.current = true;
    stopHeartbeat();
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    const ws = wsRef.current;
    wsRef.current = null; // 置空后 onclose 回调直接跳过
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      try {
        ws.close();
      } catch {
        /* noop */
      }
    }
    setStatus('idle');
    addLog('sys', '已手动断开连接');
  };

  const send = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      message.warning('连接未就绪，请先建立连接');
      return;
    }
    if (!msgText.trim()) {
      message.warning('请输入要发送的消息');
      return;
    }
    let payload = msgText;
    if (sendMode === 'json') {
      try {
        payload = JSON.stringify(JSON.parse(msgText));
      } catch {
        message.error('JSON 格式不正确，请检查后重试');
        return;
      }
    }
    try {
      ws.send(payload);
      addLog('send', payload);
      setMsgText('');
    } catch {
      message.error('消息发送失败');
    }
  };

  // 心跳配置变化时按需重启
  useEffect(() => {
    if (status === 'open' && heartbeatEnabled) startHeartbeat();
    else stopHeartbeat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heartbeatEnabled, heartbeatInterval, heartbeatContent, status]);

  // 卸载时清理连接与定时器
  useEffect(() => {
    return () => {
      manualCloseRef.current = true;
      stopHeartbeat();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) {
        ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
        try {
          ws.close();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  // 日志自动滚动到底部
  useEffect(() => {
    const el = logBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const clearLogs = () => {
    setLogs([]);
    message.success('日志已清空');
  };

  const copyLogs = async () => {
    if (!logs.length) {
      message.warning('暂无日志可复制');
      return;
    }
    const text = logs
      .map((l) => `[${l.time}] ${DIR_LABEL[l.dir]} ${l.content}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      message.success('日志已复制');
    } catch {
      message.error('复制失败，请手动选择');
    }
  };

  const connected = status === 'open';
  const connecting = status === 'connecting';
  const statusMeta = STATUS_META[status];

  const hintText = useMemo(
    () =>
      '输入 ws:// 或 wss:// 地址即可连接测试，支持自定义消息、心跳检测与自动重连。可尝试公开 echo 服务（如 wss://echo.websocket.events）验证收发。',
    [],
  );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* 连接配置 */}
      <AccentCard
        accent={primary}
        title={PanelTitle({ icon: <Cable size={15} />, text: '连接配置', color: '#fff' })}
      >
        <div className="flex flex-col gap-4">
          <div>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>WebSocket 地址</div>
            <Input
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              onPressEnter={() => void (connected ? disconnect() : connect())}
              placeholder="ws://localhost:8080 或 wss://example.com/ws"
              className="ck-code"
              prefix={<Cable size={14} color="#94a3b8" />}
              style={{ fontSize: 13 }}
            />
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: statusMeta.dot,
                  boxShadow: `0 0 0 3px ${statusMeta.dot}26`,
                  animation: connecting ? 'ck-pulse 1.2s infinite' : undefined,
                }}
              />
              <span style={{ fontSize: 13, color: '#475569' }}>{statusMeta.label}</span>
              {connected && (
                <span style={{ fontSize: 12, color: '#047857' }}>· 可发送与接收消息</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="primary"
              icon={<Plug size={14} />}
              loading={connecting}
              disabled={connecting || connected}
              onClick={connect}
              className="ck-btn-rise"
            >
              连接
            </Button>
            <Button
              icon={<PlugZap size={14} />}
              disabled={!connected && !connecting}
              onClick={disconnect}
            >
              断开
            </Button>
          </div>

          <div
            style={{
              borderTop: '1px solid #f1f5f9',
              paddingTop: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Switch size="small" checked={autoReconnect} onChange={setAutoReconnect} />
                <span style={{ fontSize: 13, color: '#0f172a' }}>自动重连</span>
              </span>
              {autoReconnect && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: '#64748b',
                    flexWrap: 'wrap',
                  }}
                >
                  最多
                  <InputNumber
                    size="small"
                    min={1}
                    max={99}
                    value={reconnectTimes}
                    onChange={(v) => setReconnectTimes(v ?? 3)}
                    style={{ width: 64 }}
                  />
                  次，间隔
                  <InputNumber
                    size="small"
                    min={1}
                    max={300}
                    value={reconnectInterval}
                    onChange={(v) => setReconnectInterval(v ?? 3)}
                    style={{ width: 72 }}
                  />
                  秒
                </span>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Switch size="small" checked={heartbeatEnabled} onChange={setHeartbeatEnabled} />
                <HeartPulse size={13} color="#475569" />
                <span style={{ fontSize: 13, color: '#0f172a' }}>心跳检测</span>
              </span>
              {heartbeatEnabled && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: '#64748b',
                    flexWrap: 'wrap',
                  }}
                >
                  每
                  <InputNumber
                    size="small"
                    min={1}
                    max={3600}
                    value={heartbeatInterval}
                    onChange={(v) => setHeartbeatInterval(v ?? 15)}
                    style={{ width: 72 }}
                  />
                  秒发送
                  <Input
                    size="small"
                    value={heartbeatContent}
                    onChange={(e) => setHeartbeatContent(e.target.value)}
                    placeholder="ping"
                    className="ck-code"
                    style={{ width: 110, fontSize: 12 }}
                  />
                </span>
              )}
            </div>

            <InfoCard icon={<Lightbulb size={14} />} text={hintText} tone="info" />
          </div>
        </div>
      </AccentCard>

      {/* 消息发送 + 日志 */}
      <div className="flex flex-col gap-5">
        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <Send size={15} />, text: '消息发送', color: '#fff' })}
        >
          <div className="flex flex-col gap-3">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#475569' }}>消息格式</span>
              <Segmented
                size="small"
                options={[
                  { label: '文本', value: 'text' },
                  { label: 'JSON', value: 'json' },
                ]}
                value={sendMode}
                onChange={(v) => setSendMode(v as 'text' | 'json')}
              />
            </div>
            <Input.TextArea
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder={
                sendMode === 'json'
                  ? '{"type": "message", "content": "hello"}'
                  : '输入要发送的消息...'
              }
              autoSize={{ minRows: 3, maxRows: 6 }}
              className="ck-code"
              style={{ fontSize: 13, background: '#f8fafc', lineHeight: 1.7 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button
              type="primary"
              icon={<Send size={14} />}
              onClick={send}
              disabled={!connected}
              block
              className="ck-btn-rise"
              style={{ height: 38 }}
            >
              发送消息
            </Button>
          </div>
        </AccentCard>

        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <Cable size={15} />, text: '消息日志', color: '#fff' })}
          extra={
            <div style={{ display: 'flex', gap: 4 }}>
              <Button
                type="text"
                size="small"
                icon={<Copy size={12} />}
                style={{ color: '#ffffff' }}
                onClick={() => void copyLogs()}
              >
                复制
              </Button>
              <Button
                type="text"
                size="small"
                icon={<Eraser size={12} />}
                style={{ color: '#ffffff' }}
                onClick={clearLogs}
                disabled={!logs.length}
              >
                清空
              </Button>
            </div>
          }
        >
          <div
            ref={logBoxRef}
            style={{
              background: '#0f172a',
              borderRadius: 10,
              padding: 12,
              minHeight: 220,
              maxHeight: 320,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {logs.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 13 }}>
                // 连接后收发消息将实时记录在此...
              </div>
            ) : (
              logs.map((l) => (
                <div
                  key={l.id}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'baseline',
                    padding: '3px 0',
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ color: '#64748b', fontSize: 11, flexShrink: 0 }}>{l.time}</span>
                  <span
                    style={{
                      color: DIR_COLOR[l.dir],
                      fontSize: 11,
                      flexShrink: 0,
                      width: 30,
                      fontWeight: 600,
                    }}
                  >
                    {DIR_LABEL[l.dir]}
                  </span>
                  <span
                    className="ck-code"
                    style={{
                      color: DIR_TEXT_COLOR[l.dir],
                      wordBreak: 'break-all',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {l.content}
                  </span>
                </div>
              ))
            )}
          </div>
        </AccentCard>
      </div>
    </div>
  );
}
