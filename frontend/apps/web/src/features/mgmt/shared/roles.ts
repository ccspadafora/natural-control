export function isMgmtConsole(role: string) {
  return role === "LIDER_ZONA" || role === "GERENCIA"
}

export function isGerencia(role: string) {
  return role === "GERENCIA"
}
