// Review form generated from the shared EXTRACTION_FIELDS registry — every field editable.
import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { AlertTriangle, Check, ChevronDown } from 'lucide-react-native'
import {
  CURRENCIES, DOCUMENT_TYPES, EXTRACTION_FIELDS, fieldLabel, type Category, type Draft, type FieldDef, type FieldKey, type TaxRegion,
} from '@taxsteps/core'
import { colors, fonts } from '@/lib/theme'
import { PickerModal, type PickerOption } from './PickerModal'
import { T } from './ui'

type Props = {
  draft: Draft
  errors: Partial<Record<FieldKey, string>>
  categories: Category[]
  region: TaxRegion
  onChange: (key: FieldKey, value: string) => void
  /** Example date in the user's locale, e.g. 05/10/2026 */
  datePlaceholder: string
}

function optionsFor(def: FieldDef, categories: Category[], value: string): PickerOption[] | null {
  if (def.kind === 'documentType') return DOCUMENT_TYPES.map((t) => ({ value: t.code, label: t.label }))
  if (def.kind === 'currency') return [...new Set([value, ...CURRENCIES])].filter(Boolean).map((c) => ({ value: c, label: c }))
  if (def.kind === 'category') {
    return [{ value: '', label: 'Uncategorised' }, ...categories.filter((c) => !c.archived || c.id === value).map((c) => ({ value: c.id, label: c.name }))]
  }
  return null
}

export function DocumentForm({ draft, errors, categories, region, onChange, datePlaceholder }: Props) {
  const [picker, setPicker] = useState<FieldDef | null>(null)
  return (
    <View style={{ gap: 4, padding: 8, borderRadius: 32, backgroundColor: colors.neutral[100] }}>
      {EXTRACTION_FIELDS.map((def) => {
        const value = draft.values[def.key]
        const flagged = draft.flags.includes(def.key)
        const error = errors[def.key] ?? draft.warnings.find((w) => w.field === def.key)?.message
        const opts = optionsFor(def, categories, value)
        const label = fieldLabel(def, region)
        const display = opts ? opts.find((o) => o.value === value)?.label ?? '' : value
        return (
          <View key={def.key} style={{ borderRadius: 22, backgroundColor: flagged ? colors.accentRamp[100] : 'transparent', paddingVertical: 6, paddingHorizontal: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: def.kind === 'textarea' ? 'flex-start' : 'center', gap: 10, minHeight: 40 }}>
              <T size={13} color={colors.neutral[700]} style={{ width: 92 }}>{label}{def.required ? ' *' : ''}</T>
              {opts ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${display || 'not set'}`} onPress={() => setPicker(def)}
                  style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                  <T weight="bold" style={{ textAlign: 'right' }}>{display || 'Choose'}</T>
                  <ChevronDown size={16} color={colors.neutral[600]} strokeWidth={2.75} />
                </Pressable>
              ) : (
                <TextInput accessibilityLabel={label} value={value} onChangeText={(v) => onChange(def.key, v)} maxLength={def.maxLength}
                  multiline={def.kind === 'textarea'} keyboardType={def.kind === 'money' ? 'decimal-pad' : 'default'}
                  placeholder={def.kind === 'date' ? datePlaceholder : undefined} placeholderTextColor={colors.neutral[500]}
                  style={{ flex: 1, textAlign: def.kind === 'textarea' ? 'left' : 'right', fontFamily: fonts.bold, fontSize: 15, color: colors.text, paddingVertical: 6 }} />
              )}
              <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: flagged ? colors.accentRamp[300] : colors.accent2Ramp[200] }}>
                {flagged ? <AlertTriangle size={12} color={colors.accentRamp[900]} strokeWidth={2.75} /> : <Check size={12} color={colors.accent2Ramp[800]} strokeWidth={2.75} />}
              </View>
            </View>
            {error ? <T size={12} weight="semibold" color={colors.accentRamp[700]}>{error}</T> : null}
          </View>
        )
      })}
      {picker && (
        <PickerModal title={fieldLabel(picker, region)} options={optionsFor(picker, categories, draft.values[picker.key]) ?? []}
          value={draft.values[picker.key]} onPick={(v) => onChange(picker.key, v)} onClose={() => setPicker(null)} />
      )}
    </View>
  )
}
