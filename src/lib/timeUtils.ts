/**
 * 时间转换纯逻辑（不依赖第三方库）。
 * 与 processors.ts 一致：纯函数，便于在 React 组件外复用与测试。
 */

export type TzMode = 'local' | 'utc';

const pad = (n: number, len = 2) => String(n).padStart(len, '0');

interface Parts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
  weekday: number;
}

function getParts(d: Date, tz: TzMode): Parts {
  if (tz === 'utc') {
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
      ms: d.getUTCMilliseconds(),
      weekday: d.getUTCDay(),
    };
  }
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    second: d.getSeconds(),
    ms: d.getMilliseconds(),
    weekday: d.getDay(),
  };
}

const WD_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const WD_LONG = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

/**
 * 按格式字符串格式化日期。
 * 支持令牌：YYYY YY MM M DD D HH H mm m ss s A(AM/PM) ddd dddd
 * tz 决定取本地还是 UTC 字段。
 */
export function formatDate(d: Date, format: string, tz: TzMode = 'local'): string {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  const p = getParts(d, tz);
  const map: Record<string, string> = {
    YYYY: String(p.year),
    YY: String(p.year).slice(-2),
    MM: pad(p.month),
    M: String(p.month),
    DD: pad(p.day),
    D: String(p.day),
    HH: pad(p.hour),
    H: String(p.hour),
    mm: pad(p.minute),
    m: String(p.minute),
    ss: pad(p.second),
    s: String(p.second),
    A: p.hour < 12 ? 'AM' : 'PM',
    ddd: WD_SHORT[p.weekday],
    dddd: WD_LONG[p.weekday],
  };
  return format.replace(
    /YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s|A|ddd|dddd/g,
    (t) => map[t] ?? t,
  );
}

/**
 * 解析时间戳文本为毫秒。
 * unit='auto' 时按数字位数自动判断（≤11 位视为秒，否则毫秒）。
 * 非法或负数返回 null。
 */
export function tsToMs(raw: string, unit: 'auto' | '秒' | '毫秒'): number | null {
  const s = raw.trim();
  if (!s) return null;
  const num = Number(s);
  if (!isFinite(num) || num < 0) return null;
  let u = unit;
  if (u === 'auto') {
    const digitLen = s.replace(/[^\d]/g, '').length;
    u = digitLen <= 11 ? '秒' : '毫秒';
  }
  return u === '秒' ? num * 1000 : num;
}

export interface Duration {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** 将毫秒差值拆解为 天/时/分/秒（天可带符号，其余为绝对值）。 */
export function breakdown(msTotal: number): Duration {
  const sign = msTotal < 0 ? -1 : 1;
  let t = Math.abs(Math.trunc(msTotal));
  const days = Math.floor(t / 86_400_000);
  t -= days * 86_400_000;
  const hours = Math.floor(t / 3_600_000);
  t -= hours * 3_600_000;
  const minutes = Math.floor(t / 60_000);
  t -= minutes * 60_000;
  const seconds = Math.floor(t / 1000);
  return { days: sign * days, hours, minutes, seconds };
}
