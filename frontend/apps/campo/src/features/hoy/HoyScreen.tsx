import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useOutletContext } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Button, ComplianceMeter, Format, Icon, SyncBanner, VisitCard, type VisitStatus } from "@nc/ui"
import { useOutbox } from "../../offline"
import { planNotice, type Current } from "../../programacion"
import { agendaDayParam, campoDayLabel, userInitials, visitClock } from "../shared/campo-format"

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

function visitCardStatus(row: VisitRow): VisitStatus {
  if (row.late && row.status === "PROGRAMADA") return "ATRASADA"
  return row.status as VisitStatus
}

function planDeadlineLine(current: Current | null) {
  if (!current?.deadline_at) return ""
  const when = new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(current.deadline_at))
  return `Vence ${when}`
}

export function HoyScreen() {
  const { user } = useOutletContext<{ user: SessionUser }>()
  const navigate = useNavigate()
  const [rows, setRows] = useState<VisitRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState("")
  const [plan, setPlan] = useState<Current | null>(null)
  const { pending, offline, syncing, syncNow } = useOutbox()

  useEffect(() => {
    const day = agendaDayParam()
    setLoaded(false)
    api<{ results: VisitRow[] }>(`/api/v1/visits/agenda?date=${day}&view=today`)
      .then((data) => setRows(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la agenda"))
      .finally(() => setLoaded(true))
    api<Current>("/api/v1/weekly-plans/current").then(setPlan).catch(() => setPlan(null))
  }, [])

  const done = useMemo(() => rows.filter((v) => DONE.has(v.status)).length, [rows])
  const doneLabel = `${done} de ${rows.length} visitas`
  const planPending = Boolean(user.requires_weekly_plan) || Boolean(planNotice(plan))
  const notice = planNotice(plan)

  const month = new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: "America/Bogota" }).format(new Date())
  const sales = 31_200_000
  const budget = 34_000_000
  const day = new Date().getDate()
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const expected = budget * (day / daysInMonth)
  const falta = budget - sales

  return (
    <>
      <header className="nc-campo-head">
        <div className="nc-campo-head-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nc-campo-eyebrow">
              {campoDayLabel()} · {doneLabel}
            </div>
            <h1>Hoy</h1>
          </div>
          <span className="nc-campo-avatar" aria-hidden="true">
            {userInitials(user.first_name, user.last_name)}
          </span>
        </div>
      </header>

      <section className="nc-campo-page">
        {offline || syncing ? (
          <SyncBanner
            state={syncing ? "syncing" : "offline"}
            pending={pending}
            onRetry={() => navigate("/sincronizacion")}
          />
        ) : null}
        {!offline && pending > 0 && !syncing ? (
          <p className="nc-kicker" style={{ marginTop: "var(--space-2)" }}>
            <button type="button" className="nc-campo-link-row" onClick={() => void syncNow()}>
              Sincronizar ahora
            </button>
          </p>
        ) : null}

        <ComplianceMeter
          label={`Ventas de ${month}`}
          value={sales}
          target={budget}
          expected={expected}
          hint={`Te faltan ${Format.money(falta)}`}
        />

        {planPending && notice ? (
          <Link to="/programacion" className="nc-campo-plan-btn">
            <Icon name="calendar" />
            <span className="nc-campo-plan-copy">
              <strong>Envía tu programación semanal</strong>
              <small>{planDeadlineLine(plan) || notice}</small>
            </span>
            <Icon name="chevronRight" />
          </Link>
        ) : null}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 className="nc-campo-section-title">Agenda de hoy</h2>
          <span className="nc-campo-section-meta">{doneLabel}</span>
        </div>

        {error ? <p className="nc-note">{error}</p> : null}
        {!loaded ? <p className="nc-kicker">Cargando…</p> : null}
        {loaded && rows.length === 0 ? <p className="nc-kicker">No tienes visitas agendadas para hoy.</p> : null}
        {rows.map((visit) => (
          <VisitCard
            key={visit.id}
            client={visit.client_name}
            site={visit.site}
            municipality={visit.municipality}
            time={visitClock(visit.scheduled_start)}
            duration={visit.scheduled_start ? "60 min" : undefined}
            status={visitCardStatus(visit)}
            reason={visit.reason || undefined}
            onClick={() => navigate(`/visitas/${visit.id}`)}
          />
        ))}

        <Button variant="outline" icon="plus" block onClick={() => navigate("/clientes")}>
          Registrar visita sin agendar
        </Button>
      </section>
    </>
  )
}
