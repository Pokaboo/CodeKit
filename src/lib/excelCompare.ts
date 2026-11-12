import * as XLSX from 'xlsx';

/** 单个工作表的解析元数据（表头行可指定） */
export interface SheetMeta {
  name: string;
  /** 表头所在行（0-based） */
  headerRow: number;
  headers: string[];
  rows: Record<string, string>[];
  raw: string[][];
  /** 前 3 行数据，用于上传后的预览 */
  preview: string[][];
  totalRows: number;
}

/** 跨线程回传用的轻量元数据（不含全量 rows / raw） */
export interface SheetMetaLite {
  name: string;
  headerRow: number;
  headers: string[];
  preview: string[][];
  totalRows: number;
}

export function toLite(m: SheetMeta): SheetMetaLite {
  return {
    name: m.name,
    headerRow: m.headerRow,
    headers: m.headers,
    preview: m.preview,
    totalRows: m.totalRows,
  };
}

export interface CellDiff {
  sheetRowA: number;
  sheetRowB: number;
  keyValue: string;
  col: string;
  colIndex: number;
  /** 归一化后的展示值（与参与比较的值同口径） */
  valueA: string;
  valueB: string;
  /** 原始值，导出用 */
  rawA: string;
  rawB: string;
}

export interface OrphanRow {
  side: 'onlyA' | 'onlyB';
  sheetRow: number;
  keyValue: string;
  values: Record<string, string>;
}

export interface GridCell {
  col: string;
  a: string;
  b: string;
  changed: boolean;
}

export interface GridRow {
  keyValue: string;
  sheetRowA: number | null;
  sheetRowB: number | null;
  side: 'both' | 'onlyA' | 'onlyB';
  cells: GridCell[];
}

export interface CellValueNormalize {
  trim: boolean;
  ignoreCase: boolean;
  /** 数字按数值比较（1 与 1.0 视为相同） */
  numeric: boolean;
  /** 常见日期格式归一为 YYYY-MM-DD */
  date: boolean;
}

export interface CompareOptions {
  keyMode: 'column' | 'row';
  /** 复合关键列 */
  keyCols: string[];
  ignoreCols: string[];
  normalize: CellValueNormalize;
  headerRowA: number;
  headerRowB: number;
  sheetA: string;
  sheetB: string;
}

export const DEFAULT_NORMALIZE: CellValueNormalize = {
  trim: true,
  ignoreCase: false,
  numeric: true,
  date: true,
};

export interface ExcelCompareResult {
  headers: string[];
  keyCols: string[];
  ignoredCols: string[];
  cellDiffs: CellDiff[];
  orphans: OrphanRow[];
  gridRows: GridRow[];
  stats: {
    rowsA: number;
    rowsB: number;
    matched: number;
    cellDiffs: number;
    onlyA: number;
    onlyB: number;
    duplicateKeysA: number;
    duplicateKeysB: number;
    emptyKeysA: number;
    emptyKeysB: number;
    ignoredCols: number;
  };
  warnings: string[];
  suspectedInsert: boolean;
}

/**
 * 读取文件为 WorkBook。CSV 先做编码探测：UTF-8 解码出现替换字符时改用 GBK，
 * 避免中文 CSV 乱码。
 */
export async function readWorkbook(buffer: ArrayBuffer, fileName = ''): Promise<XLSX.WorkBook> {
  if (fileName.toLowerCase().endsWith('.csv')) {
    let text = new TextDecoder('utf-8').decode(buffer);
    if (text.includes('\uFFFD')) {
      try {
        text = new TextDecoder('gbk').decode(buffer);
      } catch {
        /* 不支持 gbk 时保留 UTF-8 结果 */
      }
    }
    return XLSX.read(text.replace(/^\uFEFF/, ''), { type: 'string' });
  }
  return XLSX.read(buffer, { type: 'array' });
}

export function getSheetNames(wb: XLSX.WorkBook): string[] {
  return wb.SheetNames ?? [];
}

export function getSheetMeta(wb: XLSX.WorkBook, sheetName?: string, headerRow = 0): SheetMeta {
  const name = sheetName && wb.SheetNames.includes(sheetName) ? sheetName : wb.SheetNames[0];
  const sheet = wb.Sheets[name];
  const raw = (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]).map((r) =>
    r.map((c) => (c === null || c === undefined ? '' : String(c))),
  );
  const hr = Math.min(Math.max(0, headerRow), Math.max(0, raw.length - 1));
  const headerLine = raw[hr] ?? [];
  const seen = new Map<string, number>();
  // 重名表头加后缀，避免对象 key 互相覆盖
  const headers = headerLine.map((h, i) => {
    const base = h === '' ? `列${i + 1}` : String(h);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}(${n + 1})`;
  });
  const rows = raw.slice(hr + 1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] === undefined ? '' : String(r[i]);
    });
    return obj;
  });
  const preview = raw.slice(hr + 1, hr + 4).map((r) =>
    headers.map((_, i) => (r[i] === undefined ? '' : String(r[i]))),
  );
  return { name, headerRow: hr, headers, rows, raw, preview, totalRows: rows.length };
}

export function normalizeCell(value: string, o: CellValueNormalize): string {
  let s = o.trim ? value.trim() : value;
  if (o.ignoreCase) s = s.toLowerCase();
  if (o.numeric && s !== '' && !Number.isNaN(Number(s))) s = String(Number(s));
  if (o.date && /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(s)) {
    const d = new Date(s.replace(/-/g, '/'));
    if (!Number.isNaN(d.getTime())) s = d.toISOString().slice(0, 10);
  }
  return s;
}

interface RowEntry {
  row: Record<string, string>;
  sheetRow: number;
}

function buildRowMap(
  meta: SheetMeta,
  options: CompareOptions,
): { map: Map<string, RowEntry>; duplicates: number; emptyKeys: number } {
  const map = new Map<string, RowEntry>();
  let duplicates = 0;
  let emptyKeys = 0;
  meta.rows.forEach((row, i) => {
    let key: string;
    if (options.keyMode === 'row') {
      key = `ROW#${i}`;
    } else {
      const parts = options.keyCols.map((c) => normalizeCell(row[c] ?? '', options.normalize));
      key = parts.join('||');
      if (!options.keyCols.length || parts.every((p) => p === '')) emptyKeys += 1;
    }
    if (map.has(key)) {
      // 重复键只保留首行，但显式统计，不再静默丢数据
      duplicates += 1;
      return;
    }
    map.set(key, { row, sheetRow: meta.headerRow + i + 2 });
  });
  return { map, duplicates, emptyKeys };
}

/** 比对两份工作表：支持复合键、忽略列、值归一化、表头行与 Sheet 分别指定 */
export function compareWorkbooks(
  metaA: SheetMeta,
  metaB: SheetMeta,
  options: CompareOptions,
): ExcelCompareResult {
  const warnings: string[] = [];
  const headersA = metaA.headers;
  const headersB = metaB.headers;

  const missingInB = headersA.filter((h) => !headersB.includes(h));
  const missingInA = headersB.filter((h) => !headersA.includes(h));
  if (missingInB.length) warnings.push(`文件B缺少列：${missingInB.join('、')}`);
  if (missingInA.length) warnings.push(`文件A缺少列：${missingInA.join('、')}`);
  if (metaA.headerRow !== metaB.headerRow) {
    warnings.push(`两侧表头行不同（A 第 ${metaA.headerRow + 1} 行 / B 第 ${metaB.headerRow + 1} 行），请确认解析正确。`);
  }

  const ignoredCols = options.ignoreCols.filter((h) => headersA.includes(h) && headersB.includes(h));
  if (ignoredCols.length) warnings.push(`已忽略 ${ignoredCols.length} 列：${ignoredCols.join('、')}`);
  const compareCols = headersA.filter((h) => headersB.includes(h) && !ignoredCols.includes(h));

  if (options.keyMode === 'column' && !options.keyCols.length) {
    warnings.push('未选择关键列：所有行会合并为同一个键，结果不可用，请先选择关键列。');
  }
  if (options.keyMode === 'column' && options.keyCols.some((c) => !headersA.includes(c))) {
    warnings.push('所选关键列在文件A中不存在，已按空值匹配。');
  }

  const a = buildRowMap(metaA, options);
  const b = buildRowMap(metaB, options);
  if (options.keyMode === 'column') {
    if (a.duplicates) warnings.push(`文件A有 ${a.duplicates} 行关键值重复，已保留首行，其余 ${a.duplicates} 行未参与比对。`);
    if (b.duplicates) warnings.push(`文件B有 ${b.duplicates} 行关键值重复，已保留首行，其余 ${b.duplicates} 行未参与比对。`);
    if (a.emptyKeys) warnings.push(`文件A有 ${a.emptyKeys} 行关键列为空，被合并为同一个键，结果可能不准。`);
    if (b.emptyKeys) warnings.push(`文件B有 ${b.emptyKeys} 行关键列为空，被合并为同一个键，结果可能不准。`);
  }

  const suspectedInsert = options.keyMode === 'row' && metaA.rows.length !== metaB.rows.length;
  if (suspectedInsert) {
    warnings.push(
      `按行号对齐时两份文件行数不同（A ${metaA.rows.length} / B ${metaB.rows.length}），中间若有插入或删除会导致整片假差异，建议改用关键列匹配。`,
    );
  }

  const cellDiffs: CellDiff[] = [];
  const orphans: OrphanRow[] = [];
  const gridRows: GridRow[] = [];
  let matched = 0;

  for (const [key, left] of a.map) {
    const right = b.map.get(key);
    if (!right) {
      orphans.push({ side: 'onlyA', sheetRow: left.sheetRow, keyValue: key, values: left.row });
      gridRows.push({
        keyValue: key,
        sheetRowA: left.sheetRow,
        sheetRowB: null,
        side: 'onlyA',
        cells: compareCols.map((col) => ({
          col,
          a: normalizeCell(left.row[col] ?? '', options.normalize),
          b: '',
          changed: true,
        })),
      });
      continue;
    }
    matched += 1;
    const cells: GridCell[] = compareCols.map((col) => {
      const valueA = normalizeCell(left.row[col] ?? '', options.normalize);
      const valueB = normalizeCell(right.row[col] ?? '', options.normalize);
      const changed = valueA !== valueB;
      if (changed) {
        cellDiffs.push({
          sheetRowA: left.sheetRow,
          sheetRowB: right.sheetRow,
          keyValue: key,
          col,
          colIndex: headersA.indexOf(col),
          valueA,
          valueB,
          rawA: left.row[col] ?? '',
          rawB: right.row[col] ?? '',
        });
      }
      return { col, a: valueA, b: valueB, changed };
    });
    gridRows.push({
      keyValue: key,
      sheetRowA: left.sheetRow,
      sheetRowB: right.sheetRow,
      side: 'both',
      cells,
    });
  }

  for (const [key, right] of b.map) {
    if (a.map.has(key)) continue;
    orphans.push({ side: 'onlyB', sheetRow: right.sheetRow, keyValue: key, values: right.row });
    gridRows.push({
      keyValue: key,
      sheetRowA: null,
      sheetRowB: right.sheetRow,
      side: 'onlyB',
      cells: compareCols.map((col) => ({
        col,
        a: '',
        b: normalizeCell(right.row[col] ?? '', options.normalize),
        changed: true,
      })),
    });
  }

  return {
    headers: compareCols,
    keyCols: options.keyCols,
    ignoredCols,
    cellDiffs,
    orphans,
    gridRows,
    stats: {
      rowsA: metaA.rows.length,
      rowsB: metaB.rows.length,
      matched,
      cellDiffs: cellDiffs.length,
      onlyA: orphans.filter((o) => o.side === 'onlyA').length,
      onlyB: orphans.filter((o) => o.side === 'onlyB').length,
      duplicateKeysA: a.duplicates,
      duplicateKeysB: b.duplicates,
      emptyKeysA: a.emptyKeys,
      emptyKeysB: b.emptyKeys,
      ignoredCols: ignoredCols.length,
    },
    warnings,
    suspectedInsert,
  };
}

/** 生成导出工作簿：单元格差异 / 并排对照 / 独有行 / 汇总 */
export function buildExportWorkbook(result: ExcelCompareResult): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const diffRows = result.cellDiffs.map((d) => ({
    'A行号': d.sheetRowA,
    'B行号': d.sheetRowB,
    关键值: d.keyValue,
    差异列: d.col,
    '文件A(原值)': d.rawA,
    '文件B(原值)': d.rawB,
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(diffRows.length ? diffRows : [{ 提示: '两份文件无单元格差异' }]),
    '单元格差异',
  );

  const gridRows = result.gridRows.map((r) => {
    const row: Record<string, string | number | null> = {
      关键值: r.keyValue,
      'A行号': r.sheetRowA,
      'B行号': r.sheetRowB,
      状态: r.side === 'both' ? '已匹配' : r.side === 'onlyA' ? '仅A存在' : '仅B存在',
    };
    r.cells.forEach((c) => {
      row[`A:${c.col}`] = c.a;
      row[`B:${c.col}`] = c.b;
    });
    return row;
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(gridRows.length ? gridRows : [{ 提示: '无可对比数据' }]),
    '并排对照',
  );

  const cols = result.headers;
  const orphanRows = result.orphans.map((o) => {
    const row: Record<string, string | number> = {
      状态: o.side === 'onlyA' ? '仅文件A存在' : '仅文件B存在',
      行号: o.sheetRow,
      关键值: o.keyValue,
    };
    cols.forEach((c) => {
      row[c] = o.values[c] ?? '';
    });
    return row;
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(orphanRows.length ? orphanRows : [{ 提示: '无独有行' }]),
    '独有行',
  );

  const s = result.stats;
  const summary: Record<string, string | number>[] = [
    { 指标: '文件A数据行数', 值: s.rowsA },
    { 指标: '文件B数据行数', 值: s.rowsB },
    { 指标: '成功匹配行数', 值: s.matched },
    { 指标: '单元格差异数', 值: s.cellDiffs },
    { 指标: '仅文件A存在的行', 值: s.onlyA },
    { 指标: '仅文件B存在的行', 值: s.onlyB },
    { 指标: 'A重复关键值丢弃行数', 值: s.duplicateKeysA },
    { 指标: 'B重复关键值丢弃行数', 值: s.duplicateKeysB },
    { 指标: '忽略列数', 值: s.ignoredCols },
  ];
  result.warnings.forEach((w, i) => summary.push({ 指标: `提示${i + 1}`, 值: w }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), '汇总');

  return wb;
}

/** Worker 侧把工作簿编码为可传输的 ArrayBuffer */
export function writeWorkbookBuffer(wb: XLSX.WorkBook): ArrayBuffer {
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

/** 生成带颜色高亮的离线 HTML 对照表（xlsx 社区版不写单元格样式，故单独提供） */
export function buildHighlightHtml(result: ExcelCompareResult, title = 'Excel 对比结果'): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const style = `
    body{font-family:ui-sans-serif,system-ui,sans-serif;margin:24px;color:#0f172a}
    h1{font-size:18px;font-weight:600}
    table{border-collapse:collapse;width:100%;font-size:12px;margin-top:12px}
    th,td{border:1px solid #e2e8f0;padding:5px 8px;text-align:left;white-space:nowrap}
    th{background:#f8fafc;position:sticky;top:0}
    .key{background:#f1f5f9;font-weight:600}
    .chg-a{background:#fee2e2;color:#991b1b}.chg-b{background:#d1fae5;color:#065f46}
    .only-a{background:#fef2f2}.only-b{background:#ecfdf5}
    .stat{font-size:13px;color:#475569;margin:10px 0}`;
  const cols = result.headers;
  const head = `<tr><th>关键值</th><th>A行</th><th>B行</th>${cols
    .map((c) => `<th colspan="2">${esc(c)}</th>`)
    .join('')}</tr><tr><th></th><th></th><th></th>${cols.map(() => '<th>A</th><th>B</th>').join('')}</tr>`;
  const body = result.gridRows
    .map((r) => {
      const rowCls = r.side === 'onlyA' ? 'only-a' : r.side === 'onlyB' ? 'only-b' : '';
      const cells = r.cells
        .map((c) => {
          const aCls = c.changed ? 'chg-a' : '';
          const bCls = c.changed ? 'chg-b' : '';
          return `<td class="${aCls}">${esc(c.a)}</td><td class="${bCls}">${esc(c.b)}</td>`;
        })
        .join('');
      return `<tr class="${rowCls}"><td class="key">${esc(r.keyValue)}</td><td>${r.sheetRowA ?? ''}</td><td>${r.sheetRowB ?? ''}</td>${cells}</tr>`;
    })
    .join('');
  const s = result.stats;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${style}</style></head>
<body><h1>${esc(title)}</h1>
<div class="stat">匹配 ${s.matched} 行 · 单元格差异 ${s.cellDiffs} · 仅A ${s.onlyA} 行 · 仅B ${s.onlyB} 行 · 重复键丢弃 A ${s.duplicateKeysA} / B ${s.duplicateKeysB}</div>
<table><thead>${head}</thead><tbody>${body}</tbody></table></body></html>`;
}
