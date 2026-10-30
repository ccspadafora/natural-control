import type { ReactNode } from "react"

export type LoginLayoutProps = {
  logoSrc: string
  coverSrc: string
  platform: string
  title: string
  lede: string
  coverTitle: string
  coverText: string
  children: ReactNode
}

export function LoginLayout({
  logoSrc,
  coverSrc,
  platform,
  title,
  lede,
  coverTitle,
  coverText,
  children,
}: LoginLayoutProps) {
  return (
    <main className="nc-login">
      <section className="nc-login-cover" style={{ backgroundImage: `url(${coverSrc})` }}>
        <div className="nc-login-cover-copy">
          <span className="nc-login-rule" />
          <p className="nc-login-cover-title">{coverTitle}</p>
          <p className="nc-login-cover-text">{coverText}</p>
        </div>
      </section>
      <section className="nc-login-panel">
        <div className="nc-login-form">
          <img src={logoSrc} alt="Natural Control" />
          <div className="nc-login-intro">
            <p className="nc-login-eyebrow">Plataforma {platform}</p>
            <h1>{title}</h1>
            <span className="nc-login-marks" aria-hidden="true">
              <i />
              <i />
            </span>
            <p className="nc-login-lede">{lede}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}
