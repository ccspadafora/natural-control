import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "@nc/api"
import { formatMoney } from "@nc/domain"
import { Badge, Button, Icon, type BadgeTone } from "@nc/ui"

type Site = {
  id: string
  name: string
  municipality: string
  latitude: number | null
  longitude: number | null
  location_locked?: boolean
  location_accuracy_m?: number | null
}

type Detail = {
  id: string
  name: string
  municipality: string
  phone: string
  contact_name: string
  document: string
  segment: string | null
  status: string
  status_label: string
  status_tone: BadgeTone
  sites: Site[]
  crops: { id: string; name: string; area_ha: number; phase: string }[]
  biotechs: { id: string; name: string; origin: string; tone: BadgeTone }[]
  history: { when: string; text: string }[]
  price_list?: string | null
}

type ProductRow = { id: string; name: string; presentation: string; unit_price: string | null }

function phaseLabel(phase: string) {
  return phase === "SIEMBRA" ? "siembra" : "producción"
}

function formatHa(value: number) {
  return `${value.toLocaleString("es-CO", { maximumFractionDigits: 2 })} ha`
}

function digitsPhone(phone: string) {
  return phone.replace(/\D/g, "")
}

export function ClientDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState<Detail | null>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [priceList, setPriceList] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    api<Detail>(`/api/v1/clients/${id}`)
      .then(setClient)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo abrir el cliente"))
    api<{ results: ProductRow[]; price_list: string | null }>(`/api/v1/products?client=${id}`)
      .then((data) => {
        setProducts(data.results.slice(0, 6))
        setPriceList(data.price_list || "")
      })
      .catch(() => setProducts([]))
  }, [id])

  async function startVisit() {
    if (!client) return
    setBusy(true)
    setError("")
    try {
      const created = await api<{ id: string }>("/api/v1/visits/now", {
        method: "POST",
        body: JSON.stringify({ client_id: client.id }),
      })
      navigate(`/visitas/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir la visita")
      setBusy(false)
    }
  }

  if (error && !client) return <p className="nc-note">{error}</p>
  if (!client) return <p className="nc-kicker">Cargando…</p>

  const site = client.sites[0]
  const phone = client.phone
  const wa = digitsPhone(phone)
  const coords =
    site?.latitude != null && site?.longitude != null
      ? `${site.latitude.toFixed(4)}, ${site.longitude < 0 ? "−" : ""}${Math.abs(site.longitude).toFixed(4)}`
      : ""
  const segment = client.segment ? ` · segmento ${client.segment}` : ""

  return (
    <>
      <header className="nc-campo-head nc-campo-ficha-head">
        <div className="nc-campo-head-row">
          <button type="button" className="nc-campo-icon-btn" aria-label="Volver" onClick={() => navigate(-1)}>
            <Icon name="chevronLeft" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nc-campo-eyebrow">Cliente{segment}</div>
            <h1 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.name}</h1>
          </div>
        </div>
      </header>

      <section className="nc-campo-page nc-campo-ficha-body">
        <div className="nc-campo-ficha-hero">
          <Badge tone={client.status_tone || "neutral"}>{client.status_label || client.status}</Badge>
          <h2 className="nc-campo-ficha-title">{client.name}</h2>
          <span className="nc-campo-section-meta" style={{ font: "var(--text-body-lg)" }}>
            {client.contact_name || "Sin contacto"} · {client.municipality}
          </span>
          {client.document ? <span className="nc-campo-mono">{client.document}</span> : null}
        </div>

        <div className="nc-campo-action-grid">
          <Button
            variant="outline"
            block
            disabled={!phone}
            onClick={() => {
              if (phone) window.location.href = `tel:${phone}`
            }}
          >
            Llamar
          </Button>
          <Button
            variant="outline"
            block
            icon="message"
            disabled={!wa}
            onClick={() => {
              if (wa) window.open(`https://wa.me/57${wa.replace(/^57/, "")}`, "_blank", "noopener,noreferrer")
            }}
          >
            WhatsApp
          </Button>
        </div>

        <section className="nc-campo-panel">
          <h3 className="nc-campo-panel-title">Cultivos</h3>
          {client.crops.length ? (
            <div>
              {client.crops.map((crop) => (
                <div key={crop.id} className="nc-campo-split-row">
                  <span>{crop.name}</span>
                  <span>
                    {formatHa(crop.area_ha)} · {phaseLabel(crop.phase)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="nc-campo-section-meta">Sin cultivos registrados</p>
          )}
          <h3 className="nc-campo-panel-title" style={{ marginTop: "var(--space-2)" }}>
            Biotecnologías en uso
          </h3>
          {client.biotechs.length ? (
            <div className="nc-campo-chip-row" style={{ gap: 6 }}>
              {client.biotechs.map((bio) => (
                <Badge key={bio.id} tone={bio.tone}>
                  {bio.name} · {bio.origin}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="nc-campo-section-meta">Sin biotecnologías registradas</p>
          )}
        </section>

        <section className="nc-campo-panel">
          <h3 className="nc-campo-panel-title">Sede principal</h3>
          <div className="nc-campo-map-stub" aria-hidden="true">
            <span className="nc-campo-map-pin" />
          </div>
          <span className="nc-campo-mono">
            {coords || "Sin coordenadas"}
            {site?.location_locked ? " · ubicación bloqueada" : ""}
            {site?.name ? ` · ${site.name}` : ""}
          </span>
        </section>

        <section className="nc-campo-ficha-history">
          <h3 className="nc-campo-panel-title">Historial</h3>
          {client.history.length ? (
            <div className="nc-campo-history-grid">
              {client.history.map((row, index) => (
                <div key={`${row.when}-${index}`} className="nc-campo-history-row">
                  <span>{row.when}</span>
                  <span>{row.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="nc-campo-section-meta">Sin visitas registradas</p>
          )}
        </section>

        {products.length ? (
          <section className="nc-campo-panel">
            <h3 className="nc-campo-panel-title">Precios{priceList ? ` · ${priceList}` : ""}</h3>
            {products.map((product) => (
              <div key={product.id} className="nc-campo-split-row">
                <span>
                  {product.name}
                  <small style={{ display: "block", color: "var(--ink-secondary)", font: "var(--text-caption)" }}>
                    {product.presentation}
                  </small>
                </span>
                <span>{product.unit_price ? formatMoney(product.unit_price) : "Sin precio"}</span>
              </div>
            ))}
          </section>
        ) : null}

        {error ? <p className="nc-note">{error}</p> : null}
      </section>

      <div className="nc-campo-visit-footer nc-campo-ficha-footer">
        <Button variant="secondary" size="lg" block onClick={() => navigate(`/clientes/${client.id}/agendar`)}>
          Agendar
        </Button>
        <Button size="lg" block icon="pin" disabled={busy} onClick={() => void startVisit()}>
          {busy ? "Abriendo…" : "Registrar visita"}
        </Button>
      </div>
    </>
  )
}
