import type { LeagueRtc } from "../shared/leagueData"

export function PlayerCard({ rtc }: { rtc: LeagueRtc }) {
  return (
    <article className="nc-player-card" style={{ borderColor: rtc.tierBorder }}>
      <div className="nc-player-card-top">
        <div>
          <span className="nc-portal-gen">{rtc.genLabel}</span>
          <span className="nc-portal-muted">{rtc.tierName}</span>
        </div>
        <span className="nc-player-avatar" style={{ background: rtc.tierBg }}>
          {rtc.initials}
        </span>
      </div>
      <div className="nc-player-card-name">
        <strong>{rtc.name}</strong>
        <span className="nc-portal-muted">
          {rtc.zoneName} · <span style={{ color: rtc.formFg }}>{rtc.formWord}</span>
        </span>
      </div>
      <div className="nc-player-attrs">
        {rtc.attrs.map((attr) => (
          <div key={attr.k}>
            <strong>{attr.v}</strong>
            <span className="nc-portal-muted">{attr.k}</span>
          </div>
        ))}
      </div>
    </article>
  )
}
