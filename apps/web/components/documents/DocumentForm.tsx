'use client'
import { useId } from 'react'
import {
  CURRENCIES, DOCUMENT_TYPES, EXTRACTION_FIELDS, PAYMENT_METHODS, fieldLabel, parseUserDate, type Category, type Draft,
  type FieldDef, type FieldKey, type TaxRegion,
} from '@taxsteps/core'

type Props = {
  draft: Draft
  errors: Partial<Record<FieldKey, string>>
  categories: Category[]
  region: TaxRegion
  locale: string
  onChange: (key: FieldKey, value: string) => void
}

/** Review form generated from the EXTRACTION_FIELDS registry — every extracted field is editable. */
export function DocumentForm({ draft, errors, categories, region, locale, onChange }: Props) {
  const listId = useId()
  return (
    <div className="field-grid">
      {EXTRACTION_FIELDS.map((def) => (
        <FieldControl key={def.key} def={def} label={fieldLabel(def, region)} value={draft.values[def.key]}
          flagged={draft.flags.includes(def.key)} error={errors[def.key]}
          warning={draft.warnings.find((w) => w.field === def.key)?.message}
          categories={categories} locale={locale} listId={listId} onChange={(v) => onChange(def.key, v)} />
      ))}
      <datalist id={listId}>{PAYMENT_METHODS.map((m) => <option key={m} value={m} />)}</datalist>
    </div>
  )
}

function FieldControl({ def, label, value, flagged, error, warning, categories, locale, listId, onChange }: {
  def: FieldDef; label: string; value: string; flagged: boolean; error?: string; warning?: string
  categories: Category[]; locale: string; listId: string; onChange: (v: string) => void
}) {
  const id = useId()
  const cls = `input ${flagged ? 'flagged' : ''}`
  const common = { id, className: cls, 'aria-invalid': error ? true : undefined, 'aria-describedby': error || warning ? `${id}-msg` : undefined }
  let control
  switch (def.kind) {
    case 'textarea':
      control = <textarea {...common} rows={3} maxLength={def.maxLength} value={value} onChange={(e) => onChange(e.target.value)} />
      break
    case 'money':
      control = <input {...common} inputMode="decimal" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      break
    case 'date':
      control = <input {...common} type="date" value={parseUserDate(value, locale) ?? ''} onChange={(e) => onChange(e.target.value)} />
      break
    case 'documentType':
      control = (
        <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
          {DOCUMENT_TYPES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
        </select>
      )
      break
    case 'currency':
      control = (
        <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
          {[...new Set([value, ...CURRENCIES])].filter(Boolean).map((c) => <option key={c}>{c}</option>)}
        </select>
      )
      break
    case 'category':
      control = (
        <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Uncategorised</option>
          {categories.filter((c) => !c.archived || c.id === value).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )
      break
    case 'payment':
      control = <input {...common} list={listId} maxLength={def.maxLength} value={value} onChange={(e) => onChange(e.target.value)} />
      break
    default:
      control = <input {...common} maxLength={def.maxLength} value={value} onChange={(e) => onChange(e.target.value)} />
  }
  return (
    <div className={`field ${def.span === 'full' ? 'full' : ''}`}>
      <label htmlFor={id}>
        <span>{label}{def.required && <span aria-hidden> *</span>}</span>
        {flagged && <span className="field-note">Review</span>}
      </label>
      {control}
      {(error || warning) && <div id={`${id}-msg`} className="field-error">{error ?? warning}</div>}
    </div>
  )
}
