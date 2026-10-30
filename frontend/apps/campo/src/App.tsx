import { FormEvent, useEffect, useState } from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"
import { logout, requestCode, restore } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Button, TextField, initTheme } from "@nc/ui"
import "@nc/ui/tokens.css"
import "@nc/ui/fonts.css"
import "@nc/ui/components.css"
import "./campo.css"
import "./campo-shell.css"
import "./campo-features.css"
import "./campo-auth.css"
import { CampoLogin } from "./features/auth/CampoLogin"
import { ClientsScreen } from "./features/clientes/ClientsScreen"
import { HoyScreen } from "./features/hoy/HoyScreen"
import { MisNumerosScreen } from "./features/numeros/MisNumerosScreen"
import { OportunidadesScreen } from "./features/numeros/OportunidadesScreen"
import { CampoShell } from "./features/shell/CampoShell"
import { SincronizacionScreen } from "./features/yo/SincronizacionScreen"
import { YoScreen } from "./features/yo/YoScreen"
import { NewPlanItem, Programacion } from "./programacion"
import { ClientDetail, NewClient, Schedule } from "./screens"
import { startOfflineSync } from "./offline"
import { VisitScreen } from "./visit"

initTheme()

export function App() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    restore().then((session) => {
      setUser(session)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!user?.features?.offline) return
    return startOfflineSync()
  }, [user?.features?.offline])

  if (!ready) return null
  return (
    <Routes>
      <Route path="/login" element={user?.role === "RTC" ? <Navigate to="/" replace /> : <CampoLogin onDone={setUser} />} />
      <Route path="/recuperar" element={<Recover />} />
      <Route
        element={
          user?.role === "RTC" ? (
            <CampoShell
              user={user}
              planPending={user.requires_weekly_plan}
              onLogout={() => {
                logout()
                setUser(null)
              }}
            />
          ) : user ? (
            <ExternalHome />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route path="/" element={<HoyScreen />} />
        <Route path="/programacion" element={<Programacion />} />
        <Route path="/programacion/nueva" element={<NewPlanItem />} />
        <Route path="/clientes" element={<ClientsScreen />} />
        <Route path="/clientes/nuevo" element={<NewClient />} />
        <Route path="/clientes/:id" element={<ClientDetail />} />
        <Route path="/clientes/:id/agendar" element={<Schedule />} />
        <Route path="/visitas/:id" element={<VisitScreen />} />
        <Route path="/numeros" element={<MisNumerosScreen />} />
        <Route path="/numeros/oportunidades" element={<OportunidadesScreen />} />
        <Route path="/yo" element={<YoScreen />} />
        <Route path="/sincronizacion" element={<SincronizacionScreen />} />
        <Route path="/perfil" element={<Navigate to="/yo" replace />} />
      </Route>
    </Routes>
  )
}

function ExternalHome() {
  window.location.assign("/consola/")
  return null
}

function Recover() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await requestCode(identifier, "PASSWORD_RESET")
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el código")
    }
  }

  return (
    <div className="nc-auth">
      <div className="nc-auth-card">
        <div className="nc-auth-brand">
          <h1 className="nc-auth-title">Recupera tu contraseña</h1>
          <p className="nc-auth-lede">Si el correo está registrado, enviamos un código.</p>
        </div>
        {sent ? (
          <>
            <p className="nc-auth-lede">Revisa tu bandeja.</p>
            <Button type="button" block onClick={() => navigate("/login")}>
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
            <Button type="submit" size="lg" block>
              Enviar código
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
