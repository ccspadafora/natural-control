import type { SessionUser } from "@nc/domain"

export function mgmtScopeWord(user: SessionUser) {
  if (user.role === "LIDER_ZONA") return "Tu zona y comerciales a cargo"
  if (user.role === "GERENCIA") return "Toda la operación"
  return "Consola"
}
