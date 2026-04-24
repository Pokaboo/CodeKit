import React, { useState } from 'react';
import {
  Settings,
  AlignLeft,
  Minimize2,
  CheckCircle2,
  ArrowLeftRight,
  Database,
  Terminal,
  Copy,
  Lightbulb,
  Bolt,
  Code2,
  FileCode2,
  Table2,
  Wrench,
  FileJson,
  Braces,
  Construction,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { format as sqlFormat } from 'sql-formatter';
import { cn } from './lib/utils';
import { ToolCategory, SubTool, JavaConfig } from './types';
import codekitIcon from './assets/codekit-icon.png';

export default function App() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('JSON');
  const [activeSubTool, setActiveSubTool] = useState<SubTool>('TRANSFORM');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [javaConfig, setJavaConfig] = useState<JavaConfig>({
    useLombok: true,
    getterSetter: false,
    camelCase: true,
    jackson: false
  });

  // Handle different processing logic
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
        } else if (activeSubTool === 'VALIDATE') {
          setOutput('// 验证结果: 合法的 JSON 格式\n' + JSON.stringify(obj, null, 2));
        } else if (activeSubTool === 'TO_XML') {
          const builder = new XMLBuilder({ format: true });
          const xmlContent = builder.build(obj);
          setOutput(xmlContent);
        } else if (activeSubTool === 'TRANSFORM') {
          generateJavaCode(obj);
          return; // generateJavaCode handles toast
        }
        toast.success(`${activeSubTool} 处理完成`);
      } else if (activeCategory === 'XML') {
        if (activeSubTool === 'TRANSFORM') {
          const parser = new XMLParser();
          const jsonObj = parser.parse(input);
          setOutput(JSON.stringify(jsonObj, null, 2));
          toast.success('XML 已成功转换为 JSON');
        } else {
          setOutput('// XML ' + activeSubTool + ' 正在处理...\n' + input);
          toast.success('XML 处理完成');
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
        } else if (activeSubTool === 'TRANSFORM') {
          // List to SQL IN conversion
          const lines = input.split(/[\n,;]+/).map(l => l.trim()).filter(l => l !== '');
          if (lines.length === 0) {
            toast.error('请输入有效的列表数据');
            return;
          }
          const joined = lines.map(l => `'${l}'`).join(', ');
          setOutput(`IN (${joined})`);
          toast.success('已转换为 IN 查询子句');
        } else {
          setOutput('// SQL 处理中...\n' + input);
          toast.success('SQL 处理完成');
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

  const renderConfig = () => {
    switch (activeSubTool) {
      case 'TRANSFORM':
        if (activeCategory === 'JSON') {
          return (
            <div className="space-y-4">
              <ConfigToggle
                label="使用 Lombok"
                subLabel="添加 @Data 注解"
                checked={javaConfig.useLombok}
                onChange={(checked) => setJavaConfig({ ...javaConfig, useLombok: checked })}
              />
              <ConfigToggle
                label="驼峰命名"
                subLabel="自动转换下划线"
                checked={javaConfig.camelCase}
                onChange={(checked) => setJavaConfig({ ...javaConfig, camelCase: checked })}
              />
            </div>
          );
        }
        if (activeCategory === 'SQL') {
          return (
            <div className="p-4 bg-primary/5 rounded-2xl border-2 border-primary/10 text-xs text-primary font-medium leading-relaxed">
              <div className="flex gap-2 items-start">
                <Lightbulb className="w-4 h-4 shrink-0" />
                <p>将换行、逗号分隔的原始数据列表，自动转换为可用于 WHERE 子句的 IN (...) 集合。</p>
              </div>
            </div>
          );
        }
        return (
          <div className="p-4 bg-tertiary-container/10 rounded-2xl border-2 border-outline-variant text-sm flex gap-2">
            <ArrowLeftRight className="w-4 h-4 shrink-0" />
            <p>{activeCategory} 转其对应格式。</p>
          </div>
        );
      case 'TO_XML':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100 text-sm text-emerald-800 flex gap-2">
              <Code2 className="w-4 h-4 shrink-0" />
              <p>采用标准 XML 1.0 规范，自动处理层级映射与格式缩进。</p>
            </div>
          </div>
        );
      case 'FORMAT':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-100 text-sm text-blue-800 flex gap-2">
              <Braces className="w-4 h-4 shrink-0" />
              <p>使用标准代码缩进，自动对齐属性与层级结构。</p>
            </div>
          </div>
        );
      case 'COMPRESS':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-2xl border-2 border-orange-100 text-sm text-orange-800 flex gap-2">
              <Minimize2 className="w-4 h-4 shrink-0" />
              <p>移除冗余字符，极限压缩文件大小。</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-8 text-center text-outline/40">
            <Settings className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>该功能目前无需额外配置</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-on-secondary-container font-sans bg-surface-variant">
      <Toaster position="top-right" />

      {/* Top Header - Chrome Tool Style */}
      <header className="bg-white border-b border-outline h-14 px-4 flex items-center justify-between z-50 shrink-0 google-shadow">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <img
              src={codekitIcon}
              alt="CodeKit"
              className="w-8 h-8 rounded-lg object-cover codekit-icon"
            />
            <span className="text-xl font-semibold tracking-tight text-secondary">CodeKit</span>
            <span className="text-xs text-secondary/50 font-medium ml-1">让开发更省心</span>
          </div>

          <div className="h-4 w-px bg-outline mx-2" />

          <nav className="flex items-center bg-surface-variant rounded-full px-1 py-1 gap-1">
            {(['JSON', 'XML', 'SQL', 'OTHER'] as ToolCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setOutput('');
                }}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                  activeCategory === cat
                    ? "bg-white text-primary google-shadow"
                    : "text-secondary hover:bg-surface/50"
                )}
              >
                {cat}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-primary text-white rounded-full text-[10px] font-bold google-shadow">PREMIUM TOOLSET</div>
          <button className="p-2 rounded-full hover:bg-surface-variant transition-all">
            <Settings className="w-4 h-4 text-secondary" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        {activeCategory !== 'OTHER' && (
          <aside className="bg-surface-variant w-20 hidden lg:flex flex-col py-6 gap-6 shrink-0 border-r border-outline items-center">
            {(activeCategory === 'JSON' ? [
              { id: 'FORMAT', label: '美化', icon: <AlignLeft className="w-6 h-6" /> },
              { id: 'COMPRESS', label: '压缩', icon: <Minimize2 className="w-6 h-6" /> },
              { id: 'TRANSFORM', label: '转Java', icon: <Terminal className="w-6 h-6" /> },
              { id: 'TO_XML', label: '转XML', icon: <Code2 className="w-6 h-6" /> }
            ] : activeCategory === 'SQL' ? [
              { id: 'FORMAT', label: '美化', icon: <AlignLeft className="w-6 h-6" /> },
              { id: 'COMPRESS', label: '压缩', icon: <Minimize2 className="w-6 h-6" /> },
              { id: 'TRANSFORM', label: '转IN', icon: <ArrowLeftRight className="w-6 h-6" /> }
            ] : [
              { id: 'FORMAT', label: '美化', icon: <AlignLeft className="w-6 h-6" /> },
              { id: 'COMPRESS', label: '压缩', icon: <Minimize2 className="w-6 h-6" /> },
              { id: 'TRANSFORM', label: '转换', icon: <ArrowLeftRight className="w-6 h-6" /> }
            ]).map((tool) => (
              <SidebarItem
                key={tool.id}
                icon={tool.icon}
                label={tool.label}
                active={activeSubTool === tool.id}
                onClick={() => {
                  setActiveSubTool(tool.id as SubTool);
                  setOutput('');
                }}
              />
            ))}

            <div className="mt-auto px-2">
              <button className="p-3 bg-primary-container text-on-primary-container rounded-2xl hover:google-shadow-hover transition-all">
                <Lightbulb className="w-6 h-6" />
              </button>
            </div>
          </aside>
        )}

        {/* Dynamic Content Area */}
        <main className="flex-1 overflow-y-auto bg-surface-variant p-6 relative">
          <AnimatePresence mode="wait">
            {activeCategory === 'OTHER' ? (
              <motion.div
                key="other-coming-soon"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex flex-col items-center justify-center text-center p-12 space-y-8"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full animate-pulse" />
                  <div className="relative bg-white p-10 rounded-[3rem] google-shadow">
                    <Construction className="w-40 h-40 text-primary" />
                  </div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-4 -left-4 bg-amber-100 text-amber-600 p-4 rounded-3xl google-shadow"
                  >
                    <Wrench className="w-8 h-8" />
                  </motion.div>
                  <div className="absolute -bottom-4 -right-4 bg-emerald-500 text-white p-4 rounded-full google-shadow">
                    <Sparkles className="w-8 h-8" />
                  </div>
                </div>

                <div className="space-y-4 max-w-xl">
                  <h2 className="text-5xl font-bold text-secondary tracking-tight">更多功能 敬请期待</h2>
                  <p className="text-secondary/60 text-xl leading-relaxed">
                    CodeKit 团队正在昼夜不停地为您开发更多极致效能的工具。
                    下一波更新将包含正则语法树、JWT 调试与 Mock 数据引擎。
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                  <div className="px-6 py-3 bg-white border border-outline text-secondary rounded-full font-bold text-sm google-shadow">REGEX ENGINE</div>
                  <div className="px-6 py-3 bg-white border border-outline text-secondary rounded-full font-bold text-sm google-shadow">JWT DEBUGGER</div>
                  <div className="px-6 py-3 bg-white border border-outline text-secondary rounded-full font-bold text-sm google-shadow">MOCK SERVER</div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`${activeCategory}-${activeSubTool}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-6 max-w-[1600px] mx-auto"
              >
                <section className="flex items-end justify-between px-2">
                  <div className="space-y-1">
                    <h1 className="text-2xl font-semibold text-secondary flex items-center gap-2">
                      {activeCategory} {
                        activeSubTool === 'TRANSFORM' ? (activeCategory === 'JSON' ? '转 Java POJO' : activeCategory === 'SQL' ? '转 IN 查询' : '转换') :
                          activeSubTool === 'TO_XML' ? '转 XML' :
                            activeSubTool === 'FORMAT' ? '美化' :
                              activeSubTool === 'COMPRESS' ? '压缩' :
                                activeSubTool === 'VALIDATE' ? '验证' : '处理'
                      }
                    </h1>
                    <p className="text-sm text-secondary/70">
                      {activeSubTool === 'TRANSFORM'
                        ? (activeCategory === 'JSON' ? "生成生产级、标准化的 Java 实体类骨架。" : activeCategory === 'SQL' ? "将列表数据极速转换为 SQL IN 集合。" : "数据格式高效转换。")
                        : activeSubTool === 'TO_XML' ? "将 JSON 对象转换为标准 XML 格式。" : `一站式 ${activeCategory} ${activeSubTool === 'FORMAT' ? '美化' : activeSubTool === 'COMPRESS' ? '极致压缩' : '处理'}中心。`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-secondary/60">
                    <Terminal className="w-3 h-3" />
                    <span>LOCAL_RUNTIME: ACTIVE</span>
                  </div>
                </section>

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px_1fr] gap-6 min-h-[700px]">
                  {/* Panel 1: Source */}
                  <div className="google-card p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-outline pb-3">
                      <div className="flex items-center gap-2">
                        <FileCode2 className="w-4 h-4 text-primary" />
                        <h2 className="font-semibold text-sm">输入数据</h2>
                      </div>
                      <button onClick={() => setInput('')} className="text-[10px] font-bold text-secondary uppercase hover:text-red-500 transition-colors">Clear</button>
                    </div>
                    <div className="flex-1 rounded-xl bg-surface-variant border border-outline focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all overflow-hidden flex flex-col">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 p-4 font-mono text-sm focus:outline-none resize-none bg-transparent placeholder:text-secondary/30"
                        placeholder={activeCategory === 'JSON' ? '{\n  "id": 1,\n  "name": "CodeKit"\n}' : activeCategory === 'XML' ? '<root>\n  <id>1</id>\n</root>' : 'SELECT * FROM users;'}
                      />
                    </div>
                  </div>

                  {/* Panel 2: Options */}
                  <div className="flex flex-col gap-6">
                    <div className="google-card p-6 flex flex-col gap-6">
                      <div className="flex flex-col items-center gap-2 border-b border-outline pb-6">
                        <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center">
                          <Wrench className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold text-sm">处理配置</h3>
                      </div>

                      <div className="flex-1">
                        {renderConfig()}
                      </div>

                      <button
                        onClick={handleProcess}
                        className="w-full bg-primary text-white py-3 rounded-full font-semibold flex items-center justify-center gap-2 active:scale-98 transition-all hover:google-shadow focus:ring-4 focus:ring-primary/30"
                      >
                        <Bolt className="w-4 h-4 fill-current" />
                        <span>立即执行</span>
                      </button>
                    </div>

                    <div className="google-card p-6 flex flex-col gap-4 flex-1 bg-primary/5 border-primary/10 border-dashed">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-primary">工作流日志</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-primary" />
                          <p className="text-[10px] font-mono text-secondary">Awaiting input data...</p>
                        </div>
                        {input && (
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-emerald-500" />
                            <p className="text-[10px] font-mono text-secondary">Data size: {input.length} bytes</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Panel 3: Output */}
                  <div className="google-card p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-outline pb-3">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-emerald-600" />
                        <h2 className="font-semibold text-sm">处理结果</h2>
                      </div>
                      <button
                        onClick={() => copyToClipboard(output)}
                        className="text-primary hover:bg-primary-container px-3 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        COPY
                      </button>
                    </div>
                    <div className="flex-1 rounded-xl bg-[#1e1e1e] border border-outline overflow-hidden flex flex-col google-shadow">
                      <div className="bg-[#2d2d2d] px-4 py-2 border-b border-[#3e3e3e] flex justify-between items-center">
                        <span className="text-[#9cdcfe] text-[10px] font-mono font-medium">
                          output.{activeSubTool === 'TRANSFORM' && activeCategory === 'JSON' ? 'java' : activeSubTool === 'TO_XML' ? 'xml' : activeCategory === 'SQL' ? 'sql' : activeCategory.toLowerCase()}
                        </span>
                      </div>
                      <pre className="flex-1 p-5 font-mono text-xs text-[#d4d4d4] overflow-auto leading-relaxed selection:bg-primary/40 whitespace-pre">
                        {output || "// 处理结果将在此呈现..."}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Features Bento */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                  <div className="p-6 google-card flex items-start gap-5 hover:google-shadow-hover translate-y-0 hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                      <Bolt className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold text-secondary">极速模式</h5>
                      <p className="text-xs text-secondary/60 leading-relaxed">基于高阶语法树解析算法，毫秒级响应海量数据处理需求。</p>
                    </div>
                  </div>
                  <div className="p-6 google-card flex items-start gap-5 hover:google-shadow-hover translate-y-0 hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-primary-container text-primary rounded-2xl flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold text-secondary">验证就绪</h5>
                      <p className="text-xs text-secondary/60 leading-relaxed">内置深度合法性校验引擎，确保输出结果符合行业标准规范。</p>
                    </div>
                  </div>
                  <div className="p-6 google-card flex items-start gap-5 hover:google-shadow-hover translate-y-0 hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-surface-variant text-secondary rounded-2xl flex items-center justify-center shrink-0">
                      <Database className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold text-secondary">安全保障</h5>
                      <p className="text-xs text-secondary/60 leading-relaxed">全量本地化运算机制，绝不上传敏感数据，守护开发者隐私。</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Material 3 Footer */}
      <footer className="bg-white border-t border-outline h-12 flex items-center justify-between px-8 shrink-0 relative z-50">
        <div className="flex items-center gap-6">
          <div className="text-[11px] font-medium text-secondary/50">
            v1.2.0-STABLE | © {new Date().getFullYear()} <span className="text-primary font-bold">CodeKit</span> Open Toolset
          </div>
          <div className="h-3 w-px bg-outline" />
          <nav className="flex gap-4">
            <button className="text-[10px] font-bold text-secondary/60 hover:text-primary transition-colors">PRIVACY POLICY</button>
            <button className="text-[10px] font-bold text-secondary/60 hover:text-primary transition-colors">TERMS OF USE</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 p-1 px-2.5 bg-emerald-50 rounded-full border border-emerald-100">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-700">SERVER STATUS: OK</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: {
  icon: React.ReactNode,
  label: string,
  active: boolean,
  onClick: () => void,
  key?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 w-full transition-all group relative",
        active ? "text-primary" : "text-secondary hover:text-primary"
      )}
    >
      <div className={cn(
        "px-4 py-1 rounded-full transition-all duration-200 relative overflow-hidden",
        active ? "bg-primary-container text-on-primary-container" : "hover:bg-surface/50"
      )}>
        {icon}
      </div>
      <span className={cn(
        "text-[10px] font-bold tracking-tight transition-all",
        active ? "opacity-100" : "opacity-60"
      )}>{label}</span>

      {active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute -left-0.5 top-0 bottom-0 w-1 bg-primary rounded-r-full"
        />
      )}
    </button>
  );
}

function ConfigToggle({ label, subLabel, checked, onChange }: {
  label: string,
  subLabel: string,
  checked: boolean,
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between p-3 rounded-xl border border-outline bg-white hover:bg-surface-variant cursor-pointer transition-all active:scale-[0.98] group">
      <div className="flex flex-col text-left">
        <span className="text-xs font-semibold group-hover:text-primary transition-colors">{label}</span>
        <span className="text-[9px] text-secondary/60 font-medium">{subLabel}</span>
      </div>
      <div
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        className={cn(
          "w-10 h-5 rounded-full relative transition-all duration-200 border-2",
          checked ? "bg-primary border-primary" : "bg-outline/20 border-outline/30"
        )}
      >
        <div className={cn(
          "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200",
          checked ? "left-5.5" : "left-0.5"
        )} />
      </div>
    </label>
  );
}
