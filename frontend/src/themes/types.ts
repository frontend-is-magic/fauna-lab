import type { ThemeId } from '../atoms/theme';

export interface ThemeConfig {
  id: ThemeId;
  label: string;
  description: string;
  accent: string;
  surfaceClassName: string;
}
