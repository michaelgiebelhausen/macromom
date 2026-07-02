// Design tokens — single source of truth is docs/design.md. Do not invent values.
import { Platform } from 'react-native';

export const colors = {
  primary: '#E85440',
  onPrimary: '#FFFFFF',
  primaryHover: '#CE4634',
  primaryBright: '#FF6F5E', // decorative only — fails text contrast
  accent: '#F2A65A',
  onAccent: '#2E2A26',
  accentHover: '#E5924A',
  surface: '#FFF9F3',
  surfaceRaised: '#FFFFFF',
  surfaceSunken: '#F7EEE4',
  onSurface: '#2E2A26',
  onSurfaceMuted: '#726A61',
  border: '#EADFD2',
  success: '#3E9E6E',
  onSuccess: '#FFFFFF',
  warning: '#E8A317',
  onWarning: '#2E2A26',
  error: '#B3261E',
  onError: '#FFFFFF',
  info: '#3E86C4',
  onInfo: '#FFFFFF',
} as const;

// Nunito (headings) / Inter (body) load via expo-font in the root layout.
// System fallbacks keep the app usable before fonts resolve.
const heading = Platform.select({ ios: 'Nunito', default: 'Nunito' }) ?? 'Nunito';
const body = Platform.select({ ios: 'Inter', default: 'Inter' }) ?? 'Inter';

export const fonts = {
  headingRegular: `${heading}_700Bold`,
  headingBold: `${heading}_800ExtraBold`,
  bodyRegular: `${body}_400Regular`,
  bodyMedium: `${body}_500Medium`,
  bodySemiBold: `${body}_600SemiBold`,
  bodyBold: `${body}_700Bold`,
} as const;

export const typography = {
  display: { fontFamily: fonts.headingBold, fontSize: 34, lineHeight: 39, letterSpacing: -0.68 },
  h1: { fontFamily: fonts.headingBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.28 },
  h2: { fontFamily: fonts.headingRegular, fontSize: 22, lineHeight: 28 },
  h3: { fontFamily: fonts.headingRegular, fontSize: 18, lineHeight: 23 },
  bodyLg: { fontFamily: fonts.bodyRegular, fontSize: 17, lineHeight: 26 },
  body: { fontFamily: fonts.bodyRegular, fontSize: 15, lineHeight: 23 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 18 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  numeric: {
    fontFamily: fonts.bodyBold,
    fontSize: 26,
    lineHeight: 29,
    fontVariant: ['tabular-nums'] as ('tabular-nums' | 'lining-nums')[],
  },
} as const;

export const rounded = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

/** Soft, warm card shadow (design.md § Elevation & Depth). */
export const shadowCard = {
  shadowColor: '#2E2A26',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

export const shadowModal = {
  shadowColor: '#2E2A26',
  shadowOpacity: 0.1,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
} as const;
