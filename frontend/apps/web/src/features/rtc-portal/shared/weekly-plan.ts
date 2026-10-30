type Item = {
  id: string
  client_name: string
  planned_date: string
  slot: string
  reason: string
  objective: string
}

type Plan = {
  id: string
  status: string
  is_late: boolean
  editable: boolean
  review_note: string
  items: Item[]
}

export type WeeklyPlanCurrent = {
  required: boolean
  reason: string
  reminder: string | null
  iso_week: number
  week_start: string
  week_end: string
  deadline_at: string
  plan: Plan | null
}

export const PLAN_SLOT: Record<string, string> = { MANANA: "Mañana", TARDE: "Tarde", DIA: "Día" }

export const PLAN_STATUS: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  APROBADA: "Enviada",
  DEVUELTA: "Devuelta",
}

export function planNotice(current: WeeklyPlanCurrent | null) {
  if (!current?.required || (current.plan && !current.plan.editable && current.plan.status !== "DEVUELTA")) return ""
  if (current.plan?.status === "DEVUELTA") {
    return current.plan.review_note ? `Te la devolvieron: ${current.plan.review_note}` : "Te devolvieron la programación."
  }
  if (current.reminder === "vencido") return "El plazo ya pasó. Si la envías, queda tarde."
  if (current.reminder === "2h") return "Te quedan menos de 2 horas para enviar la programación."
  if (current.reminder === "24h") return "El plazo de la programación vence en menos de un día."
  return current.reason ? `Te piden la programación: ${current.reason}` : "Te piden la programación de la semana."
}

export function planBannerLine(current: WeeklyPlanCurrent | null) {
  if (!current?.required) return null
  const notice = planNotice(current)
  if (!notice && current.plan && !current.plan.editable) return null
  const week = current.week_start
  return {
    weekLabel: current.iso_week,
    deadline: current.deadline_at,
    notice: notice || `Envía tu programación de la semana del ${week} antes del plazo.`,
  }
}
