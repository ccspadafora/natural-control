import { FormEvent, useEffect, useState } from "react"
import { api } from "@nc/api"
import { Button, Sheet, TextField } from "@nc/ui"

export type RescheduleTarget = {
  id: string
  client_name: string
  scheduled_start: string | null
}

type Props = {
  visit: RescheduleTarget | null
  onClose: () => void
  onDone: (payload: {
    id: string
    scheduled_start: string
    reschedule_count: number
    stats: { month_count: number; threshold: number; alert: boolean; warning?: string | null }
  }) => void
}

function toLocalInput(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  // America/Bogota offset for display in datetime-local (UTC-5, no DST)
  const local = new Date(d.getTime() - 5 * 60 * 60 * 1000)
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`
}

function fromLocalInput(value: string) {
  // Treat as America/Bogota wall time
  return `${value}:00-05:00`
}

export function RescheduleSheet({ visit, onClose, onDone }: Props) {
  const [when, setWhen] = useState("")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setWhen(toLocalInput(visit?.scheduled_start ?? null))
    setReason("")
    setError("")
    setBusy(false)
  }, [visit])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!visit) return
    if (!when) {
      setError("Elige la nueva fecha y hora.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const data = await api<{
        id: string
        scheduled_start: string
        reschedule_count: number
        stats: { month_count: number; threshold: number; alert: boolean; warning?: string | null }
      }>(`/api/v1/visits/${visit.id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({
          scheduled_start: fromLocalInput(when),
          reason: reason.trim(),
        }),
      })
      onDone(data)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reprogramar")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={Boolean(visit)} title="Reprogramar visita" onClose={onClose} className="nc-sheet">
      {visit ? (
        <form className="nc-portal-stack" onSubmit={submit}>
          <p className="nc-portal-muted">{visit.client_name}</p>
          <TextField
            label="Nueva fecha y hora"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            required
          />
          <TextField
            label="Motivo (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. Cliente pidió otro horario"
          />
          {error ? <p className="nc-note">{error}</p> : null}
          <p className="nc-portal-muted">
            Cada reagendamiento queda registrado. Si superas el umbral mensual, líder y gerencia verán una alerta.
          </p>
          <div className="nc-portal-actions-row">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando…" : "Guardar nueva hora"}
            </Button>
          </div>
        </form>
      ) : null}
    </Sheet>
  )
}
