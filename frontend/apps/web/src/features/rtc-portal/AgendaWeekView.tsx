import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "@nc/api"
import {
  CAL_GRID_H,
  CAL_HOURS,
  HP,
  STATUS_STYLE,
  eventHeight,
  eventTop,
  formatWeekTitle,
  hourLabel,
  isoToDayKey,
  isoToHour,
} from "./shared/agendaCalendar"
import { weekDayParams } from "./shared/format"

type VisitRow = {
  id: string
  client_id: string
  client_name: string
  municipality: string
  status: string
  scheduled_start: string | null
  late: boolean
}

type Props = {
  anchor?: Date
}

export function AgendaWeekView({ anchor = new Date() }: Props) {
  const navigate = useNavigate()
  const days = useMemo(() => weekDayParams(anchor), [anchor])
  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
  const [rows, setRows] = useState<VisitRow[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    const from = days[0]
    const to = days[days.length - 1]
    setError("")
    api<{ results: VisitRow[] }>(`/api/v1/visits/agenda?from=${from}&to=${to}&view=range`)
      .then((data) => setRows(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la semana"))
  }, [days])

  const byDay = useMemo(() => {
    const map: Record<string, VisitRow[]> = {}
    for (const d of days) map[d] = []
    for (const row of rows) {
      const key = isoToDayKey(row.scheduled_start)
      if (map[key]) map[key].push(row)
    }
    return map
  }, [rows, days])

  const dayMeta = days.map((key) => {
    const d = new Date(`${key}T12:00:00-05:00`)
    const label = new Intl.DateTimeFormat("es-CO", { weekday: "short", timeZone: "America/Bogota" }).format(d)
    return { key, label: label.replace(".", ""), day: Number(key.split("-")[2]), today: key === todayKey }
  })

  return (
    <section className="nc-agenda-cal" aria-label="Calendario semanal">
      <div className="nc-agenda-cal-toolbar">
        <h2 className="nc-agenda-cal-title">{formatWeekTitle(days)}</h2>
        <ul className="nc-agenda-legend">
          <li>
            <i style={{ background: "var(--success-solid)" }} /> Realizada
          </li>
          <li>
            <i style={{ background: "var(--primary)" }} /> Programada
          </li>
          <li>
            <i style={{ background: "var(--danger-solid)" }} /> Atrasada
          </li>
        </ul>
      </div>
      {error ? <p className="nc-note">{error}</p> : null}
      <div className="nc-agenda-week-scroll">
        <div className="nc-agenda-week-grid" style={{ ["--nc-agenda-hp" as string]: `${HP}px`, gridTemplateColumns: `72px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="nc-agenda-week-corner" />
          {dayMeta.map((d) => (
            <div key={d.key} className={`nc-agenda-week-head${d.today ? " is-today" : ""}`}>
              <span>{d.label}</span>
              <span className="nc-agenda-week-daynum">{d.day}</span>
            </div>
          ))}
          <div className="nc-agenda-week-hours" style={{ height: CAL_GRID_H }}>
            {CAL_HOURS.map((h) => (
              <span key={h} style={{ top: (h - 7) * HP }}>
                {hourLabel(h)}
              </span>
            ))}
          </div>
          {dayMeta.map((d) => (
            <div key={d.key} className={`nc-agenda-week-col${d.today ? " is-today" : ""}`} style={{ height: CAL_GRID_H }}>
              {CAL_HOURS.slice(0, -1).map((h) => (
                <div key={h} className="nc-agenda-week-line" style={{ top: (h - 7) * HP }} />
              ))}
              {(byDay[d.key] ?? []).map((e) => {
                const status = e.late && e.status === "PROGRAMADA" ? "ATRASADA" : e.status
                const style = STATUS_STYLE[status] ?? STATUS_STYLE.PROGRAMADA
                const startHour = Math.min(Math.max(isoToHour(e.scheduled_start), 7), 17)
                return (
                  <button
                    key={e.id}
                    type="button"
                    className="nc-agenda-event"
                    style={{
                      top: eventTop(startHour),
                      height: eventHeight(1),
                      background: style.bg,
                    }}
                    title={`${e.client_name} · ${e.municipality}`}
                    onClick={() => navigate(`/portal/clientes/${e.client_id}`)}
                  >
                    <span className="nc-agenda-event-time">
                      <i style={{ background: style.dot }} />
                      {hourLabel(startHour)}
                    </span>
                    <span className="nc-agenda-event-client">{e.client_name}</span>
                    <span className="nc-agenda-event-mun">{e.municipality}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {rows.length === 0 && !error ? <p className="nc-portal-muted" style={{ padding: "var(--space-4)" }}>No hay visitas esta semana.</p> : null}
    </section>
  )
}
