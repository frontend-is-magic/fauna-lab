import React from 'react';
import {
  createBrowserRouter,
  Outlet,
  type RouteObject,
} from 'react-router-dom';

type PageModule = {
  default: React.ComponentType;
};

const pageModules = import.meta.glob('./pages/**/*.tsx', {
  eager: true,
}) as Record<string, PageModule>;

function normalizeFilePath(filePath: string): string | null {
  const withoutPrefix = filePath.replace('./pages', '').replace(/\.tsx$/, '');

  if (withoutPrefix === '/_layout' || withoutPrefix === '/not-found') {
    return null;
  }

  if (withoutPrefix.endsWith('/index')) {
    const trimmed = withoutPrefix.slice(0, -'/index'.length);
    return trimmed === '' ? '/' : trimmed;
  }

  return withoutPrefix === '/index' ? '/' : withoutPrefix;
}

function toRoutePath(filePath: string): string | null {
  const normalized = normalizeFilePath(filePath);
  if (!normalized) {
    return null;
  }

  if (normalized === '/') {
    return '/';
  }

  return normalized
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith('[...') && segment.endsWith(']')) {
        return '*';
      }

      if (segment.startsWith('[') && segment.endsWith(']')) {
        return `:${segment.slice(1, -1)}`;
      }

      return segment;
    })
    .join('/');
}

const layoutModule = pageModules['./pages/_layout.tsx'];
const Layout = layoutModule?.default ?? Outlet;
const NotFound = pageModules['./pages/not-found.tsx']?.default;

const children: RouteObject[] = Object.entries(pageModules)
  .map(([filePath, mod]) => {
    const routePath = toRoutePath(filePath);

    if (!routePath) {
      return null;
    }

    const element = React.createElement(mod.default);

    if (routePath === '/') {
      return {
        index: true,
        element,
      } satisfies RouteObject;
    }

    return {
      path: routePath,
      element,
    } satisfies RouteObject;
  })
  .filter((route): route is RouteObject => route !== null)
  .sort((a, b) => {
    const aPath = a.index ? '' : String(a.path ?? '');
    const bPath = b.index ? '' : String(b.path ?? '');
    return aPath.localeCompare(bPath);
  });

children.push({
  path: '*',
  element: NotFound
    ? React.createElement(NotFound)
    : React.createElement(() => (
        <section className="card">
          <h2 className="page-title">404</h2>
          <p className="page-desc">页面不存在。</p>
        </section>
      )),
});

export const router = createBrowserRouter([
  {
    path: '/',
    element: React.createElement(Layout),
    children,
  },
]);
