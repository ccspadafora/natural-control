import { useMemo } from "react"
import type { SessionUser } from "@nc/domain"
import { LeagueRadar } from "../liga/components/LeagueRadar"
import { ATTR_COACH, attrCompareTable, mapPlayer, periodEyebrow } from "../liga/shared/leagueMap"
import { useScorecard } from "../liga/shared/useLeague"
import { PortalPage } from "./PortalPage"

export function MiCartaPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { data, error, loading } = useScorecard("me")
  const player = data ? mapPlayer(data.player) : null
  const zoneAvg = data?.zone_avg || [0, 0, 0, 0, 0, 0]
  const neighborhood = data?.neighborhood || []
  const myPos = data?.zone_rank ?? neighborhood.find((n) => n.is_me)?.pos
  const zoneSize = data?.zone_size || 0
  const day = data ? new Date(`${data.period_start}T12:00:00`).getDate() : 1
  const days = data
    ? new Date(
        new Date(`${data.period_start}T12:00:00`).getFullYear(),
        new Date(`${data.period_start}T12:00:00`).getMonth() + 1,
        0,
      ).getDate()
    : 30

  const coaching = useMemo(() => {
    if (!player || !data) return []
    return attrCompareTable(player, zoneAvg, `Promedio ${player.zoneName}`, day, days)
  }, [player, zoneAvg, data, day, days])

  const focus = coaching.filter((row) => row.behind).slice(0, 3)

  return (
    <PortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-hero">
        <span className="nc-portal-eyebrow">
          {myPos != null
            ? `Liga de tu zona · puesto ${myPos}${zoneSize ? ` de ${zoneSize}` : ""}`
            : "Liga de tu zona"}
        </span>
        <h1>Mi carta y liga</h1>
        {data ? <p className="nc-portal-muted">{periodEyebrow(data.period_start, day)}</p> : null}
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
                {player.attrs.map((attr, i) => (
                  <div key={attr.k} title={ATTR_COACH[i]?.meaning}>
                    <strong>{attr.v}</strong>
                    <span className="nc-portal-muted">
                      {attr.n} <span className="nc-player-attr-code">({attr.k})</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="nc-player-card-hint">
                GEN es tu nota general (0–99). Cada número de abajo es un atributo de tu mes; toca “Cómo mejorar” para
                ver qué significa y qué hacer.
              </p>
            </article>

            <LeagueRadar
              valuesA={player.a || [0, 0, 0, 0, 0, 0]}
              valuesB={zoneAvg}
              labelA={player.name}
              labelB={`Promedio ${player.zoneName}`}
            />
          </div>

          <section className="nc-portal-card nc-liga-coach">
            <h2>Cómo mejorar</h2>
            <p className="nc-portal-muted">
              Comparado con el promedio de {player.zoneName}. Empieza por lo que vas más abajo.
            </p>
            {focus.length > 0 ? (
              <div className="nc-liga-focus">
                <span className="nc-field-label">Prioridad esta semana</span>
                <ul>
                  {focus.map((row) => (
                    <li key={`focus-${row.k}`}>
                      <strong>
                        {row.n} ({row.k}) · {row.a}
                      </strong>
                      <span>{row.action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="nc-portal-muted">Vas parejo o por encima del promedio en todos los atributos. Mantén el ritmo.</p>
            )}
            <ul className="nc-liga-coach-list">
              {coaching.map((row) => (
                <li key={row.k} className={row.behind ? "is-behind" : "is-ok"}>
                  <div className="nc-liga-coach-head">
                    <div>
                      <strong>
                        {row.n} <span className="nc-player-attr-code">({row.k})</span>
                      </strong>
                      <p>{row.meaning}</p>
                    </div>
                    <div className="nc-liga-coach-scores">
                      <span>
                        Tú <strong>{row.a}</strong>
                      </span>
                      <span>
                        Zona <strong>{row.b}</strong>
                      </span>
                      <span style={{ color: row.diffFg }}>{row.diff}</span>
                    </div>
                  </div>
                  <p className="nc-liga-coach-ind">{row.indicators}</p>
                  <p className="nc-liga-coach-tip">
                    <span>{row.behind ? "Para subir" : "Para mantener"}</span>
                    {row.action}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="nc-portal-card">
            <h2>Tu vecindario en la liga</h2>
            <p className="nc-portal-muted">Puesto por GEN en tu zona este mes.</p>
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
