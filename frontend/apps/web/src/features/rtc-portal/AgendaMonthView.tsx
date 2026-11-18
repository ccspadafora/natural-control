import { useEffect, useMemo, useState } from "react"
import { api } from "@nc/api"
import { WEEKDAY_HEADERS, buildMonthCells, formatMonthTitle, isoToDayKey } from "./shared/agendaCalendar"
import { agendaDayParam } from "./shared/format"

type VisitRow = {
  id: string
  scheduled_start: string | null
  late: boolean
}

type Props = {
  anchor?: Date
  onPickDay?: (dateKey: string) => void
}

export function AgendaMonthView({ anchor = new Date(), onPickDay }: Props) {
  const todayKey = agendaDayParam(anchor)
  const [y, m] = todayKey.split("-").map(Number)
  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const monthEnd = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`

  const [rows, setRows] = useState<VisitRow[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    setError("")
    api<{ results: VisitRow[] }>(`/api/v1/visits/agenda?from=${monthStart}&to=${monthEnd}&view=range`)
      .then((data) => setRows(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el mes"))
  }, [monthStart, monthEnd])

  const counts = useMemo(() => {
    const map: Record<string, { total: number; late: number }> = {}
    for (const row of rows) {
      const key = isoToDayKey(row.scheduled_start)
      if (!key) continue
      if (!map[key]) map[key] = { total: 0, late: 0 }
      map[key].total += 1
      if (row.late) map[key].late += 1
    }
    return map
  }, [rows])

  const cells = useMemo(() => buildMonthCells(todayKey, todayKey, counts), [todayKey, counts])

  return (
    <section className="nc-agenda-cal" aria-label="Calendario mensual">
      <div className="nc-agenda-cal-toolbar">
        <h2 className="nc-agenda-cal-title">{formatMonthTitle(anchor)}</h2>
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
      <div className="nc-agenda-month-scroll">
        <div className="nc-agenda-month-grid">
          {WEEKDAY_HEADERS.map((label) => (
            <div key={label} className="nc-agenda-month-weekday">
              {label}
            </div>
          ))}
          {cells.map((cell) => (
            <button
              key={cell.dateKey + String(cell.inMonth)}
              type="button"
              className={["nc-agenda-month-cell", cell.inMonth ? "" : " is-out", cell.isToday ? " is-today" : ""].join("")}
              disabled={!cell.inMonth}
              onClick={() => cell.inMonth && onPickDay?.(cell.dateKey)}
            >
              <span className="nc-agenda-month-num">{cell.day}</span>
              {cell.inMonth && cell.visitCount > 0 ? (
                <span className="nc-agenda-month-meta">
                  <span>
                    {cell.visitCount} visita{cell.visitCount === 1 ? "" : "s"}
                  </span>
                  {cell.lateCount > 0 ? (
                    <span className="nc-agenda-month-late">
                      <i /> {cell.lateCount} atrasada{cell.lateCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
