import { FormEvent, useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Button } from "@nc/ui"
import { ConsoleShell } from "./admin"

type ClientRow = { id: string; name: string; municipality: string; owner_name: string }
type Salesperson = { id: string; first_name: string; last_name: string; zone_name: string }
type VisitRow = {
  id: string
  client_name: string
  municipality: string
  rtc_id: string
  rtc_name: string
  status: string
  origin: string
  priority: string
  reason: string
  scheduled_start: string | null
}

const STATUS: Record<string, string> = {
  PROGRAMADA: "Programada",
  EN_CURSO: "En curso",
}
const ORIGIN: Record<string, string> = {
  ASIGNADA: "Asignada",
  RTC: "Del comercial",
  PROGRAMACION: "Programación",
  RECURRENTE: "Recurrente",
}
const PRIORITY: Record<string, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
}

function slot(iso: string | null) {
  if (!iso) return "Sin fecha"
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(iso))
}

function useSalespeople() {
  const [rows, setRows] = useState<Salesperson[]>([])
  useEffect(() => {
    api<{ results: Salesperson[] }>("/api/v1/users?role=RTC&active=1").then((data) => setRows(data.results))
  }, [])
  return rows
}

export function MovePortfolioPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const navigate = useNavigate()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [ownerId, setOwnerId] = useState("")
  const [error, setError] = useState("")
  const people = useSalespeople()

  useEffect(() => {
    api<{ results: ClientRow[] }>("/api/v1/clients").then((data) => setClients(data.results))
  }, [])

  useEffect(() => {
    if (!ownerId && people[0]) setOwnerId(people[0].id)
  }, [people, ownerId])

  function toggle(id: string) {
    setPicked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    if (picked.length === 0) {
      setError("Elige al menos un cliente.")
      return
    }
    try {
      const data = await api<{ moved: number }>("/api/v1/clients/reassign", {
        method: "POST",
        body: JSON.stringify({ client_ids: picked, owner_id: ownerId }),
      })
      const person = people.find((item) => item.id === ownerId)
      const name = person ? `${person.first_name} ${person.last_name}` : "el comercial"
      const notice = data.moved === 1
        ? `1 cliente quedó en la cartera de ${name}.`
        : `${data.moved} clientes quedaron en la cartera de ${name}.`
      navigate("/consola", { state: { notice } })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo mover la cartera")
    }
  }

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title="Mover cartera"
      lede="Las visitas programadas de esos clientes pasan con ellos."
      back={{ to: "/consola", label: "Cartera" }}
    >
      <form className="nc-panel" onSubmit={submit}>
        <label className="nc-field">
          <span className="nc-field-label">Comercial</span>
          <select className="nc-input" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
            {people.map((person) => (
              <option key={person.id} value={person.id}>{person.first_name} {person.last_name}{person.zone_name ? ` · ${person.zone_name}` : ""}</option>
            ))}
          </select>
        </label>
        <div className="nc-checks">
          <span className="nc-field-label">Clientes</span>
          {clients.map((client) => (
            <label key={client.id} className="nc-check">
              <input type="checkbox" checked={picked.includes(client.id)} onChange={() => toggle(client.id)} />
              {client.name} · {client.owner_name || "Sin comercial"}
            </label>
          ))}
        </div>
        {error ? <p className="nc-note">{error}</p> : null}
        <div className="nc-panel-actions">
          <Button type="submit">Mover cartera</Button>
          <Link className="nc-text-link" to="/consola">Cancelar</Link>
        </div>
      </form>
    </ConsoleShell>
  )
}

export function VisitsPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice || ""
  const [rows, setRows] = useState<VisitRow[]>([])
  const [error, setError] = useState("")
  const canAssign = user.permissions.includes("visits.assign")

  useEffect(() => {
    api<{ results: VisitRow[] }>("/api/v1/visits")
      .then((data) => setRows(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }, [])

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title="Visitas"
      lede="Visitas programadas o en curso."
      action={canAssign ? <Link className="nc-btn nc-btn-primary" to="/consola/visitas/nueva">Asignar visita</Link> : undefined}
    >
      {notice ? <p className="nc-ok">{notice}</p> : null}
      {error ? <p className="nc-note">{error}</p> : null}
      <div className="nc-table-wrap">
        <table className="nc-table">
          <thead>
            <tr>
              <th>Cuándo</th>
              <th>Cliente</th>
              <th>Comercial</th>
              <th>Motivo</th>
              <th>Prioridad</th>
              <th>Origen</th>
              <th>Estado</th>
              {canAssign ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="nc-empty" colSpan={canAssign ? 8 : 7}>No hay visitas abiertas.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id}>
                <td>{slot(row.scheduled_start)}</td>
                <td>{row.client_name}</td>
                <td>{row.rtc_name}</td>
                <td>{row.reason || "—"}</td>
                <td>{PRIORITY[row.priority] || row.priority}</td>
                <td>{ORIGIN[row.origin] || row.origin}</td>
                <td><span className={row.status === "EN_CURSO" ? "nc-status is-warn" : "nc-status is-on"}><i />{STATUS[row.status] || row.status}</span></td>
                {canAssign ? <td><Link to={`/consola/visitas/${row.id}`}>Reasignar</Link></td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ConsoleShell>
  )
}

export function AssignVisitPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const navigate = useNavigate()
  const people = useSalespeople()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [reasons, setReasons] = useState<{ id: string; name: string }[]>([])
  const [rtcId, setRtcId] = useState("")
  const [clientId, setClientId] = useState("")
  const [reasonId, setReasonId] = useState("")
  const [priority, setPriority] = useState("MEDIA")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("09:00")
  const [error, setError] = useState("")

  useEffect(() => {
    api<{ results: ClientRow[] }>("/api/v1/clients").then((data) => {
      setClients(data.results)
      setClientId(data.results[0]?.id || "")
    })
    api<{ results: { id: string; name: string }[] }>("/api/v1/visit-reasons").then((data) => {
      setReasons(data.results)
      setReasonId(data.results[0]?.id || "")
    })
  }, [])

  useEffect(() => {
    if (!rtcId && people[0]) setRtcId(people[0].id)
  }, [people, rtcId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    if (!date || !time) {
      setError("Elige fecha y hora.")
      return
    }
    try {
      const scheduled = new Date(`${date}T${time}`)
      const data = await api<{ warning: string | null; client_name: string }>("/api/v1/visits/assign", {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          rtc_id: rtcId,
          reason_id: reasonId || null,
          priority,
          scheduled_start: scheduled.toISOString(),
        }),
      })
      const extra = data.warning ? ` ${data.warning}` : ""
      navigate("/consola/visitas", { state: { notice: `La visita a ${data.client_name} quedó asignada.${extra}` } })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar")
    }
  }

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title="Asignar visita"
      lede="Llega a la agenda del comercial como visita asignada."
      back={{ to: "/consola/visitas", label: "Visitas" }}
    >
      <form className="nc-panel" onSubmit={submit}>
        <label className="nc-field">
          <span className="nc-field-label">Comercial</span>
          <select className="nc-input" value={rtcId} onChange={(event) => setRtcId(event.target.value)}>
            {people.map((person) => <option key={person.id} value={person.id}>{person.first_name} {person.last_name}</option>)}
          </select>
        </label>
        <label className="nc-field">
          <span className="nc-field-label">Cliente</span>
          <select className="nc-input" value={clientId} onChange={(event) => setClientId(event.target.value)}>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </label>
        <label className="nc-field">
          <span className="nc-field-label">Fecha</span>
          <input className="nc-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </label>
        <label className="nc-field">
          <span className="nc-field-label">Hora</span>
          <input className="nc-input" type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
        </label>
        <label className="nc-field">
          <span className="nc-field-label">Motivo</span>
          <select className="nc-input" value={reasonId} onChange={(event) => setReasonId(event.target.value)}>
            {reasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.name}</option>)}
          </select>
        </label>
        <label className="nc-field">
          <span className="nc-field-label">Prioridad</span>
          <select className="nc-input" value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
          </select>
        </label>
        {error ? <p className="nc-note">{error}</p> : null}
        <div className="nc-panel-actions">
          <Button type="submit">Asignar visita</Button>
          <Link className="nc-text-link" to="/consola/visitas">Cancelar</Link>
        </div>
      </form>
    </ConsoleShell>
  )
}

export function ReassignVisitPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { visitId } = useParams()
  const navigate = useNavigate()
  const people = useSalespeople()
  const [row, setRow] = useState<VisitRow | null>(null)
  const [rtcId, setRtcId] = useState("")
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    api<{ results: VisitRow[] }>("/api/v1/visits").then((data) => {
      const found = data.results.find((item) => item.id === visitId)
      if (!found) setMissing(true)
      else {
        setRow(found)
        setRtcId(found.rtc_id)
      }
    }).catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }, [visitId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!row) return
    if (rtcId === row.rtc_id) {
      setError("Elige otro comercial.")
      return
    }
    setError("")
    try {
      await api(`/api/v1/visits/${row.id}/reassign`, {
        method: "POST",
        body: JSON.stringify({ rtc_id: rtcId }),
      })
      navigate("/consola/visitas", { state: { notice: `La visita de ${row.client_name} quedó con otro comercial.` } })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reasignar")
    }
  }

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title={row?.client_name || "Visita"}
      lede={row ? `${slot(row.scheduled_start)} · ${row.rtc_name}` : undefined}
      back={{ to: "/consola/visitas", label: "Visitas" }}
    >
      {missing ? <p className="nc-note">No encontramos esa visita abierta.</p> : null}
      {row ? (
        <form className="nc-panel" onSubmit={submit}>
          <label className="nc-field">
            <span className="nc-field-label">Nuevo comercial</span>
            <select className="nc-input" value={rtcId} onChange={(event) => setRtcId(event.target.value)}>
              {people.map((person) => <option key={person.id} value={person.id}>{person.first_name} {person.last_name}</option>)}
            </select>
          </label>
          {error ? <p className="nc-note">{error}</p> : null}
          <div className="nc-panel-actions">
            <Button type="submit">Reasignar visita</Button>
            <Link className="nc-text-link" to="/consola/visitas">Cancelar</Link>
          </div>
        </form>
      ) : null}
    </ConsoleShell>
  )
}
