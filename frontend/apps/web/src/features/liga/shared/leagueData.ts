/** Datos de liga del prototipo Portal (RAW RTC líneas 1245–1256). */

export type LeagueForm = "up" | "flat" | "down"

export type LeagueZone = {
  id: string
  name: string
}

export type RawRtc = {
  id: string
  name: string
  z: string
  sales: number
  budget: number
  visits: number
  vt: number
  verif: number
  nuevos: number
  pot: number
  conc: number
  cob: number
  eff: number
  stale: number
  gen: number | null
  a: number[] | null
  form: LeagueForm
  chg: number
  erp: string
}

export type LeagueRtc = RawRtc & {
  zoneName: string
  initials: string
  tierName: string
  tierBorder: string
  tierBg: string
  formWord: string
  formFg: string
  chgLabel: string
  chgFg: string
  genLabel: string
  ven: string
  con: string
  act: string
  cobA: string
  attrs: { k: string; n: string; v: string }[]
  d1Pct: number
  d1Label: string
  d2Label: string
  effLabel: string
  verifLabel: string
  cobLabel: string
  toCatchLabel: string
}

export const LEAGUE_ZONES: LeagueZone[] = [
  { id: "ori", name: "Oriente antioqueño" },
  { id: "eje", name: "Eje Cafetero" },
  { id: "val", name: "Valle del Cauca" },
  { id: "cun", name: "Cundinamarca y Boyacá" },
  { id: "san", name: "Santanderes" },
  { id: "tol", name: "Tolima y Huila" },
]

const ZONE_NAMES = Object.fromEntries(LEAGUE_ZONES.map((z) => [z.id, z.name]))

export const ATTR = [
  ["VEN", "Ventas"],
  ["CON", "Conversión"],
  ["ACT", "Actividad"],
  ["COB", "Cobertura"],
  ["CNF", "Confiabilidad"],
  ["DES", "Desarrollo"],
] as const

const DAY = 29
const DAYS = 31

const RAW: RawRtc[] = [
  { id: "ep", name: "Esteban Posada", z: "ori", sales: 36.9e6, budget: 35e6, visits: 66, vt: 60, verif: 98, nuevos: 6, pot: 47.5e6, conc: 28.3e6, cob: 93, eff: 63, stale: 3, gen: 92, a: [97, 90, 91, 92, 96, 84], form: "up", chg: 0, erp: "V-0091" },
  { id: "cr", name: "Camilo Restrepo", z: "ori", sales: 31.2e6, budget: 34e6, visits: 61, vt: 60, verif: 97, nuevos: 5, pot: 41.2e6, conc: 24.1e6, cob: 91, eff: 58, stale: 4, gen: 88, a: [90, 86, 88, 90, 95, 79], form: "up", chg: 1, erp: "V-0112" },
  { id: "jh", name: "Julián Henao", z: "ori", sales: 28.8e6, budget: 32e6, visits: 59, vt: 60, verif: 93, nuevos: 3, pot: 33.0e6, conc: 18.2e6, cob: 86, eff: 51, stale: 6, gen: 85, a: [86, 84, 86, 87, 90, 80], form: "up", chg: 2, erp: "V-0123" },
  { id: "vc", name: "Valentina Cano", z: "ori", sales: 21.5e6, budget: 30e6, visits: 52, vt: 60, verif: 89, nuevos: 2, pot: 24.3e6, conc: 12.0e6, cob: 76, eff: 42, stale: 12, gen: 74, a: [74, 70, 80, 76, 84, 63], form: "flat", chg: -1, erp: "V-0127" },
  { id: "so", name: "Santiago Mejía", z: "ori", sales: 18.4e6, budget: 30e6, visits: 38, vt: 60, verif: 81, nuevos: 1, pot: 22.7e6, conc: 9.6e6, cob: 62, eff: 34, stale: 21, gen: 63, a: [66, 58, 64, 55, 61, 66], form: "down", chg: -2, erp: "V-0118" },
  { id: "no", name: "Natalia Osorio", z: "eje", sales: 27.9e6, budget: 30e6, visits: 57, vt: 60, verif: 94, nuevos: 3, pot: 36.4e6, conc: 19.8e6, cob: 87, eff: 52, stale: 6, gen: 84, a: [87, 82, 85, 86, 91, 70], form: "flat", chg: 0, erp: "V-0104" },
  { id: "dv", name: "Daniela Vargas", z: "eje", sales: 22.6e6, budget: 28e6, visits: 49, vt: 60, verif: 90, nuevos: 2, pot: 28.1e6, conc: 13.2e6, cob: 78, eff: 45, stale: 11, gen: 76, a: [78, 75, 74, 77, 86, 72], form: "up", chg: 3, erp: "V-0121" },
  { id: "ag", name: "Andrés Gómez", z: "val", sales: 35.1e6, budget: 36e6, visits: 54, vt: 60, verif: 92, nuevos: 4, pot: 52.6e6, conc: 30.4e6, cob: 84, eff: 61, stale: 7, gen: 90, a: [95, 93, 82, 85, 89, 88], form: "up", chg: 1, erp: "V-0097" },
  { id: "jr", name: "Juliana Ríos", z: "cun", sales: 20.3e6, budget: 32e6, visits: 44, vt: 60, verif: 88, nuevos: 2, pot: 25.9e6, conc: 11.7e6, cob: 69, eff: 40, stale: 17, gen: 68, a: [68, 64, 70, 62, 78, 71], form: "flat", chg: -1, erp: "V-0109" },
  { id: "fc", name: "Felipe Cárdenas", z: "san", sales: 25.7e6, budget: 30e6, visits: 58, vt: 60, verif: 95, nuevos: 3, pot: 30.8e6, conc: 15.9e6, cob: 88, eff: 47, stale: 5, gen: 80, a: [83, 74, 87, 87, 93, 68], form: "down", chg: -1, erp: "V-0115" },
  { id: "ml", name: "Mariana López", z: "tol", sales: 9.8e6, budget: 26e6, visits: 6, vt: 60, verif: 100, nuevos: 2, pot: 14.2e6, conc: 4.1e6, cob: 31, eff: 50, stale: 28, gen: null, a: null, form: "flat", chg: 0, erp: "V-0130" },
]

const FORM: Record<LeagueForm, [string, string]> = {
  up: ["Mejora", "var(--success)"],
  flat: ["Estable", "var(--ink-secondary)"],
  down: ["Empeora", "var(--danger)"],
}

function pct(value: number) {
  return `${Math.round(value)} %`
}

function money(value: number) {
  const digits = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(value))
  return `$ ${digits}`
}

function tierOf(gen: number | null) {
  if (gen == null) return { name: "En evaluación", border: "var(--hairline)", bg: "var(--surface)" }
  if (gen >= 90) return { name: "Élite", border: "var(--primary)", bg: "var(--primary-tint)" }
  if (gen >= 80) return { name: "Oro", border: "var(--warning-solid)", bg: "var(--warning-tint)" }
  if (gen >= 65) return { name: "Plata", border: "var(--border-control)", bg: "var(--surface-sunken)" }
  return { name: "Bronce", border: "var(--accent)", bg: "var(--accent-tint)" }
}

function derive(raw: RawRtc): LeagueRtc {
  const exp = (raw.budget * DAY) / DAYS
  const d1 = (raw.sales / exp) * 100
  const d2 = ((raw.sales / DAY) * DAYS) / raw.budget * 100
  const tier = tierOf(raw.gen)
  const form = FORM[raw.form]
  const chgLabel = raw.chg > 0 ? `↑${raw.chg}` : raw.chg < 0 ? `↓${Math.abs(raw.chg)}` : "="
  const chgFg = raw.chg > 0 ? "var(--success)" : raw.chg < 0 ? "var(--danger)" : "var(--ink-tertiary)"
  const attrs = raw.a
    ? raw.a.map((v, i) => ({ k: ATTR[i][0], n: ATTR[i][1], v: String(v) }))
    : ATTR.map(([k, n]) => ({ k, n, v: "—" }))

  return {
    ...raw,
    zoneName: ZONE_NAMES[raw.z] || raw.z,
    initials: raw.name
      .split(" ")
      .map((w) => w[0])
      .join(""),
    tierName: tier.name,
    tierBorder: tier.border,
    tierBg: tier.bg,
    formWord: form[0],
    formFg: form[1],
    chgLabel,
    chgFg,
    genLabel: raw.gen == null ? "—" : String(raw.gen),
    ven: raw.a ? String(raw.a[0]) : "—",
    con: raw.a ? String(raw.a[1]) : "—",
    act: raw.a ? String(raw.a[2]) : "—",
    cobA: raw.a ? String(raw.a[3]) : "—",
    attrs,
    d1Pct: d1,
    d1Label: pct(d1),
    d2Label: pct(d2),
    effLabel: pct(raw.eff),
    verifLabel: pct(raw.verif),
    cobLabel: pct(raw.cob),
    toCatchLabel: money(Math.max(0, exp - raw.sales)),
  }
}

export const LEAGUE_RTCS: LeagueRtc[] = RAW.map(derive)

export const LEAGUE_BY_ID = Object.fromEntries(LEAGUE_RTCS.map((r) => [r.id, r])) as Record<string, LeagueRtc>

export const LEAGUE_BADGES = [
  { badge: "Goleador", name: "Esteban Posada", why: "Más ventas del mes" },
  { badge: "MVP", name: "Esteban Posada", why: "Mayor GEN · 92" },
  { badge: "Mejora del mes", name: "Daniela Vargas", why: "Subió 6 puntos de GEN" },
  { badge: "Muro", name: "Mariana López", why: "100 % de visitas verificadas" },
  { badge: "Racha", name: "Valentina Cano", why: "4 semanas con la programación a tiempo" },
]

const BOTTOM_ACTIONS = [
  "Revisar con él los clientes con potencial de horizonte corto",
  "Acompañarlo en 2 visitas de presentación de producto",
  "Exigir programación semanal",
  " clientes sin visita en 30 días · asignar visitas",
  "Revisar las discrepancias del mes con él",
  "Asignar 3 prospectos de su zona",
]

export function leaderZoneScope(): string[] {
  return ["ori", "eje"]
}

export function rankedLeague(scopeRtcIds?: Set<string>, zoneFilter?: string) {
  const ranked = LEAGUE_RTCS.slice().sort((a, b) => (b.gen ?? -1) - (a.gen ?? -1))
  const filtered = ranked
    .filter((r) => !scopeRtcIds || scopeRtcIds.has(r.id))
    .filter((r) => !zoneFilter || zoneFilter === "all" || r.z === zoneFilter)
  let pos = 0
  return filtered.map((r) => {
    if (r.gen != null) pos += 1
    return { ...r, pos: r.gen == null ? "—" : String(pos) }
  })
}

export function bottomThird(rows: LeagueRtc[]) {
  const graded = rows.filter((r) => r.gen != null && r.a)
  const slice = graded.slice(Math.ceil((graded.length * 2) / 3))
  return slice.map((r) => {
    const lo = r.a!.indexOf(Math.min(...r.a!))
    const act = BOTTOM_ACTIONS[lo].includes("clientes")
      ? `${r.stale}${BOTTOM_ACTIONS[lo]}`
      : BOTTOM_ACTIONS[lo]
    return { name: r.name, attr: ATTR[lo][0], value: String(r.a![lo]), action: act }
  })
}

export function zoneAverageAttrs(rtcId: string): number[] {
  const rtc = LEAGUE_BY_ID[rtcId]
  if (!rtc) return [0, 0, 0, 0, 0, 0]
  const peers = LEAGUE_RTCS.filter((r) => r.z === rtc.z && r.a)
  return ATTR.map((_, i) => Math.round(peers.reduce((t, r) => t + r.a![i], 0) / peers.length))
}

export function idealPitch() {
  return ATTR.map(([k, n], i) => {
    const best = LEAGUE_RTCS.filter((r) => r.a)
      .slice()
      .sort((a, b) => b.a![i] - a.a![i])[0]
    return {
      k,
      n,
      name: best.name,
      value: best.a![i],
      gen: best.genLabel,
      zone: best.zoneName,
      border: best.tierBorder,
      bg: best.tierBg,
    }
  })
}

export function pitchRows() {
  const pitch = idealPitch()
  return [pitch.slice(0, 1), pitch.slice(1, 3), pitch.slice(3, 6)]
}

export function attrCompareTable(rtc: LeagueRtc, compareVals: number[], compareName: string) {
  const aVals = rtc.a || [0, 0, 0, 0, 0, 0]
  const ind = [
    [`D1 ${rtc.d1Label} · D2 ${rtc.d2Label}`, `Te faltan ${rtc.toCatchLabel} para ponerte al día`],
    [`C1 ${rtc.effLabel} · C5 ${money(rtc.sales / rtc.visits)} por visita`, "Lleva la cotización impresa a las visitas de seguimiento"],
    [`A6 ${Math.round((rtc.visits / ((rtc.vt * DAY) / DAYS)) * 100)} % de la zona · A3 92 %`, "Mantén 3 visitas antes del mediodía"],
    [`B1 ${rtc.cobLabel} · B5 60 %`, `${rtc.stale} clientes sin visita en 30 días`],
    [`E1 ${rtc.verifLabel} · E3 88 %`, "Agrega al menos una foto en cada cierre"],
    [`B4 ${rtc.nuevos} nuevos · D7 41 %`, "Ofrece Trichobiol a los clientes de aguacate que usan Bacillus genérico"],
  ]
  return ATTR.map(([k, n], i) => {
    const a = aVals[i]
    const b = compareVals[i]
    const d = a - b
    return {
      k,
      n,
      a: rtc.a ? String(a) : "—",
      b: String(b),
      diff: rtc.a ? (d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : "0") : "—",
      diffFg: d > 0 ? "var(--success)" : d < 0 ? "var(--danger)" : "var(--ink-secondary)",
      indicators: ind[i][0],
      action: ind[i][1],
      compareName,
    }
  })
}

export function compareOptions() {
  return LEAGUE_RTCS.filter((r) => r.a).map((r) => ({ id: r.id, name: r.name }))
}
