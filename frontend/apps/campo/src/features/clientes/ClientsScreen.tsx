import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "@nc/api"
import { Badge, Button, Icon } from "@nc/ui"
import { isOfflineMode, listCachedClients } from "../../offline"
import { daysSinceVisit, visitAgo } from "../shared/campo-format"

type ClientRow = {
  id: string
  name: string
  municipality: string
  phone: string
  status: string
  is_new: boolean
  last_visit_at: string | null
}

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "stale", label: "Sin visita +30 días" },
  { id: "prospecto", label: "Prospectos" },
] as const

export function ClientsScreen() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("todos")
  const [rows, setRows] = useState<ClientRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let alive = true
    const handle = setTimeout(() => {
      setLoaded(false)

      async function load() {
        if (isOfflineMode()) {
          const cached = (await listCachedClients(query)) as ClientRow[]
          if (!alive) return
          setRows(cached)
          setError(cached.length ? "" : "Sin cartera local. Conéctate para sincronizar.")
          setLoaded(true)
          return
        }
        try {
          const data = await api<{ results: ClientRow[] }>(`/api/v1/clients?q=${encodeURIComponent(query)}`)
          if (!alive) return
          setRows(data.results)
          setError("")
        } catch (err) {
          const cached = (await listCachedClients(query)) as ClientRow[]
          if (!alive) return
          if (cached.length) {
            setRows(cached)
            setError("Mostrando cartera en caché.")
          } else {
            setError(err instanceof Error ? err.message : "No se pudo cargar la cartera")
          }
        } finally {
          if (alive) setLoaded(true)
        }
      }

      void load()
    }, 200)
    return () => {
      alive = false
      clearTimeout(handle)
    }
  }, [query])

  const clients = useMemo(() => {
    return rows.filter((c) => {
      if (filter === "prospecto" && c.status !== "PROSPECTO") return false
      if (filter === "stale" && daysSinceVisit(c.last_visit_at) < 30) return false
      return true
    })
  }, [rows, filter])

  return (
    <>
      <header className="nc-campo-head" style={{ display: "grid", gap: "var(--space-3)" }}>
        <div>
          <div className="nc-campo-eyebrow">
            {clients.length} {clients.length === 1 ? "cliente" : "clientes"}
          </div>
          <h1>Mi cartera</h1>
        </div>
        <label className="nc-campo-search">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre, NIT o municipio"
            aria-label="Buscar clientes"
          />
        </label>
        <div className="nc-campo-filter-row" role="group" aria-label="Filtros">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={filter === f.id ? "is-on" : ""} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <section className="nc-campo-page">
        {error ? <p className="nc-note">{error}</p> : null}
        {!loaded ? <p className="nc-kicker">Cargando…</p> : null}
        {loaded && clients.length === 0 ? (
          <p className="nc-kicker" style={{ textAlign: "center", margin: "var(--space-6) 0" }}>
            No hay clientes con esa búsqueda. Revisa el nombre o regístralo.
          </p>
        ) : null}
        {clients.map((client) => {
          const stale = daysSinceVisit(client.last_visit_at) >= 30
          return (
            <button key={client.id} type="button" className="nc-campo-client-row" onClick={() => navigate(`/clientes/${client.id}`)}>
              <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 3, textAlign: "left" }}>
                <strong>{client.name}</strong>
                <small style={{ color: stale ? "var(--warning)" : "var(--ink-secondary)" }}>
                  {client.municipality || "Sin sede"} · última visita {visitAgo(client.last_visit_at).toLowerCase()}
                </small>
              </span>
              {stale ? <Badge tone="warning">+30 días</Badge> : null}
              {client.is_new ? <Badge tone="primary">Nuevo</Badge> : null}
              <Icon name="chevronRight" />
            </button>
          )
        })}
        <Button size="lg" block icon="plus" onClick={() => navigate("/clientes/nuevo")}>
          Registrar cliente
        </Button>
      </section>
    </>
  )
}
