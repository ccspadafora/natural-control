import { FormEvent, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Button, TextField } from "@nc/ui"
import { ConsoleShell } from "../../admin"
import { PortalPage } from "./PortalPage"

export function NewClientPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const navigate = useNavigate()
  const [types, setTypes] = useState<{ id: string; name: string }[]>([])
  const [towns, setTowns] = useState<{ id: string; name: string }[]>([])
  const [kind, setKind] = useState<"PERSONA" | "EMPRESA">("EMPRESA")
  const [legalName, setLegalName] = useState("")
  const [documentNumber, setDocumentNumber] = useState("")
  const [typeId, setTypeId] = useState("")
  const [townId, setTownId] = useState("")
  const [contactName, setContactName] = useState("")
  const [phone, setPhone] = useState("")
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ results: { id: string; name: string }[] }>("/api/v1/client-types")
      .then((data) => {
        setTypes(data.results)
        setTypeId(data.results[0]?.id || "")
      })
      .catch(() => setTypes([]))
    api<{ results: { id: string; name: string }[] }>("/api/v1/municipalities")
      .then((data) => {
        setTowns(data.results)
        setTownId(data.results[0]?.id || "")
      })
      .catch(() => setTowns([]))
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!consent) {
      setError("Autoriza el tratamiento de datos para guardar el cliente.")
      return
    }
    if (!legalName.trim() || !typeId || !townId) {
      setError("Completa nombre, tipo y municipio.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const created = await api<{ id: string }>("/api/v1/clients", {
        method: "POST",
        body: JSON.stringify({
          kind,
          legal_name: legalName.trim(),
          document_type: kind === "EMPRESA" ? "NIT" : "CC",
          document_number: documentNumber.trim() || null,
          client_type_id: typeId,
          municipality_id: townId,
          site_name: "Sede principal",
          contact_name: contactName.trim(),
          phone: phone.trim(),
          data_consent: true,
        }),
      })
      navigate(user.role === "RTC" ? `/portal/clientes/${created.id}` : `/consola/clientes`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar")
      setBusy(false)
    }
  }

  const backTo = user.role === "RTC" ? "/portal/clientes" : "/consola/clientes"
  const form = (
      <form className="nc-portal-card nc-portal-form" onSubmit={save}>
        <label className="nc-field">
          <span className="nc-field-label">Tipo</span>
          <select className="nc-input" value={kind} onChange={(e) => setKind(e.target.value as "PERSONA" | "EMPRESA")}>
            <option value="EMPRESA">Empresa</option>
            <option value="PERSONA">Persona</option>
          </select>
        </label>
        <TextField label="Nombre / razón social" value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
        <TextField label="Documento" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
        <label className="nc-field">
          <span className="nc-field-label">Tipo de cliente</span>
          <select className="nc-input" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="nc-field">
          <span className="nc-field-label">Municipio</span>
          <select className="nc-input" value={townId} onChange={(e) => setTownId(e.target.value)}>
            {towns.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <TextField label="Contacto" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        <TextField label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <label className="nc-check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>Autorizo el tratamiento de datos personales</span>
        </label>
        {error ? <p className="nc-note">{error}</p> : null}
        <div className="nc-panel-actions">
          <Button type="submit" disabled={busy}>
            {busy ? "Guardando…" : "Guardar cliente"}
          </Button>
          <Link className="nc-text-link" to={backTo}>
            Cancelar
          </Link>
        </div>
      </form>
  )

  if (user.role === "RTC") {
    return (
      <PortalPage user={user} onLogout={onLogout}>
        <header className="nc-portal-page-head">
          <div className="nc-portal-hero">
            <h1>Registrar cliente</h1>
          </div>
          <Link className="nc-text-link" to={backTo}>
            Volver a la cartera
          </Link>
        </header>
        {form}
      </PortalPage>
    )
  }

  return (
    <ConsoleShell user={user} onLogout={onLogout} title="Registrar cliente" lede="Alta de cliente en cartera." back={{ to: backTo, label: "Clientes" }}>
      {form}
    </ConsoleShell>
  )
}
