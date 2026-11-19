import { useCallback, useEffect, useMemo, useState } from "react"
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
import { mapsUrl } from "./shared/maps"
import { RescheduleSheet, type RescheduleTarget } from "./shared/RescheduleSheet"
import { planBannerLine, type WeeklyPlanCurrent } from "./shared/weekly-plan"
import { useToast } from "../shared/useToast"

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
  latitude?: number | null
  longitude?: number | null
  reschedule_count?: number
}

type RescheduleStats = {
  month_key: string
  threshold: number
  mine: { count: number; alert: boolean }
}

const DONE = new Set(["REALIZADA", "NO_REALIZADA"])
const OPEN = new Set(["PROGRAMADA", "EN_CURSO", "ATRASADA"])

function cardStatus(row: VisitRow): VisitStatus {
  if (row.late && row.status === "PROGRAMADA") return "ATRASADA"
  return row.status as VisitStatus
}

export function MisNumerosPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const toast = useToast()
  const [today, setToday] = useState<VisitRow[]>([])
  const [weekDone, setWeekDone] = useState(0)
  const [weekTotal, setWeekTotal] = useState(0)
  const [plan, setPlan] = useState<WeeklyPlanCurrent | null>(null)
  const [error, setError] = useState("")
  const [reschedule, setReschedule] = useState<RescheduleTarget | null>(null)
  const [stats, setStats] = useState<RescheduleStats | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadToday = useCallback(() => {
    const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
    return api<{ results: VisitRow[] }>(`/api/v1/visits/agenda?date=${day}&view=today`)
      .then((data) => setToday(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la agenda"))
  }, [])

  const loadStats = useCallback(() => {
    api<RescheduleStats>("/api/v1/visits/reschedule-stats")
      .then(setStats)
      .catch(() => setStats(null))
  }, [])

  useEffect(() => {
    loadToday()
    loadStats()
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
  }, [loadToday, loadStats])

  const nextVisit = useMemo(
    () => today.find((v) => v.status === "PROGRAMADA" || v.status === "EN_CURSO") ?? today[0],
    [today],
  )

  const tasks = useMemo(
    () =>
      today
        .filter((v) => v.status === "PROGRAMADA" || v.status === "EN_CURSO" || v.late)
        .slice(0, 6)
        .map((v) => ({
          id: v.id,
          title: v.reason ? `${v.reason} · ${v.client_name}` : `Visita · ${v.client_name}`,
          client: v.municipality,
          late: v.late,
          clientId: v.client_id,
        })),
    [today],
  )

  const [kpi, setKpi] = useState<{
    sales: number
    budget: number
    expected: number
    falta: number
    gen: number | null
    rank_zone: number | null
    zone_size?: number
  } | null>(null)

  useEffect(() => {
    api<{
      sales: number
      budget: number
      expected: number
      falta: number
      gen: number | null
      rank_zone: number | null
      zone_size?: number
    }>("/api/v1/metrics/my-numbers")
      .then(setKpi)
      .catch(() => setKpi(null))
  }, [])

  async function markDone(visit: VisitRow) {
    if (!window.confirm(`¿Marcar la visita a ${visit.client_name} como realizada?`)) return
    setBusyId(visit.id)
    try {
      await api(`/api/v1/visits/${visit.id}/close`, {
        method: "POST",
        body: JSON.stringify({
          result: "SEGUIMIENTO_PROGRAMADO",
          products: [],
          notes: "Cierre rápido desde Mis números",
          gps: { error: "POSITION_UNAVAILABLE", capture_mode: "ONLINE" },
        }),
      })
      toast.show("Visita marcada como realizada", "success")
      await loadToday()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "No se pudo cerrar la visita", "danger")
    } finally {
      setBusyId(null)
    }
  }

  const banner = planBannerLine(plan)
  const now = new Date()
  const day = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const sales = kpi?.sales ?? 0
  const budget = kpi?.budget ?? 0
  const expected = kpi?.expected ?? budget * (day / daysInMonth)
  const weekTarget = Math.max(weekTotal, 15)
  const weekExpected = Math.round(weekTarget * (day / 7))
  const dailyNeed = Format.money(Math.max(0, (budget - sales) / Math.max(1, daysInMonth - day + 1)))
  const lateTasks = tasks.filter((t) => t.late).length
  const nextOpen = nextVisit && OPEN.has(cardStatus(nextVisit))

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

      {stats && stats.mine.count > 0 ? (
        <div
          className={stats.mine.alert ? "nc-portal-reschedule-alert" : "nc-portal-banner"}
          role="status"
        >
          <Icon name="calendar" />
          <span>
            Reagendamientos este mes:{" "}
            <strong>
              {stats.mine.count} / {stats.threshold}
            </strong>
            {stats.mine.alert ? " · Umbral superado: líder y gerencia ya lo ven." : null}
          </span>
        </div>
      ) : null}

      {error ? <p className="nc-note">{error}</p> : null}

      <div className="nc-portal-metrics">
        <Link to="/portal/forecast" className="nc-portal-metric-link" aria-label="Ir a Mi forecast">
          <ComplianceMeter
            label="Ventas del mes"
            value={sales}
            target={budget}
            expected={expected}
            hint={Format.money(sales)}
          />
        </Link>
        <Link to="/portal/agenda" className="nc-portal-metric-link" aria-label="Ir a Agenda">
          <ComplianceMeter
            label="Visitas de la semana"
            unit="number"
            value={weekDone}
            target={weekTarget}
            expected={weekExpected}
            hint={`${weekDone} de ${weekTarget}`}
          />
        </Link>
        <Link to="/portal/forecast" className="nc-portal-metric-link" aria-label="Ir a meta diaria">
          <StatTile
            label="Meta diaria"
            value={dailyNeed}
            caption={`Te faltan ${Format.money(budget - sales)} para la meta`}
          />
        </Link>
      </div>

      <div className="nc-portal-split">
        <section className="nc-portal-card">
          <div className="nc-portal-card-head">
            <h2>Agenda de hoy</h2>
            <span className="nc-portal-muted">
              {tasks.length} visita{tasks.length === 1 ? "" : "s"} · {lateTasks} atrasada{lateTasks === 1 ? "" : "s"}
            </span>
          </div>
          {tasks.length === 0 ? (
            <p className="nc-portal-muted">No tienes visitas abiertas para hoy.</p>
          ) : (
            <ul className="nc-portal-task-list">
              {tasks.map((task) => (
                <li key={task.id} className="nc-portal-task">
                  <div>
                    <span className="nc-portal-task-title">{task.title}</span>
                    <span className="nc-portal-muted">{task.client}</span>
                  </div>
                  {task.late ? <Badge tone="warning">Atrasada</Badge> : null}
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => window.location.assign(`/portal/clientes/${task.clientId}`)}
                  >
                    Abrir
                  </Button>
                </li>
              ))}
            </ul>
          )}
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
              mapsUrl={mapsUrl(nextVisit)}
              onClick={() => {
                if (nextVisit.client_id) window.location.assign(`/portal/clientes/${nextVisit.client_id}`)
              }}
              actions={
                nextOpen ? (
                  <>
                    <Button
                      variant="primary"
                      type="button"
                      onClick={() => window.location.assign(`/portal/visitas/${nextVisit.id}`)}
                    >
                      Registrar visita
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() =>
                        setReschedule({
                          id: nextVisit.id,
                          client_name: nextVisit.client_name,
                          scheduled_start: nextVisit.scheduled_start,
                        })
                      }
                    >
                      Reprogramar
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      disabled={busyId === nextVisit.id}
                      onClick={() => markDone(nextVisit)}
                    >
                      Cierre rápido
                    </Button>
                  </>
                ) : null
              }
            />
          ) : (
            <p className="nc-portal-muted">No tienes visitas programadas para hoy.</p>
          )}

          <div className="nc-portal-mini-card">
            <span className="nc-portal-gen">{kpi?.gen ?? "—"}</span>
            <div className="nc-portal-mini-body">
              <span className="nc-portal-task-title">
                {kpi?.rank_zone
                  ? `GEN ${kpi.gen ?? "—"} · puesto ${kpi.rank_zone}${kpi.zone_size ? ` de ${kpi.zone_size}` : ""}`
                  : "Tu carta de liga"}
              </span>
              <span className="nc-portal-muted">Liga {user.zone_id ? "de tu zona" : "Oriente antioqueño"}</span>
            </div>
            <Link className="nc-text-link" to="/portal/micarta">
              Ver carta
            </Link>
          </div>
        </div>
      </div>

      <RescheduleSheet
        visit={reschedule}
        onClose={() => setReschedule(null)}
        onDone={(payload) => {
          toast.show(
            payload.stats.alert
              ? `Reprogramada. Llevas ${payload.stats.month_count} reagendamientos (umbral ${payload.stats.threshold}).`
              : "Visita reprogramada",
            payload.stats.alert ? "warning" : "success",
          )
          loadToday()
          loadStats()
        }}
      />
      {toast.node}
    </PortalPage>
  )
}
