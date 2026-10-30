import type { SessionUser } from "@nc/domain"
import { PortalPage } from "./PortalPage"

const ATTRS = [
  { k: "VEN", v: "78" },
  { k: "CON", v: "72" },
  { k: "ACT", v: "81" },
  { k: "COB", v: "65" },
  { k: "GPS", v: "88" },
  { k: "DAT", v: "74" },
]

const NEIGHBORHOOD = [
  { pos: 1, name: "Juan H. Restrepo", gen: "89" },
  { pos: 2, name: "Paula Zuluaga", gen: "86" },
  { pos: 3, name: "Camilo Restrepo", gen: "82", you: true },
  { pos: 4, name: "Esteban Pérez", gen: "80" },
  { pos: 5, name: "Daniela Vélez", gen: "77" },
]

export function MiCartaPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const initials = `${user.first_name[0] || ""}${user.last_name[0] || ""}`.toUpperCase()

  return (
    <PortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-hero">
        <span className="nc-portal-eyebrow">Liga de tu zona · puesto 3 de 12</span>
        <h1>Mi carta y liga</h1>
      </header>

      <div className="nc-portal-split">
        <article className="nc-player-card">
          <div className="nc-player-card-top">
            <div>
              <span className="nc-portal-gen">82</span>
              <span className="nc-portal-muted">Nivel Oro</span>
            </div>
            <span className="nc-player-avatar">{initials}</span>
          </div>
          <div className="nc-player-card-name">
            <strong>
              {user.first_name} {user.last_name}
            </strong>
            <span className="nc-portal-muted">
              {user.zone_id ? "Tu zona" : "Oriente antioqueño"} · En racha
            </span>
          </div>
          <div className="nc-player-attrs">
            {ATTRS.map((attr) => (
              <div key={attr.k}>
                <strong>{attr.v}</strong>
                <span className="nc-portal-muted">{attr.k}</span>
              </div>
            ))}
          </div>
        </article>

        <section className="nc-portal-card nc-portal-radar">
          <svg viewBox="0 0 300 290" role="img" aria-label="Radar de atributos (placeholder)">
            {[0.25, 0.5, 0.75, 1].map((scale) => (
              <polygon
                key={scale}
                points="150,40 250,120 210,230 90,230 50,120"
                fill="none"
                stroke="var(--hairline)"
                transform={`translate(150 140) scale(${scale}) translate(-150 -140)`}
              />
            ))}
            <polygon
              points="150,55 235,125 200,215 100,215 65,125"
              fill="var(--primary-tint)"
              fillOpacity={0.55}
              stroke="var(--chart-1)"
              strokeWidth={2.5}
            />
            <polygon
              points="150,70 220,130 190,200 110,200 80,130"
              fill="none"
              stroke="var(--chart-5)"
              strokeWidth={2}
              strokeDasharray="5 4"
            />
          </svg>
          <p className="nc-portal-muted">Comparación contra el promedio de la zona (datos ilustrativos).</p>
        </section>
      </div>

      <section className="nc-portal-card">
        <h2>Tu vecindario en la liga</h2>
        <ul className="nc-portal-league">
          {NEIGHBORHOOD.map((row) => (
            <li key={row.pos} className={row.you ? "is-you" : ""}>
              <span>{row.pos}</span>
              <span>{row.name}</span>
              <strong>{row.gen}</strong>
            </li>
          ))}
        </ul>
      </section>
    </PortalPage>
  )
}
