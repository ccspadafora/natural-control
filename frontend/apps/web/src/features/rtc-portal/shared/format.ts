const TZ = "America/Bogota"

export function portalDayLabel(date = new Date()) {
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "short", timeZone: TZ }).format(date)
}

export function portalMonthEyebrow(date = new Date()) {
  const month = new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: TZ }).format(date)
  const day = new Intl.DateTimeFormat("es-CO", { day: "numeric", timeZone: TZ }).format(date)
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} · día ${day} de ${daysInMonth}`
}

export function visitClock(iso: string | null) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: TZ }).format(new Date(iso))
}

export function visitDayShort(iso: string) {
  return new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: TZ }).format(
    new Date(`${iso}T12:00:00-05:00`),
  )
}

export function visitAgo(iso: string | null) {
  if (!iso) return "Sin visitas"
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return "Hoy"
  if (days === 1) return "Hace 1 día"
  return `Hace ${days} días`
}

export function agendaDayParam(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: TZ })
}

/** Lunes a domingo de la semana calendario (America/Bogota). */
export function weekDayParams(anchor = new Date()): string[] {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(anchor)
  const y = Number(parts.find((p) => p.type === "year")?.value)
  const m = Number(parts.find((p) => p.type === "month")?.value)
  const d = Number(parts.find((p) => p.type === "day")?.value)
  const utc = new Date(Date.UTC(y, m - 1, d, 12))
  const dow = new Date(utc.toLocaleString("en-US", { timeZone: TZ })).getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const t = new Date(Date.UTC(y, m - 1, d + mondayOffset + i, 12))
    days.push(t.toLocaleDateString("en-CA", { timeZone: TZ }))
  }
  return days
}

export function planWeekRange(startIso: string, endIso: string) {
  const start = visitDayShort(startIso)
  const end = visitDayShort(endIso)
  return `${start} al ${end}`
}

export function planDeadline(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso))
}

export function greeting(firstName: string) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: TZ }).format(new Date()))
  const word = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches"
  return `${word}, ${firstName}`
}
