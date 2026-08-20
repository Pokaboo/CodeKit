import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntApp, ConfigProvider } from 'antd';
import App from './App';
import { ThemeProvider, useTheme, buildAntdTheme } from './theme/ThemeContext';
import './index.css';

/** 内层：读取当前主色，动态生成 antd 主题后渲染应用 */
function ThemedRoot() {
  const { primary } = useTheme();
  const antdTheme = useMemo(() => buildAntdTheme(primary), [primary]);
  return (
    <ConfigProvider theme={antdTheme}>
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ThemedRoot />
    </ThemeProvider>
  </StrictMode>,
);
