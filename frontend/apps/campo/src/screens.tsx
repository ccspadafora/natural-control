import { FormEvent, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api } from "@nc/api"
import { enqueueMutation, isOfflineMode } from "./offline"
import { formatMoney } from "@nc/domain"
import { Button, TextField } from "@nc/ui"

type ClientRow = {
  id: string
  name: string
  municipality: string
  phone: string
  is_new: boolean
  last_visit_at: string | null
  price_list?: string | null
  sites?: { id: string; name: string; municipality: string }[]
}

type Option = { id: string; name: string; department?: string }

function ago(iso: string | null) {
  if (!iso) return "Sin visitas"
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return "Visitado hoy"
  if (days === 1) return "Hace 1 día"
  return `Hace ${days} días`
}

export function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState<ClientRow | null>(null)
  const [products, setProducts] = useState<{ id: string; name: string; presentation: string; unit_price: string | null }[]>([])
  const [priceList, setPriceList] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    api<ClientRow>(`/api/v1/clients/${id}`).then(setClient).catch((err) => setError(err instanceof Error ? err.message : "No se pudo abrir el cliente"))
    api<{ results: typeof products; price_list: string | null }>(`/api/v1/products?client=${id}`)
      .then((data) => {
        setProducts(data.results)
        setPriceList(data.price_list || "")
      })
      .catch(() => setProducts([]))
  }, [id])

  if (error) return <p className="nc-note">{error}</p>
  if (!client) return <p className="nc-kicker">Cargando…</p>
  return (
    <section className="nc-page">
      <h1>{client.name}</h1>
      <p className="nc-kicker">{client.municipality}{client.phone ? ` · ${client.phone}` : ""}</p>
      <span className="nc-row">
        <Link className="nc-text-link" to={`/clientes/${client.id}/agendar`}>Agendar visita</Link>
        <button type="button" className="nc-text-link" onClick={() => {
          api<{ id: string }>("/api/v1/visits/now", { method: "POST", body: JSON.stringify({ client_id: client.id }) })
            .then((created) => navigate(`/visitas/${created.id}`))
            .catch((err) => setError(err instanceof Error ? err.message : "No se pudo abrir la visita"))
        }}>Registrar ahora</button>
      </span>
      <h2 style={{ margin: "8px 0 0", font: "700 17px/22px var(--font-sans)" }}>Precios{priceList ? ` · ${priceList}` : ""}</h2>
      <ul className="nc-list">
        {products.map((product) => (
          <li key={product.id} className="nc-card">
            <strong>{product.name}</strong>
            <span>{product.presentation} · {product.unit_price ? formatMoney(product.unit_price) : "Sin precio en su lista"}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function NewClient() {
  const navigate = useNavigate()
  const [types, setTypes] = useState<Option[]>([])
  const [towns, setTowns] = useState<Option[]>([])
  const [kind, setKind] = useState("PERSONA")
  const [legalName, setLegalName] = useState("")
  const [typeId, setTypeId] = useState("")
  const [townId, setTownId] = useState("")
  const [phone, setPhone] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ results: Option[] }>("/api/v1/client-types").then((data) => setTypes(data.results))
    api<{ results: Option[] }>("/api/v1/municipalities").then((data) => setTowns(data.results))
  }, [])

  function locate() {
    if (!navigator.geolocation) {
      setError("Este navegador no entrega la ubicación. Escribe latitud y longitud.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6))
        setLongitude(position.coords.longitude.toFixed(6))
        setAccuracy(position.coords.accuracy)
        setError("")
      },
      () => setError("No pudimos leer el GPS. Escribe latitud y longitud."),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!consent) {
      setError("Autoriza el tratamiento de datos para registrar el cliente.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const body = {
        kind,
        legal_name: legalName,
        client_type_id: typeId,
        municipality_id: townId,
        phone,
        latitude,
        longitude,
        accuracy_m: accuracy,
        location_source: accuracy ? "GPS_DEVICE" : "MAP_PIN",
        data_consent: true,
      }
      if (isOfflineMode()) {
        await enqueueMutation({ method: "POST", path: "/api/v1/clients", body })
        navigate("/sincronizacion")
        return
      }
      const created = await api<ClientRow>("/api/v1/clients", {
        method: "POST",
        body: JSON.stringify(body),
      })
      navigate(`/clientes/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="nc-page">
      <h1>Nuevo cliente</h1>
      <form className="nc-form" onSubmit={submit}>
        <label className="nc-field">
          <span className="nc-field-label">Tipo</span>
          <select className="nc-input" value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="PERSONA">Persona</option>
            <option value="EMPRESA">Empresa</option>
          </select>
        </label>
        <TextField label="Nombre o razón social" value={legalName} onChange={(event) => setLegalName(event.target.value)} required />
        <label className="nc-field">
          <span className="nc-field-label">Tipo de cliente</span>
          <select className="nc-input" value={typeId} onChange={(event) => setTypeId(event.target.value)} required>
            <option value="">Elige uno</option>
            {types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="nc-field">
          <span className="nc-field-label">Municipio</span>
          <select className="nc-input" value={townId} onChange={(event) => setTownId(event.target.value)} required>
            <option value="">Elige uno</option>
            {towns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <TextField label="Teléfono" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <Button type="button" variant="secondary" onClick={locate}>Usar mi ubicación</Button>
        <TextField label="Latitud" value={latitude} onChange={(event) => setLatitude(event.target.value)} required />
        <TextField label="Longitud" value={longitude} onChange={(event) => setLongitude(event.target.value)} required />
        <label className="nc-check">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          Autorizo el tratamiento de los datos de este cliente.
        </label>
        {error ? <p className="nc-note">{error}</p> : null}
        <Button type="submit" block disabled={busy}>{busy ? "Guardando…" : "Guardar cliente"}</Button>
      </form>
    </section>
  )
}

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
    <section className="nc-page">
      <h1>Agendar visita</h1>
      <p className="nc-kicker">Dura 60 minutos. Si se cruza con otra, te avisamos y puedes dejarla.</p>
      <form className="nc-form" onSubmit={submit}>
        <TextField label="Fecha" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        <TextField label="Hora" type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
        <label className="nc-field">
          <span className="nc-field-label">Motivo</span>
          <select className="nc-input" value={reasonId} onChange={(event) => setReasonId(event.target.value)}>
            <option value="">Sin motivo</option>
            {reasons.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        {warning ? <p className="nc-note">{warning}</p> : null}
        {error ? <p className="nc-note">{error}</p> : null}
        {warning ? <Button type="button" block onClick={() => navigate(`/clientes/${id}`)}>Listo</Button> : <Button type="submit" block disabled={busy}>{busy ? "Agendando…" : "Agendar"}</Button>}
      </form>
    </section>
  )
}

