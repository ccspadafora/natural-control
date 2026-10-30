import { FormEvent, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api } from "@nc/api"
import { enqueueMutation, isOfflineMode } from "../../offline"
import {
  Badge,
  Button,
  GpsCheck,
  Icon,
  Tabs,
  TextField,
  type BadgeTone,
  type GpsStatus,
  type TabItem,
} from "@nc/ui"
import { mapsDirectionsUrl, visitAgo } from "../shared/campo-format"

type Line = { product_id: string; kind: string; quantity: string; unit_price: string; horizon: string; month?: string }
type Product = { id: string; name: string; presentation: string; unit_price: string | null }
type Site = { id: string; name: string; municipality: string; latitude: number | null; longitude: number | null }
type ClientDetail = {
  id: string
  name: string
  phone: string
  last_visit_at: string | null
  sites?: Site[]
}
type Visit = {
  id: string
  client_id: string
  client_name: string
  municipality: string
  status: string
  result: string | null
  notes: string
  gps_check: {
    status: GpsStatus
    distance_m: number | null
    tolerance_m: number
  } | null
  photos: { id: string; thumbnail: string }[]
}

type Stage = "antes" | "capturando" | "curso" | "cerrada"

const OUTCOMES: { id: string; api: string; label: string }[] = [
  { id: "pedido", api: "PEDIDO_CONFIRMADO", label: "Pedido confirmado" },
  { id: "cotizacion", api: "COTIZACION_SOLICITADA", label: "Cotización solicitada" },
  { id: "seguimiento", api: "SEGUIMIENTO_PROGRAMADO", label: "Seguimiento programado" },
  { id: "sin", api: "SIN_INTERES", label: "Sin interés" },
  { id: "otro", api: "OTRO", label: "Otro" },
]

const HZ: TabItem[] = [
  { id: "CORTO", label: "Corto" },
  { id: "MEDIANO", label: "Mediano" },
  { id: "LARGO", label: "Largo" },
]

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

function gpsFromFix(
  fix: { coordinates: [number, number] },
  site: Site | undefined,
): { status: GpsStatus; distanceM?: number; toleranceM: number } {
  const toleranceM = 1000
  if (!site?.latitude || !site?.longitude) {
    return { status: "SIN_REFERENCIA", toleranceM }
  }
  const distanceM = haversineM(site.latitude, site.longitude, fix.coordinates[1], fix.coordinates[0])
  if (distanceM > toleranceM) return { status: "FUERA_DE_RANGO", distanceM, toleranceM }
  return { status: "VERIFICADA", distanceM, toleranceM }
}

export function VisitaScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [visit, setVisit] = useState<Visit | null>(null)
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [outcome, setOutcome] = useState("cotizacion")
  const [notDone, setNotDone] = useState(false)
  const [notes, setNotes] = useState("")
  const [justification, setJustification] = useState("")
  const [estimate, setEstimate] = useState("")
  const [horizon, setHorizon] = useState("CORTO")
  const [selectedProducts, setSelectedProducts] = useState<Record<string, boolean>>({})
  const [lines, setLines] = useState<Line[]>([])
  const [photos, setPhotos] = useState<{ id: string; thumbnail: string }[]>([])
  const [gps, setGps] = useState<Record<string, unknown> | null>(null)
  const [liveGps, setLiveGps] = useState<{ status: GpsStatus; distanceM?: number; toleranceM: number } | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [captureHint, setCaptureHint] = useState("")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [error, setError] = useState("")
  const [notesError, setNotesError] = useState("")
  const [justError, setJustError] = useState("")
  const [busy, setBusy] = useState(false)
  const [draftReady, setDraftReady] = useState(false)

  const site = client?.sites?.[0]

  useEffect(() => {
    const saved = localStorage.getItem(`nc-draft-visit-${id}`)
    if (saved) {
      const draft = JSON.parse(saved) as {
        outcome: string
        notDone: boolean
        notes: string
        justification: string
        estimate: string
        horizon: string
        selectedProducts: Record<string, boolean>
      }
      setOutcome(draft.outcome || "cotizacion")
      setNotDone(Boolean(draft.notDone))
      setNotes(draft.notes || "")
      setJustification(draft.justification || "")
      setEstimate(draft.estimate || "")
      setHorizon(draft.horizon || "CORTO")
      if (draft.selectedProducts) setSelectedProducts(draft.selectedProducts)
    }
    api<Visit>(`/api/v1/visits/${id}`)
      .then((data) => {
        setVisit(data)
        setPhotos(data.photos || [])
        return api<ClientDetail>(`/api/v1/clients/${data.client_id}`)
      })
      .then((detail) => {
        setClient(detail)
        return api<{ results: Product[] }>(`/api/v1/products?client=${detail.id}`)
      })
      .then((catalog) => setProducts(catalog.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo abrir la visita"))
    setDraftReady(true)
  }, [id])

  useEffect(() => {
    if (!draftReady || !id || visit?.status === "REALIZADA" || visit?.status === "NO_REALIZADA") return
    localStorage.setItem(
      `nc-draft-visit-${id}`,
      JSON.stringify({ outcome, notDone, notes, justification, estimate, horizon, selectedProducts }),
    )
  }, [draftReady, id, visit?.status, outcome, notDone, notes, justification, estimate, horizon, selectedProducts])

  const stage: Stage = useMemo(() => {
    if (!visit) return "antes"
    if (visit.status === "REALIZADA" || visit.status === "NO_REALIZADA") return "cerrada"
    if (capturing) return "capturando"
    if (visit.status === "EN_CURSO") return "curso"
    return "antes"
  }, [visit, capturing])

  const outcomeApi = OUTCOMES.find((o) => o.id === outcome)?.api || "COTIZACION_SOLICITADA"
  const showValue = !notDone && (outcome === "pedido" || outcome === "cotizacion")
  const fuera = liveGps?.status === "FUERA_DE_RANGO"

  function toggleProduct(productId: string) {
    setSelectedProducts((current) => {
      const next = { ...current, [productId]: !current[productId] }
      const picked = products.filter((p) => next[p.id])
      setLines(
        picked.map((p) => ({
          product_id: p.id,
          kind: outcome === "pedido" ? "CONCRETADO" : "POTENCIAL",
          quantity: "1",
          unit_price: p.unit_price || estimate || "0",
          horizon,
        })),
      )
      return next
    })
  }

  function locate(onReady?: (fix: Record<string, unknown>) => void) {
    if (!navigator.geolocation) {
      setGps({ error: "UNSUPPORTED", capture_mode: "ONLINE" })
      setCaptureHint("Este navegador no entrega la ubicación.")
      return
    }
    setCaptureHint("Tomando tu ubicación…")
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        const fix = {
          position: { type: "Point", coordinates: [position.coords.longitude, position.coords.latitude] },
          accuracy_m: position.coords.accuracy,
          altitude_m: position.coords.altitude,
          captured_at: new Date(position.timestamp).toISOString(),
          capture_mode: navigator.onLine ? "ONLINE" : "OFFLINE",
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
        setGps({ error: "PERMISSION_DENIED", capture_mode: "ONLINE" })
        setCaptureHint("Sin permiso de ubicación.")
        navigator.geolocation.clearWatch(watch)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    )
    window.setTimeout(() => navigator.geolocation.clearWatch(watch), 15000)
  }

  async function registerArrival() {
    setCapturing(true)
    setError("")
    locate(async (fix) => {
      try {
        const updated = await api<Visit>(`/api/v1/visits/${id}/start`, { method: "POST", body: JSON.stringify({ gps: fix }) })
        setVisit(updated)
        setCapturing(false)
      } catch (err) {
        setCapturing(false)
        setError(err instanceof Error ? err.message : "No se pudo registrar la llegada")
      }
    })
  }

  async function upload(file: File) {
    const body = new FormData()
    body.set("file", file)
    const saved = await api<{ id: string; thumbnail: string }>(`/api/v1/visits/${id}/evidence`, { method: "POST", body })
    setPhotos((current) => [...current, saved])
  }

  async function closeVisit(event: FormEvent) {
    event.preventDefault()
    const nextJust = fuera && !notDone && !justification.trim()
    const nextNotesErr = notDone
      ? notes.trim().length < 3
        ? "Cuéntanos por qué no se realizó."
        : ""
      : !notes.trim()
        ? "Escribe qué pasó en la visita para cerrarla."
        : ""
    setNotesError(nextNotesErr)
    setJustError(nextJust ? "Cuéntale a tu líder por qué estás lejos de la sede." : "")
    if (nextNotesErr || nextJust) return

    setBusy(true)
    setError("")
    try {
      if (!gps) locate()
      const payload = notDone
        ? { reason: notes.trim() || "Cliente ausente", gps: gps || { error: "POSITION_UNAVAILABLE", capture_mode: "ONLINE" } }
        : {
            result: outcomeApi,
            notes: fuera && justification.trim() ? `${notes.trim()}\n\nUbicación: ${justification.trim()}` : notes.trim(),
            contact_name_free: client?.phone ? client.name : "",
            products: lines
              .filter((line) => line.product_id)
              .map((line) => {
                if (showValue && estimate && !line.unit_price) {
                  return { ...line, unit_price: String(Number(estimate.replace(/\D/g, "")) || 0) }
                }
                if (line.kind === "POTENCIAL" && line.horizon === "LARGO" && line.month) {
                  const [year, month] = line.month.split("-").map(Number)
                  const last = new Date(year, month, 0).getDate()
                  return { ...line, expected_date: `${line.month}-${String(last).padStart(2, "0")}` }
                }
                return line
              }),
            gps: gps || { error: "POSITION_UNAVAILABLE", capture_mode: "ONLINE" },
          }
      const path = `/api/v1/visits/${id}/${notDone ? "not-done" : "close"}`
      if (isOfflineMode()) {
        await enqueueMutation({ method: "POST", path, body: payload })
        localStorage.removeItem(`nc-draft-visit-${id}`)
        setVisit({
          ...visit,
          status: notDone ? "NO_REALIZADA" : "REALIZADA",
          result: notDone ? null : outcomeApi,
          notes: notDone ? notes.trim() : visit.notes,
          gps_check: liveGps
            ? {
                status: liveGps.status,
                distance_m: liveGps.distanceM ?? null,
                tolerance_m: liveGps.toleranceM,
              }
            : visit.gps_check,
        })
        setSheetOpen(true)
        return
      }
      const updated = await api<Visit>(path, {
        method: "POST",
        body: JSON.stringify(payload),
      })
      localStorage.removeItem(`nc-draft-visit-${id}`)
      setVisit(updated)
      setSheetOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cerrar la visita")
    } finally {
      setBusy(false)
    }
  }

  if (error && !visit) return <p className="nc-note">{error}</p>
  if (!visit || !client) return <p className="nc-kicker">Cargando…</p>

  const badge: [BadgeTone, string] =
    stage === "cerrada"
      ? visit.status === "NO_REALIZADA"
        ? ["neutral", "No realizada"]
        : ["success", "Realizada"]
      : stage === "antes"
        ? ["primary", "Programada"]
        : ["accent", "En curso"]

  const check = visit.gps_check
  const sheetGps = check || liveGps

  return (
    <>
      <header className="nc-campo-head">
        <div className="nc-campo-head-row">
          <button type="button" className="nc-campo-link-row" style={{ width: 48, color: "var(--ink)" }} aria-label="Volver" onClick={() => navigate(-1)}>
            <Icon name="chevronLeft" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nc-campo-eyebrow">Visita</div>
            <h1 style={{ font: "var(--text-title)" }}>{visit.client_name}</h1>
          </div>
        </div>
      </header>

      <form id="visita-form" className="nc-campo-page" onSubmit={closeVisit}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge tone={badge[0]}>{badge[1]}</Badge>
          </div>
          <h1 style={{ margin: 0, font: "var(--text-title-lg)", letterSpacing: "-0.015em" }}>{visit.client_name}</h1>
          <div style={{ display: "flex", gap: 4, alignItems: "center", font: "var(--text-body-lg)", color: "var(--ink-secondary)" }}>
            <Icon name="pin" small />
            {site?.name || "Sede principal"} · {visit.municipality}
          </div>
        </div>

        <section className="nc-campo-dl">
          <div className="nc-campo-dl-row">
            <span>Contacto</span>
            <span>{client.phone ? `${client.name} · ${client.phone}` : client.name}</span>
          </div>
          <div className="nc-campo-dl-row">
            <span>Cultivos</span>
            <span>—</span>
          </div>
          <div className="nc-campo-dl-row">
            <span>Última visita</span>
            <span>{visitAgo(client.last_visit_at)}</span>
          </div>
          <Link to={`/clientes/${visit.client_id}`} className="nc-campo-link-row">
            Ver ficha del cliente
            <Icon name="chevronRight" />
          </Link>
        </section>

        {stage === "antes" ? (
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <p style={{ margin: 0, font: "var(--text-body-lg)", color: "var(--ink-secondary)" }}>
              Registra tu llegada cuando estés en la finca. Usamos tu ubicación para verificar la visita.
            </p>
            <Button variant="secondary" size="lg" block icon="crosshair" type="button" onClick={registerArrival}>
              Registrar llegada
            </Button>
            {site?.latitude && site?.longitude ? (
              <Button
                variant="quiet"
                block
                icon="map"
                type="button"
                onClick={() => window.open(mapsDirectionsUrl(site.latitude!, site.longitude!), "_blank", "noopener,noreferrer")}
              >
                Cómo llegar
              </Button>
            ) : (
              <Button variant="quiet" block icon="map" type="button" disabled>
                Cómo llegar
              </Button>
            )}
          </div>
        ) : null}

        {stage === "capturando" ? (
          <div className="nc-campo-capture">
            <span style={{ color: "var(--primary)" }}>
              <Icon name="refresh" className="nc-spin" />
            </span>
            <span style={{ display: "grid", gap: 2 }}>
              <span style={{ font: "var(--text-label)" }}>Tomando tu ubicación…</span>
              <span style={{ font: "var(--text-caption)", color: "var(--ink-secondary)" }}>
                Quédate quieto un momento · {captureHint || "buscando señal"}
              </span>
            </span>
          </div>
        ) : null}

        {stage === "curso" ? (
          <div style={{ display: "grid", gap: "var(--space-5)" }}>
            <div style={{ display: "grid", gap: 8 }}>
              <span style={{ font: "var(--text-label)" }}>Ubicación</span>
              {liveGps ? (
                <GpsCheck status={liveGps.status} distanceM={liveGps.distanceM} toleranceM={liveGps.toleranceM} preliminary />
              ) : (
                <Button variant="secondary" type="button" onClick={() => locate()}>
                  Tomar ubicación
                </Button>
              )}
            </div>

            {fuera && !notDone ? (
              <TextField
                label="Por qué estás lejos de la sede"
                required
                value={justification}
                onChange={(e) => {
                  setJustification(e.target.value)
                  setJustError("")
                }}
                error={justError}
                placeholder="Ej.: Me recibió en la bodega del pueblo"
                helper="Tu líder la revisará en la Consola"
              />
            ) : null}

            <div style={{ display: "grid", gap: 8 }}>
              <span style={{ font: "var(--text-label)" }}>Resultado</span>
              <div className="nc-campo-pill-grid">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={outcome === o.id && !notDone ? "is-on" : ""}
                    onClick={() => {
                      setNotDone(false)
                      setOutcome(o.id)
                    }}
                  >
                    {o.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={notDone ? "is-on" : ""}
                  onClick={() => {
                    setNotDone(true)
                    setOutcome("")
                  }}
                >
                  No realizada
                </button>
              </div>
            </div>

            {!notDone ? (
              <>
                <div style={{ display: "grid", gap: 8 }}>
                  <span style={{ font: "var(--text-label)" }}>Productos ofrecidos</span>
                  <div className="nc-campo-chip-row">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={selectedProducts[p.id] ? "is-on" : ""}
                        onClick={() => toggleProduct(p.id)}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {showValue ? (
                  <div style={{ display: "grid", gap: "var(--space-3)" }}>
                    <TextField
                      label="Valor estimado ($)"
                      inputMode="numeric"
                      value={estimate}
                      onChange={(e) => setEstimate(e.target.value)}
                      helper="Suma al forecast de tu zona"
                    />
                    <div style={{ display: "grid", gap: 8 }}>
                      <span style={{ font: "var(--text-label)" }}>Horizonte de cierre</span>
                      <Tabs items={HZ} value={horizon} onChange={setHorizon} block label="Horizonte" />
                      <span style={{ font: "var(--text-caption)", color: "var(--ink-tertiary)" }}>
                        Corto: 0–30 días · mediano: 31–90 · largo: más de 90
                      </span>
                    </div>
                  </div>
                ) : null}

                <TextField
                  label="Qué pasó en la visita"
                  required
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value)
                    setNotesError("")
                  }}
                  error={notesError}
                  placeholder="Ej.: Pidió cotización de Trichobiol para el lote 2"
                  helper="Lo verá tu líder en la Consola"
                />
              </>
            ) : (
              <TextField
                label="Por qué no se realizó"
                required
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value)
                  setNotesError("")
                }}
                error={notesError}
                placeholder="Ej.: Cliente ausente"
              />
            )}

            <div style={{ display: "grid", gap: 8 }}>
              <span style={{ font: "var(--text-label)" }}>Fotos</span>
              <div className="nc-campo-photo-grid">
                {photos.map((ph) => (
                  <img key={ph.id} src={ph.thumbnail} alt="" />
                ))}
                <label className="nc-campo-photo-add">
                  <Icon name="plus" />
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) upload(file).catch((err) => setError(err instanceof Error ? err.message : "No se pudo subir la foto"))
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        ) : null}

        {stage === "cerrada" && sheetGps ? (
          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ font: "var(--text-label)" }}>Verificación</span>
            <GpsCheck
              status={sheetGps.status}
              distanceM={"distance_m" in sheetGps ? sheetGps.distance_m ?? undefined : sheetGps.distanceM}
              toleranceM={"tolerance_m" in sheetGps ? sheetGps.tolerance_m : sheetGps.toleranceM}
              preliminary={!check}
            />
          </div>
        ) : null}

        {error ? <p className="nc-note">{error}</p> : null}
      </form>

      {stage === "curso" ? (
        <div className="nc-campo-visit-footer">
          <Button size="lg" block icon="check" type="submit" form="visita-form" disabled={busy}>
            {busy ? "Cerrando…" : "Cerrar visita"}
          </Button>
        </div>
      ) : null}

      {sheetOpen ? (
        <button type="button" className="nc-campo-bottom-sheet" aria-label="Cerrar" onClick={() => setSheetOpen(false)}>
          <div
            className="nc-campo-bottom-sheet-panel"
            role="dialog"
            aria-labelledby="visita-cerrada"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="nc-campo-sheet-handle" />
            <div id="visita-cerrada" style={{ font: "var(--text-title)", letterSpacing: "-0.01em" }}>
              Visita cerrada
            </div>
            <p style={{ margin: 0, font: "var(--text-body-lg)", color: "var(--ink-secondary)" }}>
              {navigator.onLine
                ? "Ya la ve tu líder en la Consola. El estado oficial del GPS se confirma en unos segundos."
                : "Quedó guardada en tu teléfono y se enviará cuando tengas señal."}
            </p>
            {sheetGps ? (
              <GpsCheck
                status={sheetGps.status}
                distanceM={"distance_m" in sheetGps ? sheetGps.distance_m ?? undefined : sheetGps.distanceM}
                toleranceM={"tolerance_m" in sheetGps ? sheetGps.tolerance_m : sheetGps.toleranceM}
                preliminary
              />
            ) : null}
            <Button size="lg" block onClick={() => navigate("/")}>
              Volver a Hoy
            </Button>
          </div>
        </button>
      ) : null}
    </>
  )
}
