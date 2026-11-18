/** Layout helpers for agenda week/month grids (no mock visit data). */

export type CalStatus = "REALIZADA" | "PROGRAMADA" | "ATRASADA" | "NO_REALIZADA" | "EN_CURSO" | "CANCELADA"

export const H0 = 7
export const H1 = 18
export const HP = 68
export const CAL_GRID_H = (H1 - H0) * HP

export const CAL_HOURS = Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i)

export const STATUS_STYLE: Record<string, { bg: string; dot: string }> = {
  REALIZADA: { bg: "var(--surface-sunken)", dot: "var(--success-solid)" },
  PROGRAMADA: { bg: "var(--primary-tint)", dot: "var(--primary)" },
  EN_CURSO: { bg: "var(--primary-tint)", dot: "var(--primary)" },
  ATRASADA: { bg: "var(--danger-tint)", dot: "var(--danger-solid)" },
  NO_REALIZADA: { bg: "var(--surface-sunken)", dot: "var(--border-control)" },
  CANCELADA: { bg: "var(--surface-sunken)", dot: "var(--border-control)" },
}

export const WEEKDAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

export function hourLabel(h: number) {
  const whole = Math.floor(h)
  const mins = Math.round((h - whole) * 60)
  const suffix = whole >= 12 ? "p. m." : "a. m."
  const display = ((whole + 11) % 12) + 1
  return mins ? `${display}:${String(mins).padStart(2, "0")} ${suffix}` : `${display} ${suffix}`
}

export function eventTop(startHour: number) {
  return (startHour - H0) * HP + 2
}

export function eventHeight(durationHours: number) {
  return Math.max(durationHours * HP - 4, 28)
}

/** Decimal hour in America/Bogota from ISO. */
export function isoToHour(iso: string | null): number {
  if (!iso) return H0
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date(iso))
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? H0)
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0)
  return hour + minute / 60
}

export function isoToDayKey(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
}

export function formatWeekTitle(days: string[]) {
  if (days.length === 0) return ""
  const start = new Date(`${days[0]}T12:00:00-05:00`)
  const end = new Date(`${days[days.length - 1]}T12:00:00-05:00`)
  const a = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" }).format(start)
  const b = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" }).format(end)
  return `${a} al ${b}`
}

export function formatMonthTitle(anchor: Date) {
  const label = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "America/Bogota" }).format(anchor)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export type MonthCell = {
  day: number
  dateKey: string
  inMonth: boolean
  isToday: boolean
  visitCount: number
  lateCount: number
}

/** Build Mon-start month grid for the month containing `anchorIso` (YYYY-MM-DD). */
export function buildMonthCells(
  anchorIso: string,
  todayIso: string,
  counts: Record<string, { total: number; late: number }>,
): MonthCell[] {
  const [y, m] = anchorIso.split("-").map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1, 12))
  const firstDow = new Date(first.toLocaleString("en-US", { timeZone: "America/Bogota" })).getDay()
  const mondayOffset = firstDow === 0 ? -6 : 1 - firstDow
  const daysInMonth = new Date(y, m, 0).getDate()
  const cells: MonthCell[] = []
  for (let w = 0; w < 6; w++) {
    for (let i = 0; i < 7; i++) {
      const dayNum = mondayOffset + w * 7 + i
      const date = new Date(Date.UTC(y, m - 1, dayNum, 12))
      const dateKey = date.toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
      const inMonth = dayNum >= 1 && dayNum <= daysInMonth
      const c = counts[dateKey] ?? { total: 0, late: 0 }
      cells.push({
        day: Number(dateKey.split("-")[2]),
        dateKey,
        inMonth,
        isToday: dateKey === todayIso,
        visitCount: inMonth ? c.total : 0,
        lateCount: inMonth ? c.late : 0,
      })
    }
  }
  return cells
}
