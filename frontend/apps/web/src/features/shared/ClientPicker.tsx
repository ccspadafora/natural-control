import { useEffect, useId, useMemo, useRef, useState } from "react"

export type ClientOption = {
  id: string
  name: string
  municipality?: string
  owner_name?: string
}

type Props = {
  clients: ClientOption[]
  value: string
  onChange: (id: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
}

function norm(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

/** Selector de cliente con buscador (listas largas). */
export function ClientPicker({
  clients,
  value,
  onChange,
  label = "Cliente",
  placeholder = "Busca por nombre o municipio…",
  disabled,
}: Props) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const selected = clients.find((c) => c.id === value) ?? null

  const filtered = useMemo(() => {
    const needle = norm(query.trim())
    if (!needle) return clients.slice(0, 80)
    return clients
      .filter((c) => [c.name, c.municipality, c.owner_name].some((v) => norm(v || "").includes(needle)))
      .slice(0, 80)
  }, [clients, query])

  useEffect(() => {
    if (!open) return
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  useEffect(() => {
    if (!open) setQuery("")
  }, [open, value])

  function pick(id: string) {
    onChange(id)
    setOpen(false)
    setQuery("")
  }

  return (
    <div className="nc-field nc-client-picker" ref={rootRef}>
      <span className="nc-field-label">{label}</span>
      <button
        type="button"
        className="nc-input nc-client-picker-trigger"
        disabled={disabled || clients.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={selected ? "" : "nc-portal-muted"}>
          {selected ? `${selected.name}${selected.municipality ? ` · ${selected.municipality}` : ""}` : "Elige un cliente"}
        </span>
        <span aria-hidden>▾</span>
      </button>
      {open ? (
        <div className="nc-client-picker-panel" role="listbox" id={listId}>
          <input
            className="nc-input"
            autoFocus
            value={query}
            placeholder={placeholder}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false)
              if (event.key === "Enter" && filtered[0]) {
                event.preventDefault()
                pick(filtered[0].id)
              }
            }}
          />
          <ul className="nc-client-picker-list">
            {filtered.length === 0 ? (
              <li className="nc-client-picker-empty">Ningún cliente coincide.</li>
            ) : (
              filtered.map((client) => {
                const active = client.id === value
                return (
                  <li key={client.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`nc-client-picker-option${active ? " is-active" : ""}`}
                      onClick={() => pick(client.id)}
                    >
                      <span>{client.name}</span>
                      <span className="nc-portal-muted">
                        {[client.municipality, client.owner_name].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          {clients.length > filtered.length ? (
            <p className="nc-client-picker-hint">Escribe para filtrar · {clients.length} clientes</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
