import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "@nc/api"
import { Badge, Button, Icon, TextField } from "@nc/ui"
import { enqueueMutation, isOfflineMode } from "../../offline"

type Option = { id: string; name: string; department?: string }
type CropDraft = { key: string; crop_type_id: string; name: string; area_ha: string; phase: "PRODUCCION" | "SIEMBRA" }
type BioDraft = { key: string; product_id?: string; name: string; origin: "Propio" | "Competencia" }

const PHASES = [
  { id: "PRODUCCION" as const, label: "Producción" },
  { id: "SIEMBRA" as const, label: "Siembra" },
]

function areaTotal(crops: CropDraft[]) {
  return crops.reduce((sum, crop) => sum + (Number(crop.area_ha) || 0), 0)
}

export function NewClientWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [types, setTypes] = useState<Option[]>([])
  const [towns, setTowns] = useState<Option[]>([])
  const [cropTypes, setCropTypes] = useState<Option[]>([])
  const [products, setProducts] = useState<Option[]>([])

  const [kind, setKind] = useState<"PERSONA" | "EMPRESA">("EMPRESA")
  const [typeId, setTypeId] = useState("")
  const [legalName, setLegalName] = useState("")
  const [documentNumber, setDocumentNumber] = useState("")
  const [contactName, setContactName] = useState("")
  const [phone, setPhone] = useState("")

  const [siteName, setSiteName] = useState("")
  const [townId, setTownId] = useState("")
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [locating, setLocating] = useState(false)

  const [crops, setCrops] = useState<CropDraft[]>([])
  const [biotechs, setBiotechs] = useState<BioDraft[]>([])
  const [addingCrop, setAddingCrop] = useState(false)
  const [draftCropType, setDraftCropType] = useState("")
  const [draftArea, setDraftArea] = useState("")
  const [draftPhase, setDraftPhase] = useState<"PRODUCCION" | "SIEMBRA">("PRODUCCION")
  const [addingBio, setAddingBio] = useState(false)

  const [consentDatos, setConsentDatos] = useState(false)
  const [consentWa, setConsentWa] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ results: Option[] }>("/api/v1/client-types").then((data) => {
      setTypes(data.results)
      if (data.results[0]) setTypeId(data.results[0].id)
    })
    api<{ results: Option[] }>("/api/v1/municipalities").then((data) => setTowns(data.results))
    api<{ results: Option[] }>("/api/v1/crop-types").then((data) => setCropTypes(data.results)).catch(() => setCropTypes([]))
    api<{ results: { id: string; name: string }[] }>("/api/v1/products")
      .then((data) => setProducts(data.results.map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => setProducts([]))
  }, [])

  const townName = useMemo(() => towns.find((t) => t.id === townId)?.name || "", [towns, townId])
  const hasLoc = latitude != null && longitude != null

  function takeLocation() {
    if (!navigator.geolocation) {
      setError("Este navegador no entrega la ubicación.")
      return
    }
    setLocating(true)
    setError("")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)
        setAccuracy(position.coords.accuracy)
        setLocating(false)
      },
      () => {
        setError("No pudimos leer el GPS. Intenta de nuevo parado en la sede.")
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  function addCrop() {
    const cropType = cropTypes.find((c) => c.id === draftCropType)
    const area = Number(draftArea)
    if (!cropType || !(area > 0)) {
      setError("Elige el cultivo y las hectáreas.")
      return
    }
    setCrops((prev) => [
      ...prev,
      { key: `${cropType.id}-${Date.now()}`, crop_type_id: cropType.id, name: cropType.name, area_ha: String(area), phase: draftPhase },
    ])
    setDraftCropType("")
    setDraftArea("")
    setDraftPhase("PRODUCCION")
    setAddingCrop(false)
    setError("")
  }

  function validateStep() {
    if (step === 1) {
      if (!typeId) return "Elige el tipo de cliente."
      if (legalName.trim().length < 3) return "Escribe el nombre o razón social."
      return ""
    }
    if (step === 2) {
      if (!townId) return "Elige el municipio de la sede."
      if (!hasLoc) return "Toma la ubicación de la sede para continuar."
      return ""
    }
    if (step === 4) {
      if (!consentDatos) return "Autoriza el tratamiento de datos para guardar el cliente."
      return ""
    }
    return ""
  }

  async function save() {
    const problem = validateStep()
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError("")
    const body = {
      kind,
      legal_name: legalName.trim(),
      document_type: kind === "EMPRESA" ? "NIT" : "CC",
      document_number: documentNumber.trim() || null,
      client_type_id: typeId,
      municipality_id: townId,
      site_name: siteName.trim() || "Sede principal",
      contact_name: contactName.trim(),
      phone: phone.trim(),
      latitude,
      longitude,
      accuracy_m: accuracy,
      location_source: accuracy ? "GPS_DEVICE" : "MAP_PIN",
      data_consent: true,
      whatsapp_opt_in: consentWa,
      crops: crops.map((c) => ({
        crop_type_id: c.crop_type_id,
        area_ha: Number(c.area_ha),
        phase: c.phase,
      })),
      biotechs: biotechs.map((b) =>
        b.origin === "Propio" && b.product_id
          ? { product_id: b.product_id }
          : { competitor_product: b.name },
      ),
    }
    try {
      if (isOfflineMode()) {
        await enqueueMutation({ method: "POST", path: "/api/v1/clients", body })
        navigate("/sincronizacion")
        return
      }
      const created = await api<{ id: string }>("/api/v1/clients", {
        method: "POST",
        body: JSON.stringify(body),
      })
      navigate(`/clientes/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar")
      setBusy(false)
    }
  }

  function next() {
    const problem = validateStep()
    if (problem) {
      setError(problem)
      return
    }
    setError("")
    if (step === 4) {
      void save()
      return
    }
    setStep((s) => Math.min(4, s + 1))
  }

  return (
    <>
      <header className="nc-campo-head nc-campo-wizard-head">
        <div className="nc-campo-head-row">
          <button type="button" className="nc-campo-icon-btn" aria-label="Cancelar" onClick={() => navigate(-1)}>
            <Icon name="x" />
          </button>
          <div style={{ flex: 1 }}>
            <div className="nc-campo-eyebrow">Paso {step} de 4</div>
            <h1>Nuevo cliente</h1>
          </div>
        </div>
        <div className="nc-campo-stepper" aria-hidden="true">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={n <= step ? "is-on" : ""} />
          ))}
        </div>
      </header>

      <section className="nc-campo-page nc-campo-wizard-body">
        {step === 1 ? (
          <div className="nc-campo-wizard-step">
            <h2 className="nc-campo-section-title">Datos del cliente</h2>
            <div className="nc-campo-field-block">
              <span className="nc-field-label">Tipo</span>
              <div className="nc-campo-chip-row">
                {types.map((item) => (
                  <button key={item.id} type="button" className={typeId === item.id ? "is-on" : ""} onClick={() => setTypeId(item.id)}>
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="nc-campo-field-block">
              <span className="nc-field-label">Persona o empresa</span>
              <div className="nc-campo-chip-row">
                <button type="button" className={kind === "PERSONA" ? "is-on" : ""} onClick={() => setKind("PERSONA")}>
                  Persona
                </button>
                <button type="button" className={kind === "EMPRESA" ? "is-on" : ""} onClick={() => setKind("EMPRESA")}>
                  Empresa
                </button>
              </div>
            </div>
            <TextField label="Nombre o razón social" value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
            <TextField
              label="NIT o cédula"
              inputMode="numeric"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              helper="Escribe el NIT sin dígito de verificación"
            />
            <TextField label="Persona de contacto" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            <TextField label="Celular" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="nc-campo-wizard-step">
            <h2 className="nc-campo-section-title">Sede principal</h2>
            <TextField label="Nombre de la sede" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            <label className="nc-field">
              <span className="nc-field-label">Municipio</span>
              <select className="nc-input" value={townId} onChange={(e) => setTownId(e.target.value)} required>
                <option value="">Elige uno</option>
                {towns.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.department ? ` · ${item.department}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="nc-campo-field-block">
              <span className="nc-field-label">Ubicación</span>
              {!hasLoc ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <p className="nc-campo-section-meta" style={{ font: "var(--text-body-lg)", margin: 0 }}>
                    Tómala parado en la sede. Con ella verificamos tus visitas.
                  </p>
                  <Button variant="secondary" size="lg" block icon="crosshair" disabled={locating} onClick={takeLocation}>
                    {locating ? "Tomando…" : "Tomar ubicación de la sede"}
                  </Button>
                </div>
              ) : (
                <div className="nc-campo-loc-card">
                  <Badge tone="success" icon="check">
                    Ubicación tomada
                  </Badge>
                  <span className="nc-campo-mono" style={{ color: "var(--ink-secondary)" }}>
                    {latitude!.toFixed(4)}, {longitude! < 0 ? "−" : ""}
                    {Math.abs(longitude!).toFixed(4)}
                    {accuracy != null ? ` · precisión ${Math.round(accuracy)} m` : ""}
                  </span>
                  <span className="nc-campo-section-meta">Después de guardar, solo tu líder puede cambiarla.</span>
                  <button type="button" className="nc-text-link" onClick={takeLocation}>
                    Volver a tomar
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="nc-campo-wizard-step">
            <h2 className="nc-campo-section-title">Cultivos y biotecnologías</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {crops.map((crop) => (
                <div key={crop.key} className="nc-campo-list-row">
                  <span className="nc-campo-list-row-label">{crop.name}</span>
                  <span className="nc-campo-section-meta">
                    {Number(crop.area_ha).toLocaleString("es-CO")} ha · {crop.phase === "SIEMBRA" ? "siembra" : "producción"}
                  </span>
                </div>
              ))}
              {addingCrop ? (
                <div className="nc-campo-panel" style={{ gap: 12 }}>
                  <label className="nc-field">
                    <span className="nc-field-label">Cultivo</span>
                    <select className="nc-input" value={draftCropType} onChange={(e) => setDraftCropType(e.target.value)}>
                      <option value="">Elige uno</option>
                      {cropTypes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <TextField label="Hectáreas" inputMode="decimal" value={draftArea} onChange={(e) => setDraftArea(e.target.value)} />
                  <div className="nc-campo-chip-row">
                    {PHASES.map((p) => (
                      <button key={p.id} type="button" className={draftPhase === p.id ? "is-on" : ""} onClick={() => setDraftPhase(p.id)}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="secondary" onClick={() => setAddingCrop(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={addCrop}>Agregar</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" icon="plus" block onClick={() => setAddingCrop(true)}>
                  Agregar cultivo
                </Button>
              )}
            </div>

            <div className="nc-campo-field-block">
              <span className="nc-field-label">¿Qué biológicos usa hoy?</span>
              <div className="nc-campo-chip-row" style={{ gap: 6 }}>
                {biotechs.map((bio) => (
                  <Badge key={bio.key} tone={bio.origin === "Propio" ? "primary" : "neutral"}>
                    {bio.name} · {bio.origin}
                  </Badge>
                ))}
              </div>
              {addingBio ? (
                <div className="nc-campo-panel" style={{ gap: 8 }}>
                  {products.slice(0, 8).map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className="nc-campo-list-row"
                      onClick={() => {
                        setBiotechs((prev) => [
                          ...prev,
                          { key: `${product.id}-${Date.now()}`, product_id: product.id, name: product.name, origin: "Propio" },
                        ])
                        setAddingBio(false)
                      }}
                    >
                      <span className="nc-campo-list-row-label">{product.name}</span>
                      <span className="nc-campo-section-meta">Propio</span>
                    </button>
                  ))}
                  <Button variant="quiet" onClick={() => setAddingBio(false)}>
                    Cerrar
                  </Button>
                </div>
              ) : (
                <Button variant="quiet" icon="plus" onClick={() => setAddingBio(true)}>
                  Agregar biotecnología
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="nc-campo-wizard-step">
            <h2 className="nc-campo-section-title">Autorizaciones</h2>
            {(
              [
                ["datos", consentDatos, setConsentDatos, "Autoriza el tratamiento de sus datos personales (Ley 1581 de 2012)"],
                ["wa", consentWa, setConsentWa, "Acepta recibir mensajes por WhatsApp"],
              ] as const
            ).map(([key, on, setOn, label]) => (
              <button key={key} type="button" className="nc-campo-check-card" onClick={() => setOn(!on)}>
                <span className={`nc-campo-check-box${on ? " is-on" : ""}`}>{on ? <Icon name="check" /> : null}</span>
                <span>{label}</span>
              </button>
            ))}
            <section className="nc-campo-dl">
              <div className="nc-campo-dl-row">
                <span>Cliente</span>
                <span>{legalName || "—"}</span>
              </div>
              <div className="nc-campo-dl-row">
                <span>Sede</span>
                <span>
                  {siteName || "Sede principal"}
                  {townName ? ` · ${townName}` : ""}
                </span>
              </div>
              <div className="nc-campo-dl-row">
                <span>Cultivos</span>
                <span>{areaTotal(crops).toLocaleString("es-CO", { maximumFractionDigits: 1 })} ha</span>
              </div>
            </section>
          </div>
        ) : null}

        {error ? <p className="nc-note">{error}</p> : null}
      </section>

      <div className="nc-campo-visit-footer nc-campo-wizard-footer">
        {step > 1 ? (
          <Button variant="secondary" size="lg" onClick={() => setStep((s) => s - 1)}>
            Atrás
          </Button>
        ) : null}
        <div style={{ flex: 1 }}>
          <Button size="lg" block disabled={busy} onClick={next}>
            {busy ? "Guardando…" : step === 4 ? "Guardar cliente" : "Siguiente"}
          </Button>
        </div>
      </div>
    </>
  )
}
