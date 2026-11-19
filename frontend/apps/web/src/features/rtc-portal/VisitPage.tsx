import { FormEvent, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, Format, GpsCheck, Tabs, TextField, type GpsStatus } from "@nc/ui"
import { PortalPage } from "./PortalPage"
import { mapsUrl } from "./shared/maps"
import { visitAgo, visitClock } from "./shared/format"
import { useToast } from "../shared/useToast"

type Product = { id: string; name: string; presentation: string; unit_price: string | null }
type Site = { id: string; name: string; municipality: string; latitude: number | null; longitude: number | null }
type ClientDetail = {
  id: string
  name: string
  phone: string
  last_visit_at: string | null
  sites?: Site[]
  crops?: { name: string; area_ha: number }[]
}
type Visit = {
  id: string
  client_id: string
  client_name: string
  municipality: string
  status: string
  result: string | null
  notes: string
  scheduled_start: string | null
  gps_check?: { status: GpsStatus; distance_m: number | null; tolerance_m: number } | null
  photos?: { id: string; thumbnail: string }[]
}

type CartLine = {
  product_id: string
  name: string
  presentation: string
  quantity: string
  unit_price: string
}

function moneyDigits(value: string) {
  return value.replace(/[^\d]/g, "")
}

/** API Decimal ("45000.00") → pesos enteros sin multiplicar por 100. */
function pesosFromApi(value: string | null | undefined) {
  if (value == null || value === "") return ""
  const n = Number(String(value).replace(",", "."))
  if (!Number.isFinite(n)) return ""
  return String(Math.round(n))
}

function toNumber(value: string) {
  const n = Number(moneyDigits(value) || "0")
  return Number.isFinite(n) ? n : 0
}

function lineTotal(line: CartLine) {
  return toNumber(line.quantity) * toNumber(line.unit_price)
}

const OUTCOMES = [
  { id: "pedido", api: "PEDIDO_CONFIRMADO", label: "Pedido confirmado" },
  { id: "cotizacion", api: "COTIZACION_SOLICITADA", label: "Cotización solicitada" },
  { id: "seguimiento", api: "SEGUIMIENTO_PROGRAMADO", label: "Seguimiento programado" },
  { id: "sin", api: "SIN_INTERES", label: "Sin interés" },
  { id: "otro", api: "OTRO", label: "Otro" },
] as const

const HZ = [
  { id: "CORTO", label: "Corto" },
  { id: "MEDIANO", label: "Mediano" },
  { id: "LARGO", label: "Largo" },
]

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

function gpsFromFix(fix: { coordinates: [number, number] }, site?: Site) {
  const toleranceM = 1000
  if (!site?.latitude || !site?.longitude) return { status: "SIN_REFERENCIA" as GpsStatus, toleranceM }
  const distanceM = haversineM(site.latitude, site.longitude, fix.coordinates[1], fix.coordinates[0])
  if (distanceM > toleranceM) return { status: "FUERA_DE_RANGO" as GpsStatus, distanceM, toleranceM }
  return { status: "VERIFICADA" as GpsStatus, distanceM, toleranceM }
}

export function VisitPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [visit, setVisit] = useState<Visit | null>(null)
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [priceList, setPriceList] = useState<string | null>(null)
  const [outcome, setOutcome] = useState("seguimiento")
  const [notDone, setNotDone] = useState(false)
  const [notes, setNotes] = useState("")
  const [justification, setJustification] = useState("")
  const [horizon, setHorizon] = useState("CORTO")
  const [lines, setLines] = useState<CartLine[]>([])
  const [photos, setPhotos] = useState<{ id: string; thumbnail: string }[]>([])
  const [gps, setGps] = useState<Record<string, unknown> | null>(null)
  const [liveGps, setLiveGps] = useState<{ status: GpsStatus; distanceM?: number; toleranceM: number } | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [captureHint, setCaptureHint] = useState("")
  const [deskMode, setDeskMode] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    api<Visit>(`/api/v1/visits/${id}`)
      .then(async (data) => {
        setVisit(data)
        setNotes(data.notes || "")
        setPhotos(data.photos || [])
        const detail = await api<ClientDetail>(`/api/v1/clients/${data.client_id}`)
        setClient(detail)
        const catalog = await api<{ results: Product[]; price_list: string | null }>(
          `/api/v1/products?client=${data.client_id}`,
        )
        setProducts(catalog.results)
        setPriceList(catalog.price_list)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la visita"))
  }, [id])

  const site = client?.sites?.[0]
  const closed = visit?.status === "REALIZADA" || visit?.status === "NO_REALIZADA"
  const inProgress = visit?.status === "EN_CURSO" || deskMode
  const outcomeApi = OUTCOMES.find((o) => o.id === outcome)?.api || "SEGUIMIENTO_PROGRAMADO"
  const showValue = !notDone && (outcome === "pedido" || outcome === "cotizacion")
  const fuera = liveGps?.status === "FUERA_DE_RANGO"
  const directions = mapsUrl({
    latitude: site?.latitude,
    longitude: site?.longitude,
    site: site?.name,
    municipality: visit?.municipality,
  })

  const stageLabel = useMemo(() => {
    if (!visit) return "…"
    if (closed) return visit.status === "NO_REALIZADA" ? "No realizada" : "Realizada"
    if (capturing) return "Tomando GPS…"
    if (inProgress) return "En curso"
    return "Programada"
  }, [visit, closed, capturing, inProgress])

  const cartTotal = useMemo(() => lines.reduce((sum, line) => sum + lineTotal(line), 0), [lines])
  const inCart = useMemo(() => new Set(lines.map((line) => line.product_id)), [lines])

  function addProduct(product: Product) {
    setLines((current) => {
      const existing = current.find((line) => line.product_id === product.id)
      if (existing) {
        return current.map((line) =>
          line.product_id === product.id
            ? { ...line, quantity: String(Math.max(1, toNumber(line.quantity) + 1)) }
            : line,
        )
      }
      return [
        ...current,
        {
          product_id: product.id,
          name: product.name,
          presentation: product.presentation,
          quantity: "1",
          unit_price: pesosFromApi(product.unit_price),
        },
      ]
    })
  }

  function removeLine(productId: string) {
    setLines((current) => current.filter((line) => line.product_id !== productId))
  }

  function patchLine(productId: string, patch: Partial<Pick<CartLine, "quantity" | "unit_price">>) {
    setLines((current) =>
      current.map((line) => (line.product_id === productId ? { ...line, ...patch } : line)),
    )
  }

  function bumpQty(productId: string, delta: number) {
    setLines((current) =>
      current.map((line) => {
        if (line.product_id !== productId) return line
        const next = Math.max(1, toNumber(line.quantity) + delta)
        return { ...line, quantity: String(next) }
      }),
    )
  }

  function locate(onReady?: (fix: Record<string, unknown>) => void) {
    if (!navigator.geolocation) {
      setGps({ error: "UNSUPPORTED", capture_mode: "ONLINE" })
      setCaptureHint("Este navegador no entrega la ubicación.")
      onReady?.({ error: "UNSUPPORTED", capture_mode: "ONLINE" })
      return
    }
    setCaptureHint("Tomando tu ubicación…")
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        const fix = {
          position: { type: "Point", coordinates: [position.coords.longitude, position.coords.latitude] as [number, number] },
          accuracy_m: position.coords.accuracy,
          altitude_m: position.coords.altitude,
          captured_at: new Date(position.timestamp).toISOString(),
          capture_mode: "ONLINE",
          error: "NONE",
        }
        setGps(fix)
        setLiveGps(gpsFromFix(fix.position as { coordinates: [number, number] }, site))
        setCaptureHint(`Precisión ${Math.round(position.coords.accuracy)} m`)
        if (position.coords.accuracy <= 80) {
          navigator.geolocation.clearWatch(watch)
          onReady?.(fix)
        }
      },
      () => {
        const fallback = { error: "PERMISSION_DENIED", capture_mode: "ONLINE" }
        setGps(fallback)
        setCaptureHint("Sin permiso de ubicación.")
        navigator.geolocation.clearWatch(watch)
        onReady?.(fallback)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    )
    window.setTimeout(() => {
      navigator.geolocation.clearWatch(watch)
      if (gps) onReady?.(gps)
    }, 15000)
  }

  async function registerArrival() {
    if (!id) return
    setCapturing(true)
    setError("")
    locate(async (fix) => {
      try {
        const updated = await api<Visit>(`/api/v1/visits/${id}/start`, {
          method: "POST",
          body: JSON.stringify({ gps: fix }),
        })
        setVisit(updated)
        setDeskMode(false)
        toast.show("Llegada registrada", "success")
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo registrar la llegada")
      } finally {
        setCapturing(false)
      }
    })
  }

  async function continueWithoutGps() {
    if (!id) return
    setBusy(true)
    setError("")
    try {
      if (visit?.status === "PROGRAMADA") {
        const updated = await api<Visit>(`/api/v1/visits/${id}/start`, {
          method: "POST",
          body: JSON.stringify({ gps: { error: "POSITION_UNAVAILABLE", capture_mode: "ONLINE" } }),
        })
        setVisit(updated)
      }
      setDeskMode(true)
      setGps({ error: "POSITION_UNAVAILABLE", capture_mode: "ONLINE" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar la visita")
    } finally {
      setBusy(false)
    }
  }

  async function upload(file: File) {
    if (!id) return
    const localUrl = URL.createObjectURL(file)
    const tempId = `local-${crypto.randomUUID()}`
    setPhotos((current) => [...current, { id: tempId, thumbnail: localUrl }])
    try {
      const body = new FormData()
      body.set("file", file)
      const saved = await api<{ id: string; thumbnail: string; url?: string }>(`/api/v1/visits/${id}/evidence`, {
        method: "POST",
        body,
      })
      const remote = saved.thumbnail || saved.url || ""
      setPhotos((current) =>
        current.map((ph) =>
          ph.id === tempId ? { id: saved.id, thumbnail: remote || localUrl } : ph,
        ),
      )
      if (remote) URL.revokeObjectURL(localUrl)
    } catch (err) {
      setPhotos((current) => current.filter((ph) => ph.id !== tempId))
      URL.revokeObjectURL(localUrl)
      throw err
    }
  }

  async function closeVisit(event: FormEvent) {
    event.preventDefault()
    if (!id || !visit) return
    if (fuera && !notDone && justification.trim().length < 3) {
      setError("Cuéntale a tu líder por qué estás lejos de la sede.")
      return
    }
    if (notes.trim().length < 3) {
      setError(notDone ? "Cuéntanos por qué no se realizó." : "Escribe qué pasó en la visita.")
      return
    }
    if (!notDone && (outcome === "pedido" || outcome === "cotizacion") && lines.length === 0) {
      setError(outcome === "pedido" ? "Un pedido confirmado necesita al menos un producto." : "Agrega al menos un producto a la cotización.")
      return
    }
    if (!notDone && lines.some((line) => toNumber(line.quantity) <= 0)) {
      setError("Cada producto del carrito necesita cantidad mayor a 0.")
      return
    }
    if (showValue && lines.some((line) => toNumber(line.unit_price) <= 0)) {
      setError("Indica el precio unitario de cada producto.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const payloadGps = gps || { error: "POSITION_UNAVAILABLE", capture_mode: "ONLINE" }
      const path = notDone ? `/api/v1/visits/${id}/not-done` : `/api/v1/visits/${id}/close`
      const kind = outcome === "pedido" ? "CONCRETADO" : "POTENCIAL"
      const body = notDone
        ? { reason: notes.trim(), gps: payloadGps }
        : {
            result: outcomeApi,
            notes:
              fuera && justification.trim()
                ? `${notes.trim()}\n\nUbicación: ${justification.trim()}`
                : notes.trim(),
            products: lines.map((line) => ({
              product_id: line.product_id,
              kind,
              quantity: String(toNumber(line.quantity) || 1),
              unit_price: String(toNumber(line.unit_price)),
              ...(showValue ? { horizon } : {}),
            })),
            gps: payloadGps,
          }
      const updated = await api<Visit>(path, { method: "POST", body: JSON.stringify(body) })
      setVisit(updated)
      toast.show(notDone ? "Visita marcada como no realizada" : "Visita cerrada", "success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cerrar la visita")
    } finally {
      setBusy(false)
    }
  }

  return (
    <PortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <Link className="nc-text-link" to="/portal/agenda">
            Volver a la agenda
          </Link>
          <h1>{visit?.client_name || "Registrar visita"}</h1>
          <p className="nc-portal-muted">
            {[site?.name || "Sede", visit?.municipality, visit ? visitClock(visit.scheduled_start) : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Badge tone={closed ? "success" : inProgress ? "accent" : "primary"}>{stageLabel}</Badge>
      </header>

      {error ? <p className="nc-note">{error}</p> : null}
      {!visit || !client ? <p className="nc-portal-muted">Cargando visita…</p> : null}

      {visit && client ? (
        <div className="nc-visita-layout">
          <aside className="nc-visita-side">
            <section className="nc-portal-card nc-visita-panel">
              <h2>Cliente</h2>
              <dl className="nc-visita-dl">
                <div>
                  <dt>Contacto</dt>
                  <dd>{client.phone ? `${client.name} · ${client.phone}` : client.name}</dd>
                </div>
                <div>
                  <dt>Cultivos</dt>
                  <dd>
                    {client.crops?.length
                      ? client.crops.map((c) => `${c.name} (${c.area_ha} ha)`).join(", ")
                      : "Sin cultivos"}
                  </dd>
                </div>
                <div>
                  <dt>Última visita</dt>
                  <dd>{visitAgo(client.last_visit_at)}</dd>
                </div>
              </dl>
              <div className="nc-portal-actions-row" style={{ justifyContent: "flex-start" }}>
                <Link className="nc-btn nc-btn-secondary" to={`/portal/clientes/${visit.client_id}`}>
                  Ver ficha
                </Link>
                {directions ? (
                  <Button type="button" variant="outline" onClick={() => window.open(directions, "_blank", "noopener,noreferrer")}>
                    Cómo llegar
                  </Button>
                ) : null}
              </div>
            </section>
          </aside>

          <div className="nc-visita-main">
            {!closed && !inProgress && !capturing ? (
              <section className="nc-portal-card nc-visita-panel">
                <h2>Registrar llegada</h2>
                <p className="nc-portal-muted">
                  Igual que en Campo: registra llegada con GPS, o continúa desde escritorio si estás reportando sin estar en finca.
                </p>
                <div className="nc-portal-actions-row" style={{ justifyContent: "flex-start" }}>
                  <Button type="button" icon="crosshair" onClick={() => void registerArrival()} disabled={busy}>
                    Registrar llegada
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void continueWithoutGps()} disabled={busy}>
                    Continuar sin GPS
                  </Button>
                </div>
              </section>
            ) : null}

            {capturing ? (
              <section className="nc-portal-card nc-visita-panel">
                <h2>Tomando ubicación…</h2>
                <p className="nc-portal-muted">{captureHint || "Quédate quieto un momento."}</p>
              </section>
            ) : null}

            {!closed && inProgress ? (
              <form className="nc-portal-card nc-visita-panel" onSubmit={closeVisit}>
                <h2>Resultado de la visita</h2>

                <div className="nc-visita-block">
                  <span className="nc-field-label">Ubicación</span>
                  {liveGps ? (
                    <GpsCheck status={liveGps.status} distanceM={liveGps.distanceM} toleranceM={liveGps.toleranceM} preliminary />
                  ) : (
                    <Button type="button" variant="secondary" onClick={() => locate()}>
                      Tomar ubicación
                    </Button>
                  )}
                </div>

                {fuera && !notDone ? (
                  <TextField
                    label="Por qué estás lejos de la sede"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Ej.: Me recibió en la bodega del pueblo"
                    helper="Tu líder la revisará en la Consola"
                    required
                  />
                ) : null}

                <div className="nc-visita-block">
                  <span className="nc-field-label">Resultado de la visita</span>
                  <div className="nc-visita-outcome-list" role="radiogroup" aria-label="Resultado">
                    {OUTCOMES.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={outcome === o.id && !notDone}
                        className={outcome === o.id && !notDone ? "is-on" : undefined}
                        onClick={() => {
                          setNotDone(false)
                          setOutcome(o.id)
                        }}
                      >
                        <span className="nc-visita-outcome-dot" aria-hidden />
                        {o.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={notDone}
                      className={notDone ? "is-on is-muted" : "is-muted"}
                      onClick={() => {
                        setNotDone(true)
                        setOutcome("")
                      }}
                    >
                      <span className="nc-visita-outcome-dot" aria-hidden />
                      No realizada
                    </button>
                  </div>
                </div>

                {!notDone ? (
                  <>
                    <div className="nc-visita-block">
                      <div className="nc-visita-cart-head">
                        <span className="nc-field-label">Productos</span>
                        <span className="nc-portal-muted">
                          {priceList ? `Lista ${priceList}` : "Sin lista de precios regional"}
                        </span>
                      </div>
                      {products.length === 0 ? (
                        <p className="nc-portal-muted">Sin productos en catálogo.</p>
                      ) : (
                        <ul className="nc-visita-catalog">
                          {products.map((p) => {
                            const listed = pesosFromApi(p.unit_price)
                            const added = inCart.has(p.id)
                            return (
                              <li key={p.id} className="nc-visita-catalog-row">
                                <div className="nc-visita-catalog-meta">
                                  <strong>{p.name}</strong>
                                  <span className="nc-portal-muted">
                                    {[p.presentation, listed ? Format.money(toNumber(listed)) : "Sin precio en lista"]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant={added ? "secondary" : "outline"}
                                  onClick={() => addProduct(p)}
                                >
                                  {added ? "Sumar +1" : "Agregar"}
                                </Button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>

                    <div className="nc-visita-block">
                      <div className="nc-visita-cart-head">
                        <span className="nc-field-label">Carrito</span>
                        <span className="nc-portal-muted">
                          {lines.length === 0 ? "Vacío" : `${lines.length} ítem${lines.length === 1 ? "" : "s"}`}
                        </span>
                      </div>
                      {lines.length === 0 ? (
                        <p className="nc-portal-muted">Agrega productos del catálogo. El precio sale de la lista de la zona del cliente.</p>
                      ) : (
                        <ul className="nc-visita-cart">
                          {lines.map((line) => (
                            <li key={line.product_id} className="nc-visita-cart-line">
                              <div className="nc-visita-cart-line-top">
                                <div>
                                  <strong>{line.name}</strong>
                                  {line.presentation ? (
                                    <span className="nc-portal-muted"> · {line.presentation}</span>
                                  ) : null}
                                </div>
                                <button type="button" className="nc-visita-cart-remove" onClick={() => removeLine(line.product_id)}>
                                  Quitar
                                </button>
                              </div>
                              <div className="nc-visita-cart-controls">
                                <div className="nc-visita-qty">
                                  <button type="button" aria-label="Menos" onClick={() => bumpQty(line.product_id, -1)}>
                                    −
                                  </button>
                                  <input
                                    inputMode="numeric"
                                    value={line.quantity}
                                    aria-label={`Cantidad de ${line.name}`}
                                    onChange={(e) =>
                                      patchLine(line.product_id, {
                                        quantity: moneyDigits(e.target.value) || "1",
                                      })
                                    }
                                  />
                                  <button type="button" aria-label="Más" onClick={() => bumpQty(line.product_id, 1)}>
                                    +
                                  </button>
                                </div>
                                <label className="nc-visita-price">
                                  <span>Precio unit. (lista)</span>
                                  <input
                                    inputMode="numeric"
                                    value={line.unit_price}
                                    placeholder="0"
                                    aria-label={`Precio de ${line.name}`}
                                    onChange={(e) =>
                                      patchLine(line.product_id, {
                                        unit_price: moneyDigits(e.target.value),
                                      })
                                    }
                                  />
                                </label>
                                <div className="nc-visita-line-total">
                                  <span>Subtotal</span>
                                  <strong>{Format.money(lineTotal(line))}</strong>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      {lines.length > 0 ? (
                        <div className="nc-visita-cart-footer">
                          <span>Total</span>
                          <strong>{Format.money(cartTotal)}</strong>
                        </div>
                      ) : null}
                    </div>

                    {showValue ? (
                      <div className="nc-visita-block">
                        <span className="nc-field-label">Horizonte de cierre</span>
                        <Tabs items={HZ} value={horizon} onChange={setHorizon} label="Horizonte" />
                        <span className="nc-portal-muted">Corto: 0–30 días · mediano: 31–90 · largo: más de 90</span>
                      </div>
                    ) : null}

                    <TextField
                      label="Qué pasó en la visita"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej.: Pidió cotización de Trichobiol para el lote 2"
                      helper="Lo verá tu líder en la Consola"
                      required
                    />
                  </>
                ) : (
                  <TextField
                    label="Por qué no se realizó"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej.: Cliente ausente"
                    required
                  />
                )}

                <div className="nc-visita-block">
                  <span className="nc-field-label">Fotos</span>
                  <div className="nc-visita-photo-grid">
                    {photos.map((ph) => (
                      <img key={ph.id} src={ph.thumbnail} alt="" />
                    ))}
                    <label className="nc-visita-photo-add">
                      <span>+</span>
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            upload(file).catch((err) =>
                              setError(err instanceof Error ? err.message : "No se pudo subir la foto"),
                            )
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="nc-visita-footer">
                  <button
                    type="button"
                    className="nc-text-link"
                    onClick={() => navigate("/portal/agenda")}
                    disabled={busy}
                  >
                    Cancelar
                  </button>
                  <Button type="submit" icon="check" disabled={busy}>
                    {busy ? "Cerrando…" : notDone ? "Marcar no realizada" : "Cerrar visita"}
                  </Button>
                </div>
              </form>
            ) : null}

            {closed ? (
              <section className="nc-portal-card nc-visita-panel">
                <h2>Visita cerrada</h2>
                <p className="nc-portal-muted">{visit.notes || "Sin notas."}</p>
                {visit.gps_check ? (
                  <GpsCheck
                    status={visit.gps_check.status}
                    distanceM={visit.gps_check.distance_m ?? undefined}
                    toleranceM={visit.gps_check.tolerance_m}
                  />
                ) : null}
                {photos.length > 0 ? (
                  <div className="nc-visita-photo-grid">
                    {photos.map((ph) => (
                      <img key={ph.id} src={ph.thumbnail} alt="" />
                    ))}
                  </div>
                ) : null}
                <Link className="nc-btn nc-btn-secondary" to="/portal/agenda">
                  Volver a la agenda
                </Link>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}

      {toast.node}
    </PortalPage>
  )
}
