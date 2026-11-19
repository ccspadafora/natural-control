import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Button, Tabs, VisitCard, type VisitStatus } from "@nc/ui"
import { AgendaMonthView } from "./AgendaMonthView"
import { AgendaWeekView } from "./AgendaWeekView"
import { PortalPage } from "./PortalPage"
import { agendaDayParam, lateAgo, portalDayLabel, visitClock } from "./shared/format"
import { mapsUrl } from "./shared/maps"
import { RescheduleSheet, type RescheduleTarget } from "./shared/RescheduleSheet"
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
  late_minutes?: number
  latitude?: number | null
  longitude?: number | null
  reschedule_count?: number
}

/** Una sola fila de filtros de contenido (sin segunda capa de pills). */
type ListFilter = "hoy" | "atrasadas" | "pendientes" | "en_curso" | "realizadas"
type ViewMode = "lista" | "semana" | "mes"

type RescheduleStats = {
  month_key: string
  threshold: number
  mine: { count: number; alert: boolean }
}

const OPEN = new Set(["PROGRAMADA", "EN_CURSO", "ATRASADA"])

function cardStatus(row: VisitRow): VisitStatus {
  if (row.late || (row.status === "PROGRAMADA" && row.scheduled_start && new Date(row.scheduled_start).getTime() < Date.now())) {
    return "ATRASADA"
  }
  return row.status as VisitStatus
}

function sortBoard(a: VisitRow, b: VisitRow) {
  const sa = cardStatus(a)
  const sb = cardStatus(b)
  const rank = (s: VisitStatus) => (s === "ATRASADA" ? 0 : s === "EN_CURSO" ? 1 : s === "PROGRAMADA" ? 2 : 3)
  const r = rank(sa) - rank(sb)
  if (r !== 0) return r
  return (a.scheduled_start || "").localeCompare(b.scheduled_start || "")
}

function apiViewFor(filter: ListFilter) {
  if (filter === "hoy") return "today"
  if (filter === "realizadas") return "done"
  return "pending"
}

export function AgendaPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [listFilter, setListFilter] = useState<ListFilter>("hoy")
  const [viewMode, setViewMode] = useState<ViewMode>("lista")
  const [rows, setRows] = useState<VisitRow[]>([])
  const [pendingRows, setPendingRows] = useState<VisitRow[]>([])
  const [counts, setCounts] = useState({ hoy: 0, pendientes: 0, realizadas: 0 })
  const [error, setError] = useState("")
  const [reschedule, setReschedule] = useState<RescheduleTarget | null>(null)
  const [stats, setStats] = useState<RescheduleStats | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const day = agendaDayParam()

  const refreshCounts = useCallback(() => {
    Promise.all([
      api<{ results: VisitRow[] }>(`/api/v1/visits/agenda?date=${day}&view=today`),
      api<{ results: VisitRow[] }>(`/api/v1/visits/agenda?date=${day}&view=pending`),
      api<{ results: VisitRow[] }>(`/api/v1/visits/agenda?date=${day}&view=done`),
    ]).then(([today, pending, done]) => {
      setCounts({ hoy: today.results.length, pendientes: pending.results.length, realizadas: done.results.length })
      setPendingRows(pending.results)
    })
  }, [day])

  const refreshRows = useCallback(() => {
    setError("")
    api<{ results: VisitRow[] }>(`/api/v1/visits/agenda?date=${day}&view=${apiViewFor(listFilter)}`)
      .then((data) => setRows(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la agenda"))
  }, [listFilter, day])

  useEffect(() => {
    refreshCounts()
  }, [refreshCounts])

  useEffect(() => {
    if (viewMode !== "lista") return
    refreshRows()
  }, [refreshRows, viewMode])

  useEffect(() => {
    api<RescheduleStats>("/api/v1/visits/reschedule-stats")
      .then(setStats)
      .catch(() => setStats(null))
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
          notes: "Cierre rápido desde agenda",
          gps: { error: "POSITION_UNAVAILABLE", capture_mode: "ONLINE" },
        }),
      })
      toast.show("Visita marcada como realizada", "success")
      refreshRows()
      refreshCounts()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "No se pudo cerrar la visita", "danger")
    } finally {
      setBusyId(null)
    }
  }

  const pendingBreakdown = useMemo(() => {
    let atrasadas = 0
    let enCurso = 0
    for (const row of pendingRows) {
      const s = cardStatus(row)
      if (s === "ATRASADA") atrasadas += 1
      else if (s === "EN_CURSO") enCurso += 1
    }
    return { atrasadas, enCurso }
  }, [pendingRows])

  const visible = useMemo(() => {
    const filtered = rows.filter((row) => {
      const s = cardStatus(row)
      if (listFilter === "atrasadas") return s === "ATRASADA"
      if (listFilter === "en_curso") return s === "EN_CURSO"
      return true
    })
    return [...filtered].sort(sortBoard)
  }, [rows, listFilter])

  const tabItems = useMemo(
    () => [
      { id: "hoy", label: "Hoy", count: counts.hoy },
      { id: "atrasadas", label: "Atrasadas", count: pendingBreakdown.atrasadas },
      { id: "pendientes", label: "Pendientes", count: counts.pendientes },
      { id: "en_curso", label: "En curso", count: pendingBreakdown.enCurso },
      { id: "realizadas", label: "Realizadas", count: counts.realizadas },
    ],
    [counts, pendingBreakdown],
  )

  return (
    <PortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <span className="nc-portal-eyebrow">{portalDayLabel()}</span>
          <h1>Agenda de visitas</h1>
        </div>
        <div className="nc-agenda-head-actions">
          <div className="nc-agenda-view-toggle" role="group" aria-label="Tipo de vista">
            {(
              [
                ["lista", "Lista"],
                ["semana", "Semana"],
                ["mes", "Mes"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={viewMode === id ? "is-active" : undefined}
                aria-pressed={viewMode === id}
                onClick={() => setViewMode(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <Link className="nc-btn nc-btn-primary" to="/portal/programacion/nueva">
            Agendar visita
          </Link>
        </div>
      </header>

      {stats && stats.mine.count > 0 ? (
        <p className={stats.mine.alert ? "nc-portal-reschedule-alert" : "nc-portal-muted"} role="status">
          Reagendamientos del mes:{" "}
          <strong>
            {stats.mine.count}/{stats.threshold}
          </strong>
          {stats.mine.alert ? " · Umbral superado" : null}
        </p>
      ) : null}

      {viewMode === "semana" ? <AgendaWeekView /> : null}
      {viewMode === "mes" ? <AgendaMonthView onPickDay={() => setViewMode("semana")} /> : null}

      {viewMode === "lista" ? (
        <>
          {error ? <p className="nc-note">{error}</p> : null}
          <Tabs
            items={tabItems}
            value={listFilter}
            onChange={(id) => setListFilter(id as ListFilter)}
            label="Filtrar agenda"
          />
          <div className="nc-portal-visit-grid">
            {visible.length === 0 ? (
              <p className="nc-portal-muted">No hay visitas en este filtro.</p>
            ) : (
              visible.map((visit) => {
                const status = cardStatus(visit)
                const open = OPEN.has(status)
                const overdue = status === "ATRASADA" ? lateAgo(visit.scheduled_start, visit.late_minutes) : null
                const maps = mapsUrl(visit)
                return (
                  <VisitCard
                    key={visit.id}
                    time={visitClock(visit.scheduled_start)}
                    duration={overdue || undefined}
                    client={visit.client_name}
                    site={visit.site}
                    municipality={visit.municipality}
                    status={status}
                    reason={visit.reason}
                    mapsUrl={maps}
                    onClick={() => navigate(`/portal/clientes/${visit.client_id}`)}
                    actions={
                      open ? (
                        <>
                          <Button variant="primary" type="button" onClick={() => navigate(`/portal/visitas/${visit.id}`)}>
                            Registrar visita
                          </Button>
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() =>
                              setReschedule({
                                id: visit.id,
                                client_name: visit.client_name,
                                scheduled_start: visit.scheduled_start,
                              })
                            }
                          >
                            Reprogramar
                          </Button>
                          <Button
                            variant="secondary"
                            type="button"
                            disabled={busyId === visit.id}
                            onClick={() => markDone(visit)}
                          >
                            Cierre rápido
                          </Button>
                          {maps ? (
                            <Button
                              variant="quiet"
                              type="button"
                              onClick={() => window.open(maps, "_blank", "noopener,noreferrer")}
                            >
                              Cómo llegar
                            </Button>
                          ) : null}
                        </>
                      ) : null
                    }
                  />
                )
              })
            )}
          </div>
        </>
      ) : null}

      <RescheduleSheet
        visit={reschedule}
        onClose={() => setReschedule(null)}
        onDone={(payload) => {
          toast.show(
            payload.stats.alert
              ? `Reprogramada. Llevas ${payload.stats.month_count}/${payload.stats.threshold} reagendamientos.`
              : "Visita reprogramada",
            payload.stats.alert ? "warning" : "success",
          )
          refreshRows()
          refreshCounts()
          api<RescheduleStats>("/api/v1/visits/reschedule-stats")
            .then(setStats)
            .catch(() => null)
        }}
      />
      {toast.node}
    </PortalPage>
  )
}
