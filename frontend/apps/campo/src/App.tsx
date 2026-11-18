import { FormEvent, useEffect, useState } from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"
import { logout, requestCode, resetPassword, restore } from "@nc/api"
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
import { ClientDetailScreen } from "./features/clientes/ClientDetailScreen"
import { ClientsScreen } from "./features/clientes/ClientsScreen"
import { NewClientWizard } from "./features/clientes/NewClientWizard"
import { HoyScreen } from "./features/hoy/HoyScreen"
import { MisNumerosScreen } from "./features/numeros/MisNumerosScreen"
import { OportunidadesScreen } from "./features/numeros/OportunidadesScreen"
import { CampoShell } from "./features/shell/CampoShell"
import { InstalarScreen } from "./features/yo/InstalarScreen"
import { SincronizacionScreen } from "./features/yo/SincronizacionScreen"
import { YoScreen } from "./features/yo/YoScreen"
import { NewPlanItem, Programacion } from "./programacion"
import { Schedule } from "./screens"
import { ConfirmSheet } from "./features/shared/ConfirmSheet"
import { clearCampoCache, startOfflineSync } from "./offline"
import { VisitScreen } from "./visit"

initTheme()

function hideSplash() {
  const splash = document.getElementById("nc-splash")
  if (!splash) return
  splash.setAttribute("hidden", "")
}

function isStandaloneApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function App() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)
  const [showInstallNudge, setShowInstallNudge] = useState(false)
  const [logoutConfirm, setLogoutConfirm] = useState<{ pending: number } | null>(null)

  useEffect(() => {
    restore()
      .then((session) => {
        setUser(session)
        setReady(true)
      })
      .finally(() => hideSplash())
  }, [])

  useEffect(() => {
    if (!user?.features?.offline) return
    return startOfflineSync(user.id)
  }, [user?.features?.offline, user?.id])

  useEffect(() => {
    if (!user || user.role !== "RTC") return
    if (isStandaloneApp()) return
    if (localStorage.getItem("nc-campo-install-nudge") === "1") return
    setShowInstallNudge(true)
  }, [user])

  if (!ready) return null
  return (
    <>
    <Routes>
      <Route
        path="/login"
        element={
          user?.role === "RTC" ? (
            <Navigate to="/" replace />
          ) : (
            <CampoLogin
              onDone={(session) => {
                setUser(session)
                if (!isStandaloneApp() && localStorage.getItem("nc-campo-install-nudge") !== "1") {
                  setShowInstallNudge(true)
                }
              }}
            />
          )
        }
      />
      <Route path="/recuperar" element={<Recover />} />
      <Route
        element={
          user?.role === "RTC" ? (
            <CampoShell
              user={user}
              planPending={user.requires_weekly_plan}
              installNudge={showInstallNudge}
              onDismissInstall={() => {
                localStorage.setItem("nc-campo-install-nudge", "1")
                setShowInstallNudge(false)
              }}
              onLogout={() => {
                void (async () => {
                  try {
                    const { countPending } = await import("./offline/outbox")
                    const n = await countPending()
                    if (n > 0) {
                      setLogoutConfirm({ pending: n })
                      return
                    }
                  } catch {
                    /* ignore */
                  }
                  await clearCampoCache().catch(() => undefined)
                  logout()
                  setUser(null)
                })()
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
        <Route path="/clientes/nuevo" element={<NewClientWizard />} />
        <Route path="/clientes/:id" element={<ClientDetailScreen />} />
        <Route path="/clientes/:id/agendar" element={<Schedule />} />
        <Route path="/visitas/:id" element={<VisitScreen />} />
        <Route path="/numeros" element={<MisNumerosScreen />} />
        <Route path="/numeros/oportunidades" element={<OportunidadesScreen />} />
        <Route path="/yo" element={<YoScreen />} />
        <Route path="/sincronizacion" element={<SincronizacionScreen />} />
        <Route path="/instalar" element={<InstalarScreen />} />
        <Route path="/perfil" element={<Navigate to="/yo" replace />} />
      </Route>
    </Routes>
    <ConfirmSheet
      open={Boolean(logoutConfirm)}
      title="Cerrar sesión"
      body={
        logoutConfirm
          ? `Hay ${logoutConfirm.pending} cambio${logoutConfirm.pending === 1 ? "" : "s"} sin sincronizar. Se borrarán del dispositivo.`
          : undefined
      }
      confirmLabel="Cerrar y borrar"
      cancelLabel="Seguir aquí"
      danger
      onCancel={() => setLogoutConfirm(null)}
      onConfirm={() => {
        void (async () => {
          setLogoutConfirm(null)
          await clearCampoCache().catch(() => undefined)
          logout()
          setUser(null)
        })()
      }}
    />
    </>
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
            {sent ? (
              <TextField label="Código" value={code} onChange={(event) => setCode(event.target.value)} required />
            ) : null}
            {sent ? (
              <TextField
                label="Nueva contraseña"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
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
