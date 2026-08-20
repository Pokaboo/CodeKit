import * as XLSX from 'xlsx';

/** 单个工作表的解析元数据 */
export interface ExcelSheetMeta {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
  raw: string[][];
}

export interface CellDiff {
  /** 该差异所在的 Sheet 行号（1-based） */
  sheetRow: number;
  /** 关键列的值 */
  keyValue: string;
  /** 差异列名 */
  col: string;
  colIndex: number;
  valueA: string;
  valueB: string;
}

export interface OrphanRow {
  side: 'onlyA' | 'onlyB';
  sheetRow: number;
  keyValue: string;
  values: Record<string, string>;
}

export interface ExcelCompareResult {
  headers: string[];
  keyCol: string;
  cellDiffs: CellDiff[];
  orphans: OrphanRow[];
  stats: {
    rowsA: number;
    rowsB: number;
    matched: number;
    cellDiffs: number;
    onlyA: number;
    onlyB: number;
  };
  warnings: string[];
}

export type KeyMode = 'column' | 'row';

/** 读取文件为 WorkBook */
export function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  return file.arrayBuffer().then((buf) => XLSX.read(buf, { type: 'array' }));
}

/** 解析指定工作表为元数据（首行作为表头） */
export function getSheetMeta(wb: XLSX.WorkBook, sheetName?: string): ExcelSheetMeta {
  const name = sheetName && wb.SheetNames.includes(sheetName) ? sheetName : wb.SheetNames[0];
  const sheet = wb.Sheets[name];
  const raw = (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]).map((r) =>
    r.map((c) => (c === null || c === undefined ? '' : String(c))),
  );
  const headers = (raw[0] ?? []).map((h, i) => (h === '' ? `列${i + 1}` : String(h)));
  const rows = raw.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] === undefined ? '' : String(r[i]);
    });
    return obj;
  });
  return { name, headers, rows, raw };
}

/**
 * 比对两份工作表。
 * - keyMode='column'：以关键列的值作为行匹配键（适合有 ID 等唯一键）。
 * - keyMode='row'：按行号顺序对齐（适合行顺序一致）。
 */
export function compareWorkbooks(
  metaA: ExcelSheetMeta,
  metaB: ExcelSheetMeta,
  keyCol: string,
  keyMode: KeyMode = 'column',
  extraWarnings: string[] = [],
): ExcelCompareResult {
  const warnings = [...extraWarnings];
  const headersA = metaA.headers;
  const headersB = metaB.headers;

  const missingInB = headersA.filter((h) => !headersB.includes(h));
  const missingInA = headersB.filter((h) => !headersA.includes(h));
  if (missingInB.length) warnings.push(`文件B缺少列：${missingInB.join('、')}`);
  if (missingInA.length) warnings.push(`文件A缺少列：${missingInA.join('、')}`);
  const compareCols = headersA.filter((h) => headersB.includes(h));

  const keyOf = (row: Record<string, string>, idx: number) =>
    keyMode === 'column' ? String(row[keyCol] ?? '') : `ROW#${idx}`;

  const mapA = new Map<string, { row: Record<string, string>; sheetRow: number }>();
  metaA.rows.forEach((row, i) => {
    const k = keyOf(row, i);
    if (!mapA.has(k)) mapA.set(k, { row, sheetRow: i + 2 }); // +2 = 表头占第1行 + 1-based
  });
  const mapB = new Map<string, { row: Record<string, string>; sheetRow: number }>();
  metaB.rows.forEach((row, i) => {
    const k = keyOf(row, i);
    if (!mapB.has(k)) mapB.set(k, { row, sheetRow: i + 2 });
  });

  const cellDiffs: CellDiff[] = [];
  const orphans: OrphanRow[] = [];
  let matched = 0;

  for (const [k, a] of mapA) {
    const b = mapB.get(k);
    if (!b) {
      orphans.push({ side: 'onlyA', sheetRow: a.sheetRow, keyValue: k, values: a.row });
      continue;
    }
    matched++;
    for (const col of compareCols) {
      const va = (a.row[col] ?? '').trim();
      const vb = (b.row[col] ?? '').trim();
      if (va !== vb) {
        cellDiffs.push({
          sheetRow: a.sheetRow,
          keyValue: k,
          col,
          colIndex: headersA.indexOf(col),
          valueA: a.row[col] ?? '',
          valueB: b.row[col] ?? '',
        });
      }
    }
  }
  for (const [k, b] of mapB) {
    if (!mapA.has(k)) {
      orphans.push({ side: 'onlyB', sheetRow: b.sheetRow, keyValue: k, values: b.row });
    }
  }

  return {
    headers: compareCols,
    keyCol,
    cellDiffs,
    orphans,
    stats: {
      rowsA: metaA.rows.length,
      rowsB: metaB.rows.length,
      matched,
      cellDiffs: cellDiffs.length,
      onlyA: orphans.filter((o) => o.side === 'onlyA').length,
      onlyB: orphans.filter((o) => o.side === 'onlyB').length,
    },
    warnings,
  };
}

/** 生成可下载的差异工作簿（单元格差异 / 独有行 / 汇总 三个 Sheet） */
export function buildExportWorkbook(
  result: ExcelCompareResult,
  metaA: ExcelSheetMeta,
  metaB: ExcelSheetMeta,
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  void metaA;
  void metaB;

  const diffRows = result.cellDiffs.map((d) => ({
    行号: d.sheetRow,
    [result.keyCol]: d.keyValue,
    差异列: d.col,
    文件A: d.valueA,
    文件B: d.valueB,
  }));
  const diffWs = XLSX.utils.json_to_sheet(
    diffRows.length ? diffRows : [{ 提示: '两份文件无单元格差异' }],
  );
  XLSX.utils.book_append_sheet(wb, diffWs, '单元格差异');

  const orphanRows = result.orphans.map((o) => ({
    状态: o.side === 'onlyA' ? '仅文件A存在' : '仅文件B存在',
    行号: o.sheetRow,
    [result.keyCol]: o.keyValue,
    内容: JSON.stringify(o.values),
  }));
  const orphanWs = XLSX.utils.json_to_sheet(
    orphanRows.length ? orphanRows : [{ 提示: '无独有行' }],
  );
  XLSX.utils.book_append_sheet(wb, orphanWs, '独有行');

  const s = result.stats;
  const summary = [
    { 指标: '文件A数据行数', 值: s.rowsA },
    { 指标: '文件B数据行数', 值: s.rowsB },
    { 指标: '成功匹配行数', 值: s.matched },
    { 指标: '单元格差异数', 值: s.cellDiffs },
    { 指标: '仅文件A存在的行', 值: s.onlyA },
    { 指标: '仅文件B存在的行', 值: s.onlyB },
  ];
  const sumWs = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, sumWs, '汇总');

  return wb;
}
