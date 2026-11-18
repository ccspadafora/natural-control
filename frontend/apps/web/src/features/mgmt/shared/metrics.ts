import { Format, type IconName } from "@nc/ui"

export type Period = "mes" | "semana" | "dia" | "anio"

export type Tone = "success" | "warning" | "danger"

export type TeamRtc = {
  id: string
  name: string
  zone: string
  zone_id: string | null
  sales: number
  budget: number
  expected: number
  d1_pct: number | null
  d2_pct: number | null
  visits_done: number
  visits_target: number
  verified_pct: number | null
  coverage_pct: number | null
  last_sync_at: string | null
  gen: number | null
  day: { programadas: number; realizadas: number; pendientes: number; no_realizadas: number }
}

export type TeamAttention = {
  gps_pending: number
  plans_pending: number
  visits_not_started: number
  clients_stale_30d: number
}

export type TeamProduct = {
  id: string
  name: string
  category: string
  active_ingredient: string
  potential: number
  concretado: number
  conversion: number | null
}

export type TeamMetrics = {
  period: Period
  period_start: string
  day: number
  days_in_month: number
  totals: {
    sales: number
    budget: number
    expected: number
    visits_done: number
    visits_target: number
    gps_verified_pct: number | null
    forecast_probable: number
  }
  rtcs: TeamRtc[]
  attention: TeamAttention
  products: TeamProduct[]
}

export type ZoneMetric = {
  id: string
  code: string
  name: string
  leader: string
  rtc_count: number
  municipality_count: number
  departments: string[]
  sales: number
  budget: number
  d1_pct: number | null
  d2_pct: number | null
  visits_pct: number | null
  coverage_pct: number | null
  tone: Tone
}

export type ForecastLine = { id: string; name: string; optimistic: number; probable: number; committed: number }

export type ForecastRtc = ForecastLine & { zone: string; hit_rate: number | null }

export type Forecast = {
  totals: { optimistic: number; probable: number; committed: number }
  by_month: { month: string; label: string; corto: number; mediano: number; largo: number }[]
  by_rtc: ForecastRtc[]
  by_product: ForecastLine[]
  gap: {
    budget: number
    sales: number
    falta: number
    ticket_avg: number
    close_rate: number
    visits_needed: number
    days_left: number
  } | null
}

export type LiveGps = { status: string; distance_m: number | null; review_status: string }

export type LiveVisit = {
  id: string
  scheduled_start: string | null
  client_name: string
  site: string
  municipality: string
  rtc_id: string
  rtc_name: string
  zone: string
  zone_id: string | null
  status: string
  result: string
  reason: string
  gps: LiveGps | null
  position: { latitude: number; longitude: number } | null
  concretado: number
  potencial: number
  photos: number
}

export type LiveVisits = {
  results: LiveVisit[]
  count: number
  page: number
  page_size: number
  summary: { total: number; en_curso: number; realizadas: number; no_realizadas: number; verificadas_pct: number | null }
}

export type AttentionCase = {
  id: string
  n: number
  title: string
  sub: string
  icon: IconName
  to: string
}

export function attentionCases(attention: TeamAttention | undefined): AttentionCase[] {
  if (!attention) return []
  const all: AttentionCase[] = [
    { id: "gps", n: attention.gps_pending, title: "discrepancias GPS sin revisar", sub: "Geolocalización · prioriza las de hoy", icon: "crosshair", to: "/consola/geo" },
    { id: "plan", n: attention.plans_pending, title: "programaciones pendientes de aprobar", sub: "Semana próxima · vence pronto", icon: "calendar", to: "/consola/programacion" },
    { id: "vis", n: attention.visits_not_started, title: "visitas programadas sin iniciar", sub: "Hoy · revisa en Visitas en vivo", icon: "pin", to: "/consola/visitas" },
    { id: "cob", n: attention.clients_stale_30d, title: "clientes sin visita en 30 días", sub: "Cobertura · últimos 30 días", icon: "users", to: "/consola/tableros" },
  ]
  return all.filter((a) => a.n > 0)
}

export type ZoneBarRow = {
  id: string
  name: string
  rtcCount: number
  salesLabel: string
  salesPct: number
  salesColor: string
  visitsPct: number
  d1Label: string
  visitsLabel: string
}

const TONE_COLOR: Record<Tone, string> = {
  success: "var(--success-solid)",
  warning: "var(--warning-solid)",
  danger: "var(--danger-solid)",
}

export function zoneBarRows(zones: ZoneMetric[]): ZoneBarRow[] {
  return zones.map((z) => ({
    id: z.id,
    name: z.name,
    rtcCount: z.rtc_count,
    salesLabel: moneyShort(z.sales),
    salesPct: clampPct(z.d1_pct),
    salesColor: TONE_COLOR[z.tone] ?? TONE_COLOR.warning,
    visitsPct: clampPct(z.visits_pct),
    d1Label: pctLabel(z.d1_pct),
    visitsLabel: pctLabel(z.visits_pct),
  }))
}

export function clampPct(pct: number | null | undefined) {
  if (pct == null) return 0
  return Math.max(0, Math.min(100, pct))
}

export function pctLabel(pct: number | null | undefined) {
  return pct == null ? "—" : `${Math.round(pct)} %`
}

export function moneyShort(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `$ ${(n / 1_000_000_000).toFixed(2).replace(".", ",")} MM`
  if (abs >= 1_000_000) return `$ ${Math.round(n / 1_000_000)} M`
  return Format.money(n)
}

export function d1ToneToBg(tone: Tone | "muted") {
  switch (tone) {
    case "success":
      return "var(--success-tint)"
    case "warning":
      return "var(--warning-tint)"
    case "danger":
      return "var(--danger-tint)"
    default:
      return "var(--surface-sunken)"
  }
}

export function d1FromPct(pct: number | null | undefined): { label: string; tone: Tone | "muted" } {
  if (pct == null) return { label: "—", tone: "muted" }
  const rounded = Math.round(pct)
  const label = `${rounded} %`
  if (rounded >= 85) return { label, tone: "success" }
  if (rounded >= 70) return { label, tone: "warning" }
  return { label, tone: "danger" }
}

export function syncAgo(iso: string | null) {
  if (!iso) return "Sin sincronizar"
  return Format.relativeDate(new Date(iso))
}

export function monthShort(iso: string) {
  const word = new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "America/Bogota" }).format(new Date(`${iso}T12:00:00-05:00`))
  return word.charAt(0).toUpperCase() + word.slice(1)
}

export function monthLong(iso: string) {
  const word = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "America/Bogota" }).format(
    new Date(`${iso}T12:00:00-05:00`),
  )
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/** Posición relativa (0–100 %) de un punto dentro del rectángulo que encierra a todos los puntos. */
export function projectPoints<T extends { id: string; position: { latitude: number; longitude: number } | null }>(rows: T[]) {
  const pts = rows.filter((r) => r.position)
  if (pts.length === 0) return new Map<string, { left: string; top: string }>()
  const lats = pts.map((r) => r.position!.latitude)
  const lngs = pts.map((r) => r.position!.longitude)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const spanLat = maxLat - minLat || 1
  const spanLng = maxLng - minLng || 1
  const out = new Map<string, { left: string; top: string }>()
  for (const r of pts) {
    const left = 10 + ((r.position!.longitude - minLng) / spanLng) * 80
    const top = 10 + (1 - (r.position!.latitude - minLat) / spanLat) * 78
    out.set(r.id, { left: `${left}%`, top: `${top}%` })
  }
  return out
}
