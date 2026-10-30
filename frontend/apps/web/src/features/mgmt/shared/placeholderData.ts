import type { IconName } from "@nc/ui"

export type AttentionCase = {
  id: string
  n: number
  title: string
  sub: string
  icon: IconName
  to: string
}

export function placeholderAttention(): AttentionCase[] {
  return [
    { id: "gps", n: 4, title: "discrepancias GPS sin revisar", sub: "Geolocalización · prioriza las de hoy", icon: "crosshair", to: "/consola/geo" },
    { id: "plan", n: 2, title: "programaciones pendientes de aprobar", sub: "Semana próxima · vence pronto", icon: "calendar", to: "/consola/programacion" },
    { id: "vis", n: 6, title: "visitas programadas sin iniciar", sub: "Hoy · revisa en Visitas en vivo", icon: "pin", to: "/consola/visitas" },
    { id: "cob", n: 11, title: "clientes sin visita en 30 días", sub: "Cobertura · datos ilustrativos", icon: "users", to: "/consola/tableros" },
  ]
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

export function placeholderZones(): ZoneBarRow[] {
  return [
    { id: "z1", name: "Oriente antioqueño", rtcCount: 12, salesLabel: "$ 412 M", salesPct: 88, salesColor: "var(--success-solid)", visitsPct: 72, d1Label: "92 %", visitsLabel: "68 %" },
    { id: "z2", name: "Eje cafetero", rtcCount: 9, salesLabel: "$ 298 M", salesPct: 76, salesColor: "var(--warning-solid)", visitsPct: 81, d1Label: "84 %", visitsLabel: "74 %" },
    { id: "z3", name: "Costa norte", rtcCount: 11, salesLabel: "$ 355 M", salesPct: 94, salesColor: "var(--success-solid)", visitsPct: 69, d1Label: "97 %", visitsLabel: "71 %" },
    { id: "z4", name: "Tolima grande", rtcCount: 8, salesLabel: "$ 221 M", salesPct: 62, salesColor: "var(--danger-solid)", visitsPct: 58, d1Label: "71 %", visitsLabel: "55 %" },
    { id: "z5", name: "Valle sur", rtcCount: 10, salesLabel: "$ 318 M", salesPct: 83, salesColor: "var(--chart-1)", visitsPct: 77, d1Label: "89 %", visitsLabel: "76 %" },
    { id: "z6", name: "Llanos", rtcCount: 7, salesLabel: "$ 184 M", salesPct: 71, salesColor: "var(--warning-solid)", visitsPct: 64, d1Label: "78 %", visitsLabel: "62 %" },
  ]
}

export type RtcCompliance = {
  id: string
  name: string
  sales: number
  budget: number
  expected: number
}

export function placeholderRtcs(): RtcCompliance[] {
  return [
    { id: "r1", name: "Laura Méndez", sales: 42_000_000, budget: 48_000_000, expected: 44_000_000 },
    { id: "r2", name: "Carlos Ríos", sales: 38_500_000, budget: 45_000_000, expected: 41_000_000 },
    { id: "r3", name: "Ana Toro", sales: 51_200_000, budget: 50_000_000, expected: 46_000_000 },
    { id: "r4", name: "Diego Vargas", sales: 29_800_000, budget: 42_000_000, expected: 38_000_000 },
    { id: "r5", name: "María Gil", sales: 33_100_000, budget: 40_000_000, expected: 36_500_000 },
    { id: "r6", name: "Juan Prada", sales: 47_600_000, budget: 46_000_000, expected: 42_000_000 },
  ]
}

export type MapZoneSummary = {
  id: string
  name: string
  leader: string
  rtcCount: number
  munCount: number
  d1Label: string
  d2Label: string
  salesLabel: string
  visitsLabel: string
  cobLabel: string
  tone: "success" | "warning" | "danger"
  deps: string[]
}

export function placeholderMapZones(): MapZoneSummary[] {
  return [
    { id: "orient", name: "Oriente antioqueño", leader: "Patricia Ruiz", rtcCount: 12, munCount: 34, d1Label: "92 %", d2Label: "98 %", salesLabel: "$ 412 M", visitsLabel: "68 %", cobLabel: "81 %", tone: "success", deps: ["ANT", "CAL", "RIS"] },
    { id: "cafetero", name: "Eje cafetero", leader: "Luis Hoyos", rtcCount: 9, munCount: 28, d1Label: "84 %", d2Label: "91 %", salesLabel: "$ 298 M", visitsLabel: "74 %", cobLabel: "76 %", tone: "warning", deps: ["RIS", "QUI", "CAL"] },
    { id: "costa", name: "Costa norte", leader: "Sandra Mora", rtcCount: 11, munCount: 41, d1Label: "97 %", d2Label: "102 %", salesLabel: "$ 355 M", visitsLabel: "71 %", cobLabel: "79 %", tone: "success", deps: ["ATL", "MAG", "BOL", "CES", "SUC", "COR"] },
    { id: "tolima", name: "Tolima grande", leader: "Óscar León", rtcCount: 8, munCount: 22, d1Label: "71 %", d2Label: "78 %", salesLabel: "$ 221 M", visitsLabel: "55 %", cobLabel: "63 %", tone: "danger", deps: ["TOL", "HUI", "CUN"] },
    { id: "valle", name: "Valle sur", leader: "Claudia Nieto", rtcCount: 10, munCount: 31, d1Label: "89 %", d2Label: "94 %", salesLabel: "$ 318 M", visitsLabel: "76 %", cobLabel: "82 %", tone: "success", deps: ["VAL", "CAU", "NAR"] },
    { id: "llanos", name: "Llanos", leader: "Héctor Arias", rtcCount: 7, munCount: 19, d1Label: "78 %", d2Label: "85 %", salesLabel: "$ 184 M", visitsLabel: "62 %", cobLabel: "70 %", tone: "warning", deps: ["MET", "CAS", "VIC", "ARA"] },
  ]
}

export function d1ToneToBg(tone: "success" | "warning" | "danger" | "muted") {
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

export function d1FromPct(pct: number): { label: string; tone: "success" | "warning" | "danger" } {
  if (pct >= 85) return { label: `${pct} %`, tone: "success" }
  if (pct >= 70) return { label: `${pct} %`, tone: "warning" }
  return { label: `${pct} %`, tone: "danger" }
}
