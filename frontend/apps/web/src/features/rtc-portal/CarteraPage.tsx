import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, DataTable, Format, TextField, TOAST } from "@nc/ui"
import { PortalPage } from "./PortalPage"
import { CLIENT_STATUS, statusTone } from "./shared/clients"
import { visitAgo } from "./shared/format"
import { useExport } from "../mgmt/shared/useMetrics"
import { useToast } from "../shared/useToast"

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
  client_type?: string
  segment?: string
  total_area_ha?: number | string | null
}

export function CarteraPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const q = params.get("q") || ""
  const [rows, setRows] = useState<ClientRow[]>([])
  const [error, setError] = useState("")
  const exporter = useExport()
  const toast = useToast()

  async function exportXls() {
    if (!user.permissions.includes("clients.export")) {
      toast.show("No tienes permiso para exportar la cartera.", "danger")
      return
    }
    toast.show("Generando el archivo…", "neutral")
    const ok = await exporter.start("CLIENTS_XLSX")
    toast.show(ok ? TOAST.exportReady : TOAST.genericError, ok ? "success" : "danger")
  }

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
          <Button type="button" variant="secondary" disabled={exporter.busy} onClick={() => void exportXls()}>
            {exporter.busy ? "Generando…" : "Exportar a Excel"}
          </Button>
          <Link className="nc-btn nc-btn-primary" to="/portal/clientes/nuevo">
            Registrar cliente
          </Link>
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
            render: (c) =>
              c.client_type || c.segment ? (
                <span>
                  {c.client_type || "—"} · {c.segment || "—"}
                </span>
              ) : (
                <span className="nc-portal-muted">— · —</span>
              ),
          },
          {
            key: "estado",
            header: "Estado",
            render: (c) => <Badge tone={statusTone(c.status)}>{CLIENT_STATUS[c.status] || c.status}</Badge>,
          },
          {
            key: "area",
            header: "Área",
            render: (c) => {
              const ha = c.total_area_ha == null ? null : Number(c.total_area_ha)
              return <span style={{ textAlign: "right", display: "block" }}>{ha != null && ha > 0 ? Format.hectares(ha) : "—"}</span>
            },
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
      {toast.node}
    </PortalPage>
  )
}
