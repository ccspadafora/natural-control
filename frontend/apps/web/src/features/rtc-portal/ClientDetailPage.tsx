import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, Format, Icon, PageHead } from "@nc/ui"
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
  document?: string
  segment?: string
  status_label?: string
  contact_name?: string
  email?: string
  data_consent_at?: string | null
  crops?: { id: string; name: string; area_ha: number; phase: string }[]
  biotechs?: { id: string; name: string; origin: string; tone: string }[]
  history?: { when: string; text: string }[]
}

function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return `57${digits}`
  return digits
}

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
  const segment = client.segment || "—"
  const estado = client.status_label || CLIENT_STATUS[client.status] || client.status
  const crops = client.crops ?? []
  const biotechs = client.biotechs ?? []
  const history = client.history ?? []
  const totalHa = crops.reduce((sum, c) => sum + c.area_ha, 0)
  const contact = client.contact_name || client.owner_name
  const wa = client.phone ? whatsappNumber(client.phone) : ""

  return (
    <PortalPage user={user} onLogout={onLogout}>
      <PageHead
        title={client.name}
        description={[contact || "Sin contacto", client.document || client.legal_name, client.municipality].filter(Boolean).join(" · ")}
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
          <span className="nc-portal-task-title">{contact || client.name}</span>
          <span className="nc-portal-muted">
            {client.phone || "Sin teléfono"}
            {client.email ? ` · ${client.email}` : ""}
          </span>
          <span className="nc-portal-actions">
            {client.phone ? (
              <>
                <a className="nc-btn nc-btn-outline" href={`tel:${client.phone.replace(/\s/g, "")}`}>
                  Llamar
                </a>
                <a className="nc-btn nc-btn-outline" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
                  <Icon name="message" />
                  WhatsApp
                </a>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" disabled title="Este cliente no tiene teléfono registrado">
                  Llamar
                </Button>
                <Button type="button" variant="outline" disabled title="Este cliente no tiene teléfono registrado">
                  WhatsApp
                </Button>
              </>
            )}
            {client.email ? (
              <a className="nc-btn nc-btn-outline" href={`mailto:${client.email}`}>
                Correo
              </a>
            ) : null}
          </span>
          <span className="nc-portal-muted">
            {client.data_consent_at ? "Con consentimiento de datos." : "Consentimiento de datos pendiente."}
          </span>
        </section>

        <section className="nc-portal-card">
          <div className="nc-portal-card-head">
            <h2>Cultivos</h2>
            <span className="nc-portal-muted">{Format.hectares(totalHa)}</span>
          </div>
          {crops.length === 0 ? <p className="nc-portal-muted">Sin cultivos registrados.</p> : null}
          {crops.map((crop) => (
            <div key={crop.id} className="nc-portal-bar-row">
              <div className="nc-portal-bar-labels">
                <span>{crop.name}</span>
                <span className="nc-portal-muted">{Format.hectares(crop.area_ha)}</span>
              </div>
              <div className="nc-portal-bar-track">
                <div className="nc-portal-bar-fill" style={{ width: `${totalHa > 0 ? (crop.area_ha / totalHa) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
          {biotechs.length > 0 ? (
            <span className="nc-portal-actions">
              {biotechs.map((b) => (
                <Badge key={b.id} tone={b.tone === "primary" ? "primary" : "neutral"}>
                  {b.name} · {b.origin}
                </Badge>
              ))}
            </span>
          ) : null}
        </section>
      </div>

      <section className="nc-portal-card">
        <div className="nc-portal-card-head">
          <h2>Historial de visitas</h2>
          <Badge tone={statusTone(client.status)}>{estado}</Badge>
        </div>
        <p className="nc-portal-muted">Última visita registrada: {visitAgo(client.last_visit_at)}.</p>
        <ul className="nc-portal-history">
          {history.length === 0 ? <li className="nc-portal-muted">Aún no hay visitas registradas.</li> : null}
          {history.map((row, i) => (
            <li key={`${row.when}-${i}`}>
              <span className="nc-portal-task-title">{row.when}</span>
              <span className="nc-portal-muted">{row.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </PortalPage>
  )
}
