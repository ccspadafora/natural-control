import { useEffect, useState } from "react"
import { api } from "@nc/api"
import { Badge, Button, TextField } from "@nc/ui"
import { receivedLabel } from "./shared/geo"

export type LocationChangeRow = {
  id: string
  status: string
  reason: string
  client_name: string
  site_name: string
  municipality: string
  requested_by_name: string
  zone_name: string
  requested_at: string
  new_accuracy_m: number | null
  old_location: { latitude: number; longitude: number } | null
  new_location: { latitude: number; longitude: number } | null
}

export function LocationChangesPanel({ compact = false }: { compact?: boolean }) {
  const [rows, setRows] = useState<LocationChangeRow[]>([])
  const [pending, setPending] = useState(0)
  const [error, setError] = useState("")
  const [note, setNote] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState("")

  function load() {
    api<{ results: LocationChangeRow[]; pending: number }>("/api/v1/location-changes")
      .then((data) => {
        setRows(data.results)
        setPending(data.pending)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los cambios"))
  }

  useEffect(() => {
    load()
  }, [])

  async function decide(id: string, status: "APROBADA" | "RECHAZADA") {
    const decisionNote = (note[id] || "").trim()
    if (status === "RECHAZADA" && decisionNote.length < 3) {
      setError("Escribe por qué rechazas el cambio.")
      return
    }
    setBusyId(id)
    setError("")
    try {
      await api(`/api/v1/location-changes/${id}/decide`, {
        method: "POST",
        body: JSON.stringify({ status, decision_note: decisionNote }),
      })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo decidir")
    } finally {
      setBusyId("")
    }
  }

  return (
    <div className={`nc-portal-card nc-geo-loc-stub${compact ? " nc-geo-loc-stub--detail" : ""}`}>
      <h2 className="nc-portal-card-title">Cambios de ubicación por aprobar</h2>
      <p className="nc-portal-muted">
        {pending === 0
          ? "Sin solicitudes pendientes."
          : pending === 1
            ? "1 solicitud pendiente."
            : `${pending} solicitudes pendientes.`}
      </p>
      {error ? <p className="nc-note">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="nc-portal-muted">Cuando un comercial pida mover una sede, aparecerá aquí.</p>
      ) : (
        <ul className="nc-geo-loc-list">
          {rows.map((row) => (
            <li key={row.id} className="nc-geo-loc-item">
              <div className="nc-geo-loc-item-head">
                <strong>
                  {row.client_name} · {row.site_name || row.municipality}
                </strong>
                <Badge tone="accent">Pendiente</Badge>
              </div>
              <span className="nc-portal-muted">
                {row.requested_by_name}
                {row.zone_name ? ` · ${row.zone_name}` : ""} · {receivedLabel(row.requested_at)}
              </span>
              <p className="nc-geo-loc-reason">«{row.reason}»</p>
              {row.old_location && row.new_location ? (
                <span className="nc-portal-muted nc-geo-loc-coords">
                  {row.old_location.latitude.toFixed(4)}, {row.old_location.longitude.toFixed(4)} →{" "}
                  {row.new_location.latitude.toFixed(4)}, {row.new_location.longitude.toFixed(4)}
                  {row.new_accuracy_m != null ? ` · ±${Math.round(row.new_accuracy_m)} m` : ""}
                </span>
              ) : null}
              <TextField
                label="Nota (obligatoria al rechazar)"
                value={note[row.id] || ""}
                onChange={(e) => setNote((prev) => ({ ...prev, [row.id]: e.target.value }))}
              />
              <div className="nc-panel-actions">
                <Button type="button" disabled={busyId === row.id} onClick={() => void decide(row.id, "APROBADA")}>
                  Aprobar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busyId === row.id}
                  onClick={() => void decide(row.id, "RECHAZADA")}
                >
                  Rechazar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
