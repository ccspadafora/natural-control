import type { LeagueForm, LeaguePlayerApi } from "./leagueTypes"

export const ATTR = [
  ["VEN", "Ventas"],
  ["CON", "Conversión"],
  ["ACT", "Actividad"],
  ["COB", "Cobertura"],
  ["CNF", "Confiabilidad"],
  ["DES", "Desarrollo"],
] as const

const FORM_FG: Record<LeagueForm, string> = {
  up: "var(--success)",
  flat: "var(--ink-secondary)",
  down: "var(--danger)",
}

function pct(value: number) {
  return `${Math.round(value)} %`
}

function money(value: number) {
  const digits = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(value))
  return `$ ${digits}`
}

export type LeagueRtc = {
  id: string
  slug: string
  name: string
  z: string
  zoneName: string
  initials: string
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
  pos?: string
}

export function mapPlayer(row: LeaguePlayerApi, pos?: number | null): LeagueRtc {
  const form = (row.form || "flat") as LeagueForm
  const chg = row.chg || 0
  const a = row.attributes_scores
  const attrs = a
    ? a.map((v, i) => ({ k: ATTR[i][0], n: ATTR[i][1], v: String(v) }))
    : ATTR.map(([k, n]) => ({ k, n, v: "—" }))

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    z: row.zone_code,
    zoneName: row.zone_name,
    initials: row.initials,
    sales: row.sales,
    budget: row.budget,
    visits: row.visits,
    vt: row.visits_target,
    verif: Number(row.verif ?? 0),
    nuevos: Number(row.nuevos ?? 0),
    pot: Number(row.pot ?? 0),
    conc: Number(row.conc ?? 0),
    cob: Number(row.cob ?? 0),
    eff: Number(row.eff ?? 0),
    stale: Number(row.stale ?? 0),
    gen: row.gen,
    a,
    form,
    chg,
    erp: row.erp,
    tierName: row.tier_name,
    tierBorder: row.tier_border,
    tierBg: row.tier_bg,
    formWord: row.form_word,
    formFg: FORM_FG[form],
    chgLabel: chg > 0 ? `↑${chg}` : chg < 0 ? `↓${Math.abs(chg)}` : "=",
    chgFg: chg > 0 ? "var(--success)" : chg < 0 ? "var(--danger)" : "var(--ink-tertiary)",
    genLabel: row.gen == null ? "—" : String(row.gen),
    ven: a ? String(a[0]) : "—",
    con: a ? String(a[1]) : "—",
    act: a ? String(a[2]) : "—",
    cobA: a ? String(a[3]) : "—",
    attrs,
    d1Pct: row.d1_pct ?? 0,
    d1Label: row.d1_pct == null ? "—" : pct(row.d1_pct),
    d2Label: row.d2_pct == null ? "—" : pct(row.d2_pct),
    effLabel: pct(Number(row.eff ?? 0)),
    verifLabel: pct(Number(row.verif ?? 0)),
    cobLabel: pct(Number(row.cob ?? 0)),
    toCatchLabel: money(row.falta || 0),
    pos: pos == null && row.pos == null ? "—" : String(pos ?? row.pos),
  }
}

export function attrCompareTable(rtc: LeagueRtc, compareVals: number[], compareName: string, day: number, days: number) {
  const aVals = rtc.a || [0, 0, 0, 0, 0, 0]
  const ind = [
    [`D1 ${rtc.d1Label} · D2 ${rtc.d2Label}`, `Te faltan ${rtc.toCatchLabel} para ponerte al día`],
    [`C1 ${rtc.effLabel} · C5 ${money(rtc.visits ? rtc.sales / rtc.visits : 0)} por visita`, "Lleva la cotización impresa a las visitas de seguimiento"],
    [`A6 ${Math.round((rtc.visits / ((rtc.vt * day) / days || 1)) * 100)} % de la zona · A3 92 %`, "Mantén 3 visitas antes del mediodía"],
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

export function periodEyebrow(periodStart: string, day: number) {
  const d = new Date(`${periodStart}T12:00:00`)
  const month = d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} · día ${day} · GEN de 0 a 99`
}
