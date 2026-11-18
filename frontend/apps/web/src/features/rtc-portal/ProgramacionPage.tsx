import { FormEvent, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, DataTable } from "@nc/ui"
import { PortalPage } from "./PortalPage"
import { useToast } from "../shared/useToast"
import { planDeadline, planWeekRange, visitDayShort } from "./shared/format"
import {
  PLAN_SLOT,
  PLAN_STATUS,
  planNotice,
  type WeeklyPlanCurrent,
} from "./shared/weekly-plan"

type Suggestion = {
  client_id: string
  client_name: string
  municipality: string
  site_id?: string | null
  reason: string
  band: "B1" | "B2"
  suggested_day: string
  suggested_slot: string
}

export function ProgramacionPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [current, setCurrent] = useState<WeeklyPlanCurrent | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState<Record<string, boolean>>({})
  const toast = useToast()

  function load() {
    api<WeeklyPlanCurrent>("/api/v1/weekly-plans/current")
      .then(async (data) => {
        if (data.required && !data.plan) {
          const opened = await api<WeeklyPlanCurrent>("/api/v1/weekly-plans/current", { method: "POST", body: "{}" })
          setCurrent(opened)
          return
        }
        setCurrent(data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }

  useEffect(() => {
    load()
    api<{ results: Suggestion[] }>("/api/v1/visits/suggestions")
      .then((data) => setSuggestions(data.results))
      .catch(() => setSuggestions([]))
  }, [])

  async function propose(item: Suggestion) {
    if (!current?.plan?.editable) return
    setError("")
    try {
      await api(`/api/v1/weekly-plans/${current.plan.id}/items`, {
        method: "POST",
        body: JSON.stringify({
          client_id: item.client_id,
          site_id: item.site_id,
          planned_date: item.suggested_day,
          slot: item.suggested_slot,
          objective: item.reason,
        }),
      })
      setAdded((a) => ({ ...a, [item.client_id]: true }))
      toast.show(`${item.client_name} quedó en tu programación.`)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo proponer")
    }
  }

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

  async function remove(itemId: string) {
    setError("")
    try {
      await api(`/api/v1/weekly-plan-items/${itemId}`, { method: "DELETE" })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar")
    }
  }

  if (!current && !error) {
    return (
      <PortalPage user={user} onLogout={onLogout}>
        <p className="nc-portal-muted">Cargando programación…</p>
      </PortalPage>
    )
  }

  if (!current?.required) {
    return (
      <PortalPage user={user} onLogout={onLogout}>
        <header className="nc-portal-hero">
          <h1>Programación semanal</h1>
        </header>
        <p className="nc-portal-muted">Gerencia no te está pidiendo la programación esta semana.</p>
      </PortalPage>
    )
  }

  const plan = current.plan
  const notice = planNotice(current)
  const sent = plan && !plan.editable && plan.status !== "DEVUELTA"
  const countLabel = plan ? `${plan.items.length} visita${plan.items.length === 1 ? "" : "s"} programada${plan.items.length === 1 ? "" : "s"}` : "Sin borrador"

  return (
    <PortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <span className="nc-portal-eyebrow">
            Semana del {planWeekRange(current.week_start, current.week_end)} · {countLabel}
          </span>
          <h1>Programación semanal</h1>
        </div>
        {sent && !plan?.is_late ? (
          <Badge tone="success" icon="check">
            Enviada a tiempo
          </Badge>
        ) : null}
        {sent && plan?.is_late ? (
          <Badge tone="warning" icon="alert">
            Enviada tarde
          </Badge>
        ) : null}
      </header>

      {notice ? <p className="nc-note">{notice}</p> : null}
      {error ? <p className="nc-note">{error}</p> : null}
      <p className="nc-portal-muted">Plazo: {planDeadline(current.deadline_at)}.</p>

      <DataTable
        rows={plan?.items ?? []}
        emptyMessage="Todavía no hay visitas en esta semana."
        columns={[
          { key: "day", header: "Día", render: (item) => visitDayShort(item.planned_date) },
          { key: "slot", header: "Franja", render: (item) => PLAN_SLOT[item.slot] || item.slot },
          {
            key: "client",
            header: "Cliente",
            render: (item) => (
              <div>
                <div className="nc-portal-task-title">{item.client_name}</div>
              </div>
            ),
          },
          { key: "reason", header: "Motivo", render: (item) => item.reason || "—" },
          { key: "objective", header: "Objetivo", render: (item) => item.objective || "—" },
          {
            key: "actions",
            header: "",
            render: (item) =>
              plan?.editable ? (
                <Button variant="quiet" type="button" onClick={() => remove(item.id)}>
                  Quitar
                </Button>
              ) : null,
          },
        ]}
      />

      <section className="nc-portal-stack">
        <div className="nc-portal-card-head">
          <h2 className="nc-mgmt-section-title">Sugeridos para tu semana</h2>
          <span className="nc-portal-muted">Según potencial abierto y días sin visita</span>
        </div>
        {suggestions.length === 0 ? (
          <p className="nc-portal-muted">No hay sugerencias por ahora.</p>
        ) : (
          <div className="nc-plan-suggest-cards">
            {suggestions.map((item) => (
              <article key={item.client_id} className="nc-plan-suggest-card">
                <span className="nc-portal-actions">
                  <Badge tone={item.band === "B1" ? "primary" : "neutral"}>{item.band}</Badge>
                  <span className="nc-portal-muted">
                    {visitDayShort(item.suggested_day)} · {PLAN_SLOT[item.suggested_slot] || item.suggested_slot}
                  </span>
                </span>
                <span className="nc-portal-task-title">{item.client_name}</span>
                <span className="nc-portal-muted">{item.municipality}</span>
                <span className="nc-portal-muted">{item.reason}</span>
                <Button
                  type="button"
                  variant={added[item.client_id] ? "quiet" : "secondary"}
                  icon={added[item.client_id] ? "check" : "plus"}
                  disabled={Boolean(added[item.client_id]) || (plan ? !plan.editable : false)}
                  onClick={() => propose(item)}
                >
                  {added[item.client_id] ? "Propuesta" : "Proponer visita"}
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>

      {plan?.editable ? (
        <span className="nc-portal-actions nc-portal-actions-end">
          <Link className="nc-btn nc-btn-secondary" to="/portal/programacion/nueva">
            Agregar visita
          </Link>
          <Button type="button" onClick={send} disabled={busy}>
            {busy ? "Enviando…" : "Enviar a mi líder"}
          </Button>
        </span>
      ) : plan ? (
        <p className="nc-portal-muted">{PLAN_STATUS[plan.status] || plan.status}</p>
      ) : null}
      {toast.node}
    </PortalPage>
  )
}

export function ProgramacionNuevaPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [current, setCurrent] = useState<WeeklyPlanCurrent | null>(null)
  const [clients, setClients] = useState<{ id: string; name: string; sites?: { id: string; name: string }[] }[]>([])
  const [reasons, setReasons] = useState<{ id: string; name: string }[]>([])
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
    api<WeeklyPlanCurrent>("/api/v1/weekly-plans/current").then(async (data) => {
      const next =
        data.required && !data.plan
          ? await api<WeeklyPlanCurrent>("/api/v1/weekly-plans/current", { method: "POST", body: "{}" })
          : data
      setCurrent(next)
      setDate(next.week_start)
    })
    api<{ results: typeof clients }>("/api/v1/clients").then((data) => setClients(data.results))
    api<{ results: typeof reasons }>("/api/v1/visit-reasons").then((data) => setReasons(data.results))
  }, [])

  useEffect(() => {
    if (!clientId) return
    api<{ sites?: { id: string; name: string }[] }>(`/api/v1/clients/${clientId}`).then((client) => {
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
      window.location.assign("/portal/programacion")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar")
    } finally {
      setBusy(false)
    }
  }

  return (
    <PortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-hero">
        <Link className="nc-text-link" to="/portal/programacion">
          Volver a la programación
        </Link>
        <h1>Agregar visita</h1>
        <p className="nc-portal-muted">
          Debe caer entre el {current ? visitDayShort(current.week_start) : "lunes"} y el{" "}
          {current ? visitDayShort(current.week_end) : "domingo"}.
        </p>
      </header>

      <form className="nc-portal-card nc-portal-form" onSubmit={submit}>
        <label className="nc-field">
          <span className="nc-field-label">Cliente</span>
          <select className="nc-input" value={clientId} onChange={(event) => setClientId(event.target.value)} required>
            <option value="">Elige</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
        {sites.length > 1 ? (
          <label className="nc-field">
            <span className="nc-field-label">Sede</span>
            <select className="nc-input" value={siteId} onChange={(event) => setSiteId(event.target.value)}>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="nc-field">
          <span className="nc-field-label">Fecha</span>
          <input
            className="nc-input"
            type="date"
            value={date}
            min={current?.week_start}
            max={current?.week_end}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </label>
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
            {reasons.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="nc-field">
          <span className="nc-field-label">Objetivo</span>
          <textarea className="nc-input" value={objective} onChange={(event) => setObjective(event.target.value)} rows={3} />
        </label>
        {error ? <p className="nc-note">{error}</p> : null}
        <Button type="submit" block disabled={busy || !current?.plan}>
          {busy ? "Guardando…" : "Agregar"}
        </Button>
      </form>
    </PortalPage>
  )
}
