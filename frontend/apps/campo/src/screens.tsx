import { FormEvent, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api } from "@nc/api"
import { Button, Icon, TextField } from "@nc/ui"

type ClientRow = {
  id: string
  name: string
  sites?: { id: string; name: string; municipality: string }[]
}

type Option = { id: string; name: string; department?: string }

export function Schedule() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [reasons, setReasons] = useState<Option[]>([])
  const [siteId, setSiteId] = useState("")
  const [reasonId, setReasonId] = useState("")
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }))
  const [time, setTime] = useState("09:00")
  const [warning, setWarning] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<ClientRow>(`/api/v1/clients/${id}`).then((client) => setSiteId(client.sites?.[0]?.id || ""))
    api<{ results: Option[] }>("/api/v1/visit-reasons").then((data) => setReasons(data.results))
  }, [id])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      const created = await api<{ warning: string | null }>("/api/v1/visits", {
        method: "POST",
        body: JSON.stringify({
          client_id: id,
          site_id: siteId,
          reason_id: reasonId || null,
          scheduled_start: new Date(`${date}T${time}:00-05:00`).toISOString(),
          duration_minutes: 60,
        }),
      })
      if (created.warning) setWarning(created.warning)
      else navigate(`/clientes/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agendar")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header className="nc-campo-head">
        <div className="nc-campo-head-row">
          <Link to={`/clientes/${id}`} className="nc-campo-icon-btn" aria-label="Volver">
            <Icon name="chevronLeft" />
          </Link>
          <h1>Agendar visita</h1>
        </div>
      </header>
      <section className="nc-campo-page">
        <p className="nc-kicker">Dura 60 minutos. Si se cruza con otra, te avisamos y puedes dejarla.</p>
        <form className="nc-form" onSubmit={submit}>
          <TextField label="Fecha" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          <TextField label="Hora" type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
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
          {warning ? <p className="nc-note">{warning}</p> : null}
          {error ? <p className="nc-note">{error}</p> : null}
          {warning ? (
            <Button type="button" block onClick={() => navigate(`/clientes/${id}`)}>
              Listo
            </Button>
          ) : (
            <Button type="submit" block disabled={busy}>
              {busy ? "Agendando…" : "Agendar"}
            </Button>
          )}
        </form>
      </section>
    </>
  )
}
