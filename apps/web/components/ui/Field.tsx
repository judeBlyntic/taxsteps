import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

type Common = { label: string; error?: string | null; note?: ReactNode; className?: string }

export function TextField({ label, error, note, className, ...input }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={id}>{label}{note}</label>
      <input id={id} className="input" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} {...input} />
      {error && <div id={`${id}-err`} className="field-error">{error}</div>}
    </div>
  )
}

export function SelectField({ label, error, note, className, children, ...select }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={id}>{label}{note}</label>
      <select id={id} className="input" aria-invalid={error ? true : undefined} {...select}>{children}</select>
      {error && <div className="field-error">{error}</div>}
    </div>
  )
}
