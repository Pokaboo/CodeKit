import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  App,
  Alert,
  Button,
  Card,
  Checkbox,
  Input,
  InputNumber,
  Pagination,
  Segmented,
  Select,
  Table,
  Tag,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Download, FileSpreadsheet, GitCompareArrows, UploadCloud } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { AccentCard, PanelTitle, StatCard, cardBodyStyle, useDiffNotes } from './parts';
import {
  buildHighlightHtml,
  DEFAULT_NORMALIZE,
  type CellDiff,
  type CellValueNormalize,
  type CompareOptions,
  type ExcelCompareResult,
  type OrphanRow,
  type SheetMetaLite,
} from '../../lib/excelCompare';
import type { Side, WorkerRequest, WorkerResponse } from '../../lib/excelCompareProtocol';

const ACCEPT = '.xlsx,.xls,.csv';

interface SideState {
  name: string;
  sheetNames: string[];
  sheet: string;
  headerRow: number;
  meta: SheetMetaLite | null;
}

const EMPTY_SIDE: SideState = { name: '', sheetNames: [], sheet: '', headerRow: 0, meta: null };

function download(name: string, data: BlobPart, type: string) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function stamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
}

export default function ExcelCompareWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();
  const messageRef = useRef(message);
  messageRef.current = message;

  const [sides, setSides] = useState<Record<Side, SideState>>({ A: { ...EMPTY_SIDE }, B: { ...EMPTY_SIDE } });
  const [keyMode, setKeyMode] = useState<'column' | 'row'>('column');
  const [keyCols, setKeyCols] = useState<string[]>([]);
  const [ignoreCols, setIgnoreCols] = useState<string[]>([]);
  const [normalize, setNormalize] = useState<CellValueNormalize>(DEFAULT_NORMALIZE);
  const [result, setResult] = useState<ExcelCompareResult | null>(null);
  const [stale, setStale] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [colFilter, setColFilter] = useState<string>('');
  const [keySearch, setKeySearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [parsing, setParsing] = useState<Side | null>(null);
  const [workerReady, setWorkerReady] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    let w: Worker | null = null;
    try {
      w = new Worker(new URL('../../lib/excelCompare.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const data = event.data;
        if (data.type === 'error') {
          messageRef.current.error(data.message);
          setLoading(false);
          setExporting(false);
          setParsing(null);
          return;
        }
        if (data.type === 'loaded') {
          setSides((prev) => ({
            ...prev,
            [data.side]: {
              ...prev[data.side],
              sheetNames: data.sheetNames,
              sheet: data.meta.name,
              headerRow: data.meta.headerRow,
              meta: data.meta,
            },
          }));
          setParsing(null);
          setStale(true);
          return;
        }
        if (data.type === 'meta') {
          setSides((prev) => ({
            ...prev,
            [data.side]: {
              ...prev[data.side],
              sheet: data.meta.name,
              headerRow: data.meta.headerRow,
              meta: data.meta,
            },
          }));
          setStale(true);
          return;
        }
        if (data.type === 'result') {
          setResult(data.result);
          setStale(false);
          setLoading(false);
          setPage(1);
          if (data.result.stats.cellDiffs === 0 && data.result.orphans.length === 0) {
            messageRef.current.success('对比完成：两份数据完全一致');
          } else {
            messageRef.current.success('对比完成，已生成差异结果');
          }
          return;
        }
        if (data.type === 'export') {
          download(`对比差异_${stamp()}.xlsx`, data.buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          setExporting(false);
          messageRef.current.success('已导出差异 Excel');
        }
      };
      w.onerror = () => {
        setWorkerReady(false);
        messageRef.current.error('后台计算线程启动失败，请刷新页面重试');
      };
      workerRef.current = w;
      setWorkerReady(true);
    } catch {
      setWorkerReady(false);
      messageRef.current.error('后台计算线程不可用，请刷新页面重试');
    }
    return () => {
      w?.terminate();
      workerRef.current = null;
    };
  }, []);

  const post = (req: WorkerRequest, transfer?: Transferable[]) => {
    if (!workerRef.current) {
      messageRef.current.error('后台计算线程未就绪');
      return;
    }
    workerRef.current.postMessage(req, transfer ?? []);
  };

  const headersA = sides.A.meta?.headers ?? [];
  const headersB = sides.B.meta?.headers ?? [];
  const commonHeaders = useMemo(
    () => headersA.filter((h) => headersB.includes(h)),
    [headersA, headersB],
  );

  // 上传 A 后默认把第一列作为关键列
  useEffect(() => {
    if (headersA.length && !keyCols.length) setKeyCols([headersA[0]]);
  }, [headersA, keyCols.length]);

  // 任何配置变更都把已有结果标记为过期
  const configSignature = JSON.stringify({
    keyMode, keyCols, ignoreCols, normalize,
    a: [sides.A.sheet, sides.A.headerRow],
    b: [sides.B.sheet, sides.B.headerRow],
  });
  const lastSignature = useRef(configSignature);
  useEffect(() => {
    if (result && lastSignature.current !== configSignature) setStale(true);
    lastSignature.current = configSignature;
  }, [configSignature, result]);

  const refreshMeta = (side: Side, sheet: string, headerRow: number) => {
    setSides((prev) => ({ ...prev, [side]: { ...prev[side], sheet, headerRow } }));
    post({ type: 'meta', side, sheet, headerRow });
  };

  const handleFile = async (side: Side, file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      setSides((prev) => ({ ...prev, [side]: { ...prev[side], name: file.name } }));
      setParsing(side);
      post({ type: 'load', side, buffer, name: file.name, headerRow: sides[side].headerRow }, [buffer]);
    } catch {
      message.error(`文件${side}读取失败`);
      setParsing(null);
    }
  };

  const runCompare = () => {
    if (!sides.A.meta || !sides.B.meta) {
      message.warning('请先上传两个 Excel / CSV 文件');
      return;
    }
    if (keyMode === 'column' && !keyCols.length) {
      message.warning('请先选择关键列');
      return;
    }
    setLoading(true);
    const options: CompareOptions = {
      keyMode,
      keyCols,
      ignoreCols,
      normalize,
      headerRowA: sides.A.headerRow,
      headerRowB: sides.B.headerRow,
      sheetA: sides.A.sheet,
      sheetB: sides.B.sheet,
    };
    post({ type: 'compare', requestId: ++reqId.current, options });
  };

  const exportExcel = () => {
    if (!result) return;
    setExporting(true);
    post({ type: 'export', requestId: ++reqId.current, result });
  };

  const exportHtml = () => {
    if (!result) return;
    download(`Excel对照_${stamp()}.html`, buildHighlightHtml(result), 'text/html;charset=utf-8');
    message.success('已下载带高亮的 HTML 对照表');
  };

  const filteredDiffs = useMemo(() => {
    if (!result) return [];
    return result.cellDiffs.filter(
      (d) => (!colFilter || d.col === colFilter) && (!keySearch || d.keyValue.includes(keySearch)),
    );
  }, [result, colFilter, keySearch]);

  const filteredOrphans = useMemo(() => {
    if (!result) return [];
    return result.orphans.filter((o) => !keySearch || o.keyValue.includes(keySearch));
  }, [result, keySearch]);

  const filteredGrid = useMemo(() => {
    if (!result) return [];
    return result.gridRows.filter((r) => {
      if (keySearch && !r.keyValue.includes(keySearch)) return false;
      if (colFilter && !r.cells.some((c) => c.col === colFilter && c.changed)) return false;
      return true;
    });
  }, [result, colFilter, keySearch]);

  const noteKey = (d: CellDiff) => `${d.keyValue}|${d.col}`;
  const { notes, setNote } = useDiffNotes('excel');

  const diffColumns: ColumnsType<CellDiff> = [
    { title: 'A行', dataIndex: 'sheetRowA', width: 66 },
    { title: 'B行', dataIndex: 'sheetRowB', width: 66 },
    { title: '关键值', dataIndex: 'keyValue', width: 150, ellipsis: true },
    { title: '差异列', dataIndex: 'col', width: 130, ellipsis: true },
    { title: '文件A', dataIndex: 'valueA', ellipsis: true, render: (v: string) => <span style={{ color: '#dc2626' }}>{v || '（空）'}</span> },
    { title: '文件B', dataIndex: 'valueB', ellipsis: true, render: (v: string) => <span style={{ color: '#059669' }}>{v || '（空）'}</span> },
    {
      title: '备注',
      key: 'note',
      width: 160,
      render: (_: unknown, r: CellDiff) => (
        <Input
          size="small"
          placeholder="标注此差异"
          value={notes[noteKey(r)] ?? ''}
          onChange={(e) => setNote(noteKey(r), e.target.value)}
        />
      ),
    },
  ];

  const orphanColumns: ColumnsType<OrphanRow> = [
    {
      title: '状态',
      dataIndex: 'side',
      width: 120,
      render: (s: OrphanRow['side']) =>
        s === 'onlyA' ? <Tag color="error">仅文件A存在</Tag> : <Tag color="success">仅文件B存在</Tag>,
    },
    { title: '行号', dataIndex: 'sheetRow', width: 70 },
    { title: '关键值', dataIndex: 'keyValue', width: 150, ellipsis: true },
    ...(result?.headers.map((h) => ({
      title: h,
      key: h,
      ellipsis: true,
      render: (_: unknown, r: OrphanRow) => r.values[h] ?? '',
    })) ?? []),
  ];

  const Uploader = ({ side }: { side: Side }) => {
    const s = sides[side];
    return (
      <AccentCard
        accent={primary}
        title={PanelTitle({ icon: <FileSpreadsheet size={15} />, text: `文件${side}`, color: '#fff' })}
      >
        <Upload.Dragger
          accept={ACCEPT}
          showUploadList={false}
          beforeUpload={(f) => {
            void handleFile(side, f);
            return false;
          }}
          style={{ background: '#f8fafc' }}
        >
          {s.name ? (
            <div style={{ padding: '12px 0' }}>
              <FileSpreadsheet size={28} style={{ color: primary }} />
              <div style={{ marginTop: 8, fontSize: 13, color: '#0f172a', wordBreak: 'break-all' }}>{s.name}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: parsing === side ? '#b45309' : '#059669' }}>
                {parsing === side ? '正在后台解析…' : s.meta ? `已就绪 · ${s.meta.totalRows} 行数据` : '已就绪'}
              </div>
            </div>
          ) : (
            <div style={{ padding: '12px 0' }}>
              <UploadCloud size={28} style={{ color: '#94a3b8' }} />
              <div style={{ marginTop: 8, fontSize: 13, color: '#475569' }}>拖放或点击选择文件{side}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8' }}>支持 .xlsx / .xls / .csv（自动识别 GBK）</div>
            </div>
          )}
        </Upload.Dragger>
        {s.meta && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
              解析预览 · 表头第 {s.meta.headerRow + 1} 行 · 共 {s.meta.totalRows} 行 · {s.meta.headers.length} 列
            </div>
            <div style={{ overflow: 'auto', maxHeight: 120, border: '1px solid #e2e8f0', borderRadius: 6 }}>
              <table className="ck-preview-table">
                <thead>
                  <tr>{s.meta.headers.map((h, i) => <th key={`${h}-${i}`}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {s.meta.preview.map((row, i) => (
                    <tr key={i}>{s.meta!.headers.map((_, j) => <td key={j}>{row[j] ?? ''}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AccentCard>
    );
  };

  const sheetSelector = (side: Side) => {
    const s = sides[side];
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>文件{side}工作表</div>
          <Select
            value={s.sheet || undefined}
            onChange={(v) => refreshMeta(side, v, s.headerRow)}
            options={s.sheetNames.map((n) => ({ label: n, value: n }))}
            placeholder="选择工作表"
            disabled={!s.meta}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ width: 92 }}>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>表头行</div>
          <InputNumber
            min={1}
            max={99}
            value={s.headerRow + 1}
            onChange={(v) => refreshMeta(side, s.sheet, Math.max(0, (v ?? 1) - 1))}
            disabled={!s.meta}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    );
  };

  const pageGrid = filteredGrid.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Uploader side="A" />
        <Uploader side="B" />
      </div>

      <Card className="ck-rise" styles={{ body: cardBodyStyle }}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sheetSelector('A')}
          {sheetSelector('B')}
        </div>
        <div style={{ height: 1, background: '#f1f5f9', margin: '16px 0' }} />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:flex-wrap">
          <div style={{ minWidth: 190 }}>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>行匹配方式</div>
            <Segmented
              value={keyMode}
              onChange={(v) => setKeyMode(v as 'column' | 'row')}
              options={[{ label: '按关键列', value: 'column' }, { label: '按行号', value: 'row' }]}
            />
          </div>
          <div style={{ minWidth: 220, flex: 1 }}>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>关键列（可多选组成复合键）</div>
            <Select
              mode="multiple"
              value={keyCols}
              onChange={setKeyCols}
              options={headersA.map((h) => ({ label: h, value: h }))}
              placeholder="选择关键列"
              disabled={!sides.A.meta || keyMode === 'row'}
              style={{ width: '100%' }}
              maxTagCount="responsive"
            />
          </div>
          <div style={{ minWidth: 220, flex: 1 }}>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>忽略列（不参与比较）</div>
            <Select
              mode="multiple"
              value={ignoreCols}
              onChange={setIgnoreCols}
              options={commonHeaders.map((h) => ({ label: h, value: h }))}
              placeholder="如更新时间、自增ID"
              disabled={!commonHeaders.length}
              style={{ width: '100%' }}
              maxTagCount="responsive"
            />
          </div>
          <Button
            type="primary"
            icon={<GitCompareArrows size={14} />}
            loading={loading}
            disabled={!workerReady}
            onClick={runCompare}
            style={{ height: 38 }}
          >
            开始对比
          </Button>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#475569' }}>值归一化</span>
          {([
            ['trim', '去首尾空白'],
            ['ignoreCase', '忽略大小写'],
            ['numeric', '数字按数值'],
            ['date', '日期格式'],
          ] as [keyof CellValueNormalize, string][]).map(([key, label]) => (
            <Checkbox
              key={key}
              checked={normalize[key]}
              onChange={(e) => setNormalize((o) => ({ ...o, [key]: e.target.checked }))}
              style={{ fontSize: 13 }}
            >
              {label}
            </Checkbox>
          ))}
          <span style={{ fontSize: 12, color: '#94a3b8' }}>比较与展示使用同一口径</span>
        </div>
        {!workerReady && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#b45309' }}>后台计算线程未就绪，请刷新页面后重试。</div>
        )}
      </Card>

      {result && (
        <div className="space-y-5">
          {stale && (
            <Alert
              type="warning"
              showIcon
              message="配置已变更，当前展示的是上一次对比结果，请重新点击「开始对比」。"
            />
          )}
          {result.warnings.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message="对比提示"
              description={<div style={{ fontSize: 12, lineHeight: 1.9 }}>{result.warnings.map((w, i) => <div key={i}>· {w}</div>)}</div>}
            />
          )}
          {result.suspectedInsert && (
            <Alert type="info" showIcon message="疑似存在插入/删除行：按行号对齐会把后续行整体错位，建议改用关键列匹配。" />
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <StatCard label="文件A行数" value={result.stats.rowsA} color="#475569" />
            <StatCard label="文件B行数" value={result.stats.rowsB} color="#475569" />
            <StatCard label="匹配行数" value={result.stats.matched} color={primary} />
            <StatCard label="单元格差异" value={result.stats.cellDiffs} color="#dc2626" />
            <StatCard label="仅A存在" value={result.stats.onlyA} color="#dc2626" />
            <StatCard label="仅B存在" value={result.stats.onlyB} color="#059669" />
            <StatCard label="重复键丢弃" value={result.stats.duplicateKeysA + result.stats.duplicateKeysB} color="#b45309" />
            <StatCard label="空关键列" value={result.stats.emptyKeysA + result.stats.emptyKeysB} color="#b45309" />
          </div>

          <AccentCard
            accent={primary}
            title={PanelTitle({ icon: <GitCompareArrows size={15} />, text: '差异结果', color: '#fff' })}
            extra={
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  size="small"
                  icon={<Download size={14} />}
                  loading={exporting}
                  onClick={exportExcel}
                  style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }}
                >
                  导出 Excel
                </Button>
                <Button
                  size="small"
                  icon={<Download size={14} />}
                  onClick={exportHtml}
                  style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }}
                >
                  导出高亮 HTML
                </Button>
              </div>
            }
          >
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
              <Segmented
                value={viewMode}
                onChange={(v) => { setViewMode(v as 'grid' | 'list'); setPage(1); }}
                options={[{ label: '并排网格', value: 'grid' }, { label: '差异清单', value: 'list' }]}
              />
              <Select
                value={colFilter || undefined}
                onChange={(v) => { setColFilter(v ?? ''); setPage(1); }}
                options={result.headers.map((h) => ({ label: h, value: h }))}
                placeholder="按差异列筛选"
                allowClear
                style={{ width: 180 }}
              />
              <Input.Search
                allowClear
                value={keySearch}
                onChange={(e) => { setKeySearch(e.target.value); setPage(1); }}
                placeholder="按关键值搜索"
                style={{ width: 180 }}
              />
            </div>

            {viewMode === 'grid' ? (
              <>
                <div style={{ overflow: 'auto', maxHeight: 520, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <table className="ck-grid-table">
                    <thead>
                      <tr>
                        <th rowSpan={2}>关键值</th><th rowSpan={2}>A行</th><th rowSpan={2}>B行</th>
                        {result.headers.map((h) => <th key={h} colSpan={2}>{h}</th>)}
                      </tr>
                      <tr>
                        {result.headers.map((h) => (
                          <Fragment key={h}><th className="ck-grid-sub">A</th><th className="ck-grid-sub">B</th></Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageGrid.map((r, idx) => (
                        <tr key={`${r.keyValue}-${idx}`} className={r.side === 'onlyA' ? 'ck-grid-only-a' : r.side === 'onlyB' ? 'ck-grid-only-b' : ''}>
                          <td className="ck-grid-key">{r.keyValue}</td>
                          <td>{r.sheetRowA ?? ''}</td>
                          <td>{r.sheetRowB ?? ''}</td>
                          {r.cells.map((c) => (
                            <Fragment key={c.col}>
                              <td className={c.changed ? 'ck-grid-chg-a' : ''}>{c.a}</td>
                              <td className={c.changed ? 'ck-grid-chg-b' : ''}>{c.b}</td>
                            </Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <Pagination
                    current={page}
                    pageSize={pageSize}
                    total={filteredGrid.length}
                    showSizeChanger
                    pageSizeOptions={[10, 20, 50, 100]}
                    onChange={(p, size) => { setPage(p); setPageSize(size); }}
                    showTotal={(t) => `共 ${t} 行`}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-5">
                <Table
                  columns={diffColumns}
                  dataSource={filteredDiffs}
                  rowKey={(_, i) => String(i)}
                  pagination={{ pageSize, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100] }}
                  size="middle"
                  scroll={{ x: 900 }}
                  locale={{ emptyText: '无单元格差异' }}
                  title={() => <span style={{ fontSize: 13 }}>单元格差异（{filteredDiffs.length}）</span>}
                />
                {filteredOrphans.length > 0 && (
                  <Table
                    columns={orphanColumns}
                    dataSource={filteredOrphans}
                    rowKey={(_, i) => String(i)}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    size="middle"
                    scroll={{ x: 900 }}
                    title={() => <span style={{ fontSize: 13 }}>独有行（{filteredOrphans.length}）· 已按列展开</span>}
                  />
                )}
              </div>
            )}
          </AccentCard>
        </div>
      )}
    </div>
  );
}
