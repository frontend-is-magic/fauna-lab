import { atom } from 'jotai';

export type ThemeId = 'default' | 'zoo';

export const themeAtom = atom<ThemeId>('default');
