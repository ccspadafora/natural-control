import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, PageHead } from "@nc/ui"
import { PortalPage } from "./PortalPage"
import { CLIENT_STATUS, statusTone } from "./shared/clients"
import { visitAgo } from "./shared/format"

type ClientDetail = {
  id: string
  name: string
  legal_name?: string
  municipality: string
  phone: string
  status: string
  is_new: boolean
  last_visit_at: string | null
  owner_name: string
  kind?: string
  client_type?: string
  sites?: { id: string; name: string; municipality: string }[]
}

const HISTORY_STUB = [
  { id: "1", when: "29 oct. · 10:52", result: "Pedido confirmado", reason: "Seguimiento" },
  { id: "2", when: "12 oct. · 15:10", result: "Cotización solicitada", reason: "Presentación de producto" },
  { id: "3", when: "28 sep. · 9:05", result: "Seguimiento programado", reason: "Seguimiento" },
]

const CROPS_STUB = [
  { name: "Aguacate Hass", ha: 12, pct: 67 },
  { name: "Fresa", ha: 6, pct: 33 },
]

export function ClientDetailPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id) return
    api<ClientDetail>(`/api/v1/clients/${id}`)
      .then(setClient)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo abrir el cliente"))
  }, [id])

  if (error) {
    return (
      <PortalPage user={user} onLogout={onLogout}>
        <p className="nc-note">{error}</p>
        <Link className="nc-text-link" to="/portal/clientes">
          Volver a la cartera
        </Link>
      </PortalPage>
    )
  }

  if (!client) {
    return (
      <PortalPage user={user} onLogout={onLogout}>
        <p className="nc-portal-muted">Cargando ficha…</p>
      </PortalPage>
    )
  }

  const tipo = client.client_type || "Cliente"
  const segment = "—"
  const estado = CLIENT_STATUS[client.status] || client.status
  const totalHa = CROPS_STUB.reduce((sum, c) => sum + c.ha, 0)

  return (
    <PortalPage user={user} onLogout={onLogout}>
      <PageHead
        title={client.name}
        description={`${client.owner_name || "Sin contacto"} · ${client.legal_name || "—"} · ${client.municipality} · ${client.owner_name}`}
        backHref="/portal/clientes"
        backLabel="Volver a la cartera"
        actions={
          <span className="nc-portal-actions">
            <Link className="nc-btn nc-btn-secondary" to="/portal/programacion/nueva">
              Agendar visita
            </Link>
            <Button
              type="button"
              icon="pin"
              onClick={() => {
                api<{ id: string }>("/api/v1/visits/now", { method: "POST", body: JSON.stringify({ client_id: client.id }) })
                  .then(() => navigate("/portal/agenda"))
                  .catch((err) => setError(err instanceof Error ? err.message : "No se pudo registrar la visita"))
              }}
            >
              Registrar visita ahora
            </Button>
          </span>
        }
      />

      <p className="nc-portal-eyebrow">
        {tipo} · segmento {segment} · {estado}
      </p>

      <div className="nc-portal-split">
        <section className="nc-portal-card">
          <h2>Contacto</h2>
          <span className="nc-portal-task-title">{client.owner_name || client.name}</span>
          <span className="nc-portal-muted">
            {client.phone || "Sin teléfono"} · sin correo en ficha
          </span>
          <span className="nc-portal-actions">
            <Button variant="outline" type="button" disabled>
              Llamar
            </Button>
            <Button variant="outline" icon="message" type="button" disabled>
              WhatsApp
            </Button>
            <Button variant="outline" type="button" disabled>
              Correo
            </Button>
          </span>
          <span className="nc-portal-muted">Consentimiento de datos: pendiente de conectar.</span>
        </section>

        <section className="nc-portal-card">
          <div className="nc-portal-card-head">
            <h2>Cultivos</h2>
            <span className="nc-portal-muted">{totalHa} ha</span>
          </div>
          {CROPS_STUB.map((crop) => (
            <div key={crop.name} className="nc-portal-bar-row">
              <div className="nc-portal-bar-labels">
                <span>{crop.name}</span>
                <span className="nc-portal-muted">{crop.ha} ha</span>
              </div>
              <div className="nc-portal-bar-track">
                <div className="nc-portal-bar-fill" style={{ width: `${crop.pct}%` }} />
              </div>
            </div>
          ))}
          <p className="nc-portal-muted">Datos de cultivos ilustrativos hasta conectar el maestro agronómico.</p>
        </section>
      </div>

      <section className="nc-portal-card">
        <div className="nc-portal-card-head">
          <h2>Historial de visitas</h2>
          <Badge tone={statusTone(client.status)}>{estado}</Badge>
        </div>
        <p className="nc-portal-muted">Última visita registrada: {visitAgo(client.last_visit_at)}.</p>
        <ul className="nc-portal-history">
          {HISTORY_STUB.map((row) => (
            <li key={row.id}>
              <span className="nc-portal-task-title">{row.when}</span>
              <span className="nc-portal-muted">
                {row.reason} · {row.result}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </PortalPage>
  )
}
