import { FormEvent, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Button, TextField } from "@nc/ui"
import { ConsoleShell } from "./admin"

type Setting = {
  key: string
  value: unknown
  value_type: string
  description: string
  module: string
}

const MODULES: Record<string, string> = {
  auth: "Acceso",
  gps: "GPS",
  crm: "Cartera",
  visits: "Visitas",
  goals: "Metas",
  forecast: "Pronóstico",
  pipeline: "Embudo",
  alerts: "Alertas",
  erp: "ERP",
  ai: "Informes",
  privacy: "Privacidad",
  feature: "Funciones",
}

function shown(setting: Setting) {
  if (setting.value_type === "BOOL") return setting.value ? "Sí" : "No"
  if (setting.value_type === "JSON") return "Valor compuesto"
  return String(setting.value ?? "")
}

export function SettingsPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [rows, setRows] = useState<Setting[]>([])
  const [error, setError] = useState("")
  const canEdit = user.permissions.includes("settings.edit")

  useEffect(() => {
    api<{ results: Setting[] }>("/api/v1/settings")
      .then((data) => setRows(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }, [])

  return (
    <ConsoleShell user={user} onLogout={onLogout} title="Parámetros" lede="Valores que usa toda la plataforma. Cada cambio queda registrado.">
      {error ? <p className="nc-note">{error}</p> : null}
      <div className="nc-table-wrap">
        <table className="nc-table">
          <thead>
            <tr>
              <th>Módulo</th>
              <th>Parámetro</th>
              <th>Valor</th>
              {canEdit ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{MODULES[row.module] || row.module}</td>
                <td>
                  <span className="nc-key">{row.key}</span>
                  {row.description ? <span className="nc-setting-help">{row.description}</span> : null}
                </td>
                <td>{shown(row)}</td>
                {canEdit ? <td><Link to={`/consola/parametros/${encodeURIComponent(row.key)}`}>Editar</Link></td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ConsoleShell>
  )
}

export function SettingPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { key = "" } = useParams()
  const settingKey = decodeURIComponent(key)
  const navigate = useNavigate()
  const [setting, setSetting] = useState<Setting | null>(null)
  const [draft, setDraft] = useState("")
  const [flag, setFlag] = useState(false)
  const [error, setError] = useState("")
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    api<{ results: Setting[] }>("/api/v1/settings").then((data) => {
      const found = data.results.find((item) => item.key === settingKey)
      if (!found) {
        setMissing(true)
        return
      }
      setSetting(found)
      if (found.value_type === "BOOL") setFlag(Boolean(found.value))
      else if (found.value_type === "JSON") setDraft(JSON.stringify(found.value, null, 2))
      else setDraft(String(found.value ?? ""))
    }).catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }, [settingKey])

  async function submit(event: FormEvent) {
    if (!setting) return
    event.preventDefault()
    setError("")
    let value: unknown = draft
    if (setting.value_type === "BOOL") value = flag
    else if (setting.value_type === "INT") value = Number(draft)
    else if (setting.value_type === "JSON") {
      try {
        value = JSON.parse(draft)
      } catch {
        setError("El JSON no se puede leer.")
        return
      }
    }
    try {
      await api(`/api/v1/settings/${encodeURIComponent(setting.key)}`, {
        method: "PATCH",
        body: JSON.stringify({ value }),
      })
      navigate("/consola/parametros")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar")
    }
  }

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title={setting?.key || "Parámetro"}
      lede={setting?.description}
      back={{ to: "/consola/parametros", label: "Parámetros" }}
    >
      {missing ? <p className="nc-note">No encontramos ese parámetro.</p> : null}
      {setting ? (
        <form className="nc-panel" onSubmit={submit}>
          {setting.value_type === "BOOL" ? (
            <label className="nc-field">
              <span className="nc-field-label">Valor</span>
              <select className="nc-input" value={flag ? "1" : "0"} onChange={(event) => setFlag(event.target.value === "1")}>
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </label>
          ) : setting.value_type === "JSON" ? (
            <label className="nc-field">
              <span className="nc-field-label">Valor</span>
              <textarea className="nc-input nc-json" value={draft} onChange={(event) => setDraft(event.target.value)} />
            </label>
          ) : (
            <TextField label="Valor" value={draft} onChange={(event) => setDraft(event.target.value)} />
          )}
          {error ? <p className="nc-note">{error}</p> : null}
          <div className="nc-panel-actions">
            <Button type="submit">Guardar parámetro</Button>
            <Link className="nc-text-link" to="/consola/parametros">Cancelar</Link>
          </div>
        </form>
      ) : null}
    </ConsoleShell>
  )
}
