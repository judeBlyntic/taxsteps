// Organic design system tokens (mirrors TaxSteps/_ds/organic-*/styles.css).
export const colors = {
  bg: '#f5ead8',
  surface: '#ebddc5',
  text: '#201e1d',
  accent: '#c67139',
  accent2: '#7a8a5e',
  divider: 'rgba(32,30,29,0.16)',
  neutral: { 100: '#f9f4ed', 200: '#eee7db', 300: '#dcd3c4', 400: '#c0b6a5', 500: '#a19786', 600: '#82796a', 700: '#645c50', 800: '#474238', 900: '#2e2b25' },
  accentRamp: { 100: '#fff2eb', 200: '#ffe1d0', 300: '#ffc6a5', 400: '#f6a06b', 500: '#d67f48', 600: '#b2622d', 700: '#8c491a', 800: '#643312', 900: '#402310' },
  accent2Ramp: { 100: '#f0fae1', 200: '#e1eecc', 300: '#ccdbb2', 400: '#aebf92', 500: '#8fa073', 600: '#728157', 700: '#56633f', 800: '#3d472b', 900: '#272e1b' },
} as const

export const radius = { sm: 8, md: 16, lg: 28, xl: 34, pill: 999 } as const
export const space = { 1: 4, 2: 9, 3: 13, 4: 18, 6: 26, 8: 35 } as const

export const fonts = {
  heading: 'Caprasimo_400Regular',
  body: 'Figtree_400Regular',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
} as const

export const shadow = {
  sm: { boxShadow: '0px 1px 2px rgba(46, 43, 37, 0.14)' },
  md: { boxShadow: '0px 3px 10px rgba(46, 43, 37, 0.16)' },
  lg: { boxShadow: '0px 12px 32px rgba(46, 43, 37, 0.22)' },
} as const

/** Category colour token ("accent-2-300") → background/foreground. */
export function categoryColors(token: string | null | undefined): { bg: string; fg: string } {
  const m = /^(accent-2|accent|neutral)-(\d)00$/.exec(token ?? '')
  if (!m) return { bg: colors.neutral[200], fg: colors.neutral[900] }
  const step = Number(m[2]) * 100 as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  const ramp = m[1] === 'accent-2' ? colors.accent2Ramp : m[1] === 'accent' ? colors.accentRamp : colors.neutral
  return { bg: ramp[step], fg: ramp[900] }
}
