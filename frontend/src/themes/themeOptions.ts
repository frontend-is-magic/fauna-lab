import { defaultTheme } from './default/config';
import { zooTheme } from './zoo/config';

export const themes = [defaultTheme, zooTheme];

export const themeOptions = themes.map((theme) => ({
  label: theme.label,
  value: theme.id
}));
