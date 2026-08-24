import { useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Input, InputNumber, Segmented, Select, Tag } from 'antd';
import { CalendarClock, CheckCircle2, Copy, Lightbulb, ListChecks, RefreshCw, Wand2, XCircle } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle, cardBodyStyle } from '../compare/parts';
import InfoCard from '../InfoCard';
import {
  CRON_FIELD_SPECS,
  type CronField,
  type FieldSpec,
  nextRunTimes,
  parseCron,
} from '../../lib/cron';
import { formatDate } from '../../lib/timeUtils';

/** 字段 UI 模式：全部 * / 步长 / / 区间 - / 指定值 / 不指定 ?（仅日周） */
type FieldMode = 'all' | 'step' | 'range' | 'list' | 'none';

interface FieldUi {
  mode: FieldMode;
  stepFrom: number;
  stepInterval: number | null;
  rangeFrom: number;
  rangeTo: number;
  selected: number[];
}

const DEFAULT_EXPR = '*/5 * * * *';

/** 常用预设（5 段） */
const PRESETS: { label: string; expr: string }[] = [
  { label: '每分钟', expr: '* * * * *' },
  { label: '每 5 分钟', expr: '*/5 * * * *' },
  { label: '每 10 分钟', expr: '*/10 * * * *' },
  { label: '每小时', expr: '0 * * * *' },
  { label: '每天 0 点', expr: '0 0 * * *' },
  { label: '工作日 9 点', expr: '0 9 * * 1-5' },
  { label: '每周一 0 点', expr: '0 0 * * 1' },
  { label: '每月 1 号 0 点', expr: '0 0 1 * *' },
  { label: '每年 1 月 1 日', expr: '0 0 1 1 *' },
];

function createDefaultField(spec: FieldSpec): FieldUi {
  return {
    mode: 'all',
    stepFrom: spec.min,
    stepInterval: null,
    rangeFrom: spec.min,
    rangeTo: spec.max,
    selected: [],
  };
}

/** 解析结果 → UI 状态（供文本框编辑后回填可视化控件） */
function fieldToUi(f: CronField, spec: FieldSpec): FieldUi {
  switch (f.kind) {
    case 'none':
      return { ...createDefaultField(spec), mode: 'none' };
    case 'step':
      return {
        ...createDefaultField(spec),
        mode: 'step',
        stepFrom: f.stepFrom ?? spec.min,
        stepInterval: f.stepInterval ?? null,
      };
    case 'range':
      return {
        ...createDefaultField(spec),
        mode: 'range',
        rangeFrom: f.rangeFrom ?? spec.min,
        rangeTo: f.rangeTo ?? spec.max,
      };
    case 'list':
    case 'single':
      return {
        ...createDefaultField(spec),
        mode: 'list',
        selected: [...f.values].sort((a, b) => a - b),
      };
    default:
      return createDefaultField(spec);
  }
}

/** UI 状态 → 表达式片段 */
function uiToToken(ui: FieldUi, spec: FieldSpec): string {
  switch (ui.mode) {
    case 'all':
      return '*';
    case 'none':
      return '?';
    case 'step': {
      const interval = ui.stepInterval ?? 1;
      return ui.stepFrom <= spec.min ? `*/${interval}` : `${ui.stepFrom}/${interval}`;
    }
    case 'range':
      return `${ui.rangeFrom}-${ui.rangeTo}`;
    case 'list':
      return ui.selected.length > 0 ? ui.selected.join(',') : '*';
  }
}

function buildExpr(fields: FieldUi[], hasSeconds: boolean): string {
  const specs = hasSeconds ? CRON_FIELD_SPECS : CRON_FIELD_SPECS.slice(1);
  return fields.map((f, i) => uiToToken(f, specs[i])).join(' ');
}

function initFromExpr(expr: string): { fields: FieldUi[]; hasSeconds: boolean } {
  const p = parseCron(expr);
  const specs = p.hasSeconds ? CRON_FIELD_SPECS : CRON_FIELD_SPECS.slice(1);
  return { hasSeconds: p.hasSeconds, fields: p.fields.map((f, i) => fieldToUi(f, specs[i])) };
}

/** 单行字段配置（字段名 + 模式切换 + 参数控件） */
function FieldRow({
  spec,
  ui,
  onChange,
}: {
  spec: FieldSpec;
  ui: FieldUi;
  onChange: (ui: FieldUi) => void;
}) {
  const modes: { value: FieldMode; label: string }[] = [
    { value: 'all', label: '全部 *' },
    { value: 'step', label: '步长 /' },
    { value: 'range', label: '区间 -' },
    { value: 'list', label: '指定' },
    ...(spec.allowNone ? [{ value: 'none' as FieldMode, label: '不指定 ?' }] : []),
  ];

  const options = useMemo(() => {
    // 周字段 0-7 中 7 与 0 同义（周日），选项收敛为 0-6
    const end = spec.max === 7 ? 6 : spec.max;
    const opts: { label: string; value: number }[] = [];
    for (let v = spec.min; v <= end; v++) {
      opts.push({ label: spec.labels ? `${spec.labels[v - spec.min]}` : String(v), value: v });
    }
    return opts;
  }, [spec]);

  const set = (patch: Partial<FieldUi>) => onChange({ ...ui, ...patch });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        flexWrap: 'wrap',
        padding: '10px 0',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <span
        style={{
          width: 42,
          flexShrink: 0,
          fontSize: 13,
          fontWeight: 600,
          color: '#0f172a',
          paddingTop: 5,
        }}
      >
        {spec.name}
      </span>
      <Segmented
        size="small"
        options={modes}
        value={ui.mode}
        onChange={(v) => set({ mode: v as FieldMode })}
      />
      {ui.mode === 'step' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>从</span>
          <InputNumber
            size="small"
            min={spec.min}
            max={spec.max}
            value={ui.stepFrom}
            onChange={(v) => set({ stepFrom: v ?? spec.min })}
            style={{ width: 72 }}
          />
          <span style={{ fontSize: 12, color: '#64748b' }}>开始，每</span>
          <InputNumber
            size="small"
            min={1}
            max={spec.max - spec.min + 1}
            value={ui.stepInterval}
            onChange={(v) => set({ stepInterval: v })}
            style={{ width: 72 }}
          />
          <span style={{ fontSize: 12, color: '#64748b' }}>个{spec.short}执行</span>
        </div>
      )}
      {ui.mode === 'range' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <InputNumber
            size="small"
            min={spec.min}
            max={spec.max}
            value={ui.rangeFrom}
            onChange={(v) => set({ rangeFrom: v ?? spec.min })}
            style={{ width: 72 }}
          />
          <span style={{ fontSize: 12, color: '#64748b' }}>至</span>
          <InputNumber
            size="small"
            min={spec.min}
            max={spec.max}
            value={ui.rangeTo}
            onChange={(v) => set({ rangeTo: v ?? spec.max })}
            style={{ width: 72 }}
          />
          <span style={{ fontSize: 12, color: '#64748b' }}>{spec.short}</span>
        </div>
      )}
      {ui.mode === 'list' && (
        <Select
          size="small"
          mode="multiple"
          allowClear
          placeholder="选择取值（多选）"
          style={{ minWidth: 180, flex: '1 1 200px' }}
          options={options}
          value={ui.selected}
          onChange={(vals) => set({ selected: vals })}
          maxTagCount={6}
        />
      )}
      {ui.mode === 'none' && (
        <span style={{ fontSize: 12, color: '#64748b', paddingTop: 5 }}>该字段不参与匹配</span>
      )}
      <span
        className="ck-code"
        style={{
          marginLeft: 'auto',
          fontSize: 12,
          color: '#2563eb',
          background: '#eff6ff',
          borderRadius: 6,
          padding: '2px 8px',
          alignSelf: 'center',
        }}
      >
        {uiToToken(ui, spec)}
      </span>
    </div>
  );
}

export default function CronWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();
  const initial = useMemo(() => initFromExpr(DEFAULT_EXPR), []);
  const [fields, setFields] = useState<FieldUi[]>(initial.fields);
  const [hasSeconds, setHasSeconds] = useState(initial.hasSeconds);
  const [inputText, setInputText] = useState(DEFAULT_EXPR);
  const [tick, setTick] = useState(0);

  const specs = hasSeconds ? CRON_FIELD_SPECS : CRON_FIELD_SPECS.slice(1);
  const expr = useMemo(() => buildExpr(fields, hasSeconds), [fields, hasSeconds]);

  // 控件编辑后同步文本框（规范化显示）
  useEffect(() => {
    setInputText(expr);
  }, [expr]);

  const updateField = (index: number, next: FieldUi) => {
    setFields((fs) => fs.map((f, i) => (i === index ? next : f)));
  };

  /** 文本框编辑：实时解析，合法则回填可视化控件 */
  const handleExprEdit = (text: string) => {
    setInputText(text);
    try {
      const p = parseCron(text);
      const specs2 = p.hasSeconds ? CRON_FIELD_SPECS : CRON_FIELD_SPECS.slice(1);
      setFields(p.fields.map((f, i) => fieldToUi(f, specs2[i])));
      setHasSeconds(p.hasSeconds);
    } catch {
      /* 非法输入不回填控件，由校验区展示错误 */
    }
  };

  const validation = useMemo(() => {
    try {
      return { ok: true as const, parsed: parseCron(inputText) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [inputText]);

  const runTimes = useMemo(() => {
    if (!validation.ok) return [];
    try {
      return nextRunTimes(inputText, new Date(), 5);
    } catch {
      return [];
    }
  }, [inputText, validation.ok, tick]);

  const copy = async (text: string, label: string) => {
    if (!text) {
      message.warning('暂无可复制内容');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      message.success(`${label} 已复制`);
    } catch {
      message.error('复制失败，请手动选择复制');
    }
  };

  return (
    <div className="space-y-5">
      {/* 段数切换 + 常用预设 */}
      <Card className="ck-rise" styles={{ body: cardBodyStyle }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#475569' }}>字段结构</span>
            <Segmented
              size="small"
              options={[
                { label: '标准 5 段', value: false },
                { label: '含秒 6 段', value: true },
              ]}
              value={hasSeconds}
              onChange={(v) => {
                const next = v as boolean;
                if (next === hasSeconds) return;
                setHasSeconds(next);
                setFields((fs) =>
                  next ? [createDefaultField(CRON_FIELD_SPECS[0]), ...fs] : fs.slice(1),
                );
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#475569' }}>常用预设</span>
            {PRESETS.map((p) => (
              <Tag
                key={p.expr}
                className="ck-btn-rise"
                style={{
                  cursor: 'pointer',
                  borderRadius: 6,
                  padding: '2px 10px',
                  userSelect: 'none',
                  margin: 0,
                }}
                onClick={() => handleExprEdit(p.expr)}
              >
                {p.label}
              </Tag>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 字段可视化配置 */}
        <AccentCard
          accent={primary}
          title={PanelTitle({ icon: <ListChecks size={15} />, text: '字段可视化配置', color: '#fff' })}
        >
          <div>
            {fields.map((ui, i) => (
              <FieldRow key={i} spec={specs[i]} ui={ui} onChange={(next) => updateField(i, next)} />
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <InfoCard
              icon={<Lightbulb size={14} />}
              text="「日」与「周」同时指定具体值时按「或」执行（满足其一即触发）；? 表示该字段不参与匹配，二者不可同时为 ?。"
              tone="info"
            />
          </div>
        </AccentCard>

        <div className="flex flex-col gap-5">
          {/* 表达式 + 校验 */}
          <AccentCard
            accent={primary}
            title={PanelTitle({ icon: <Wand2 size={15} />, text: '表达式与合法性校验', color: '#fff' })}
            extra={
              <Button
                type="text"
                size="small"
                icon={<Copy size={12} />}
                style={{ color: '#ffffff' }}
                onClick={() => void copy(expr, 'Cron 表达式')}
              >
                复制
              </Button>
            }
          >
            <div className="flex flex-col gap-3">
              <Input
                value={inputText}
                onChange={(e) => handleExprEdit(e.target.value)}
                placeholder="* * * * *"
                className="ck-code"
                style={{ fontSize: 14 }}
                onBlur={() => setInputText(expr)}
              />
              {validation.ok ? (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#047857',
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  <CheckCircle2 size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span>表达式合法 · {validation.parsed.description}</span>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  <XCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span>{validation.error}</span>
                </div>
              )}
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
                支持 5 段（分 时 日 月 周）与 6 段（含秒）；字段取值可用 * / ? / 逗号列表 / 区间 a-b / 步长 * /n。
              </div>
            </div>
          </AccentCard>

          {/* 执行时间推算 */}
          <AccentCard
            accent={primary}
            title={PanelTitle({ icon: <CalendarClock size={15} />, text: '接下来 5 次执行时间', color: '#fff' })}
            extra={
              <Button
                type="text"
                size="small"
                icon={<RefreshCw size={12} />}
                style={{ color: '#ffffff' }}
                onClick={() => setTick((t) => t + 1)}
              >
                刷新
              </Button>
            }
          >
            {!validation.ok ? (
              <div style={{ fontSize: 12, color: '#b91c1c' }}>请先修正表达式后查看执行时间。</div>
            ) : runTimes.length === 0 ? (
              <div style={{ fontSize: 13, color: '#64748b' }}>
                // 未来一段时间内没有可执行的时刻（如 2 月 31 日等不存在的日期）。
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {runTimes.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
                      <span style={{ fontSize: 12, color: '#64748b', flexShrink: 0 }}>
                        第 {i + 1} 次
                      </span>
                      <span
                        className="ck-code"
                        style={{ fontSize: 13, color: '#0f172a' }}
                      >
                        {formatDate(d, 'YYYY-MM-DD HH:mm:ss')}
                      </span>
                    </div>
                    <Tag style={{ borderRadius: 6, margin: 0, flexShrink: 0 }}>
                      {formatDate(d, 'dddd')}
                    </Tag>
                  </div>
                ))}
              </div>
            )}
          </AccentCard>
        </div>
      </div>
    </div>
  );
}
