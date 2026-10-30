import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { FilterPills, Tabs, VisitCard, type VisitStatus } from "@nc/ui"
import { PortalPage } from "./PortalPage"
import { agendaDayParam, portalDayLabel, visitClock } from "./shared/format"

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

type AgendaTab = "hoy" | "pendientes" | "realizadas"

const VIEW: Record<AgendaTab, string> = {
  hoy: "today",
  pendientes: "pending",
  realizadas: "done",
}

function cardStatus(row: VisitRow): VisitStatus {
  if (row.late && row.status === "PROGRAMADA") return "ATRASADA"
  return row.status as VisitStatus
}

export function AgendaPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<AgendaTab>("hoy")
  const [viewMode, setViewMode] = useState<"lista" | "semana" | "mes">("lista")
  const [rows, setRows] = useState<VisitRow[]>([])
  const [counts, setCounts] = useState({ hoy: 0, pendientes: 0, realizadas: 0 })
  const [error, setError] = useState("")

  const day = agendaDayParam()

  useEffect(() => {
    const views: AgendaTab[] = ["hoy", "pendientes", "realizadas"]
    Promise.all(
      views.map((key) =>
        api<{ results: VisitRow[] }>(`/api/v1/visits/agenda?date=${day}&view=${VIEW[key]}`).then((data) => ({
          key,
          n: data.results.length,
        })),
      ),
    ).then((parts) => {
      const next = { hoy: 0, pendientes: 0, realizadas: 0 }
      for (const part of parts) next[part.key] = part.n
      setCounts(next)
    })
  }, [day])

  useEffect(() => {
    setError("")
    api<{ results: VisitRow[] }>(`/api/v1/visits/agenda?date=${day}&view=${VIEW[tab]}`)
      .then((data) => setRows(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la agenda"))
  }, [tab, day])

  const tabItems = useMemo(
    () => [
      { id: "hoy", label: "Hoy", count: counts.hoy },
      { id: "pendientes", label: "Pendientes", count: counts.pendientes },
      { id: "realizadas", label: "Realizadas", count: counts.realizadas },
    ],
    [counts],
  )

  return (
    <PortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <span className="nc-portal-eyebrow">{portalDayLabel()}</span>
          <h1>Agenda de visitas</h1>
        </div>
        <Link className="nc-btn nc-btn-primary" to="/portal/programacion/nueva">
          Agendar visita
        </Link>
      </header>

      <FilterPills
        items={[
          { id: "lista", label: "Lista" },
          { id: "semana", label: "Semana" },
          { id: "mes", label: "Mes" },
        ]}
        value={viewMode}
        onChange={(id) => setViewMode(id as typeof viewMode)}
      />

      {viewMode !== "lista" ? (
        <p className="nc-portal-muted nc-portal-card">
          La vista {viewMode === "semana" ? "semanal" : "mensual"} del calendario llegará en la siguiente iteración. Por ahora
          usa la lista.
        </p>
      ) : null}

      {error ? <p className="nc-note">{error}</p> : null}

      <Tabs items={tabItems} value={tab} onChange={(id) => setTab(id as AgendaTab)} label="Agenda" />

      <div className="nc-portal-visit-grid">
        {rows.length === 0 ? (
          <p className="nc-portal-muted">No hay visitas en esta pestaña.</p>
        ) : (
          rows.map((visit) => (
            <VisitCard
              key={visit.id}
              time={visitClock(visit.scheduled_start)}
              client={visit.client_name}
              site={visit.site}
              municipality={visit.municipality}
              status={cardStatus(visit)}
              reason={visit.reason}
              onClick={() => navigate(`/portal/clientes/${visit.client_id}`)}
            />
          ))
        )}
      </div>
    </PortalPage>
  )
}
