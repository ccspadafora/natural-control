import type { InputHTMLAttributes, ReactNode } from "react"
import { useId } from "react"
import { Icon } from "../core/Icon"

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  helper?: string
  error?: string
  required?: boolean
  aside?: ReactNode
  trailing?: ReactNode
}

export function TextField({
  label,
  helper,
  error,
  required,
  id,
  aside,
  trailing,
  className = "",
  ...rest
}: TextFieldProps) {
  const auto = useId()
  const fid = id || `f${auto}`
  const msg = error || helper
  return (
    <div className={["nc-field", error ? "nc-field-error" : "", className].filter(Boolean).join(" ")}>
      <div className="nc-field-head">
        <label className="nc-field-label" htmlFor={fid}>
          {label}
          {required ? (
            <span className="nc-req" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        {aside}
      </div>
      <div className={trailing ? "nc-input-wrap" : undefined}>
        <input
          id={fid}
          className="nc-input"
          required={required}
          aria-invalid={!!error}
          aria-describedby={msg ? `${fid}-h` : undefined}
          {...rest}
        />
        {trailing}
      </div>
      {msg ? (
        <span id={`${fid}-h`} className="nc-field-help">
          {error ? <Icon name="alert" small /> : null}
          {msg}
        </span>
      ) : null}
    </div>
  )
}
