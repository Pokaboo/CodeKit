import { createPatch, diffChars, diffLines } from 'diff';

/** diff 前的归一化选项：比较用归一化文本，展示仍尽量用原文行 */
export interface NormalizeOptions {
  /** 忽略每行首尾空白 */
  ignoreWhitespace: boolean;
  /** 忽略大小写 */
  ignoreCase: boolean;
  /** 过滤空行 */
  ignoreEmptyLines: boolean;
  /** CRLF / CR 统一为 LF */
  normalizeEol: boolean;
}

export const DEFAULT_NORMALIZE: NormalizeOptions = {
  ignoreWhitespace: false,
  ignoreCase: false,
  ignoreEmptyLines: false,
  normalizeEol: true,
};

export interface NormalizedText {
  /** 参与 diff 的文本 */
  text: string;
  /** 参与 diff 的行 */
  lines: string[];
  /** 与 lines 一一对应的原始行（用于展示） */
  displayLines: string[];
}

export function normalizeText(raw: string, opts: NormalizeOptions): NormalizedText {
  const eol = opts.normalizeEol ? raw.replace(/\r\n?/g, '\n') : raw;
  const originalLines = eol.split('\n');
  if (originalLines.length > 1 && originalLines[originalLines.length - 1] === '') originalLines.pop();
  const lines: string[] = [];
  const displayLines: string[] = [];
  originalLines.forEach((line) => {
    if (opts.ignoreEmptyLines && line.trim() === '') return;
    let cmp = opts.ignoreWhitespace ? line.trim() : line;
    if (opts.ignoreCase) cmp = cmp.toLowerCase();
    lines.push(cmp);
    displayLines.push(line);
  });
  return { text: lines.join('\n'), lines, displayLines };
}

export interface InlineSegment {
  text: string;
  kind: 'equal' | 'added' | 'removed';
}

export type DiffRowKind = 'equal' | 'added' | 'removed' | 'modified' | 'collapsed';

export interface DiffRow {
  key: string;
  kind: DiffRowKind;
  noA: number | null;
  noB: number | null;
  textA: string;
  textB: string;
  segmentsA: InlineSegment[];
  segmentsB: InlineSegment[];
  /** kind=collapsed 时被折叠的行数 */
  folded: number;
}

export interface UnifiedRow {
  key: string;
  sign: '+' | '-' | ' ';
  text: string;
  no: number;
}

export interface TextDiffStats {
  added: number;
  removed: number;
  modified: number;
  /** 差异行数 = 新增 + 删除 + 修改 */
  changes: number;
  linesA: number;
  linesB: number;
  identical: boolean;
}

export interface TextDiffResult {
  rows: DiffRow[];
  unifiedRows: UnifiedRow[];
  patch: string;
  stats: TextDiffStats;
  /** rows 中差异行的下标，供上一处/下一处导航 */
  changeIndexes: number[];
}

interface Block {
  kind: 'equal' | 'added' | 'removed';
  textLines: string[];
  displayLines: string[];
  startNo: number;
}

function splitValue(value: string): string[] {
  const v = value.endsWith('\n') ? value.slice(0, -1) : value;
  return v.split('\n');
}

function inlineSegments(a: string, b: string): { segmentsA: InlineSegment[]; segmentsB: InlineSegment[] } {
  const segmentsA: InlineSegment[] = [];
  const segmentsB: InlineSegment[] = [];
  // 超长行跳过字符级 diff，避免 O(n^2) 卡顿
  if (a.length + b.length > 4000) {
    if (a) segmentsA.push({ text: a, kind: 'removed' });
    if (b) segmentsB.push({ text: b, kind: 'added' });
    return { segmentsA, segmentsB };
  }
  diffChars(a, b).forEach((p) => {
    if (p.added) segmentsB.push({ text: p.value, kind: 'added' });
    else if (p.removed) segmentsA.push({ text: p.value, kind: 'removed' });
    else {
      segmentsA.push({ text: p.value, kind: 'equal' });
      segmentsB.push({ text: p.value, kind: 'equal' });
    }
  });
  return { segmentsA, segmentsB };
}

function makeRow(
  key: string,
  kind: DiffRowKind,
  noA: number | null,
  noB: number | null,
  textA: string,
  textB: string,
  withInline: boolean,
): DiffRow {
  const inline = withInline ? inlineSegments(textA, textB) : null;
  return {
    key,
    kind,
    noA,
    noB,
    textA,
    textB,
    segmentsA: inline ? inline.segmentsA : [{ text: textA, kind: 'equal' }],
    segmentsB: inline ? inline.segmentsB : [{ text: textB, kind: 'equal' }],
    folded: 0,
  };
}

/** 把连续 equal 区块中超过上下文阈值的部分折叠成一行 */
export function foldContext(rows: DiffRow[], context: number): DiffRow[] {
  if (context < 0) return rows;
  const out: DiffRow[] = [];
  let i = 0;
  while (i < rows.length) {
    if (rows[i].kind !== 'equal') {
      out.push(rows[i]);
      i += 1;
      continue;
    }
    let j = i;
    while (j < rows.length && rows[j].kind === 'equal') j += 1;
    const block = rows.slice(i, j);
    if (block.length <= context * 2) {
      out.push(...block);
    } else {
      out.push(...block.slice(0, context));
      out.push({
        ...makeRow(`fold-${i}`, 'collapsed', null, null, '', '', false),
        folded: block.length - context * 2,
      });
      out.push(...block.slice(block.length - context));
    }
    i = j;
  }
  return out;
}

/**
 * 计算文本差异。
 * - 用 diffLines 得到块，再把相邻的 removed/added 块按位置配对成并排行；
 * - 配对的修改行用 diffChars 做字符级高亮；
 * - 同时产出统一视图行与标准 unified diff patch。
 */
export function computeTextDiff(
  rawA: string,
  rawB: string,
  opts: NormalizeOptions = DEFAULT_NORMALIZE,
  context = 3,
): TextDiffResult {
  const a = normalizeText(rawA, opts);
  const b = normalizeText(rawB, opts);
  const emptyStats: TextDiffStats = {
    added: 0,
    removed: 0,
    modified: 0,
    changes: 0,
    linesA: a.lines.length,
    linesB: b.lines.length,
    identical: a.text === b.text,
  };

  if (!rawA && !rawB) {
    return { rows: [], unifiedRows: [], patch: '', stats: emptyStats, changeIndexes: [] };
  }

  const parts = diffLines(a.text, b.text);
  const blocks: Block[] = [];
  const unifiedRows: UnifiedRow[] = [];
  let noA = 1;
  let noB = 1;
  let displayA = 1;
  let displayB = 1;

  parts.forEach((p) => {
    const kind: Block['kind'] = p.added ? 'added' : p.removed ? 'removed' : 'equal';
    const textLines = splitValue(p.value);
    const display = kind === 'added' ? b.displayLines : a.displayLines;
    const startDisplay = kind === 'added' ? displayB : displayA;
    const displayLines = textLines.map((_, i) => display[startDisplay - 1 + i] ?? '');
    const startNo = kind === 'added' ? noB : noA;
    blocks.push({ kind, textLines, displayLines, startNo });

    textLines.forEach((ln, i) => {
      const shown = displayLines[i] || ' ';
      const sign: UnifiedRow['sign'] = p.added ? '+' : p.removed ? '-' : ' ';
      unifiedRows.push({
        key: `u-${unifiedRows.length}`,
        sign,
        text: shown,
        no: p.added ? noB + i : noA + i,
      });
    });

    if (kind === 'equal') {
      noA += textLines.length;
      noB += textLines.length;
      displayA += textLines.length;
      displayB += textLines.length;
    } else if (kind === 'added') {
      noB += textLines.length;
      displayB += textLines.length;
    } else {
      noA += textLines.length;
      displayA += textLines.length;
    }
  });

  const rows: DiffRow[] = [];
  let added = 0;
  let removed = 0;
  let modified = 0;
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.kind === 'equal') {
      block.textLines.forEach((ln, li) => {
        rows.push(
          makeRow(
            `e-${i}-${li}`,
            'equal',
            block.startNo + li,
            block.startNo + li,
            block.displayLines[li] ?? '',
            block.displayLines[li] ?? '',
            false,
          ),
        );
      });
      i += 1;
      continue;
    }

    // 收集连续的 changed 块，直到遇到 equal 或结束
    const left: { text: string; no: number }[] = [];
    const right: { text: string; no: number }[] = [];
    let j = i;
    while (j < blocks.length && blocks[j].kind !== 'equal') {
      const cur = blocks[j];
      const target = cur.kind === 'removed' ? left : right;
      cur.textLines.forEach((ln, li) => {
        target.push({ text: cur.displayLines[li] ?? '', no: cur.startNo + li });
      });
      j += 1;
    }

    const pairs = Math.min(left.length, right.length);
    for (let k = 0; k < pairs; k += 1) {
      rows.push(makeRow(`m-${i}-${k}`, 'modified', left[k].no, right[k].no, left[k].text, right[k].text, true));
      modified += 1;
    }
    for (let k = pairs; k < left.length; k += 1) {
      rows.push(makeRow(`r-${i}-${k}`, 'removed', left[k].no, null, left[k].text, '', false));
      removed += 1;
    }
    for (let k = pairs; k < right.length; k += 1) {
      rows.push(makeRow(`a-${i}-${k}`, 'added', null, right[k].no, '', right[k].text, false));
      added += 1;
    }
    i = j;
  }

  const folded = foldContext(rows, context);
  const changeIndexes: number[] = [];
  folded.forEach((r, idx) => {
    if (r.kind !== 'equal' && r.kind !== 'collapsed') changeIndexes.push(idx);
  });

  const patch = createPatch('对比结果', a.text, b.text, '左侧原文', '右侧对比文', { context: 3 });

  return {
    rows: folded,
    unifiedRows,
    patch,
    stats: {
      added,
      removed,
      modified,
      changes: added + removed + modified,
      linesA: a.lines.length,
      linesB: b.lines.length,
      identical: a.text === b.text,
    },
    changeIndexes,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 生成可离线查看的并排 HTML 对照表（带字符级高亮） */
export function buildSplitHtml(result: TextDiffResult, title = '文本对比结果'): string {
  const style = `
    body{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;margin:24px;color:#0f172a}
    h1{font-size:18px;font-weight:600}
    table{border-collapse:collapse;width:100%;font-size:13px}
    th,td{border:1px solid #e2e8f0;padding:4px 8px;vertical-align:top;white-space:pre-wrap;word-break:break-all}
    th{background:#f8fafc;text-align:left}
    .no{width:44px;color:#94a3b8;text-align:right;user-select:none}
    .del{background:#fef2f2}.add{background:#ecfdf5}.mod-a{background:#fff7ed}.mod-b{background:#f0fdf4}
    .hl-a{background:#fecaca}.hl-b{background:#a7f3d0}
    .fold{background:#f8fafc;color:#64748b;text-align:center}
    .stat{font-size:13px;color:#475569;margin:10px 0 16px}`;
  const renderSegments = (segs: InlineSegment[], side: 'a' | 'b') =>
    segs
      .map((s) =>
        s.kind === 'equal'
          ? escapeHtml(s.text)
          : `<span class="hl-${side}">${escapeHtml(s.text)}</span>`,
      )
      .join('');
  const body = result.rows
    .map((r) => {
      if (r.kind === 'collapsed') {
        return `<tr><td class="fold" colspan="4">⋯ 已折叠 ${r.folded} 行未变更上下文</td></tr>`;
      }
      const clsA = r.kind === 'removed' ? 'del' : r.kind === 'modified' ? 'mod-a' : '';
      const clsB = r.kind === 'added' ? 'add' : r.kind === 'modified' ? 'mod-b' : '';
      return `<tr>
        <td class="no">${r.noA ?? ''}</td><td class="${clsA}">${renderSegments(r.segmentsA, 'a')}</td>
        <td class="no">${r.noB ?? ''}</td><td class="${clsB}">${renderSegments(r.segmentsB, 'b')}</td>
      </tr>`;
    })
    .join('');
  const s = result.stats;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${style}</style></head>
<body><h1>${escapeHtml(title)}</h1>
<div class="stat">新增 ${s.added} 行 · 删除 ${s.removed} 行 · 修改 ${s.modified} 行 · 共 ${s.changes} 行差异</div>
<table><thead><tr><th class="no">A</th><th>左侧原文</th><th class="no">B</th><th>右侧对比文</th></tr></thead>
<tbody>${body}</tbody></table></body></html>`;
}
