type Props = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

export function TablePager({ page, pageSize, total, onPageChange, disabled }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  if (total <= pageSize) {
    return total > 0 ? (
      <div className="nc-table-pager">
        <span className="nc-portal-muted">
          {total} {total === 1 ? "registro" : "registros"}
        </span>
      </div>
    ) : null
  }

  return (
    <div className="nc-table-pager">
      <span className="nc-portal-muted">
        {from}–{to} de {total}
      </span>
      <div className="nc-table-pager-actions">
        <button type="button" className="nc-btn nc-btn-quiet" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </button>
        <span className="nc-table-pager-page">
          {page} / {pages}
        </span>
        <button
          type="button"
          className="nc-btn nc-btn-quiet"
          disabled={disabled || page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
