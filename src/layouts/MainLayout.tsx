import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumb, Button, Drawer, Grid, Layout, Menu } from 'antd';
import { GithubOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { categories, categoryIcons, findTool, toolIcons } from '../config/tools';
import codekitIcon from '../assets/codekit-icon.png';
import ThemeSwitcher from '../components/ThemeSwitcher';

const { Sider, Header, Content } = Layout;

/** 由注册表生成 antd Menu items */
function buildMenuItems() {
  return categories.map((cat) => {
    const base = { key: cat.id, icon: categoryIcons[cat.id], label: cat.label };
    if (cat.tools.length === 0) return base;
    return {
      ...base,
      children: cat.tools.map((tool) => ({
        key: `${cat.id}/${tool.key}`,
        icon: toolIcons[tool.key],
        label: tool.label,
      })),
    };
  });
}

/** 由注册表推导面包屑 */
function useBreadcrumb(pathname: string) {
  return useMemo(() => {
    const found = findTool(pathname);
    if (found) return [{ title: found.category.label }, { title: found.tool.label }];
    if (pathname === '/more') return [{ title: '更多规划中' }];
    return [];
  }, [pathname]);
}

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isMobile = screens.lg === false;

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  const selectedKeys = [location.pathname];
  const breadcrumbItems = useBreadcrumb(location.pathname);

  // 路由变化时同步菜单展开状态（刷新后仍定位到当前模块）
  useEffect(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    const cat = categories.find((c) => c.id === parts[0]);
    if (cat && cat.tools.length > 0) setOpenKeys([cat.id]);
    else if (parts.length === 1) setOpenKeys([parts[0]]);
  }, [location.pathname]);

  const menu = (
    <Menu
      theme="dark"
      mode="inline"
      items={buildMenuItems()}
      selectedKeys={selectedKeys}
      openKeys={openKeys}
      onOpenChange={setOpenKeys}
      onClick={({ key }) => {
        navigate(`/${key}`);
        setDrawerOpen(false);
      }}
      style={{ borderInlineEnd: 'none', background: 'transparent' }}
    />
  );

  const logo = (
    <div
      style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        color: '#fff',
        flexShrink: 0,
      }}
    >
      <img
        src={codekitIcon}
        alt="CodeKit"
        style={{ width: 24, height: 24, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }}
      />
      {!collapsed && !isMobile && <span style={{ fontSize: 14, fontWeight: 500 }}>CodeKit</span>}
    </div>
  );

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      {isMobile ? (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={220}
          closable={false}
          styles={{ body: { padding: 0, background: '#001529' } }}
        >
          {logo}
          {menu}
        </Drawer>
      ) : (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          breakpoint="lg"
          onBreakpoint={(broken) => setCollapsed(broken)}
          width={220}
          className="ck-sider"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          {logo}
          <div className="ck-sider-menu" style={{ padding: '8px 0' }}>{menu}</div>
          <div
            style={{
              padding: '0 16px',
              height: 36,
              display: 'flex',
              alignItems: 'center',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            {!collapsed && 'v2.0.0-antd'}
          </div>
        </Sider>
      )}

      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Button
            type="text"
            icon={collapsed || isMobile ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed))}
          />
          <Breadcrumb items={breadcrumbItems} style={{ fontSize: 13 }} />
          <div style={{ flex: 1 }} />
          <ThemeSwitcher />
          <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>本地运行中</span>
          <Button
            type="text"
            icon={<GithubOutlined />}
            href="https://github.com/Pokaboo/CodeKit"
            target="_blank"
            style={{ fontSize: 13 }}
          >
            GitHub
          </Button>
        </Header>
        <Content style={{ padding: 16, overflow: 'auto', background: '#f5f5f5' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
