import { FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { isDemoMode, login, requestCode, verifyCode } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Button, TextField } from "@nc/ui"
import { homeFor } from "../shell/nav"

const DEMO_ROLES = [
  { label: "RTC", email: "rtc@naturalcontrol.test" },
  { label: "Líder", email: "lider@naturalcontrol.test" },
  { label: "Gerencia", email: "gerencia@naturalcontrol.test" },
  { label: "Admin", email: "admin@naturalcontrol.test" },
]

type Props = {
  onDone: (user: SessionUser) => void
}

export function PortalLogin({ onDone }: Props) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<"pwd" | "otp">("pwd")
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submitPwd(event: FormEvent) {
    event.preventDefault()
    setError("")
    setBusy(true)
    try {
      const session = await login(identifier, password, true)
      onDone(session)
      navigate(homeFor(session.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar")
    } finally {
      setBusy(false)
    }
  }

  async function submitOtp(event: FormEvent) {
    event.preventDefault()
    setError("")
    setBusy(true)
    try {
      if (!sent) {
        await requestCode(identifier, "LOGIN")
        setSent(true)
      } else {
        const session = await verifyCode(identifier, code)
        onDone(session)
        navigate(homeFor(session.role))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar")
    } finally {
      setBusy(false)
    }
  }

  async function demoAs(email: string) {
    setBusy(true)
    setError("")
    try {
      const session = await login(email, "Nc-Campo-2026-piloto", true)
      onDone(session)
      navigate(homeFor(session.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="nc-auth">
      <div className="nc-auth-card">
        <div className="nc-auth-brand">
          <img src="/logo-natural-control-2024.png" alt="Natural Control" width={240} />
          <div>
            <h1 className="nc-auth-title">Entra al CRM de campo</h1>
            <p className="nc-auth-lede">Usa tu correo de Natural Control.</p>
          </div>
        </div>

        {mode === "pwd" ? (
          <form className="nc-auth-form" onSubmit={submitPwd} noValidate>
            <TextField
              label="Correo o usuario"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              error={error}
              required
            />
            <div className="nc-auth-row-end">
              <button type="button" className="nc-text-link" onClick={() => navigate("/recuperar")}>
                Olvidé mi contraseña
              </button>
            </div>
            <Button type="submit" size="lg" block disabled={busy}>
              Iniciar sesión
            </Button>
            <Button type="button" variant="secondary" block onClick={() => { setMode("otp"); setError(""); setSent(false) }}>
              Entrar con un código
            </Button>
          </form>
        ) : (
          <form className="nc-auth-form" onSubmit={submitOtp} noValidate>
            <TextField
              label="Correo"
              type="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              helper="Si el correo tiene cuenta, te llega un código de 6 dígitos válido por 10 min."
              required
            />
            {sent ? (
              <TextField
                label="Código"
                inputMode="numeric"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                error={error}
                required
              />
            ) : null}
            {error && !sent ? <p className="nc-field-help" role="alert">{error}</p> : null}
            <Button type="submit" size="lg" block disabled={busy}>
              {sent ? "Entrar" : "Enviar código"}
            </Button>
            <Button type="button" variant="quiet" block onClick={() => { setMode("pwd"); setError(""); setSent(false) }}>
              Usar mi contraseña
            </Button>
          </form>
        )}
      </div>

      {isDemoMode() ? (
        <div className="nc-auth-demo">
          <span className="nc-eyebrow">Demo · entrar como</span>
          <div className="nc-auth-demo-roles">
            {DEMO_ROLES.map((r) => (
              <button key={r.email} type="button" className="nc-pill" onClick={() => demoAs(r.email)} disabled={busy}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
