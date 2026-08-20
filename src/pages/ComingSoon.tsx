import { Result, Tag } from 'antd';
import { Wrench } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

const plans = ['REGEX ENGINE', 'JWT DEBUGGER', 'MOCK SERVER'];

export default function ComingSoon() {
  const { preset } = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <Result
        icon={<Wrench size={48} style={{ color: preset.primary }} />}
        title="更多功能 敬请期待"
        subTitle="CodeKit 团队正在昼夜不停地为您开发更多极致效能的工具。下一波更新将包含正则语法树、JWT 调试与 Mock 数据引擎。"
      >
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {plans.map((p) => (
            <Tag key={p} color="blue">
              {p}
            </Tag>
          ))}
        </div>
      </Result>
    </div>
  );
}
