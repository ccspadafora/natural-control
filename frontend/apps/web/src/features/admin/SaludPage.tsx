import { useCallback, useEffect, useState } from "react"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, type BadgeTone } from "@nc/ui"
import { ConsoleShell } from "../../admin"
import { portalDayLabel } from "../rtc-portal/shared/format"

type HealthCard = {
  key: string
  name: string
  status: string
  tone: BadgeTone
  detail: string
}

type PendingDevice = {
  id: string
  name: string
  device: string
  pending_label: string
  ago: string
}

type HealthPayload = {
  checked_at: string
  cards: HealthCard[]
  pending_devices: PendingDevice[]
}

export function SaludPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [data, setData] = useState<HealthPayload | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api<HealthPayload>("/api/v1/admin/health")
      .then((res) => {
        setData(res)
        setError("")
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function revoke(deviceId: string) {
    setRevoking(deviceId)
    try {
      await api(`/api/v1/devices/${deviceId}/revoke`, { method: "POST" })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo revocar el dispositivo")
    } finally {
      setRevoking(null)
    }
  }

  const canRevoke = user.permissions.includes("users.manage")

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title="Salud del sistema"
      lede={`${portalDayLabel()} · monitoreo operativo`}
    >
      {error ? <p className="nc-portal-muted">{error}</p> : null}
      {loading && !data ? <p className="nc-portal-muted">Cargando semáforos…</p> : null}

      {data ? (
        <>
          <div className="nc-admin-health-grid">
            {data.cards.map((card) => (
              <article key={card.key} className="nc-portal-card nc-admin-health-card">
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
            {data.pending_devices.length === 0 ? (
              <p className="nc-portal-muted">Ningún dispositivo con mutaciones pendientes.</p>
            ) : (
              <ul className="nc-admin-device-list">
                {data.pending_devices.map((d) => (
                  <li key={d.id}>
                    <span>{d.name}</span>
                    <span className="nc-portal-muted">{d.device}</span>
                    <Badge tone="warning">{d.pending_label}</Badge>
                    <span className="nc-portal-muted">{d.ago}</span>
                    {canRevoke ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={revoking === d.id}
                        onClick={() => revoke(d.id)}
                      >
                        {revoking === d.id ? "Cerrando…" : "Cerrar sesión"}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </ConsoleShell>
  )
}
