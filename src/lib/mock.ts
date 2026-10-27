/**
 * Mock 数据生成：按字段名语义推断类型，生成结构合理的假数据。
 * 纯前端实现，不依赖任何服务端，也不发起网络请求。
 */

export type MockLocale = 'zh' | 'en';

export interface MockOptions {
  count: number;
  locale: MockLocale;
}

const ZH_SURNAMES = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '蒋', '沈', '韩', '杨', '徐', '朱'];
const ZH_GIVEN = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '洋', '艳', '勇', '军', '杰', '娟', '涛', '明', '超', '婷'];
const ZH_CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆', '苏州', '天津', '长沙', '青岛'];
const ZH_STREETS = ['中山路', '人民大道', '科技园南路', '长江路', '解放街', '望江路', '建设路', '滨江大道'];
const ZH_COMPANIES = ['星辰科技', '云图网络', '启明信息', '海纳数据', '嘉禾软件', '长风智能', '蓝鲸云', '极客工场'];
const ZH_DEPTS = ['研发中心', '产品部', '市场部', '运维部', '设计部', '测试部'];
const ZH_TITLES = ['产品经理', '前端工程师', '后端工程师', '测试工程师', 'UI 设计师', '数据分析师'];
const ZH_WORDS = ['测试', '示例', '数据', '接口', '订单', '用户', '配置', '日志', '任务', '模块', '服务', '环境'];
const ZH_SENTENCES = [
  '这是一条自动生成的示例描述，可用于联调与演示。',
  '接口返回的假数据，仅本地生成，不会上传任何内容。',
  '用于表格占位与页面骨架展示，可按需替换。',
  '模拟真实业务文案，方便前端先跑通流程。',
];

const EN_FIRST = ['James', 'Mary', 'Robert', 'Linda', 'Michael', 'Emily', 'David', 'Sophia', 'Daniel', 'Olivia', 'Chris', 'Emma'];
const EN_LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Taylor', 'Clark'];
const EN_CITIES = ['New York', 'San Francisco', 'Seattle', 'Austin', 'Boston', 'Chicago', 'London', 'Berlin', 'Tokyo', 'Singapore'];
const EN_COMPANIES = ['Acme Corp', 'Globex', 'Initech', 'Umbrella Labs', 'Northwind', 'Contoso', 'Fabrikam'];
const EN_WORDS = ['alpha', 'sample', 'data', 'order', 'user', 'config', 'log', 'task', 'module', 'service'];
const EN_SENTENCES = [
  'Auto-generated sample text for local development and demos.',
  'Mock data created in the browser, nothing is uploaded.',
  'Placeholder copy for layout previews and skeletons.',
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad = (n: number) => String(n).padStart(2, '0');

function randomDate(offsetDays = 365): Date {
  const now = Date.now();
  return new Date(now - randInt(0, offsetDays) * 86400000 - randInt(0, 86399999));
}

function formatDate(d: Date, withTime: boolean): string {
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return withTime ? `${base} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : base;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

/** 支持的显式类型指令（key:int 形式） */
export const MOCK_TYPES = [
  'string',
  'int',
  'number',
  'boolean',
  'date',
  'datetime',
  'uuid',
  'id',
  'name',
  'email',
  'phone',
  'url',
  'ip',
  'city',
  'address',
  'company',
  'title',
  'word',
  'sentence',
  'text',
  'price',
  'age',
  'status',
  'color',
  'avatar',
  'tags',
] as const;

export type MockType = (typeof MOCK_TYPES)[number];

/** 依据字段名猜类型（顺序敏感：先匹配更具体的复合词） */
export function guessType(rawKey: string): MockType {
  const k = rawKey.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
  const has = (...words: string[]) => words.some((w) => k.includes(w));

  if (has('uuid', 'guid')) return 'uuid';
  if (has('avatar', 'headimg', 'portrait')) return 'avatar';
  if (has('email', 'mail')) return 'email';
  if (has('phone', 'mobile', 'tel')) return 'phone';
  if (has('url', 'link', 'href', 'website', 'homepage')) return 'url';
  if (has('ip')) return 'ip';
  if (has('color', 'colour')) return 'color';
  if (has('tags', 'labels', 'hobbies', 'skills')) return 'tags';
  if (has('id', 'no')) return 'id';
  if (has('price', 'amount', 'money', 'fee', 'salary', 'balance', 'cost')) return 'price';
  if (has('age')) return 'age';
  if (has('status', 'state', 'level', 'role', 'type', 'gender', 'category')) return 'status';
  if (has('address', 'addr')) return 'address';
  if (has('city', 'region')) return 'city';
  if (has('company', 'org', 'corp')) return 'company';
  if (has('title', 'job', 'position')) return 'title';
  if (has('username', 'nickname', 'name')) return 'name';
  if (has('datetime', 'createdat', 'updatedat', 'createtime', 'updatetime', 'timestamp', 'time', 'date')) return 'datetime';
  if (has('day', 'birthday')) return 'date';
  if (has('desc', 'remark', 'content', 'summary', 'comment', 'message', 'text')) return 'text';
  if (has('count', 'num', 'qty', 'quantity', 'total', 'size', 'page', 'stock')) return 'int';
  if (has('rate', 'percent', 'ratio', 'score', 'weight')) return 'number';
  if (/^(is|has|can|enabled|active|deleted|visible|valid|finished|locked)/.test(k)) return 'boolean';
  return 'string';
}

/** 生成单个字段值 */
export function mockValue(type: MockType, index: number, locale: MockLocale): unknown {
  const zh = locale === 'zh';
  switch (type) {
    case 'uuid':
      return uuid();
    case 'id':
      return index + 1;
    case 'int':
      return randInt(1, 1000);
    case 'number':
      return Number((Math.random() * 100).toFixed(2));
    case 'price':
      return Number((Math.random() * 2000 + 9.9).toFixed(2));
    case 'age':
      return randInt(18, 60);
    case 'boolean':
      return Math.random() > 0.5;
    case 'date':
      return formatDate(randomDate(), false);
    case 'datetime':
      return formatDate(randomDate(), true);
    case 'name':
      return zh ? `${pick(ZH_SURNAMES)}${pick(ZH_GIVEN)}` : `${pick(EN_FIRST)} ${pick(EN_LAST)}`;
    case 'email': {
      const name = zh ? `user${randInt(100, 9999)}` : `${pick(EN_FIRST).toLowerCase()}${randInt(1, 99)}`;
      return `${name}@example.com`;
    }
    case 'phone': {
      const prefix = pick(['138', '139', '150', '151', '173', '186', '189', '199']);
      return `${prefix}${String(randInt(0, 99999999)).padStart(8, '0')}`;
    }
    case 'url':
      return `https://example.com/${pick(zh ? ZH_WORDS : EN_WORDS)}/${randInt(100, 999)}`;
    case 'avatar':
      return `https://api.dicebear.com/7.x/initials/svg?seed=${randInt(1, 9999)}`;
    case 'ip':
      return `${randInt(1, 255)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`;
    case 'city':
      return zh ? pick(ZH_CITIES) : pick(EN_CITIES);
    case 'address':
      return zh
        ? `${pick(ZH_CITIES)}市${pick(ZH_STREETS)}${randInt(1, 200)}号`
        : `${randInt(1, 999)} ${pick(EN_CITIES)} Ave`;
    case 'company':
      return zh ? `${pick(ZH_COMPANIES)}有限公司` : pick(EN_COMPANIES);
    case 'title':
      return zh ? pick(ZH_TITLES) : pick(['Product Manager', 'Frontend Engineer', 'Backend Engineer', 'Designer']);
    case 'status': {
      const zhStatus = ['启用', '停用', '待审核', '已完成'];
      return zh ? pick(zhStatus) : pick(['active', 'inactive', 'pending', 'done']);
    }
    case 'color':
      return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
    case 'tags':
      return Array.from({ length: randInt(1, 3) }, () => pick(zh ? ZH_WORDS : EN_WORDS));
    case 'word':
      return pick(zh ? ZH_WORDS : EN_WORDS);
    case 'sentence':
      return pick(zh ? ZH_SENTENCES : EN_SENTENCES);
    case 'text':
      return Array.from({ length: randInt(1, 2) }, () => pick(zh ? ZH_SENTENCES : EN_SENTENCES)).join('');
    case 'string':
    default:
      return `${pick(zh ? ZH_WORDS : EN_WORDS)}_${randInt(100, 999)}`;
  }
}

/** 解析 "name" / "age:int" / "id : uuid" 形式的字段行 */
export function parseFieldList(raw: string): { key: string; type: MockType }[] {
  return raw
    .split(/[\n,;，；]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [keyPart, typePart] = line.split(':').map((s) => s.trim());
      const type = (MOCK_TYPES as readonly string[]).includes(typePart) ? (typePart as MockType) : guessType(keyPart);
      return { key: keyPart, type };
    });
}

/** 按字段名生成 N 条数据 */
export function generateByFields(raw: string, opts: MockOptions): string {
  const fields = parseFieldList(raw);
  if (!fields.length) throw new Error('请至少输入一个字段名');
  const rows = Array.from({ length: Math.min(Math.max(opts.count, 1), 100) }, (_, i) =>
    Object.fromEntries(fields.map((f) => [f.key, mockValue(f.type, i, opts.locale)])),
  );
  return JSON.stringify(rows.length === 1 ? rows[0] : rows, null, 2);
}

/** 按 JSON 模板的字段名生成结构相同的假数据 */
export function generateByTemplate(template: string, opts: MockOptions): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(template);
  } catch {
    throw new Error('模板不是合法 JSON，请检查后再生成');
  }

  const isArrayTemplate = Array.isArray(parsed);
  const prototype = isArrayTemplate ? (parsed as unknown[])[0] : parsed;
  if (prototype === null || typeof prototype !== 'object') {
    throw new Error('模板需为对象或对象数组');
  }

  let counter = 0;
  const build = (node: unknown, key: string): unknown => {
    if (Array.isArray(node)) {
      const len = Math.max(1, Math.min(node.length, 3));
      return Array.from({ length: len }, (_, i) => build(node[i] ?? node[0], key));
    }
    if (node !== null && typeof node === 'object') {
      return Object.fromEntries(Object.entries(node as Record<string, unknown>).map(([k, v]) => [k, build(v, k)]));
    }
    counter += 1;
    return mockValue(guessType(key), counter, opts.locale);
  };

  const rows = Array.from({ length: Math.min(Math.max(opts.count, 1), 100) }, () => build(prototype, ''));
  return JSON.stringify(isArrayTemplate && rows.length === 1 ? rows : rows, null, 2);
}
