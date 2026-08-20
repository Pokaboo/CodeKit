import { useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Segmented, Select, Table, Tag, Upload } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Download, FileSpreadsheet, GitCompareArrows, UploadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { WorkBook } from 'xlsx';
import { useTheme } from '../../theme/ThemeContext';
import { PanelTitle, cardBodyStyle } from './parts';
import {
  buildExportWorkbook,
  compareWorkbooks,
  getSheetMeta,
  readWorkbook,
  type CellDiff,
  type ExcelCompareResult,
  type KeyMode,
  type OrphanRow,
} from '../../lib/excelCompare';

const ACCEPT = '.xlsx,.xls,.csv';

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 120,
        padding: '14px 16px',
        borderRadius: 10,
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

export default function ExcelCompareWorkspace() {
  const { message } = App.useApp();
  const { primary } = useTheme();

  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [wbA, setWbA] = useState<WorkBook | null>(null);
  const [wbB, setWbB] = useState<WorkBook | null>(null);
  const [sheetA, setSheetA] = useState<string>('');
  const [keyMode, setKeyMode] = useState<KeyMode>('column');
  const [keyCol, setKeyCol] = useState<string>('');
  const [result, setResult] = useState<ExcelCompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const sheetNamesA = wbA?.SheetNames ?? [];
  const headersA = useMemo(
    () => (wbA ? getSheetMeta(wbA, sheetA || undefined).headers : []),
    [wbA, sheetA],
  );

  // 切换工作表或文件后，保证关键列有效
  useEffect(() => {
    if (headersA.length && (!keyCol || !headersA.includes(keyCol))) {
      setKeyCol(headersA[0]);
    }
  }, [headersA, keyCol]);

  const handleA = async (file: File) => {
    try {
      const wb = await readWorkbook(file);
      setFileA(file);
      setWbA(wb);
      setSheetA(wb.SheetNames[0]);
      setResult(null);
    } catch {
      message.error('文件A解析失败，请确认是有效的 Excel/CSV');
    }
  };
  const handleB = async (file: File) => {
    try {
      const wb = await readWorkbook(file);
      setFileB(file);
      setWbB(wb);
      setResult(null);
    } catch {
      message.error('文件B解析失败，请确认是有效的 Excel/CSV');
    }
  };

  const runCompare = () => {
    if (!wbA || !wbB) {
      message.warning('请先上传两个 Excel 文件');
      return;
    }
    setLoading(true);
    try {
      const sheetWarn: string[] = [];
      if (sheetA && !wbB.SheetNames.includes(sheetA)) {
        sheetWarn.push(`文件B无同名工作表「${sheetA}」，已自动对比其首个工作表。`);
      }
      const metaA = getSheetMeta(wbA, sheetA || undefined);
      const metaB = getSheetMeta(wbB, sheetA || undefined);
      const res = compareWorkbooks(metaA, metaB, keyCol, keyMode, sheetWarn);
      setResult(res);
      if (res.stats.cellDiffs === 0 && res.orphans.length === 0) {
        message.success('对比完成：两份数据完全一致');
      } else {
        message.success('对比完成，已生成差异结果');
      }
    } catch (e) {
      message.error(`对比失败：${e instanceof Error ? e.message : '请检查文件格式'}`);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!result || !wbA || !wbB) return;
    setExporting(true);
    try {
      const metaA = getSheetMeta(wbA, sheetA || undefined);
      const metaB = getSheetMeta(wbB, sheetA || undefined);
      const wb = buildExportWorkbook(result, metaA, metaB);
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
      XLSX.writeFile(wb, `对比差异_${ts}.xlsx`);
      message.success('已导出差异 Excel');
    } catch (e) {
      message.error(`导出失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setExporting(false);
    }
  };

  const diffColumns: ColumnsType<CellDiff> = [
    { title: '行号', dataIndex: 'sheetRow', width: 70 },
    { title: result?.keyCol ?? '关键列', dataIndex: 'keyValue', width: 160, ellipsis: true },
    { title: '差异列', dataIndex: 'col', width: 140, ellipsis: true },
    {
      title: '文件A',
      dataIndex: 'valueA',
      render: (v: string) => <span style={{ color: '#ef4444' }}>{v || '（空）'}</span>,
    },
    {
      title: '文件B',
      dataIndex: 'valueB',
      render: (v: string) => <span style={{ color: '#10b981' }}>{v || '（空）'}</span>,
    },
  ];

  const orphanColumns: ColumnsType<OrphanRow> = [
    {
      title: '状态',
      dataIndex: 'side',
      width: 130,
      render: (s: OrphanRow['side']) =>
        s === 'onlyA' ? (
          <Tag color="error">仅文件A存在</Tag>
        ) : (
          <Tag color="success">仅文件B存在</Tag>
        ),
    },
    { title: '行号', dataIndex: 'sheetRow', width: 70 },
    { title: result?.keyCol ?? '关键列', dataIndex: 'keyValue', width: 160, ellipsis: true },
    { title: '整行内容', dataIndex: 'values', ellipsis: true, render: (v: Record<string, string>) => JSON.stringify(v) },
  ];

  const Uploader = ({ side, file, onFile }: { side: 'A' | 'B'; file: File | null; onFile: (f: File) => void }) => (
    <Card
      className="ck-rise"
      title={PanelTitle({ icon: <FileSpreadsheet size={15} />, text: `文件${side}`, color: primary })}
      styles={{ body: cardBodyStyle }}
      style={{ borderTop: `3px solid ${primary}` }}
    >
      <Upload.Dragger
        accept={ACCEPT}
        showUploadList={false}
        beforeUpload={(f) => {
          onFile(f);
          return false;
        }}
        style={{ background: '#f8fafc' }}
      >
        {file ? (
          <div style={{ padding: '12px 0' }}>
            <FileSpreadsheet size={28} style={{ color: primary }} />
            <div style={{ marginTop: 8, fontSize: 13, color: '#0f172a', wordBreak: 'break-all' }}>{file.name}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#10b981' }}>已就绪</div>
          </div>
        ) : (
          <div style={{ padding: '12px 0' }}>
            <UploadCloud size={28} style={{ color: '#94a3b8' }} />
            <div style={{ marginTop: 8, fontSize: 13, color: '#475569' }}>拖放或点击选择文件{side}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8' }}>支持 .xlsx / .xls / .csv</div>
          </div>
        )}
      </Upload.Dragger>
    </Card>
  );

  return (
    <div className="space-y-5">
      {/* 上传区 */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Uploader side="A" file={fileA} onFile={(f) => void handleA(f)} />
        <Uploader side="B" file={fileB} onFile={(f) => void handleB(f)} />
      </div>

      {/* 配置区 */}
      <Card className="ck-rise" styles={{ body: cardBodyStyle }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:flex-wrap">
          <div style={{ minWidth: 200 }}>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>对比工作表（取自文件A）</div>
            <Select
              value={sheetA || undefined}
              onChange={setSheetA}
              options={sheetNamesA.map((s) => ({ label: s, value: s }))}
              placeholder="选择工作表"
              disabled={!wbA}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ minWidth: 200 }}>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>行匹配方式</div>
            <Segmented
              value={keyMode}
              onChange={(v) => setKeyMode(v as KeyMode)}
              options={[
                { label: '按关键列', value: 'column' },
                { label: '按行号', value: 'row' },
              ]}
            />
          </div>
          <div style={{ minWidth: 200 }}>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>关键列</div>
            <Select
              value={keyCol || undefined}
              onChange={setKeyCol}
              options={headersA.map((h) => ({ label: h, value: h }))}
              placeholder="选择关键列"
              disabled={!wbA || keyMode === 'row'}
              style={{ width: '100%' }}
            />
          </div>
          <Button
            type="primary"
            icon={<GitCompareArrows size={14} />}
            loading={loading}
            onClick={runCompare}
            style={{ height: 38, marginTop: 'auto' }}
          >
            开始对比
          </Button>
        </div>
      </Card>

      {/* 结果区 */}
      {result && (
        <div className="space-y-5">
          {result.warnings.length > 0 && (
            <Card styles={{ body: { padding: 16 } }} style={{ borderLeft: '3px solid #f59e0b', background: '#fffbeb' }}>
              <div style={{ fontSize: 13, color: '#b45309', lineHeight: 1.8 }}>
                {result.warnings.map((w, i) => (
                  <div key={i}>· {w}</div>
                ))}
              </div>
            </Card>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <StatCard label="文件A行数" value={result.stats.rowsA} color="#475569" />
            <StatCard label="文件B行数" value={result.stats.rowsB} color="#475569" />
            <StatCard label="匹配行数" value={result.stats.matched} color={primary} />
            <StatCard label="单元格差异" value={result.stats.cellDiffs} color="#ef4444" />
            <StatCard label="仅A存在" value={result.stats.onlyA} color="#ef4444" />
            <StatCard label="仅B存在" value={result.stats.onlyB} color="#10b981" />
          </div>

          <Card
            className="ck-rise"
            title={PanelTitle({ icon: <GitCompareArrows size={15} />, text: '单元格差异', color: '#ef4444' })}
            extra={
              <Button
                type="primary"
                icon={<Download size={14} />}
                loading={exporting}
                onClick={exportExcel}
              >
                导出差异 Excel
              </Button>
            }
            styles={{ body: { padding: 0 } }}
            style={{ borderTop: '3px solid #ef4444' }}
          >
            <Table
              columns={diffColumns}
              dataSource={result.cellDiffs}
              rowKey={(_, i) => String(i)}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              size="middle"
              scroll={{ x: 600 }}
              locale={{ emptyText: '无单元格差异' }}
            />
          </Card>

          {result.orphans.length > 0 && (
            <Card
              className="ck-rise"
              title={PanelTitle({ icon: <GitCompareArrows size={15} />, text: '独有行（仅存在于某一文件）', color: '#f59e0b' })}
              styles={{ body: { padding: 0 } }}
              style={{ borderTop: '3px solid #f59e0b' }}
            >
              <Table
                columns={orphanColumns}
                dataSource={result.orphans}
                rowKey={(_, i) => String(i)}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                size="middle"
                scroll={{ x: 600 }}
                locale={{ emptyText: '无独有行' }}
              />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
