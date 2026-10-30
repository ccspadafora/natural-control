import type { SessionUser } from "@nc/domain"
import { Badge, type BadgeTone } from "@nc/ui"
import { ConsoleShell } from "../../admin"
import { portalDayLabel } from "../rtc-portal/shared/format"

type HealthCard = {
  name: string
  status: string
  tone: BadgeTone
  detail: string
}

type PendingDevice = {
  name: string
  device: string
  pending: string
  ago: string
}

const HEALTH: HealthCard[] = [
  { name: "Correo (SES)", status: "Operando", tone: "success", detail: "Último envío hace 4 min" },
  {
    name: "ERP · ventas facturadas",
    status: "Operando",
    tone: "success",
    detail: "Última corrida hoy, 6:00 a. m. · 214 registros · 3 sin cruzar",
  },
  { name: "Colas de tareas", status: "Operando", tone: "success", detail: "0 tareas atrasadas" },
  {
    name: "Sincronización en vivo",
    status: "Con retraso",
    tone: "warning",
    detail: "p95 de 4,1 s en la última hora (meta: 3 s)",
  },
  { name: "Último backup", status: "Operando", tone: "success", detail: "Hoy, 3:00 a. m." },
  {
    name: "WhatsApp Business",
    status: "Sin conectar",
    tone: "neutral",
    detail: "Fase 2 · pendiente WABA de Natural Control",
  },
]

const DEVICES: PendingDevice[] = [
  { name: "Santiago Mejía", device: "Android 13 · Samsung A34", pending: "3 registros pendientes", ago: "hace 1 h" },
  { name: "Mariana López", device: "iPhone 12 · iOS 17.5", pending: "1 registro pendiente", ago: "hace 18 h" },
]

export function SaludPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  return (
    <ConsoleShell user={user} onLogout={onLogout} title="Salud del sistema" lede={`${portalDayLabel()} · monitoreo operativo (stub)`}>
      <div className="nc-admin-health-grid">
        {HEALTH.map((card) => (
          <article key={card.name} className="nc-portal-card nc-admin-health-card">
            <div className="nc-admin-health-head">
              <h2>{card.name}</h2>
              <Badge tone={card.tone}>{card.status}</Badge>
            </div>
            <p className="nc-portal-muted">{card.detail}</p>
          </article>
        ))}
      </div>

      <section className="nc-portal-card nc-admin-devices">
        <h2>Dispositivos con registros sin sincronizar</h2>
        <ul className="nc-admin-device-list">
          {DEVICES.map((d) => (
            <li key={d.name}>
              <span>{d.name}</span>
              <span className="nc-portal-muted">{d.device}</span>
              <Badge tone="warning">{d.pending}</Badge>
              <span className="nc-portal-muted">{d.ago}</span>
            </li>
          ))}
        </ul>
      </section>
    </ConsoleShell>
  )
}
