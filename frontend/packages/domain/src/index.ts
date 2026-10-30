export { Format } from "@nc/ui/format"

export {
  clientListSchema,
  clientSummarySchema,
  gpsStatusSchema,
  sessionUserSchema,
  visitListSchema,
  visitSummarySchema,
  type ClientSummary,
  type GpsStatus,
  type SessionUser,
  type VisitSummary,
} from "./schemas"

export function formatMoney(value: number | string): string {
  const amount = Math.round(Number(value))
  const digits = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.abs(amount))
  const sign = amount < 0 ? "−" : ""
  return `${sign}$ ${digits}`
}

export function homeFor(role: string, surface: "campo" | "web"): string {
  if (surface === "campo") {
    return role === "RTC" ? "/campo/" : "/consola/"
  }
  return role === "RTC" ? "/portal" : "/consola"
}
