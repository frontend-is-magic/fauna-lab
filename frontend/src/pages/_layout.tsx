import { Segmented } from 'antd';
import { useAtom } from 'jotai';
import { NavLink, Outlet } from 'react-router-dom';

import { themeAtom, type ThemeId } from '../atoms/theme';
import { themeOptions, themes } from '../themes/themeOptions';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/dataset', label: 'Dataset' },
  { to: '/train', label: 'Train' },
  { to: '/inference', label: 'Inference' },
  { to: '/models', label: 'Models' },
];

export default function Layout() {
  const [themeId, setThemeId] = useAtom(themeAtom);
  const activeTheme = themes.find((theme) => theme.id === themeId) ?? themes[0];

  return (
    <div className={`app-shell theme-${themeId}`}>
      <aside className="sidebar">
        <h1 className="brand">Fauna Lab</h1>
        <p className="sidebar-copy">{activeTheme.description}</p>
        <Segmented
          block
          options={themeOptions}
          value={themeId}
          onChange={(value) => setThemeId(value as ThemeId)}
          className="theme-switcher"
        />
        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
        <div className="content-head">
          <span className="pill">{activeTheme.label} theme</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
