import { Button } from "@nc/ui"

type Props = {
  open: boolean
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null
  return (
    <div className="nc-campo-sheet-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="nc-campo-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nc-campo-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="nc-campo-sheet-title">{title}</h2>
        {body ? <p>{body}</p> : null}
        <div className="nc-campo-sheet-actions">
          <Button variant="quiet" block type="button" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "primary" : "primary"}
            block
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
