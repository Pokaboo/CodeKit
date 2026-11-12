import type { WorkBook } from 'xlsx';
import {
  buildExportWorkbook,
  compareWorkbooks,
  getSheetMeta,
  getSheetNames,
  readWorkbook,
  toLite,
  writeWorkbookBuffer,
} from './excelCompare';
import type { Side, WorkerRequest, WorkerResponse } from './excelCompareProtocol';

interface WorkerCtx {
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse, transfer?: Transferable[]) => void;
}

const ctx = self as unknown as WorkerCtx;
const wbs: Record<Side, WorkBook | null> = { A: null, B: null };

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  const requestId = 'requestId' in req ? req.requestId : undefined;
  try {
    if (req.type === 'load') {
      const wb = await readWorkbook(req.buffer, req.name);
      wbs[req.side] = wb;
      const sheetNames = getSheetNames(wb);
      const meta = toLite(getSheetMeta(wb, sheetNames[0], req.headerRow));
      ctx.postMessage({ type: 'loaded', side: req.side, sheetNames, meta });
      return;
    }
    if (req.type === 'meta') {
      const wb = wbs[req.side];
      if (!wb) throw new Error(`文件${req.side}尚未加载`);
      ctx.postMessage({ type: 'meta', side: req.side, meta: toLite(getSheetMeta(wb, req.sheet, req.headerRow)) });
      return;
    }
    if (req.type === 'compare') {
      const wbA = wbs.A;
      const wbB = wbs.B;
      if (!wbA || !wbB) throw new Error('请先上传两个文件');
      const metaA = getSheetMeta(wbA, req.options.sheetA, req.options.headerRowA);
      const metaB = getSheetMeta(wbB, req.options.sheetB, req.options.headerRowB);
      const result = compareWorkbooks(metaA, metaB, req.options);
      ctx.postMessage({ type: 'result', requestId: req.requestId, result, metaA: toLite(metaA), metaB: toLite(metaB) });
      return;
    }
    if (req.type === 'export') {
      const buffer = writeWorkbookBuffer(buildExportWorkbook(req.result));
      ctx.postMessage({ type: 'export', requestId: req.requestId, buffer }, [buffer]);
      return;
    }
  } catch (e) {
    ctx.postMessage({
      type: 'error',
      requestId,
      message: e instanceof Error ? e.message : '后台处理失败',
    });
  }
};
