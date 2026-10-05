import type { ThemeName } from '@taxsteps/core'

// The account's theme is mirrored in localStorage so a page load paints in the right theme before the profile arrives.
const KEY = 'theme'

/** Runs in <head> during HTML parsing, before first paint. No data-theme = Fresh (the default). */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t)document.documentElement.dataset.theme=t}catch(e){}`

export function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme
  try { localStorage.setItem(KEY, theme) } catch { /* storage blocked: the profile still drives the theme */ }
}

/** React's dev Strict Mode remount resets <html> attributes, clearing what THEME_SCRIPT set. */
export function reapplyStoredTheme() {
  try {
    const t = localStorage.getItem(KEY)
    if (t) document.documentElement.dataset.theme = t
  } catch { /* storage blocked */ }
}
