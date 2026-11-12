import type { CompareOptions, ExcelCompareResult, SheetMetaLite } from './excelCompare';

export type Side = 'A' | 'B';

export type WorkerRequest =
  | { type: 'load'; side: Side; buffer: ArrayBuffer; name: string; headerRow: number }
  | { type: 'meta'; side: Side; sheet: string; headerRow: number }
  | { type: 'compare'; requestId: number; options: CompareOptions }
  | { type: 'export'; requestId: number; result: ExcelCompareResult };

export type WorkerResponse =
  | { type: 'loaded'; side: Side; sheetNames: string[]; meta: SheetMetaLite }
  | { type: 'meta'; side: Side; meta: SheetMetaLite }
  | { type: 'result'; requestId: number; result: ExcelCompareResult; metaA: SheetMetaLite; metaB: SheetMetaLite }
  | { type: 'export'; requestId: number; buffer: ArrayBuffer }
  | { type: 'error'; requestId?: number; message: string };
