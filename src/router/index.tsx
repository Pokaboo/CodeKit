import { Fragment } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Tag } from 'antd';
import type { CategoryConfig, ToolConfig } from '../types';
import { categories, findCategory } from '../config/tools';
import { useTheme } from '../theme/ThemeContext';
import MainLayout from '../layouts/MainLayout';
import ToolWorkspace from '../components/ToolWorkspace';
import ComingSoon from '../pages/ComingSoon';
import NotFound from '../pages/NotFound';

/** 工具页包装：标题区 + 工作台。由注册表生成，保证菜单/路由/页面一一对应。 */
function ToolPage({ catId, tool }: { catId: string; tool: ToolConfig }) {
  const cat = findCategory(catId);
  const { preset } = useTheme();
  const Body = tool.customWorkspace;
  return (
    <div className="space-y-5" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 2px' }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: -0.3,
              lineHeight: 1.3,
              color: '#0f172a',
            }}
          >
            {tool.label}
          </h1>
          <div style={{ marginTop: 6, fontSize: 14, color: '#475569' }}>
            {cat?.label} · {tool.description}
          </div>
        </div>
        <Tag
          style={{
            marginBottom: 4,
            background: preset.primarySoft,
            borderColor: preset.primaryBorder,
            color: preset.primary,
            borderRadius: 6,
            padding: '0 10px',
          }}
        >
          让开发更省心
        </Tag>
      </div>
      {Body ? <Body tool={tool} /> : <ToolWorkspace tool={tool} />}
    </div>
  );
}

export default function Router() {
  const toolRoutes = categories.flatMap((cat: CategoryConfig) =>
    cat.tools.map((tool) => ({
      path: `${cat.id}/${tool.key}`,
      element: <ToolPage catId={cat.id} tool={tool} />,
    })),
  );

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/json/format" replace />} />
          {toolRoutes.map((r) => (
            <Fragment key={r.path}>
              <Route path={r.path} element={r.element} />
            </Fragment>
          ))}
          <Route path="more" element={<ComingSoon />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
