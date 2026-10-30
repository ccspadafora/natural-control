const TZ = "America/Bogota"

export function campoDayLabel(date = new Date()) {
  return new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: TZ }).format(date)
}

export function visitClock(iso: string | null) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: TZ }).format(new Date(iso))
}

export function visitAgo(iso: string | null) {
  if (!iso) return "Sin visitas"
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return "Visitado hoy"
  if (days === 1) return "Hace 1 día"
  return `Hace ${days} días`
}

export function daysSinceVisit(iso: string | null) {
  if (!iso) return 999
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

export function userInitials(first: string, last: string) {
  const a = first.trim()[0] || ""
  const b = last.trim()[0] || ""
  return (a + b).toUpperCase() || "?"
}

export function mapsDirectionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

export function agendaDayParam() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ })
}
