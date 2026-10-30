import { Link } from "react-router-dom"
import { Icon } from "@nc/ui"
import type { AttentionCase } from "../shared/placeholderData"

export function AttentionListCompact({ items }: { items: AttentionCase[] }) {
  return (
    <div className="nc-portal-card nc-mgmt-attention">
      <div className="nc-portal-card-head">
        <h2>Pide tu atención</h2>
        <span className="nc-portal-muted">{items.length} casos</span>
      </div>
      <div className="nc-mgmt-attention-list">
        {items.map((a) => (
          <Link key={a.id} className="nc-mgmt-attention-row" to={a.to}>
            <span className="nc-leader-link-icon">
              <Icon name={a.icon} />
            </span>
            <span className="nc-leader-link-body">
              <span className="nc-leader-link-title">
                {a.n} {a.title}
              </span>
              <span className="nc-portal-muted">{a.sub}</span>
            </span>
            <Icon name="chevronRight" />
          </Link>
        ))}
      </div>
    </div>
  )
}

export function AttentionCardsToday({ items }: { items: AttentionCase[] }) {
  return (
    <div className="nc-mgmt-today-grid">
      {items.map((a) => (
        <Link key={a.id} className="nc-mgmt-today-card" to={a.to}>
          <span className="nc-mgmt-today-card-top">
            <Icon name={a.icon} />
            <span className="nc-mgmt-today-n">{a.n}</span>
          </span>
          <span className="nc-mgmt-today-title">{a.title}</span>
          <span className="nc-portal-muted">{a.sub}</span>
        </Link>
      ))}
    </div>
  )
}
