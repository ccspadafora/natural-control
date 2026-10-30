import { FormEvent, useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Button, TextField } from "@nc/ui"
import { ConsoleShell } from "./admin"

type Row = {
  rtc_id: string
  rtc_name: string
  zone_name: string
  reason: string
  status: string
  planned: number
  done: number
  bucket: string
}

type Report = {
  iso_week: number
  week_start: string
  week_end: string
  deadline_at: string
  results: Row[]
}

type Person = { id: string; first_name: string; last_name: string; requires_weekly_plan?: boolean }

const BUCKET: Record<string, string> = {
  a_tiempo: "A tiempo",
  tarde: "Tarde",
  faltante: "Sin envío",
  pendiente: "Pendiente",
}

function day(iso: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" }).format(new Date(`${iso}T12:00:00-05:00`))
}

export function PlansPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice || ""
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    api<Report>("/api/v1/weekly-plans/compliance")
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }, [])

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title="Programación"
      lede={report ? `Semana ${report.iso_week}, del ${day(report.week_start)} al ${day(report.week_end)}.` : "Quién debía enviar la semana y quién ya lo hizo."}
      action={<Link className="nc-btn nc-btn-primary" to="/consola/programacion/exigir">Exigir programación</Link>}
    >
      {notice ? <p className="nc-ok">{notice}</p> : null}
      {error ? <p className="nc-note">{error}</p> : null}
      <div className="nc-table-wrap">
        <table className="nc-table">
          <thead>
            <tr>
              <th>Comercial</th>
              <th>Zona</th>
              <th>Envío</th>
              <th>Programadas</th>
              <th>Realizadas</th>
            </tr>
          </thead>
          <tbody>
            {!report || report.results.length === 0 ? (
              <tr><td className="nc-empty" colSpan={5}>Nadie tiene la programación exigida esta semana.</td></tr>
            ) : report.results.map((row) => (
              <tr key={row.rtc_id}>
                <td>{row.rtc_name}</td>
                <td>{row.zone_name || "—"}</td>
                <td><span className={row.bucket === "faltante" || row.bucket === "tarde" ? "nc-status is-bad" : row.bucket === "a_tiempo" ? "nc-status is-on" : "nc-status"}><i />{BUCKET[row.bucket] || row.bucket}</span></td>
                <td>{row.planned}</td>
                <td>{row.done}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ConsoleShell>
  )
}

export function RequirePlanPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const navigate = useNavigate()
  const [people, setPeople] = useState<Person[]>([])
  const [rtcId, setRtcId] = useState("")
  const [required, setRequired] = useState(true)
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ results: Person[] }>("/api/v1/users?role=RTC&active=1")
      .then((data) => setPeople(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      await api(`/api/v1/users/${rtcId}/weekly-plan-requirement`, {
        method: "PUT",
        body: JSON.stringify({ required, reason }),
      })
      navigate("/consola/programacion", { state: { notice: required ? "La programación quedó exigida." : "La programación ya no es obligatoria." } })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar")
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title="Exigir programación"
      lede="El comercial ve el aviso en Hoy hasta que envía la semana."
      back={{ to: "/consola/programacion", label: "Programación" }}
    >
      <form className="nc-panel" onSubmit={submit}>
        <label className="nc-field">
          <span className="nc-field-label">Comercial</span>
          <select className="nc-input" value={rtcId} onChange={(event) => setRtcId(event.target.value)} required>
            <option value="">Elige</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.first_name} {person.last_name}</option>)}
          </select>
        </label>
        <label className="nc-check">
          <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />
          Debe enviar la programación
        </label>
        <TextField label="Motivo" value={reason} onChange={(event) => setReason(event.target.value)} required={required} />
        {error ? <p className="nc-note">{error}</p> : null}
        <span className="nc-row">
          <Button type="submit" disabled={busy || !rtcId}>{busy ? "Guardando…" : "Guardar"}</Button>
          <Link className="nc-btn nc-btn-secondary" to="/consola/programacion">Cancelar</Link>
        </span>
      </form>
    </ConsoleShell>
  )
}
