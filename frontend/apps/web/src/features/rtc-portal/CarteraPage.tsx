import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, Format, TextField, TOAST } from "@nc/ui"
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

function secondaryName(client: ClientRow) {
  const legal = (client.legal_name || "").trim()
  if (!legal) return ""
  if (legal.toLocaleLowerCase("es") === client.name.trim().toLocaleLowerCase("es")) return ""
  return legal
}

function tipoLabel(client: ClientRow) {
  const parts = [client.client_type, client.segment ? `Seg. ${client.segment}` : ""].filter(Boolean)
  return parts.length ? parts.join(" · ") : "Sin clasificar"
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

      <section className="nc-cartera-panel">
        <div className="nc-cartera-toolbar">
          <TextField
            label="Buscar en cartera"
            placeholder="Nombre, documento o municipio"
            value={q}
            onChange={(event) => {
              const next = event.target.value
              if (next) setParams({ q: next })
              else setParams({})
            }}
          />
        </div>

        {error ? <p className="nc-note">{error}</p> : null}

        {rows.length === 0 && !error ? (
          <div className="nc-cartera-empty">
            <p className="nc-cartera-empty-title">Todavía no hay clientes en tu cartera</p>
            <p className="nc-portal-muted">Registra el primero o pídele a tu líder que te asigne cartera.</p>
            <Link className="nc-btn nc-btn-primary" to="/portal/clientes/nuevo">
              Registrar cliente
            </Link>
          </div>
        ) : (
          <>
            <div className="nc-cartera-head" aria-hidden="true">
              <span>Cliente</span>
              <span>Municipio</span>
              <span>Tipo</span>
              <span>Estado</span>
              <span>Área</span>
              <span>Última visita</span>
            </div>
            <ul className="nc-cartera-list">
              {rows.map((client) => {
                const legal = secondaryName(client)
                const ha = client.total_area_ha == null ? null : Number(client.total_area_ha)
                return (
                  <li key={client.id}>
                    <button
                      type="button"
                      className="nc-cartera-row"
                      onClick={() => navigate(`/portal/clientes/${client.id}`)}
                    >
                      <span className="nc-cartera-client">
                        <span className="nc-cartera-name">
                          {client.name}
                          {client.is_new ? <Badge tone="accent">Nuevo</Badge> : null}
                        </span>
                        {legal ? <span className="nc-cartera-legal">{legal}</span> : null}
                        {client.phone ? <span className="nc-cartera-phone">{client.phone}</span> : null}
                      </span>
                      <span className="nc-cartera-mun">{client.municipality || "—"}</span>
                      <span className="nc-cartera-tipo">{tipoLabel(client)}</span>
                      <span className="nc-cartera-status">
                        <Badge tone={statusTone(client.status)}>{CLIENT_STATUS[client.status] || client.status}</Badge>
                      </span>
                      <span className="nc-cartera-area">{ha != null && ha > 0 ? Format.hectares(ha) : "—"}</span>
                      <span className="nc-cartera-visit">{visitAgo(client.last_visit_at)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

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
