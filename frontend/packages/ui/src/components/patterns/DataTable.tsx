import type { ReactNode } from "react"

export type DataTableColumn<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
}

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  rows: T[]
  emptyMessage?: string
  className?: string
}

export function DataTable<T>({ columns, rows, emptyMessage = "Sin registros", className = "" }: DataTableProps<T>) {
  return (
    <div className={["nc-table-wrap", className].filter(Boolean).join(" ")}>
      <table className="nc-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <p className="nc-empty">{emptyMessage}</p>
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render(row)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
