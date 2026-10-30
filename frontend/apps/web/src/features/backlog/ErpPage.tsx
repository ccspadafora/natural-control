import { useEffect, useState } from "react"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge } from "@nc/ui"
import { ConsoleShell } from "../../admin"

type ErpStatus = { enabled: boolean; last_run: string | null }

export function ErpPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const featureOn = Boolean(user.features.erp)
  const [status, setStatus] = useState<ErpStatus | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!featureOn) return
    api<ErpStatus>("/api/v1/erp/status")
      .then(setStatus)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }, [featureOn])

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title="Conciliación ERP"
      lede="Ventas y cartera del ERP frente al CRM — stub hasta conectar el conector."
    >
      {!featureOn ? (
        <div className="nc-portal-banner" role="status">
          <Badge tone="neutral">Próximamente</Badge>
          <span className="nc-portal-banner-text">
            La integración ERP está apagada. Actívala en Parámetros cuando el conector esté listo.
          </span>
        </div>
      ) : null}
      {error ? <p className="nc-note">{error}</p> : null}
      {featureOn && status ? (
        <section className="nc-portal-card">
          <h2>Estado del conector</h2>
          <p className="nc-portal-muted">
            {status.enabled ? "Integración habilitada" : "Integración deshabilitada"} · última corrida:{" "}
            {status.last_run ?? "Sin ejecuciones registradas"}
          </p>
          <p className="nc-portal-muted">No hay registros sin conciliar por ahora.</p>
        </section>
      ) : null}
    </ConsoleShell>
  )
}
