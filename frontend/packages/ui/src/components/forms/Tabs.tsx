import { useState } from "react"

export type TabItem = {
  id: string
  label: string
  count?: number
}

export type TabsProps = {
  items: TabItem[]
  value?: string
  onChange?: (id: string) => void
  label?: string
  block?: boolean
  className?: string
}

export function Tabs({ items, value, onChange, label, block, className = "" }: TabsProps) {
  const [inner, setInner] = useState(items[0]?.id)
  const cur = value ?? inner
  const pick = (id: string) => {
    setInner(id)
    onChange?.(id)
  }
  return (
    <div
      role="tablist"
      aria-label={label}
      className={["nc-tabs", block ? "nc-tabs-block" : "", className].filter(Boolean).join(" ")}
    >
      {items.map((it) => (
        <button
          key={it.id}
          role="tab"
          type="button"
          className="nc-tab"
          aria-selected={cur === it.id}
          onClick={() => pick(it.id)}
        >
          {it.label}
          {it.count != null ? <span className="nc-tab-count">{it.count}</span> : null}
        </button>
      ))}
    </div>
  )
}
