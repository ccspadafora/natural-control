import type { BadgeTone } from "@nc/ui"

export const CLIENT_STATUS: Record<string, string> = {
  PROSPECTO: "Prospecto",
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  PERDIDO: "Perdido",
}

export function statusTone(status: string): BadgeTone {
  if (status === "ACTIVO") return "success"
  if (status === "PROSPECTO") return "accent"
  if (status === "PERDIDO") return "warning"
  return "neutral"
}
