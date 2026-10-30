import { FormEvent, useEffect, useState } from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"
import { logout, requestCode, resetPassword, restore } from "@nc/api"
import { NewUserPage, PortfolioPage, UsersPage, ZonePage, ZonesPage } from "./admin"
import { SaludPage } from "./features/admin"
import {
  AuditoriaPage,
  AutomatizacionesPage,
  CapacitacionPage,
  EmbudoPage,
  ErpPage,
  InformesPage,
  MensajesPage,
} from "./features/backlog"
import { GeoPage, GeoReviewPage, LeaderInicioPage, LeaderProgramacionPage } from "./features/leader"
import { LigaPage } from "./features/liga"
import {
  ForecastPage as MgmtForecastPage,
  MapaZonasPage,
  MgmtInicioPage,
  TablerosPage,
  VisitasEnVivoPage,
  isGerencia,
  isMgmtConsole,
} from "./features/mgmt"
import { EditProductPage, NewProductPage, PriceListsPage, PriceSheetPage, ProductsPage } from "./catalog"
import { AssignVisitPage, MovePortfolioPage, ReassignVisitPage, VisitsPage } from "./ops"
import { RequirePlanPage } from "./plans"
import { SettingPage, SettingsPage } from "./settings"
import { homeFor, type SessionUser } from "@nc/domain"
import { Button, TextField } from "@nc/ui"
import { PortalLogin } from "./features/auth/PortalLogin"
import {
  AgendaPage,
  CarteraPage,
  ClientDetailPage,
  ForecastPage,
  MiCartaPage,
  MisNumerosPage,
  ProgramacionNuevaPage,
  ProgramacionPage,
} from "./features/rtc-portal"
import "@nc/ui/tokens.css"
import "@nc/ui/fonts.css"
import "@nc/ui/components.css"
import "./shell.css"

export function App() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    restore().then((session) => {
      setUser(session)
      setReady(true)
    })
  }, [])

  if (!ready) return null

  return (
    <Routes>
      <Route path="/" element={<Gate role={user?.role} />} />
      <Route path="/portal/login" element={<PortalLogin onDone={setUser} />} />
      <Route path="/consola/login" element={<PortalLogin onDone={setUser} />} />
      <Route path="/recuperar" element={<Recover />} />
      <Route path="/portal" element={user?.role === "RTC" ? <MisNumerosPage user={user} onLogout={() => { logout(); setUser(null) }} /> : user ? <Navigate to={homeFor(user.role, "web")} replace /> : <Navigate to="/portal/login" replace />} />
      <Route path="/portal/agenda" element={user?.role === "RTC" ? <AgendaPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to={user ? homeFor(user.role, "web") : "/portal/login"} replace />} />
      <Route path="/portal/clientes" element={user?.role === "RTC" ? <CarteraPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to={user ? homeFor(user.role, "web") : "/portal/login"} replace />} />
      <Route path="/portal/clientes/:id" element={user?.role === "RTC" ? <ClientDetailPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to={user ? homeFor(user.role, "web") : "/portal/login"} replace />} />
      <Route path="/portal/forecast" element={user?.role === "RTC" ? <ForecastPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to={user ? homeFor(user.role, "web") : "/portal/login"} replace />} />
      <Route path="/portal/programacion" element={user?.role === "RTC" ? <ProgramacionPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to={user ? homeFor(user.role, "web") : "/portal/login"} replace />} />
      <Route path="/portal/programacion/nueva" element={user?.role === "RTC" ? <ProgramacionNuevaPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to={user ? homeFor(user.role, "web") : "/portal/login"} replace />} />
      <Route path="/portal/micarta" element={user?.role === "RTC" ? <MiCartaPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to={user ? homeFor(user.role, "web") : "/portal/login"} replace />} />
      <Route
        path="/consola"
        element={
          user ? (
            user.role === "GERENCIA" ? (
              <MgmtInicioPage user={user} onLogout={() => { logout(); setUser(null) }} />
            ) : user.role === "LIDER_ZONA" ? (
              <LeaderInicioPage user={user} onLogout={() => { logout(); setUser(null) }} />
            ) : user.role === "ADMIN" || user.role === "ADMIN_PRODUCTO" ? (
              <SaludPage user={user} onLogout={() => { logout(); setUser(null) }} />
            ) : (
              <PortfolioPage user={user} onLogout={() => { logout(); setUser(null) }} />
            )
          ) : (
            <Navigate to="/consola/login" replace />
          )
        }
      />
      <Route
        path="/consola/clientes"
        element={
          user && user.role !== "RTC" && user.permissions.includes("clients.view") ? (
            <PortfolioPage user={user} onLogout={() => { logout(); setUser(null) }} />
          ) : (
            <Navigate to={user ? "/consola" : "/consola/login"} replace />
          )
        }
      />
      <Route path="/consola/cartera/mover" element={user?.permissions.includes("clients.reassign") ? <MovePortfolioPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to="/consola" replace />} />
      <Route
        path="/consola/visitas"
        element={
          user && user.role !== "RTC" && user.permissions.includes("visits.view") ? (
            isMgmtConsole(user.role) ? (
              <VisitasEnVivoPage user={user} onLogout={() => { logout(); setUser(null) }} />
            ) : (
              <VisitsPage user={user} onLogout={() => { logout(); setUser(null) }} />
            )
          ) : (
            <Navigate to="/consola" replace />
          )
        }
      />
      <Route
        path="/consola/tableros"
        element={
          user && isMgmtConsole(user.role) ? (
            <TablerosPage user={user} onLogout={() => { logout(); setUser(null) }} />
          ) : (
            <Navigate to={user ? "/consola" : "/consola/login"} replace />
          )
        }
      />
      <Route
        path="/consola/forecast"
        element={
          user && isGerencia(user.role) ? (
            <MgmtForecastPage user={user} onLogout={() => { logout(); setUser(null) }} />
          ) : (
            <Navigate to={user ? "/consola" : "/consola/login"} replace />
          )
        }
      />
      <Route
        path="/consola/mapa"
        element={
          user && isGerencia(user.role) ? (
            <MapaZonasPage user={user} onLogout={() => { logout(); setUser(null) }} />
          ) : (
            <Navigate to={user ? "/consola" : "/consola/login"} replace />
          )
        }
      />
      <Route path="/consola/programacion" element={user?.permissions.includes("weekly_plan.review") ? <LeaderProgramacionPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to="/consola" replace />} />
      <Route path="/consola/programacion/exigir" element={user?.permissions.includes("weekly_plan.require") ? <RequirePlanPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to="/consola" replace />} />
      <Route path="/consola/visitas/nueva" element={user?.permissions.includes("visits.assign") ? <AssignVisitPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to="/consola" replace />} />
      <Route path="/consola/visitas/:visitId" element={user?.permissions.includes("visits.assign") ? <ReassignVisitPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to="/consola" replace />} />
      <Route
        path="/consola/liga"
        element={
          user && (user.role === "LIDER_ZONA" || user.role === "GERENCIA") ? (
            <LigaPage user={user} onLogout={() => { logout(); setUser(null) }} />
          ) : (
            <Navigate to={user ? "/consola" : "/consola/login"} replace />
          )
        }
      />
      <Route
        path="/consola/salud"
        element={
          user && (user.role === "ADMIN" || user.role === "ADMIN_PRODUCTO") ? (
            <SaludPage user={user} onLogout={() => { logout(); setUser(null) }} />
          ) : (
            <Navigate to={user ? "/consola" : "/consola/login"} replace />
          )
        }
      />
      <Route path="/consola/usuarios" element={user?.role === "ADMIN" ? <UsersPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to="/consola" replace />} />
      <Route path="/consola/usuarios/nuevo" element={user?.role === "ADMIN" ? <NewUserPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to="/consola" replace />} />
      <Route path="/consola/zonas" element={user?.role === "ADMIN" ? <ZonesPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to="/consola" replace />} />
      <Route path="/consola/zonas/:zoneId" element={user?.role === "ADMIN" ? <ZonePage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to="/consola" replace />} />
      <Route path="/consola/productos" element={user?.permissions.includes("catalog.manage") ? <ProductsPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to="/consola" replace />} />
      <Route path="/consola/productos/nuevo" element={user?.permissions.includes("catalog.manage") ? <NewProductPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to="/consola" replace />} />
      <Route path="/consola/productos/:productId" element={user?.permissions.includes("catalog.manage") ? <EditProductPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to="/consola" replace />} />
      <Route path="/consola/precios" element={user?.permissions.includes("catalog.manage") ? <PriceListsPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to="/consola" replace />} />
      <Route path="/consola/precios/:listId" element={user?.permissions.includes("catalog.manage") ? <PriceSheetPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to="/consola" replace />} />
      <Route path="/consola/parametros" element={user?.permissions.includes("settings.view") ? <SettingsPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to="/consola" replace />} />
      <Route path="/consola/parametros/:key" element={user?.permissions.includes("settings.edit") ? <SettingPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to="/consola" replace />} />
      <Route
        path="/consola/embudo"
        element={
          user && user.role !== "RTC" ? (
            <EmbudoPage user={user} onLogout={() => { logout(); setUser(null) }} />
          ) : (
            <Navigate to={user ? homeFor(user.role, "web") : "/consola/login"} replace />
          )
        }
      />
      <Route
        path="/consola/mensajes"
        element={
          user && user.role !== "RTC" ? (
            <MensajesPage user={user} onLogout={() => { logout(); setUser(null) }} />
          ) : (
            <Navigate to={user ? homeFor(user.role, "web") : "/consola/login"} replace />
          )
        }
      />
      <Route
        path="/consola/automatizaciones"
        element={
          user && user.role !== "RTC" ? (
            <AutomatizacionesPage user={user} onLogout={() => { logout(); setUser(null) }} />
          ) : (
            <Navigate to={user ? homeFor(user.role, "web") : "/consola/login"} replace />
          )
        }
      />
      <Route
        path="/consola/erp"
        element={
          user && (user.role === "ADMIN" || user.role === "ADMIN_PRODUCTO") ? (
            <ErpPage user={user} onLogout={() => { logout(); setUser(null) }} />
          ) : (
            <Navigate to={user ? homeFor(user.role, "web") : "/consola/login"} replace />
          )
        }
      />
      <Route
        path="/consola/informes"
        element={
          user && (user.role === "ADMIN" || user.role === "ADMIN_PRODUCTO") ? (
            <InformesPage user={user} onLogout={() => { logout(); setUser(null) }} />
          ) : (
            <Navigate to={user ? homeFor(user.role, "web") : "/consola/login"} replace />
          )
        }
      />
      <Route
        path="/consola/auditoria"
        element={
          user && user.permissions.includes("audit.view") ? (
            <AuditoriaPage user={user} onLogout={() => { logout(); setUser(null) }} />
          ) : (
            <Navigate to={user ? homeFor(user.role, "web") : "/consola/login"} replace />
          )
        }
      />
      <Route
        path="/consola/capacitacion"
        element={
          user && (user.role === "ADMIN" || user.role === "ADMIN_PRODUCTO") ? (
            <CapacitacionPage user={user} onLogout={() => { logout(); setUser(null) }} />
          ) : (
            <Navigate to={user ? homeFor(user.role, "web") : "/consola/login"} replace />
          )
        }
      />
      <Route path="/consola/geo" element={user && user.role !== "RTC" ? <GeoPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to={user ? "/consola" : "/consola/login"} replace />} />
      <Route path="/consola/geo/:checkId" element={user && user.role !== "RTC" ? <GeoReviewPage user={user} onLogout={() => { logout(); setUser(null) }} /> : <Navigate to={user ? "/consola" : "/consola/login"} replace />} />
    </Routes>
  )
}

function Gate({ role }: { role?: string }) {
  if (!role) return <Navigate to="/consola/login" replace />
  return <Navigate to={homeFor(role, "web")} replace />
}

function Recover() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState("")
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      if (!sent) {
        await requestCode(identifier, "PASSWORD_RESET")
        setSent(true)
      } else {
        await resetPassword(identifier, code, password)
        setDone(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña")
    }
  }

  return (
    <div className="nc-auth">
      <div className="nc-auth-card">
        <div className="nc-auth-brand">
          <h1 className="nc-auth-title">Recupera tu contraseña</h1>
          <p className="nc-auth-lede">Si el correo está registrado, enviamos un código.</p>
        </div>
        {done ? (
          <>
            <p className="nc-auth-lede">Listo. Ya puedes entrar con tu contraseña.</p>
            <Button type="button" block onClick={() => navigate("/consola/login")}>
              Ir a iniciar sesión
            </Button>
          </>
        ) : (
          <form className="nc-auth-form" onSubmit={submit} noValidate>
            <TextField
              label="Correo"
              type="email"
              placeholder="nombre@empresa.com"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              error={error}
              required
            />
            {sent ? (
              <TextField label="Código" value={code} onChange={(event) => setCode(event.target.value)} />
            ) : null}
            {sent ? (
              <TextField
                label="Nueva contraseña"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            ) : null}
            <Button type="submit" size="lg" block>
              {sent ? "Guardar contraseña" : "Enviar código"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

