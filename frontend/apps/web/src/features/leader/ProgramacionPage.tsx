import { FormEvent, useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, Icon, PageHead, Tabs, type BadgeTone } from "@nc/ui"
import { LeaderPortalPage } from "./LeaderPortalPage"
import { useToast } from "../shared/useToast"

type Suggestion = {
  client_id: string
  client_name: string
  municipality: string
  site_id?: string | null
  reason: string
  band: string
  suggested_day: string
  suggested_slot: string
}

type LoadRow = {
  rtc_id: string
  first_name: string
  last_name: string
  zone_name: string
  visits_today: number
  visits_week: number
  week_target: number
}

type ComplianceRow = {
  rtc_id: string
  rtc_name: string
  zone_name: string
  reason: string
  plan_id: string | null
  status: string
  is_late: boolean
  submitted_at: string | null
  planned: number
  done: number
  bucket: string
}

type ComplianceReport = {
  iso_year: number
  iso_week: number
  week_start: string
  week_end: string
  deadline_at: string
  results: ComplianceRow[]
}

type Person = { id: string; first_name: string; last_name: string; zone_name?: string }
type ClientRow = { id: string; name: string; municipality: string }

const BUCKET: Record<string, string> = {
  a_tiempo: "A tiempo",
  tarde: "Tarde",
  faltante: "Sin envío",
  pendiente: "Pendiente",
}

const PLAN_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  BORRADOR: { label: "Borrador", tone: "neutral" },
  ENVIADA: { label: "Enviada", tone: "accent" },
  APROBADA: { label: "Aprobada", tone: "success" },
  DEVUELTA: { label: "Devuelta", tone: "warning" },
}

function day(iso: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" }).format(
    new Date(`${iso}T12:00:00-05:00`),
  )
}

function weekRange(start: string, end: string) {
  return `Semana del ${day(start)} al ${day(end)}`
}

function deadlineLine(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(iso))
}

function sentLabel(row: ComplianceRow) {
  if (!row.submitted_at) return "—"
  const when = new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(row.submitted_at))
  return row.is_late ? `${when} · tarde` : when
}

function prevWeekParams(year: number, week: number) {
  let py = year
  let pw = week - 1
  if (pw < 1) {
    py -= 1
    pw = 52
  }
  return { py, pw }
}

function prevWeekLabel(status: string | undefined) {
  if (!status) return "Sin envío"
  return PLAN_STATUS[status]?.label || status
}

export function LeaderProgramacionPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice || ""
  const [tab, setTab] = useState("programacion")
  const [report, setReport] = useState<ComplianceReport | null>(null)
  const [prevByRtc, setPrevByRtc] = useState<Map<string, ComplianceRow>>(new Map())
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  const [people, setPeople] = useState<Person[]>([])
  const [loads, setLoads] = useState<Record<string, LoadRow>>({})
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [rtcId, setRtcId] = useState("")
  const [clients, setClients] = useState<ClientRow[]>([])
  const [clientId, setClientId] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("09:00")
  const [assignError, setAssignError] = useState("")
  const [assignOk, setAssignOk] = useState("")
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [bulkBusy, setBulkBusy] = useState(false)
  const toast = useToast()
  const pickedCount = suggestions.filter((x) => picked[x.client_id]).length

  const canRequire = user.permissions.includes("weekly_plan.require")

  function loadReport() {
    api<ComplianceReport>("/api/v1/weekly-plans/compliance")
      .then(async (data) => {
        setReport(data)
        const { py, pw } = prevWeekParams(data.iso_year, data.iso_week)
        try {
          const prev = await api<ComplianceReport>(`/api/v1/weekly-plans/compliance?iso_year=${py}&iso_week=${pw}`)
          setPrevByRtc(new Map(prev.results.map((row) => [row.rtc_id, row])))
        } catch {
          setPrevByRtc(new Map())
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }

  useEffect(() => {
    loadReport()
  }, [])

  useEffect(() => {
    api<{ results: Person[] }>("/api/v1/users?role=RTC&active=1")
      .then((data) => setPeople(data.results))
      .catch(() => setPeople([]))
    api<{ results: LoadRow[] }>("/api/v1/visits/load")
      .then((data) => {
        const map: Record<string, LoadRow> = {}
        for (const row of data.results) map[row.rtc_id] = row
        setLoads(map)
      })
      .catch(() => setLoads({}))
    api<{ results: ClientRow[] }>("/api/v1/clients")
      .then((data) => {
        setClients(data.results)
        setClientId(data.results[0]?.id || "")
      })
      .catch(() => setClients([]))
  }, [])

  useEffect(() => {
    if (!rtcId && people[0]) setRtcId(people[0].id)
  }, [people, rtcId])

  useEffect(() => {
    if (!rtcId) return
    setPicked({})
    api<{ results: Suggestion[] }>(`/api/v1/visits/suggestions?rtc_id=${rtcId}`)
      .then((data) => setSuggestions(data.results))
      .catch(() => setSuggestions([]))
  }, [rtcId])

  const selectedRtc = useMemo(() => people.find((p) => p.id === rtcId), [people, rtcId])
  const selectedLoad = loads[rtcId]

  async function assignPicked() {
    if (!selectedRtc || pickedCount === 0) return
    setBulkBusy(true)
    setAssignError("")
    try {
      let ok = 0
      for (const item of suggestions.filter((s) => picked[s.client_id])) {
        const hour = item.suggested_slot === "TARDE" ? "15:00" : "09:00"
        await api("/api/v1/visits/assign", {
          method: "POST",
          body: JSON.stringify({
            client_id: item.client_id,
            site_id: item.site_id,
            rtc_id: rtcId,
            scheduled_start: `${item.suggested_day}T${hour}:00-05:00`,
            priority: item.band === "B1" ? "ALTA" : "MEDIA",
          }),
        })
        ok += 1
      }
      toast.show(`${ok} ${ok === 1 ? "visita asignada" : "visitas asignadas"} a ${selectedRtc.first_name} ${selectedRtc.last_name}.`)
      setPicked({})
      const load = await api<{ results: LoadRow[] }>("/api/v1/visits/load")
      const map: Record<string, LoadRow> = {}
      for (const row of load.results) map[row.rtc_id] = row
      setLoads(map)
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "No se pudo asignar")
    } finally {
      setBulkBusy(false)
    }
  }

  async function approve(planId: string) {
    setBusyId(planId)
    setError("")
    try {
      await api(`/api/v1/weekly-plans/${planId}/approve`, { method: "POST", body: JSON.stringify({ note: "" }) })
      loadReport()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aprobar")
    } finally {
      setBusyId(null)
    }
  }

  async function giveBack(planId: string) {
    const note = window.prompt("Nota para el comercial (obligatoria):")?.trim() || ""
    if (note.length < 3) {
      setError("Escribe una nota de al menos 3 caracteres para devolver la programación.")
      return
    }
    setBusyId(planId)
    setError("")
    try {
      await api(`/api/v1/weekly-plans/${planId}/return`, { method: "POST", body: JSON.stringify({ note }) })
      loadReport()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo devolver")
    } finally {
      setBusyId(null)
    }
  }

  async function assignVisit(event: FormEvent) {
    event.preventDefault()
    setAssignError("")
    setAssignOk("")
    if (!date || !time || !clientId || !rtcId) {
      setAssignError("Completa comercial, cliente, fecha y hora.")
      return
    }
    try {
      const scheduled = new Date(`${date}T${time}`)
      const data = await api<{ warning: string | null; client_name: string }>("/api/v1/visits/assign", {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          rtc_id: rtcId,
          reason_id: null,
          priority: "MEDIA",
          scheduled_start: scheduled.toISOString(),
        }),
      })
      const extra = data.warning ? ` ${data.warning}` : ""
      setAssignOk(`Visita a ${data.client_name} asignada.${extra}`)
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "No se pudo asignar")
    }
  }

  const eyebrow = report
    ? `${weekRange(report.week_start, report.week_end)} · plazo ${deadlineLine(report.deadline_at)}`
    : undefined

  const planActions = canRequire ? (
    <Link className="nc-btn nc-btn-secondary" to="/consola/programacion/exigir">
      Exigir programación
    </Link>
  ) : undefined

  return (
    <LeaderPortalPage user={user} onLogout={onLogout}>
      {eyebrow ? <span className="nc-portal-eyebrow">{eyebrow}</span> : null}
      <PageHead title="Programación y asignación" actions={planActions} />
      {notice ? <p className="nc-ok">{notice}</p> : null}
      {error ? <p className="nc-note">{error}</p> : null}
      <Tabs
        label="Programación"
        value={tab}
        onChange={setTab}
        items={[
          { id: "programacion", label: "Programación semanal" },
          { id: "asignar", label: "Asignar visitas" },
        ]}
      />

      {tab === "programacion" ? (
        <div className="nc-table-wrap nc-portal-card">
          <table className="nc-table">
            <thead>
              <tr>
                <th>Comercial</th>
                <th>Por qué</th>
                <th>Estado</th>
                <th>Enviada</th>
                <th>Semana anterior</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {!report || report.results.length === 0 ? (
                <tr>
                  <td className="nc-empty" colSpan={6}>
                    Nadie tiene la programación exigida esta semana.
                  </td>
                </tr>
              ) : (
                report.results.map((row) => {
                  const st = row.status ? PLAN_STATUS[row.status] : null
                  const prev = prevByRtc.get(row.rtc_id)
                  const showActions = row.plan_id && row.status === "ENVIADA"
                  return (
                    <tr key={row.rtc_id}>
                      <td>
                        <div>{row.rtc_name}</div>
                        <span className="nc-portal-muted">
                          {row.zone_name || "—"} · {row.planned} visitas
                        </span>
                      </td>
                      <td className="nc-portal-muted">{row.reason || "—"}</td>
                      <td>
                        {st ? <Badge tone={st.tone}>{st.label}</Badge> : <span className="nc-portal-muted">—</span>}
                      </td>
                      <td>
                        {row.submitted_at ? (
                          <>
                            {sentLabel(row)}{" "}
                            <Badge tone={row.bucket === "faltante" || row.bucket === "tarde" ? "warning" : "success"}>
                              {BUCKET[row.bucket] || row.bucket}
                            </Badge>
                          </>
                        ) : (
                          BUCKET[row.bucket] || "—"
                        )}
                      </td>
                      <td className="nc-portal-muted">{prevWeekLabel(prev?.status)}</td>
                      <td>
                        {showActions && row.plan_id ? (
                          <div className="nc-panel-actions">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={busyId === row.plan_id}
                              onClick={() => giveBack(row.plan_id!)}
                            >
                              Devolver
                            </Button>
                            <Button type="button" disabled={busyId === row.plan_id} onClick={() => approve(row.plan_id!)}>
                              Aprobar
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="nc-plan-assign">
          <div className="nc-plan-assign-rtcs">
            <span className="nc-portal-eyebrow">1 · Elige el comercial</span>
            {people.map((person) => {
              const active = person.id === rtcId
              const load = loads[person.id]
              const dayLoad = load?.visits_today ?? 0
              const weekLoad = load?.visits_week ?? 0
              const target = load?.week_target ?? 15
              return (
                <button
                  key={person.id}
                  type="button"
                  className={active ? "nc-plan-rtc is-active" : "nc-plan-rtc"}
                  onClick={() => setRtcId(person.id)}
                >
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span>{person.first_name} {person.last_name}</span>
                    <span className="nc-portal-muted">{dayLoad} hoy</span>
                  </span>
                  <span className="nc-plan-load-track">
                    <span className="nc-plan-load-fill" style={{ width: `${Math.min(100, (weekLoad / target) * 100)}%` }} />
                  </span>
                  <span className="nc-portal-muted">{weekLoad} de {target} esta semana · {person.zone_name || "Sin zona"}</span>
                </button>
              )
            })}
          </div>
          <div className="nc-plan-assign-main">
            <span className="nc-portal-eyebrow">
              2 · Elige los clientes sugeridos{selectedRtc ? ` para ${selectedRtc.first_name} ${selectedRtc.last_name}` : ""}
            </span>
            {suggestions.length === 0 ? <p className="nc-portal-muted">No hay sugerencias para este comercial.</p> : null}
            {suggestions.map((item) => {
              const on = Boolean(picked[item.client_id])
              return (
                <button
                  key={item.client_id}
                  type="button"
                  className={on ? "nc-plan-sugg is-on" : "nc-plan-sugg"}
                  aria-pressed={on}
                  onClick={() => setPicked((p) => ({ ...p, [item.client_id]: !p[item.client_id] }))}
                >
                  <span className="nc-plan-sugg-box">{on ? <Icon name="check" small /> : null}</span>
                  <span className="nc-plan-sugg-body">
                    <span className="nc-leader-link-title">
                      {item.client_name} <span className="nc-portal-muted">· {item.municipality}</span>
                    </span>
                    <span className="nc-portal-muted">{item.reason}</span>
                  </span>
                </button>
              )
            })}
            {(selectedLoad?.visits_today ?? 0) > 8 ? (
              <Badge tone="warning" icon="alert">Ya tiene más de 8 visitas hoy · asígnalas para otro día</Badge>
            ) : null}
            <div className="nc-plan-sugg-foot">
              <span className="nc-portal-muted">{pickedCount} seleccionadas</span>
              <Button
                type="button"
                icon="check"
                disabled={pickedCount === 0 || !selectedRtc || bulkBusy}
                onClick={() => void assignPicked()}
              >
                {bulkBusy ? "Asignando…" : "Asignar visitas"}
              </Button>
            </div>
            <form className="nc-portal-card nc-portal-form" onSubmit={assignVisit}>
              <h2 className="nc-portal-card-title">
                Asignación manual{selectedRtc ? ` · ${selectedRtc.first_name} ${selectedRtc.last_name}` : ""}
              </h2>
              <label className="nc-field">
                <span className="nc-field-label">Cliente</span>
                <select className="nc-input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} · {client.municipality}
                    </option>
                  ))}
                </select>
              </label>
              <label className="nc-field">
                <span className="nc-field-label">Fecha</span>
                <input className="nc-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
              <label className="nc-field">
                <span className="nc-field-label">Hora</span>
                <input className="nc-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
              </label>
              {assignError ? <p className="nc-note">{assignError}</p> : null}
              {assignOk ? <p className="nc-ok">{assignOk}</p> : null}
              <Button type="submit">Asignar</Button>
            </form>
          </div>
        </div>
      )}
      {toast.node}
    </LeaderPortalPage>
  )
}
