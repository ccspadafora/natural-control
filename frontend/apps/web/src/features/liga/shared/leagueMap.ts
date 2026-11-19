import type { LeagueForm, LeaguePlayerApi } from "./leagueTypes"

export const ATTR = [
  ["VEN", "Ventas"],
  ["CON", "Conversión"],
  ["ACT", "Actividad"],
  ["COB", "Cobertura"],
  ["CNF", "Confiabilidad"],
  ["DES", "Desarrollo"],
] as const

/** Qué mide cada atributo + consejo accionable para el RTC. */
export const ATTR_COACH = [
  {
    meaning: "Avance de ventas vs tu presupuesto del mes.",
    tipLow: "Esta semana cierra 2 pedidos o cotizaciones de horizonte corto que ya tengas abiertas.",
    tipOk: "Sigue empujando el forecast corto: revisa diariamente qué falta para llegar al presupuesto.",
  },
  {
    meaning: "Qué tanto conviertes visitas y cotizaciones en negocio.",
    tipLow: "Lleva la cotización impresa y pide fecha de decisión en cada seguimiento.",
    tipOk: "Mantén el cierre: confirma pedido el mismo día que el cliente dice que sí.",
  },
  {
    meaning: "Ritmo de visitas frente a tu meta semanal/mensual.",
    tipLow: "Programa al menos 3 visitas antes del mediodía y cumple la programación semanal.",
    tipOk: "Buen ritmo: no dejes huecos en la agenda de la próxima semana.",
  },
  {
    meaning: "Qué tan recorrida tienes tu cartera (clientes visitados a tiempo).",
    tipLow: "Prioriza clientes sin visita en 30 días y agenda al menos 5 esta semana.",
    tipOk: "Cartera al día: rota los municipios más flojos para no concentrarte en los mismos.",
  },
  {
    meaning: "Calidad del registro: GPS, fotos y datos al cerrar visitas.",
    tipLow: "Cierra cada visita con ubicación y al menos una foto; evita “continuar sin GPS” salvo excepción.",
    tipOk: "Sigue registrando bien: una foto clara y nota concreta ayudan a tu líder.",
  },
  {
    meaning: "Clientes nuevos y potencial que estás abriendo en la zona.",
    tipLow: "Agenda 3 prospectos nuevos esta semana y ofréceles un producto de entrada.",
    tipOk: "Buen desarrollo: convierte 1 prospecto de la lista en cotización esta semana.",
  },
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
  const pace = Math.round((rtc.visits / ((rtc.vt * day) / days || 1)) * 100)
  const ind = [
    `Presupuesto: D1 ${rtc.d1Label} · D2 ${rtc.d2Label} · te faltan ${rtc.toCatchLabel}`,
    `Cierre: eficiencia ${rtc.effLabel} · ${money(rtc.visits ? rtc.sales / rtc.visits : 0)} por visita`,
    `Visitas: ${rtc.visits} de ${rtc.vt} meta · ritmo ${Number.isFinite(pace) ? pace : 0} %`,
    `Cartera: cobertura ${rtc.cobLabel} · ${rtc.stale} sin visita en 30 días`,
    `Registro: GPS/verif ${rtc.verifLabel}`,
    `Pipeline: ${rtc.nuevos} clientes nuevos este periodo`,
  ]
  return ATTR.map(([k, n], i) => {
    const a = aVals[i]
    const b = compareVals[i]
    const d = a - b
    const coach = ATTR_COACH[i]
    const behind = !rtc.a || a < b || a < 80
    return {
      k,
      n,
      meaning: coach.meaning,
      a: rtc.a ? String(a) : "—",
      b: String(b),
      diff: rtc.a ? (d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : "0") : "—",
      diffFg: d > 0 ? "var(--success)" : d < 0 ? "var(--danger)" : "var(--ink-secondary)",
      indicators: ind[i],
      action: behind ? coach.tipLow : coach.tipOk,
      compareName,
      behind,
    }
  })
}

export function periodEyebrow(periodStart: string, day: number) {
  const d = new Date(`${periodStart}T12:00:00`)
  const month = d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} · día ${day} · GEN de 0 a 99`
}
