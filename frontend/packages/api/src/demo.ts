/** true cuando VITE_DEMO_MODE=true o en build de desarrollo de Vite. */
export function isDemoMode(): boolean {
  const env = import.meta.env as { VITE_DEMO_MODE?: string; DEV?: boolean }
  if (env.VITE_DEMO_MODE === "true") return true
  if (env.VITE_DEMO_MODE === "false") return false
  return Boolean(env.DEV)
}
