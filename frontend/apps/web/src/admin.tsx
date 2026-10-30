import { FormEvent, ReactNode, useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { api, openStream } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Button, PageHead, TextField } from "@nc/ui"
import { PortalShell } from "./features/shell/PortalShell"
import { useGeoPending } from "./features/leader/useGeoPending"

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administración",
  GERENCIA: "Gerencia",
  RTC: "Comercial",
  LIDER_ZONA: "Líder de zona",
  ADMIN_PRODUCTO: "Producto",
}

const CLIENT_STATUS: Record<string, string> = {
  PROSPECTO: "Prospecto",
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  PERDIDO: "Perdido",
}

const GPS_LABEL: Record<string, string> = {
  FUERA_DE_RANGO: "Discrepancia",
  SIN_UBICACION: "Sin ubicación",
  PRECISION_BAJA: "Precisión baja",
  SIN_REFERENCIA: "Sin referencia",
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconBriefcase() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M16 2v4M8 2v4M3 10h18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconBox() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 8l-9-5-9 5 9 5 9-5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 8v8l9 5 9-5V8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 13v8" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 13l-7 7-9-9V4h7l9 9z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor" />
    </svg>
  )
}

function IconSliders() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8" cy="6" r="2" fill="var(--surface)" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="12" r="2" fill="var(--surface)" stroke="currentColor" strokeWidth="2" />
      <circle cx="10" cy="18" r="2" fill="var(--surface)" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconList() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 9v4M12 17h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function initials(user: SessionUser) {
  const letters = `${user.first_name} ${user.last_name}`.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "")
  return letters.join("") || "NC"
}

function when(iso: string | null) {
  if (!iso) return "Sin visitas"
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" }).format(new Date(iso))
}

function meters(value: number | null) {
  if (value == null) return "Sin definir"
  return `${new Intl.NumberFormat("es-CO").format(value)} m`
}

export function ConsoleShell({
  user,
  onLogout,
  title,
  lede,
  action,
  back,
  children,
}: {
  user: SessionUser
  onLogout: () => void
  title: string
  lede?: string
  action?: ReactNode
  back?: { to: string; label: string }
  children: ReactNode
}) {
  const geoPending = useGeoPending(user.permissions.includes("gps.review"))
  return (
    <PortalShell user={user} onLogout={onLogout} geoPending={geoPending}>
      <PageHead
        title={title}
        description={lede}
        backHref={back?.to}
        backLabel={back?.label}
        actions={action}
      />
      {children}
    </PortalShell>
  )
}

type ClientRow = {
  id: string
  name: string
  municipality: string
  phone: string
  status: string
  is_new: boolean
  last_visit_at: string | null
  owner_name: string
}

export function PortfolioPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice || ""
  const [rows, setRows] = useState<ClientRow[]>([])
  const [live, setLive] = useState("")
  const [error, setError] = useState("")
  const canMove = user.permissions.includes("clients.reassign")

  useEffect(() => {
    api<{ results: ClientRow[] }>("/api/v1/clients")
      .then((data) => setRows(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la cartera"))
    const stop = openStream((message) => {
      const data = message.data || {}
      if (message.type === "visit.closed" && typeof data.client_name === "string") {
        setLive(`Visita cerrada: ${data.client_name}`)
      }
    })
    return stop
  }, [])

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title="Cartera"
      lede="Clientes que están en tu alcance."
      action={canMove ? <Link className="nc-btn nc-btn-primary" to="/consola/cartera/mover">Mover cartera</Link> : undefined}
    >
      {notice ? <p className="nc-ok">{notice}</p> : null}
      {live ? <p className="nc-ok">{live}</p> : null}
      {error ? <p className="nc-note">{error}</p> : null}
      <div className="nc-table-wrap">
        <table className="nc-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Comercial</th>
              <th>Municipio</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Última visita</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="nc-empty" colSpan={6}>Todavía no hay clientes en tu alcance.</td></tr>
            ) : rows.map((client) => (
              <tr key={client.id}>
                <td>{client.name}{client.is_new ? <span className="nc-new">Nuevo</span> : null}</td>
                <td>{client.owner_name || "Sin comercial"}</td>
                <td>{client.municipality || "Sin sede"}</td>
                <td>{client.phone || "—"}</td>
                <td><span className={client.status === "ACTIVO" ? "nc-status is-on" : client.status === "PERDIDO" ? "nc-status is-bad" : "nc-status"}><i />{CLIENT_STATUS[client.status] || client.status}</span></td>
                <td>{when(client.last_visit_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ConsoleShell>
  )
}

type Person = {
  id: string
  email: string
  first_name: string
  last_name: string
  role_name: string
  zone_name: string
  is_active: boolean
}

export function UsersPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice || ""
  const [rows, setRows] = useState<Person[]>([])
  const [error, setError] = useState("")

  function load() {
    api<{ results: Person[] }>("/api/v1/users")
      .then((data) => setRows(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }

  useEffect(() => { load() }, [])

  async function toggle(person: Person) {
    setError("")
    try {
      await api(`/api/v1/users/${person.id}/${person.is_active ? "deactivate" : "reactivate"}`, { method: "POST" })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar")
    }
  }

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title="Usuarios"
      lede="Personas con acceso a Campo y a la Consola."
      action={<Link className="nc-btn nc-btn-primary" to="/consola/usuarios/nuevo">Nuevo usuario</Link>}
    >
      {notice ? <p className="nc-ok">{notice}</p> : null}
      {error ? <p className="nc-note">{error}</p> : null}
      <div className="nc-table-wrap">
        <table className="nc-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Zona</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((person) => (
              <tr key={person.id}>
                <td>{person.first_name} {person.last_name}</td>
                <td>{person.email}</td>
                <td>{person.role_name}</td>
                <td>{person.zone_name || "—"}</td>
                <td><span className={person.is_active ? "nc-status is-on" : "nc-status"}><i />{person.is_active ? "Activo" : "Inactivo"}</span></td>
                <td><Button variant="quiet" type="button" onClick={() => toggle(person)}>{person.is_active ? "Desactivar" : "Reactivar"}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ConsoleShell>
  )
}

export function NewUserPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const navigate = useNavigate()
  const [roles, setRoles] = useState<{ code: string; name: string }[]>([])
  const [zones, setZones] = useState<{ id: string; name: string }[]>([])
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("RTC")
  const [zoneId, setZoneId] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    api<{ results: { code: string; name: string }[] }>("/api/v1/roles").then((data) => setRoles(data.results))
    api<{ results: { id: string; name: string }[] }>("/api/v1/zones").then((data) => {
      setZones(data.results)
      setZoneId(data.results[0]?.id || "")
    })
  }, [])

  async function create(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await api("/api/v1/users", {
        method: "POST",
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          role,
          zone_id: role === "RTC" || role === "LIDER_ZONA" ? zoneId : null,
        }),
      })
      navigate("/consola/usuarios", { state: { notice: `Enviamos el código de activación a ${email}.` } })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear")
    }
  }

  const needsZone = role === "RTC" || role === "LIDER_ZONA"

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title="Nuevo usuario"
      lede="Le enviamos un código para que active su acceso."
      back={{ to: "/consola/usuarios", label: "Usuarios" }}
    >
      <form className="nc-panel" onSubmit={create}>
        <TextField label="Nombre" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
        <TextField label="Apellido" value={lastName} onChange={(event) => setLastName(event.target.value)} />
        <TextField label="Correo" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <label className="nc-field">
          <span className="nc-field-label">Rol</span>
          <select className="nc-input" value={role} onChange={(event) => setRole(event.target.value)}>
            {roles.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </label>
        {needsZone ? (
          <label className="nc-field">
            <span className="nc-field-label">Zona</span>
            <select className="nc-input" value={zoneId} onChange={(event) => setZoneId(event.target.value)}>
              {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
            </select>
          </label>
        ) : null}
        {error ? <p className="nc-note">{error}</p> : null}
        <div className="nc-panel-actions">
          <Button type="submit">Crear usuario</Button>
          <Link className="nc-text-link" to="/consola/usuarios">Cancelar</Link>
        </div>
      </form>
    </ConsoleShell>
  )
}

type Zone = { id: string; name: string; gps_tolerance_m: number | null; municipalities: { id: string; name: string }[] }

export function ZonesPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice || ""
  const [zones, setZones] = useState<Zone[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    api<{ results: Zone[] }>("/api/v1/zones")
      .then((data) => setZones(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }, [])

  return (
    <ConsoleShell user={user} onLogout={onLogout} title="Zonas" lede="Cobertura comercial y tolerancia del GPS.">
      {notice ? <p className="nc-ok">{notice}</p> : null}
      {error ? <p className="nc-note">{error}</p> : null}
      <div className="nc-table-wrap">
        <table className="nc-table">
          <thead>
            <tr>
              <th>Zona</th>
              <th>Tolerancia GPS</th>
              <th>Municipios</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {zones.map((zone) => (
              <tr key={zone.id}>
                <td>{zone.name}</td>
                <td>{meters(zone.gps_tolerance_m)}</td>
                <td>{zone.municipalities.length ? zone.municipalities.map((town) => town.name).join(", ") : "Sin municipios"}</td>
                <td><Link to={`/consola/zonas/${zone.id}`}>Editar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ConsoleShell>
  )
}

export function ZonePage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { zoneId } = useParams()
  const navigate = useNavigate()
  const [zone, setZone] = useState<Zone | null>(null)
  const [towns, setTowns] = useState<{ id: string; name: string }[]>([])
  const [tolerance, setTolerance] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState("")
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    api<{ results: Zone[] }>("/api/v1/zones").then((data) => {
      const found = data.results.find((item) => item.id === zoneId)
      if (!found) {
        setMissing(true)
        return
      }
      setZone(found)
      setTolerance(found.gps_tolerance_m == null ? "" : String(found.gps_tolerance_m))
      setSelected(found.municipalities.map((town) => town.id))
    })
    api<{ results: { id: string; name: string }[] }>("/api/v1/municipalities").then((data) => setTowns(data.results))
  }, [zoneId])

  function toggleTown(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!zone) return
    setError("")
    try {
      await api(`/api/v1/zones/${zone.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          gps_tolerance_m: tolerance ? Number(tolerance) : null,
          municipality_ids: selected,
        }),
      })
      navigate("/consola/zonas", { state: { notice: `${zone.name} quedó actualizada.` } })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar")
    }
  }

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title={zone?.name || "Zona"}
      lede="Tolerancia del GPS y municipios de la zona."
      back={{ to: "/consola/zonas", label: "Zonas" }}
    >
      {missing ? <p className="nc-note">No encontramos esa zona.</p> : (
        <form className="nc-panel" onSubmit={save}>
          <TextField label="Tolerancia GPS (metros)" value={tolerance} onChange={(event) => setTolerance(event.target.value)} />
          <div className="nc-checks">
            <span className="nc-field-label">Municipios</span>
            {towns.map((town) => (
              <label key={town.id} className="nc-check">
                <input type="checkbox" checked={selected.includes(town.id)} onChange={() => toggleTown(town.id)} />
                {town.name}
              </label>
            ))}
          </div>
          {error ? <p className="nc-note">{error}</p> : null}
          <div className="nc-panel-actions">
            <Button type="submit">Guardar zona</Button>
            <Link className="nc-text-link" to="/consola/zonas">Cancelar</Link>
          </div>
        </form>
      )}
    </ConsoleShell>
  )
}

