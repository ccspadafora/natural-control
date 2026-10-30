import { FormEvent, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "@nc/api"
import { Button, TextField } from "@nc/ui"

type Item = {
  id: string
  client_name: string
  planned_date: string
  slot: string
  reason: string
  objective: string
  warning: string | null
}

type Plan = {
  id: string
  status: string
  is_late: boolean
  editable: boolean
  review_note: string
  items: Item[]
}

export type Current = {
  required: boolean
  reason: string
  reminder: string | null
  iso_week: number
  week_start: string
  week_end: string
  deadline_at: string
  plan: Plan | null
}

type ClientRow = { id: string; name: string; sites?: { id: string; name: string }[] }
type Option = { id: string; name: string }

const SLOT: Record<string, string> = { MANANA: "Mañana", TARDE: "Tarde", DIA: "Día" }
const STATUS: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  APROBADA: "Enviada",
  DEVUELTA: "Devuelta",
}

function day(iso: string) {
  return new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Bogota" }).format(new Date(`${iso}T12:00:00-05:00`))
}

function hour(iso: string) {
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }).format(new Date(iso))
}

export function planNotice(current: Current | null) {
  if (!current?.required || (current.plan && !current.plan.editable && current.plan.status !== "DEVUELTA")) return ""
  if (current.plan?.status === "DEVUELTA") return current.plan.review_note ? `Te la devolvieron: ${current.plan.review_note}` : "Te devolvieron la programación."
  if (current.reminder === "vencido") return "El plazo ya pasó. Si la envías, queda tarde."
  if (current.reminder === "2h") return "Te quedan menos de 2 horas para enviar la programación."
  if (current.reminder === "24h") return "El plazo de la programación vence en menos de un día."
  return current.reason ? `Te piden la programación: ${current.reason}` : "Te piden la programación de la semana."
}

export function Programacion() {
  const [current, setCurrent] = useState<Current | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  function load() {
    api<Current>("/api/v1/weekly-plans/current")
      .then(async (data) => {
        if (data.required && !data.plan) {
          const opened = await api<Current>("/api/v1/weekly-plans/current", { method: "POST", body: "{}" })
          setCurrent(opened)
          return
        }
        setCurrent(data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }

  useEffect(() => { load() }, [])

  async function send() {
    if (!current?.plan) return
    setBusy(true)
    setError("")
    try {
      await api(`/api/v1/weekly-plans/${current.plan.id}/submit`, { method: "POST", body: "{}" })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar")
    } finally {
      setBusy(false)
    }
  }

  async function remove(item: Item) {
    setError("")
    try {
      await api(`/api/v1/weekly-plan-items/${item.id}`, { method: "DELETE" })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar")
    }
  }

  if (!current && !error) return <p className="nc-kicker">Cargando…</p>
  if (!current?.required) {
    return (
      <section className="nc-page">
        <h1>Programación</h1>
        <p className="nc-kicker">Gerencia no te está pidiendo la programación.</p>
      </section>
    )
  }

  const plan = current.plan
  const notice = planNotice(current)
  return (
    <section className="nc-page">
      <h1>Semana {current.iso_week}</h1>
      <p className="nc-kicker">{day(current.week_start)} a {day(current.week_end)}. Plazo: {hour(current.deadline_at)}.</p>
      {notice ? <p className="nc-note">{notice}</p> : null}
      {plan && !plan.editable ? <p className="nc-ok">{plan.is_late ? "Quedó enviada tarde. Las visitas ya están en tu agenda." : "Quedó enviada. Las visitas ya están en tu agenda."}</p> : null}
      {error ? <p className="nc-note">{error}</p> : null}
      <ul className="nc-list">
        {plan && plan.items.length === 0 ? <li className="nc-kicker">Todavía no hay visitas en esta semana.</li> : null}
        {plan?.items.map((item) => (
          <li key={item.id} className="nc-card">
            <span className="nc-row">
              <strong>{item.client_name}</strong>
              {plan.editable ? <button type="button" className="nc-text-link" onClick={() => remove(item)}>Quitar</button> : null}
            </span>
            <span>{day(item.planned_date)} · {SLOT[item.slot] || item.slot}{item.reason ? ` · ${item.reason}` : ""}</span>
            {item.objective ? <span>{item.objective}</span> : null}
          </li>
        ))}
      </ul>
      {plan?.editable ? (
        <span className="nc-row">
          <Link className="nc-btn nc-btn-secondary" to="/programacion/nueva">Agregar visita</Link>
          <Button type="button" onClick={send} disabled={busy}>{busy ? "Enviando…" : "Enviar programación"}</Button>
        </span>
      ) : plan ? <p className="nc-kicker">{STATUS[plan.status] || plan.status}</p> : null}
    </section>
  )
}

export function NewPlanItem() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState<Current | null>(null)
  const [clients, setClients] = useState<ClientRow[]>([])
  const [reasons, setReasons] = useState<Option[]>([])
  const [clientId, setClientId] = useState("")
  const [siteId, setSiteId] = useState("")
  const [sites, setSites] = useState<{ id: string; name: string }[]>([])
  const [date, setDate] = useState("")
  const [slot, setSlot] = useState("MANANA")
  const [reasonId, setReasonId] = useState("")
  const [objective, setObjective] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<Current>("/api/v1/weekly-plans/current").then(async (data) => {
      const next = data.required && !data.plan
        ? await api<Current>("/api/v1/weekly-plans/current", { method: "POST", body: "{}" })
        : data
      setCurrent(next)
      setDate(next.week_start)
    })
    api<{ results: ClientRow[] }>("/api/v1/clients").then((data) => setClients(data.results))
    api<{ results: Option[] }>("/api/v1/visit-reasons").then((data) => setReasons(data.results))
  }, [])

  useEffect(() => {
    if (!clientId) return
    api<ClientRow>(`/api/v1/clients/${clientId}`).then((client) => {
      const next = client.sites || []
      setSites(next)
      setSiteId(next[0]?.id || "")
    })
  }, [clientId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!current?.plan) return
    setBusy(true)
    setError("")
    try {
      await api(`/api/v1/weekly-plans/${current.plan.id}/items`, {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          site_id: siteId || null,
          planned_date: date,
          slot,
          reason_id: reasonId || null,
          objective,
        }),
      })
      navigate("/programacion")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="nc-page">
      <h1>Agregar visita</h1>
      <p className="nc-kicker">Tiene que caer entre el {current ? day(current.week_start) : "lunes"} y el {current ? day(current.week_end) : "domingo"}.</p>
      <form className="nc-form" onSubmit={submit}>
        <label className="nc-field">
          <span className="nc-field-label">Cliente</span>
          <select className="nc-input" value={clientId} onChange={(event) => setClientId(event.target.value)} required>
            <option value="">Elige</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </label>
        {sites.length > 1 ? (
          <label className="nc-field">
            <span className="nc-field-label">Sede</span>
            <select className="nc-input" value={siteId} onChange={(event) => setSiteId(event.target.value)}>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
          </label>
        ) : null}
        <TextField label="Fecha" type="date" value={date} min={current?.week_start} max={current?.week_end} onChange={(event) => setDate(event.target.value)} required />
        <label className="nc-field">
          <span className="nc-field-label">Franja</span>
          <select className="nc-input" value={slot} onChange={(event) => setSlot(event.target.value)}>
            <option value="MANANA">Mañana</option>
            <option value="TARDE">Tarde</option>
            <option value="DIA">Día</option>
          </select>
        </label>
        <label className="nc-field">
          <span className="nc-field-label">Motivo</span>
          <select className="nc-input" value={reasonId} onChange={(event) => setReasonId(event.target.value)}>
            <option value="">Sin motivo</option>
            {reasons.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <TextField label="Objetivo" value={objective} onChange={(event) => setObjective(event.target.value)} />
        {error ? <p className="nc-note">{error}</p> : null}
        <Button type="submit" block disabled={busy || !current?.plan}>{busy ? "Guardando…" : "Agregar"}</Button>
      </form>
    </section>
  )
}
