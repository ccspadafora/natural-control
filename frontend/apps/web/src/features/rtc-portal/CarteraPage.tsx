import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, DataTable, TextField } from "@nc/ui"
import { PortalPage } from "./PortalPage"
import { CLIENT_STATUS, statusTone } from "./shared/clients"
import { visitAgo } from "./shared/format"

type ClientRow = {
  id: string
  name: string
  legal_name?: string
  municipality: string
  phone: string
  status: string
  is_new: boolean
  last_visit_at: string | null
  owner_name: string
  zone_name?: string
}

export function CarteraPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const q = params.get("q") || ""
  const [rows, setRows] = useState<ClientRow[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""
    api<{ results: ClientRow[] }>(`/api/v1/clients${query}`)
      .then((data) => setRows(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la cartera"))
  }, [q])

  const countLabel = useMemo(() => {
    const n = rows.length
    return n === 1 ? "1 cliente en tu cartera" : `${n} clientes en tu cartera`
  }, [rows.length])

  return (
    <PortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <span className="nc-portal-eyebrow">{countLabel}</span>
          <h1>Tu cartera</h1>
        </div>
        <span className="nc-portal-actions">
          <button type="button" className="nc-btn nc-btn-secondary" disabled>
            Exportar a Excel
          </button>
          <button type="button" className="nc-btn nc-btn-primary" disabled>
            Registrar cliente
          </button>
        </span>
      </header>

      <TextField
        label="Buscar"
        placeholder="Busca por nombre, documento o municipio"
        value={q}
        onChange={(event) => {
          const next = event.target.value
          if (next) setParams({ q: next })
          else setParams({})
        }}
      />

      {error ? <p className="nc-note">{error}</p> : null}

      <DataTable
        rows={rows}
        emptyMessage="Todavía no hay clientes en tu cartera."
        columns={[
          {
            key: "name",
            header: "Cliente",
            render: (client) => (
              <button type="button" className="nc-portal-link-row" onClick={() => navigate(`/portal/clientes/${client.id}`)}>
                <span className="nc-portal-task-title">{client.name}</span>
                {client.is_new ? <Badge tone="accent">Nuevo</Badge> : null}
                {client.legal_name ? <span className="nc-portal-mono">{client.legal_name}</span> : null}
              </button>
            ),
          },
          { key: "mun", header: "Municipio", render: (c) => c.municipality || "—" },
          {
            key: "tipo",
            header: "Tipo · segmento",
            render: () => <span className="nc-portal-muted">— · —</span>,
          },
          {
            key: "estado",
            header: "Estado",
            render: (c) => <Badge tone={statusTone(c.status)}>{CLIENT_STATUS[c.status] || c.status}</Badge>,
          },
          {
            key: "area",
            header: "Área",
            render: () => <span style={{ textAlign: "right", display: "block" }}>—</span>,
          },
          {
            key: "last",
            header: "Última visita",
            render: (c) => visitAgo(c.last_visit_at),
          },
        ]}
      />
      <p className="nc-portal-muted">
        ¿Necesitas mover clientes? Eso lo hace tu líder desde la{" "}
        <Link className="nc-text-link" to="/consola">
          consola
        </Link>
        .
      </p>
    </PortalPage>
  )
}
