import { Layout, Menu, Segmented, Typography } from 'antd';
import { useAtom } from 'jotai';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { themeAtom, type ThemeId } from '../atoms/theme';
import { themeOptions } from '../themes/themeOptions';

const items = [
  { key: '/', label: 'Dataset' },
  { key: '/train', label: 'Train' },
  { key: '/inference', label: 'Inference' },
  { key: '/models', label: 'Models' }
];

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [themeId, setThemeId] = useAtom(themeAtom);

  return (
    <Layout className="min-h-screen bg-mist">
      <Layout.Sider breakpoint="lg" collapsedWidth="0" theme="light" className="border-r border-black/5">
        <div className="px-6 py-6">
          <Typography.Title level={3} className="!mb-1 !text-ink">
            Fauna Lab
          </Typography.Title>
          <Typography.Paragraph className="!mb-4 !text-sm !text-black/55">
            Local image classification workspace
          </Typography.Paragraph>
          <Segmented
            block
            options={themeOptions}
            value={themeId}
            onChange={(value) => setThemeId(value as ThemeId)}
          />
        </div>
        <Menu selectedKeys={[location.pathname]} items={items} onClick={({ key }) => navigate(key)} />
      </Layout.Sider>
      <Layout>
        <Layout.Header className="flex items-center justify-between border-b border-black/5 bg-white px-6">
          <Typography.Text className="font-medium text-ink">Theme: {themeId}</Typography.Text>
          <Typography.Text className="text-black/45">Frontend skeleton</Typography.Text>
        </Layout.Header>
        <Layout.Content className="p-6">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
