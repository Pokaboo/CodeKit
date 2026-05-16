import React, { useState } from 'react';
import {
  Settings,
  AlignLeft,
  Minimize2,
  ArrowLeftRight,
  Database,
  Terminal,
  Copy,
  Lightbulb,
  Bolt,
  Code2,
  FileCode2,
  Wrench,
  FileJson,
  Braces,
  Construction,
  Sparkles,
  CheckCircle2,
  FileCode,
  FileType2,
  Table2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { format as sqlFormat } from 'sql-formatter';
import { cn } from './lib/utils';
import { highlightCode } from './lib/highlight';
import { ToolCategory, SubTool, JavaConfig, ToolDefinition } from './types';
import codekitIcon from './assets/codekit-icon.png';

const CATEGORY_TOOLS: Record<ToolCategory, ToolDefinition[]> = {
  JSON: [
    { id: 'FORMAT', label: 'JSON 格式化', description: '美化缩进', icon: 'AlignLeft' },
    { id: 'COMPRESS', label: 'JSON 压缩', description: '移除空白', icon: 'Minimize2' },
    { id: 'TO_XML', label: 'JSON 转 XML', description: '格式转换', icon: 'Code2' },
    { id: 'TO_JAVA', label: 'JSON 转 Java', description: '生成实体', icon: 'Terminal' }
  ],
  XML: [
    { id: 'FORMAT', label: 'XML 格式化', description: '美化缩进', icon: 'AlignLeft' },
    { id: 'COMPRESS', label: 'XML 压缩', description: '移除空白', icon: 'Minimize2' },
    { id: 'TO_JSON', label: 'XML 转 JSON', description: '格式转换', icon: 'FileJson' },
    { id: 'TO_JAVA', label: 'XML 转 Java', description: '生成实体', icon: 'Terminal' }
  ],
  SQL: [
    { id: 'FORMAT', label: 'SQL 格式化', description: '美化排版', icon: 'AlignLeft' },
    { id: 'COMPRESS', label: 'SQL 压缩', description: '压缩语句', icon: 'Minimize2' },
    { id: 'TO_IN', label: '列表转 IN', description: 'IN 子句', icon: 'ArrowLeftRight' }
  ],
  OTHER: []
};

const CATEGORY_ICONS: Record<ToolCategory, React.ReactNode> = {
  JSON: <FileCode className="w-4 h-4" />,
  XML: <FileType2 className="w-4 h-4" />,
  SQL: <Table2 className="w-4 h-4" />,
  OTHER: <Construction className="w-4 h-4" />
};

const ICON_MAP: Record<string, React.ReactNode> = {
  AlignLeft: <AlignLeft className="w-4 h-4" />,
  Minimize2: <Minimize2 className="w-4 h-4" />,
  Code2: <Code2 className="w-4 h-4" />,
  Terminal: <Terminal className="w-4 h-4" />,
  FileJson: <FileJson className="w-4 h-4" />,
  ArrowLeftRight: <ArrowLeftRight className="w-4 h-4" />
};

export default function App() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('JSON');
  const [activeSubTool, setActiveSubTool] = useState<SubTool>('FORMAT');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [javaConfig, setJavaConfig] = useState<JavaConfig>({
    useLombok: true,
    getterSetter: false,
    camelCase: true,
    jackson: false
  });

  const handleToolSelect = (toolId: SubTool) => {
    setActiveSubTool(toolId);
    setInput('');
    setOutput('');
  };

  const handleCategoryChange = (cat: ToolCategory) => {
    setActiveCategory(cat);
    if (CATEGORY_TOOLS[cat].length > 0) {
      setActiveSubTool(CATEGORY_TOOLS[cat][0].id);
    }
    setInput('');
    setOutput('');
  };

  const handleProcess = () => {
    if (!input) {
      toast.error('请先输入数据');
      return;
    }

    try {
      if (activeCategory === 'JSON') {
        const obj = JSON.parse(input);
        if (activeSubTool === 'FORMAT') {
          setOutput(JSON.stringify(obj, null, 2));
        } else if (activeSubTool === 'COMPRESS') {
          setOutput(JSON.stringify(obj));
        } else if (activeSubTool === 'TO_XML') {
          const builder = new XMLBuilder({ format: true });
          const xmlContent = builder.build(obj);
          setOutput(xmlContent);
        } else if (activeSubTool === 'TO_JAVA') {
          generateJavaCode(obj);
          return;
        }
        toast.success('处理完成');
      } else if (activeCategory === 'XML') {
        if (activeSubTool === 'FORMAT') {
          const parser = new XMLParser();
          const jsonObj = parser.parse(input);
          const builder = new XMLBuilder({ format: true, indentBy: '  ' });
          const formatted = builder.build(jsonObj);
          setOutput(formatted);
          toast.success('XML 美化完成');
        } else if (activeSubTool === 'COMPRESS') {
          const compressed = input.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
          setOutput(compressed);
          toast.success('XML 压缩完成');
        } else if (activeSubTool === 'TO_JSON') {
          const parser = new XMLParser();
          const jsonObj = parser.parse(input);
          setOutput(JSON.stringify(jsonObj, null, 2));
          toast.success('转换成功');
        } else if (activeSubTool === 'TO_JAVA') {
          const parser = new XMLParser();
          const jsonObj = parser.parse(input);
          generateJavaCode(jsonObj);
          return;
        }
      } else if (activeCategory === 'SQL') {
        if (activeSubTool === 'FORMAT') {
          const formatted = sqlFormat(input);
          setOutput(formatted);
          toast.success('SQL 美化完成');
        } else if (activeSubTool === 'COMPRESS') {
          const compressed = input.replace(/\s+/g, ' ').trim();
          setOutput(compressed);
          toast.success('SQL 压缩完成');
        } else if (activeSubTool === 'TO_IN') {
          const lines = input.split(/[\n,;]+/).map(l => l.trim()).filter(l => l !== '');
          if (lines.length === 0) {
            toast.error('请输入有效的列表数据');
            return;
          }
          const joined = lines.map(l => `'${l}'`).join(', ');
          setOutput(`IN (${joined})`);
          toast.success('已转换为 IN 查询子句');
        } else {
          setOutput(input);
          toast.success('处理完成');
        }
      }
    } catch (e) {
      toast.error(`${activeCategory} 格式解析失败，请检查输入`);
    }
  };

  const generateJavaCode = (jsonObj: any) => {
    let code = '';
    if (javaConfig.useLombok) code += `@Data\n`;
    code += `public class UserEntity {\n`;

    const targetObj = Array.isArray(jsonObj) ? jsonObj[0] : jsonObj;

    if (typeof targetObj === 'object' && targetObj !== null) {
      Object.keys(targetObj).forEach((key) => {
        const value = targetObj[key];
        let type = 'String';
        if (typeof value === 'number') type = Number.isInteger(value) ? 'Long' : 'Double';
        else if (typeof value === 'boolean') type = 'Boolean';
        else if (Array.isArray(value)) type = 'List<Object>';

        if (javaConfig.jackson) code += `    @JsonProperty("${key}")\n`;
        const fieldName = javaConfig.camelCase ? key.replace(/_([a-z])/g, (g) => g[1].toUpperCase()) : key;
        code += `    private ${type} ${fieldName};\n\n`;
      });
    }
    code += `    // 自动生成于 CodeKit\n}`;
    setOutput(code);
    toast.success('Java 实体类生成成功');
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  const getPlaceholder = (): string => {
    switch (activeCategory) {
      case 'JSON': return '{\n  "id": 1,\n  "name": "CodeKit"\n}';
      case 'XML': return '<root>\n  <id>1</id>\n</root>';
      case 'SQL': return 'SELECT * FROM users;';
      default: return '';
    }
  };

  const getOutputExtension = (): string => {
    if (activeSubTool === 'TO_JAVA') return 'java';
    if (activeSubTool === 'TO_XML') return 'xml';
    if (activeCategory === 'SQL') return 'sql';
    return activeCategory.toLowerCase();
  };

  const getCurrentToolLabel = (): string => {
    const tools = CATEGORY_TOOLS[activeCategory];
    const tool = tools.find(t => t.id === activeSubTool);
    return tool ? tool.label : '';
  };

  if (activeCategory === 'OTHER') {
    return (
      <div className="flex flex-col h-screen overflow-hidden text-on-secondary-container font-sans bg-surface-variant">
        <Toaster position="top-right" />
        <header className="bg-gradient-to-r from-slate-800 to-slate-900 h-12 px-4 flex items-center justify-between z-50 shrink-0">
          <div className="flex items-center gap-3">
            <img src={codekitIcon} alt="CodeKit" className="w-6 h-6 rounded object-cover" />
            <span className="text-base font-semibold tracking-tight text-white">CodeKit</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full" />
              <div className="relative bg-white p-8 rounded-2xl shadow-lg">
                <Construction className="w-32 h-32 text-blue-500" />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -top-3 -left-3 bg-amber-100 text-amber-600 p-3 rounded-xl shadow-md"
              >
                <Wrench className="w-6 h-6" />
              </motion.div>
            </div>
            <div className="space-y-3 max-w-md">
              <h2 className="text-4xl font-bold text-slate-800">更多功能 敬请期待</h2>
              <p className="text-slate-600 text-base">
                CodeKit 团队正在为您开发更多实用工具。
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <div className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium text-sm shadow-sm">REGEX ENGINE</div>
              <div className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium text-sm shadow-sm">JWT DEBUGGER</div>
              <div className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium text-sm shadow-sm">MOCK SERVER</div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden text-on-secondary-container font-sans bg-surface-variant">
      <Toaster position="top-right" />

      {/* Top Header - Simplified */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 h-12 px-4 flex items-center justify-between z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img src={codekitIcon} alt="CodeKit" className="w-6 h-6 rounded object-cover" />
            <span className="text-base font-semibold tracking-tight text-white">CodeKit</span>
          </div>
          <div className="h-4 w-px bg-slate-600" />
          <nav className="flex items-center gap-1">
            {(['JSON', 'XML', 'SQL', 'OTHER'] as ToolCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5",
                  activeCategory === cat
                    ? "bg-white/15 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/10"
                )}
              >
                {CATEGORY_ICONS[cat]}
                {cat}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-slate-500">v1.3.0</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tool Navigation */}
        <aside className="bg-white w-48 flex flex-col py-3 gap-1 shrink-0 border-r border-slate-200 overflow-y-auto">
          <div className="px-3 py-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">工具列表</p>
          </div>
          <div className="flex flex-col gap-0.5 px-2">
            {CATEGORY_TOOLS[activeCategory].map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolSelect(tool.id)}
                className={cn(
                  "flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group",
                  activeSubTool === tool.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  activeSubTool === tool.id ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                )}>
                  {ICON_MAP[tool.icon]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-semibold truncate", activeSubTool === tool.id ? "text-blue-700" : "text-slate-700")}>{tool.label}</p>
                  <p className="text-[10px] text-slate-500 truncate">{tool.description}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeCategory}-${activeSubTool}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-full flex flex-col"
            >
              {/* Tool Header */}
              <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    {ICON_MAP[CATEGORY_TOOLS[activeCategory].find(t => t.id === activeSubTool)?.icon || 'AlignLeft']}
                  </div>
                  <div>
                    <h1 className="text-base font-semibold text-slate-800">{getCurrentToolLabel()}</h1>
                    <p className="text-xs text-slate-500">
                      {activeSubTool === 'TO_JAVA' && '生成生产级 Java 实体类'}
                      {activeSubTool === 'TO_IN' && '转换为 SQL IN 子句'}
                      {activeSubTool === 'TO_XML' && 'JSON 转 XML 格式'}
                      {activeSubTool === 'TO_JSON' && 'XML 转 JSON 格式'}
                      {activeSubTool === 'FORMAT' && '格式化美化'}
                      {activeSubTool === 'COMPRESS' && '压缩精简'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-md border border-emerald-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-medium text-emerald-700">Ready</span>
                  </div>
                </div>
              </div>

              {/* Tool Workspace */}
              <div className="flex-1 p-4 flex flex-col gap-4 min-h-0">
                <div className="flex-1 grid grid-cols-[1fr_280px_1fr] gap-4 min-h-0">
                  {/* Input Panel */}
                  <div className="bg-white rounded-xl border border-slate-200 flex flex-col shadow-sm">
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <FileCode2 className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-semibold text-slate-700">输入</span>
                      </div>
                      <button
                        onClick={() => setInput('')}
                        className="text-[10px] text-slate-500 hover:text-red-500 transition-colors px-2 py-0.5 rounded hover:bg-slate-50"
                      >
                        清空
                      </button>
                    </div>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="flex-1 p-3 font-mono text-xs focus:outline-none resize-none bg-transparent placeholder:text-slate-400 min-h-0"
                      placeholder={getPlaceholder()}
                    />
                  </div>

                  {/* Config Panel */}
                  <div className="flex flex-col gap-3">
                    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex-1">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                        <Settings className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-semibold text-slate-700">配置</span>
                      </div>
                      {activeSubTool === 'TO_JAVA' && (
                        <div className="space-y-2">
                          <ConfigToggle label="Lombok" checked={javaConfig.useLombok} onChange={(c) => setJavaConfig({ ...javaConfig, useLombok: c })} />
                          <ConfigToggle label="驼峰命名" checked={javaConfig.camelCase} onChange={(c) => setJavaConfig({ ...javaConfig, camelCase: c })} />
                          <ConfigToggle label="Jackson" checked={javaConfig.jackson} onChange={(c) => setJavaConfig({ ...javaConfig, jackson: c })} />
                        </div>
                      )}
                      {activeSubTool !== 'TO_JAVA' && (
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                            <Lightbulb className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-blue-700 leading-relaxed">
                              {activeSubTool === 'FORMAT' && '自动缩进对齐，美化代码结构'}
                              {activeSubTool === 'COMPRESS' && '移除冗余空白，压缩体积'}
                              {activeSubTool === 'TO_XML' && '转换为标准 XML 1.0 格式'}
                              {activeSubTool === 'TO_JSON' && '解析 XML 并转换为 JSON'}
                              {activeSubTool === 'TO_IN' && '将列表转为 IN (...) 子句'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleProcess}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
                    >
                      <Bolt className="w-3.5 h-3.5 fill-current" />
                      执行处理
                    </button>
                    {input && (
                      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <p className="text-[10px] font-mono text-slate-500">{input.length} bytes</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Output Panel */}
                  <div className="bg-slate-900 rounded-xl border border-slate-700 flex flex-col shadow-sm">
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-semibold text-slate-300">输出</span>
                        <span className="text-[10px] text-slate-500 font-mono">.{getOutputExtension()}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(output)}
                        className="text-blue-400 hover:text-blue-300 text-[10px] font-medium px-2 py-0.5 rounded hover:bg-slate-800 transition-colors flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        复制
                      </button>
                    </div>
                    {output ? (
                      <pre className="flex-1 p-3 font-mono text-[11px] overflow-auto leading-relaxed whitespace-pre min-h-0">
                        <code
                          className={`hljs language-${getOutputExtension()}`}
                          dangerouslySetInnerHTML={{
                            __html: highlightCode(output, getOutputExtension())
                          }}
                        />
                      </pre>
                    ) : (
                      <pre className="flex-1 p-3 font-mono text-[11px] text-slate-500 overflow-auto leading-relaxed whitespace-pre min-h-0">
                        {'// 处理结果将在此显示'}
                      </pre>
                    )}
                  </div>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-3 gap-3 shrink-0">
                  <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3 shadow-sm">
                    <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center shrink-0">
                      <Bolt className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">极速处理</p>
                      <p className="text-[10px] text-slate-500">毫秒级响应</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3 shadow-sm">
                    <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">格式校验</p>
                      <p className="text-[10px] text-slate-500">自动验证</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3 shadow-sm">
                    <div className="w-8 h-8 bg-purple-50 text-purple-500 rounded-lg flex items-center justify-center shrink-0">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">本地安全</p>
                      <p className="text-[10px] text-slate-500">不上传数据</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function ConfigToggle({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <div
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        className={cn(
          "w-9 h-5 rounded-full relative transition-all duration-200 border",
          checked ? "bg-blue-500 border-blue-500" : "bg-slate-200 border-slate-300"
        )}
      >
        <div className={cn(
          "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all duration-200 shadow-sm",
          checked ? "left-4.5" : "left-0.5"
        )} />
      </div>
    </label>
  );
}
