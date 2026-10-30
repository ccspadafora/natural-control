import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, ComplianceMeter, Format, Icon, StatTile, VisitCard, type VisitStatus } from "@nc/ui"
import { PortalPage } from "./PortalPage"
import {
  greeting,
  planDeadline,
  planWeekRange,
  portalMonthEyebrow,
  visitClock,
  weekDayParams,
} from "./shared/format"
import { planBannerLine, type WeeklyPlanCurrent } from "./shared/weekly-plan"

type VisitRow = {
  id: string
  client_id: string
  client_name: string
  municipality: string
  site?: string
  status: string
  reason: string
  scheduled_start: string | null
  late: boolean
}

const DONE = new Set(["REALIZADA", "NO_REALIZADA"])

function cardStatus(row: VisitRow): VisitStatus {
  if (row.late && row.status === "PROGRAMADA") return "ATRASADA"
  return row.status as VisitStatus
}

const TASKS = [
  { id: "1", title: "Confirmar pedido con Agrícola San José", client: "Marinilla", late: false },
  { id: "2", title: "Enviar cotización a Flores del Oriente", client: "El Carmen de Viboral", late: true },
  { id: "3", title: "Revisar muestra en Hortalizas El Retiro", client: "El Retiro", late: false },
]

export function MisNumerosPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [today, setToday] = useState<VisitRow[]>([])
  const [weekDone, setWeekDone] = useState(0)
  const [weekTotal, setWeekTotal] = useState(0)
  const [plan, setPlan] = useState<WeeklyPlanCurrent | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
    api<{ results: VisitRow[] }>(`/api/v1/visits/agenda?date=${day}&view=today`)
      .then((data) => setToday(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la agenda"))
    api<WeeklyPlanCurrent>("/api/v1/weekly-plans/current")
      .then(setPlan)
      .catch(() => setPlan(null))

    const days = weekDayParams()
    Promise.all(
      days.map((d) =>
        api<{ results: VisitRow[] }>(`/api/v1/visits/agenda?date=${d}&view=today`).then((r) => r.results),
      ),
    )
      .then((chunks) => {
        const all = chunks.flat()
        setWeekTotal(all.filter((v) => !DONE.has(v.status)).length + all.filter((v) => v.status === "REALIZADA").length)
        setWeekDone(all.filter((v) => v.status === "REALIZADA").length)
      })
      .catch(() => {
        setWeekDone(0)
        setWeekTotal(0)
      })
  }, [])

  const nextVisit = useMemo(
    () => today.find((v) => v.status === "PROGRAMADA" || v.status === "EN_CURSO") ?? today[0],
    [today],
  )

  const banner = planBannerLine(plan)
  const now = new Date()
  const day = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const sales = 31_200_000
  const budget = 34_000_000
  const expected = budget * (day / daysInMonth)
  const weekTarget = Math.max(weekTotal, 15)
  const weekExpected = Math.round(weekTarget * (day / 7))
  const dailyNeed = Format.money(Math.max(0, (budget - sales) / Math.max(1, daysInMonth - day + 1)))
  const lateTasks = TASKS.filter((t) => t.late).length

  return (
    <PortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-hero">
        <span className="nc-portal-eyebrow">{portalMonthEyebrow()}</span>
        <h1>{greeting(user.first_name)}</h1>
      </header>

      {banner ? (
        <div className="nc-portal-banner" role="status">
          <Icon name="calendar" />
          <span className="nc-portal-banner-text">
            Envía tu programación de la semana del {planWeekRange(plan!.week_start, plan!.week_end)} antes del{" "}
            {planDeadline(plan!.deadline_at)}.
          </span>
          <Link className="nc-btn nc-btn-secondary" to="/portal/programacion">
            Armar programación
          </Link>
        </div>
      ) : null}

      {error ? <p className="nc-note">{error}</p> : null}

      <div className="nc-portal-metrics">
        <ComplianceMeter label="Ventas del mes" value={sales} target={budget} expected={expected} hint={Format.money(sales)} />
        <ComplianceMeter
          label="Visitas de la semana"
          unit="number"
          value={weekDone}
          target={weekTarget}
          expected={weekExpected}
          hint={`${weekDone} de ${weekTarget}`}
        />
        <StatTile label="Meta diaria" value={dailyNeed} caption={`Te faltan ${Format.money(budget - sales)} para la meta`} />
      </div>

      <div className="nc-portal-split">
        <section className="nc-portal-card">
          <div className="nc-portal-card-head">
            <h2>Tareas de hoy</h2>
            <span className="nc-portal-muted">
              {TASKS.length} tareas · {lateTasks} atrasada{lateTasks === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="nc-portal-task-list">
            {TASKS.map((task) => (
              <li key={task.id} className="nc-portal-task">
                <div>
                  <span className="nc-portal-task-title">{task.title}</span>
                  <span className="nc-portal-muted">{task.client}</span>
                </div>
                {task.late ? <Badge tone="warning">Atrasada</Badge> : null}
                <Button variant="outline" icon="check" type="button" disabled>
                  Marcar hecha
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <div className="nc-portal-stack nc-portal-stack-tight">
          <div className="nc-portal-card-head">
            <h2>Tu próxima visita</h2>
            <Link className="nc-text-link" to="/portal/agenda">
              Ver agenda
            </Link>
          </div>
          {nextVisit ? (
            <VisitCard
              time={visitClock(nextVisit.scheduled_start)}
              client={nextVisit.client_name}
              site={nextVisit.site}
              municipality={nextVisit.municipality}
              status={cardStatus(nextVisit)}
              reason={nextVisit.reason}
              onClick={() => {
                if (nextVisit.client_id) window.location.assign(`/portal/clientes/${nextVisit.client_id}`)
              }}
            />
          ) : (
            <p className="nc-portal-muted">No tienes visitas programadas para hoy.</p>
          )}

          <div className="nc-portal-mini-card">
            <span className="nc-portal-gen">82</span>
            <div className="nc-portal-mini-body">
              <span className="nc-portal-task-title">Nivel Oro · puesto 3 de 12</span>
              <span className="nc-portal-muted">Liga {user.zone_id ? "de tu zona" : "Oriente antioqueño"} · En racha</span>
            </div>
            <Link className="nc-text-link" to="/portal/micarta">
              Ver carta
            </Link>
          </div>
        </div>
      </div>
    </PortalPage>
  )
}
