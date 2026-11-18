import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button, Icon } from "@nc/ui"

type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let deferred: InstallPrompt | null = null
const listeners = new Set<() => void>()

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    deferred = event as InstallPrompt
    listeners.forEach((fn) => fn())
  })
  window.addEventListener("appinstalled", () => {
    deferred = null
    listeners.forEach((fn) => fn())
  })
}

export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

export function InstalarScreen() {
  const navigate = useNavigate()
  const [, refresh] = useState(0)
  const [standalone, setStandalone] = useState(() => isStandalone())

  useEffect(() => {
    const update = () => {
      setStandalone(isStandalone())
      refresh((n) => n + 1)
    }
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    deferred = null
    refresh((n) => n + 1)
  }

  const ios = isIos()

  return (
    <>
      <header className="nc-campo-head">
        <div className="nc-campo-head-row">
          <button
            type="button"
            className="nc-campo-link-row"
            style={{ width: 48, color: "var(--ink)" }}
            aria-label="Volver"
            onClick={() => navigate("/yo")}
          >
            <Icon name="chevronLeft" />
          </button>
          <div style={{ flex: 1 }}>
            <div className="nc-campo-eyebrow">Acceso directo en tu celular</div>
            <h1 style={{ font: "var(--text-title)" }}>Instalar la app</h1>
          </div>
        </div>
      </header>

      <section className="nc-campo-page" style={{ display: "grid", gap: "var(--space-4)", alignContent: "start" }}>
        {standalone ? (
          <p style={{ font: "var(--text-body-lg)", color: "var(--ink-secondary)" }}>
            Ya estás usando la app instalada. Puedes abrirla desde el ícono en tu pantalla de inicio, incluso sin señal.
          </p>
        ) : ios ? (
          <>
            <p style={{ font: "var(--text-body-lg)" }}>En iPhone o iPad se instala desde Safari:</p>
            <ol style={{ margin: 0, paddingLeft: "var(--space-5)", display: "grid", gap: "var(--space-3)", font: "var(--text-body)" }}>
              <li>Abre esta página en Safari (no dentro de otra app).</li>
              <li>Toca el botón Compartir, el cuadro con la flecha hacia arriba.</li>
              <li>Elige «Agregar a pantalla de inicio».</li>
              <li>Toca «Agregar». Verás el ícono de Natural Control junto a tus otras apps.</li>
            </ol>
          </>
        ) : deferred ? (
          <>
            <p style={{ font: "var(--text-body-lg)" }}>
              Instálala para abrirla con un toque y registrar visitas aunque no tengas señal.
            </p>
            <Button size="lg" block icon="plus" onClick={() => void install()}>
              Instalar la app
            </Button>
          </>
        ) : (
          <>
            <p style={{ font: "var(--text-body-lg)" }}>
              Si usas Android, abre esta página en Chrome y sigue estos pasos:
            </p>
            <ol style={{ margin: 0, paddingLeft: "var(--space-5)", display: "grid", gap: "var(--space-3)", font: "var(--text-body)" }}>
              <li>Toca el menú de los tres puntos arriba a la derecha.</li>
              <li>Elige «Instalar app» o «Agregar a la pantalla principal».</li>
              <li>Confirma. El ícono quedará en tu pantalla de inicio.</li>
            </ol>
            <p className="nc-kicker">Si ya la instalaste, ábrela desde ese ícono.</p>
          </>
        )}
      </section>
    </>
  )
}
