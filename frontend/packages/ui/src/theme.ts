export type NcTheme = "light" | "dark" | "sol"

const KEY = "nc.theme"

export function readTheme(): NcTheme {
  if (typeof document === "undefined") return "dark"
  const stored = localStorage.getItem(KEY) as NcTheme | null
  if (stored === "light" || stored === "dark" || stored === "sol") return stored
  return "dark"
}

export function applyTheme(theme: NcTheme) {
  document.documentElement.setAttribute("data-theme", theme)
  localStorage.setItem(KEY, theme)
}

export function initTheme() {
  applyTheme(readTheme())
}
