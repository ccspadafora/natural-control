import type { SessionUser } from "@nc/domain"
import { LeagueRadar } from "../liga/components/LeagueRadar"
import { mapPlayer } from "../liga/shared/leagueMap"
import { useScorecard } from "../liga/shared/useLeague"
import { PortalPage } from "./PortalPage"

export function MiCartaPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { data, error, loading } = useScorecard("me")
  const player = data ? mapPlayer(data.player) : null
  const zoneAvg = data?.zone_avg || [0, 0, 0, 0, 0, 0]
  const neighborhood = data?.neighborhood || []
  const myPos = data?.zone_rank ?? neighborhood.find((n) => n.is_me)?.pos
  const zoneSize = data?.zone_size || 0

  return (
    <PortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-hero">
        <span className="nc-portal-eyebrow">
          {myPos != null
            ? `Liga de tu zona · puesto ${myPos}${zoneSize ? ` de ${zoneSize}` : ""}`
            : "Liga de tu zona"}
        </span>
        <h1>Mi carta y liga</h1>
      </header>

      {error ? <p className="nc-portal-muted">{error}</p> : null}
      {loading && !data ? <p className="nc-portal-muted">Cargando tu carta…</p> : null}

      {player ? (
        <>
          <div className="nc-portal-split">
            <article className="nc-player-card" style={{ borderColor: player.tierBorder }}>
              <div className="nc-player-card-top">
                <div>
                  <span className="nc-portal-gen">{player.genLabel}</span>
                  <span className="nc-portal-muted">{player.tierName}</span>
                </div>
                <span className="nc-player-avatar" style={{ background: player.tierBg }}>
                  {player.initials}
                </span>
              </div>
              <div className="nc-player-card-name">
                <strong>
                  {user.first_name} {user.last_name}
                </strong>
                <span className="nc-portal-muted">
                  {player.zoneName} · <span style={{ color: player.formFg }}>{player.formWord}</span>
                </span>
              </div>
              <div className="nc-player-attrs">
                {player.attrs.map((attr) => (
                  <div key={attr.k}>
                    <strong>{attr.v}</strong>
                    <span className="nc-portal-muted">{attr.k}</span>
                  </div>
                ))}
              </div>
            </article>

            <LeagueRadar
              valuesA={player.a || [0, 0, 0, 0, 0, 0]}
              valuesB={zoneAvg}
              labelA={player.name}
              labelB={`Promedio ${player.zoneName}`}
            />
          </div>

          <section className="nc-portal-card">
            <h2>Tu vecindario en la liga</h2>
            <ul className="nc-portal-league">
              {neighborhood.map((row) => (
                <li key={row.user_id} className={row.is_me ? "is-you" : ""}>
                  <span>{row.pos ?? "—"}</span>
                  <span>{row.name}</span>
                  <strong>{row.gen ?? "—"}</strong>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </PortalPage>
  )
}
