import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useOutletContext } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Button, ComplianceMeter, Format, Icon, SyncBanner, VisitCard, type VisitStatus } from "@nc/ui"
import { isOfflineMode, listCachedVisitsForDay, useOutbox } from "../../offline"
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
  const { pending, offline, syncing } = useOutbox()

  useEffect(() => {
    const day = agendaDayParam()
    let alive = true
    setLoaded(false)

    async function load() {
      if (isOfflineMode()) {
        const cached = (await listCachedVisitsForDay(day)) as VisitRow[]
        if (!alive) return
        setRows(cached)
        setError(cached.length ? "" : "Sin datos locales para hoy. Conéctate para sincronizar.")
        setLoaded(true)
        return
      }
      try {
        const data = await api<{ results: VisitRow[] }>(`/api/v1/visits/agenda?date=${day}&view=today`)
        if (!alive) return
        setRows(data.results)
        setError("")
      } catch (err) {
        const cached = (await listCachedVisitsForDay(day)) as VisitRow[]
        if (!alive) return
        if (cached.length) {
          setRows(cached)
          setError("Mostrando agenda en caché (sin conexión con el servidor).")
        } else {
          setError(err instanceof Error ? err.message : "No se pudo cargar la agenda")
        }
      } finally {
        if (alive) setLoaded(true)
      }
    }

    void load()
    api<Current>("/api/v1/weekly-plans/current").then(setPlan).catch(() => setPlan(null))
    return () => {
      alive = false
    }
  }, [])

  const done = useMemo(() => rows.filter((v) => DONE.has(v.status)).length, [rows])
  const doneLabel = `${done} de ${rows.length} visitas`
  const planPending = Boolean(user.requires_weekly_plan) || Boolean(planNotice(plan))
  const notice = planNotice(plan)

  const [kpi, setKpi] = useState<{ sales: number; budget: number; expected: number; falta: number } | null>(null)
  useEffect(() => {
    api<{ sales: number; budget: number; expected: number; falta: number }>("/api/v1/metrics/my-numbers")
      .then((data) =>
        setKpi({
          sales: data.sales,
          budget: data.budget,
          expected: data.expected,
          falta: data.falta,
        }),
      )
      .catch(() => setKpi(null))
  }, [])

  const monthRaw = new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: "America/Bogota" }).format(new Date())
  const month = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1)
  const sales = kpi?.sales ?? 0
  const budget = kpi?.budget ?? 0
  const expected = kpi?.expected ?? 0
  const falta = kpi?.falta ?? 0
  const showSync = offline || syncing || pending > 0

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

      {showSync ? (
        <SyncBanner
          state={syncing ? "syncing" : offline ? "offline" : "error"}
          pending={pending}
          onRetry={() => navigate("/sincronizacion")}
        />
      ) : null}

      <section className="nc-campo-page">
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
        {loaded && rows.length === 0 ? (
          <div className="nc-campo-empty">
            <p className="nc-campo-section-title" style={{ margin: 0 }}>
              Sin visitas hoy
            </p>
            <p className="nc-campo-section-meta" style={{ margin: 0 }}>
              Agenda desde un cliente o registra una visita sin agendar.
            </p>
          </div>
        ) : null}
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
