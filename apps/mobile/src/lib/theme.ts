import type { ThemeName } from '@taxsteps/core'

// Design tokens for both app themes. Classic mirrors TaxSteps/_ds/organic-*/styles.css; Fresh mirrors tr-theme.css.
const classic = {
  colors: {
    bg: '#f5ead8',
    surface: '#ebddc5',
    text: '#201e1d',
    accent: '#c67139',
    accent2: '#7a8a5e',
    divider: 'rgba(32,30,29,0.16)',
    selected: '#201e1d', // active chips, toasts
    neutral: { 100: '#f9f4ed', 200: '#eee7db', 300: '#dcd3c4', 400: '#c0b6a5', 500: '#a19786', 600: '#82796a', 700: '#645c50', 800: '#474238', 900: '#2e2b25' },
    accentRamp: { 100: '#fff2eb', 200: '#ffe1d0', 300: '#ffc6a5', 400: '#f6a06b', 500: '#d67f48', 600: '#b2622d', 700: '#8c491a', 800: '#643312', 900: '#402310' },
    accent2Ramp: { 100: '#f0fae1', 200: '#e1eecc', 300: '#ccdbb2', 400: '#aebf92', 500: '#8fa073', 600: '#728157', 700: '#56633f', 800: '#3d472b', 900: '#272e1b' },
  },
  fonts: {
    heading: 'Caprasimo_400Regular',
    body: 'Figtree_400Regular',
    semibold: 'Figtree_600SemiBold',
    bold: 'Figtree_700Bold',
  },
  shadow: {
    sm: { boxShadow: '0px 1px 2px rgba(46, 43, 37, 0.14)' },
    md: { boxShadow: '0px 3px 10px rgba(46, 43, 37, 0.16)' },
    lg: { boxShadow: '0px 12px 32px rgba(46, 43, 37, 0.22)' },
  },
}
type Palette = typeof classic

const fresh: Palette = {
  colors: {
    bg: '#f5f5f1',
    surface: '#ebebe6',
    text: '#151515',
    accent: '#7e6be0',
    accent2: '#c6db5c',
    divider: 'rgba(21,21,21,0.11)',
    selected: '#7e6be0',
    neutral: { 100: '#fcfcfa', 200: '#efefeb', 300: '#e1e1dc', 400: '#c8c8c2', 500: '#a3a39e', 600: '#80807b', 700: '#5e5e5a', 800: '#3e3e3b', 900: '#1f1f1d' },
    accentRamp: { 100: '#f4f2fe', 200: '#e6e1fd', 300: '#cfc6fb', 400: '#b3a6f6', 500: '#9a88ef', 600: '#7e6be0', 700: '#6553c0', 800: '#4a3d91', 900: '#2f2760' },
    accent2Ramp: { 100: '#f8fbe6', 200: '#eef5c6', 300: '#dbe98e', 400: '#c6db5c', 500: '#adc23f', 600: '#8c9e30', 700: '#6a7825', 800: '#48521a', 900: '#2c3210' },
  },
  // Fresh is Inter Regular throughout: the design has no bold.
  fonts: { heading: 'Inter_400Regular', body: 'Inter_400Regular', semibold: 'Inter_400Regular', bold: 'Inter_400Regular' },
  shadow: {
    sm: { boxShadow: '0px 1px 2px rgba(31, 31, 29, 0.08)' },
    md: { boxShadow: '0px 4px 14px rgba(31, 31, 29, 0.10)' },
    lg: { boxShadow: '0px 14px 36px rgba(31, 31, 29, 0.16)' },
  },
}

export const PALETTES: Record<ThemeName, Palette> = { fresh, classic }

// The live tokens. applyTheme rewrites them in place and the root remounts the screens, so read them while
// rendering and never copy them into module-level constants (those would keep the old theme).
const live: Palette = JSON.parse(JSON.stringify(fresh))
export const { colors, fonts, shadow } = live

function assignDeep(target: Record<string, unknown>, src: object) {
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === 'object') assignDeep(target[k] as Record<string, unknown>, v)
    else target[k] = v
  }
}

export function applyTheme(name: ThemeName) {
  assignDeep(live, PALETTES[name])
}

export const radius = { sm: 8, md: 16, lg: 28, xl: 34, pill: 999 } as const
export const space = { 1: 4, 2: 9, 3: 13, 4: 18, 6: 26, 8: 35 } as const

/** Category colour token ("accent-2-300") → background/foreground. */
export function categoryColors(token: string | null | undefined): { bg: string; fg: string } {
  const m = /^(accent-2|accent|neutral)-(\d)00$/.exec(token ?? '')
  if (!m) return { bg: colors.neutral[200], fg: colors.neutral[900] }
  const step = Number(m[2]) * 100 as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  const ramp = m[1] === 'accent-2' ? colors.accent2Ramp : m[1] === 'accent' ? colors.accentRamp : colors.neutral
  return { bg: ramp[step], fg: ramp[900] }
}
