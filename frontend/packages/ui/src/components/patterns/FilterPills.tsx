export type FilterPill = {
  id: string
  label: string
}

export type FilterPillsProps = {
  items: FilterPill[]
  value?: string
  onChange?: (id: string) => void
  className?: string
}

export function FilterPills({ items, value, onChange, className = "" }: FilterPillsProps) {
  return (
    <div className={["nc-row", className].filter(Boolean).join(" ")} role="group" aria-label="Filtros">
      {items.map((it) => {
        const active = value === it.id
        return (
          <button
            key={it.id}
            type="button"
            className={active ? "nc-btn nc-btn-primary" : "nc-btn nc-btn-secondary"}
            aria-pressed={active}
            onClick={() => onChange?.(it.id)}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
