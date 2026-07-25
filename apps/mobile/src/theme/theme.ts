import type { ScanCategory } from '../types/scan';

export const colors = {
  forest: '#163B2E',
  forestSoft: '#285846',
  moss: '#689756',
  mossPale: '#DDE8D2',
  cream: '#F4F3E8',
  paper: '#FCFCF7',
  white: '#FFFFFF',
  ink: '#173027',
  inkMuted: '#5E6E66',
  line: '#DCE2D8',
  sun: '#E2B54A',
  sunPale: '#F8EBC7',
  coral: '#C85B48',
  coralPale: '#F8DFD9',
  amber: '#A7681B',
  amberPale: '#F6E7CD',
  blue: '#416A73',
  bluePale: '#DAE9EA',
  shadow: '#10271F',
  black: '#000000',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const type = {
  hero: { fontSize: 34, lineHeight: 39, fontWeight: '800' as const, letterSpacing: -1.1 },
  h1: { fontSize: 28, lineHeight: 33, fontWeight: '800' as const, letterSpacing: -0.7 },
  h2: { fontSize: 21, lineHeight: 27, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '800' as const, letterSpacing: 0.9 },
} as const;

export interface CategoryStyle {
  label: string;
  shortLabel: string;
  foreground: string;
  background: string;
  accent: string;
}

export const categoryStyles: Record<ScanCategory, CategoryStyle> = {
  food: { label: 'Fresh food', shortLabel: 'F', foreground: colors.forest, background: colors.mossPale, accent: colors.moss },
  packaged_food: { label: 'Packaged food', shortLabel: 'P', foreground: '#683C13', background: colors.sunPale, accent: colors.sun },
  plant: { label: 'Plant', shortLabel: 'L', foreground: colors.forest, background: colors.mossPale, accent: colors.moss },
  mushroom: { label: 'Wild mushroom', shortLabel: 'M', foreground: '#7B3428', background: colors.coralPale, accent: colors.coral },
  // Recognized non-food. Reads as a hazard, not as an unresolved identification.
  hazardous_nonfood: { label: 'Not food', shortLabel: '!', foreground: '#702A20', background: colors.coralPale, accent: colors.coral },
  unknown: { label: 'Unidentified', shortLabel: '?', foreground: colors.blue, background: colors.bluePale, accent: colors.blue },
};
