import { View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { LEGAL_DOCS, OPERATOR, SERVICE_PROVIDERS, TERMS_VERSION, type LegalBlock } from '@taxsteps/core'
import { BackHeader } from '@/components/BackHeader'
import { H, Muted, Screen, T } from '@/components/ui'
import { colors } from '@/lib/theme'

// Terms of Service / Privacy Policy, the same text as taxsteps.vercel.app/terms and /privacy. Open signed in or out.

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') return <T>{block}</T>
  if ('list' in block) return <View style={{ gap: 6 }}>{block.list.map((li) => <T key={li}>{`•  ${li}`}</T>)}</View>
  return (
    <View style={{ gap: 8 }}>
      {SERVICE_PROVIDERS.map((p) => (
        <View key={p.name} style={{ gap: 4, padding: 14, borderRadius: 22, backgroundColor: colors.neutral[100] }}>
          <T weight="bold">{p.name}</T>
          <T size={14}>{p.role}</T>
          <Muted>{p.location}</Muted>
        </View>
      ))}
    </View>
  )
}

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc?: string }>()
  const d = doc === 'privacy' ? LEGAL_DOCS.privacy : LEGAL_DOCS.terms
  return (
    <Screen style={{ gap: 14 }}>
      <BackHeader title={d.title} />
      <Muted>Last updated {OPERATOR.updated} · version {TERMS_VERSION}</Muted>
      <View style={{ padding: 16, borderRadius: 22, backgroundColor: colors.accent2Ramp[200] }}>
        <T color={colors.accent2Ramp[900]}>{d.summary}</T>
      </View>
      {d.sections.map((s) => (
        <View key={s.heading} style={{ gap: 8 }}>
          <H size={20}>{s.heading}</H>
          {s.body.map((b, i) => <Block key={i} block={b} />)}
        </View>
      ))}
      <Muted>{OPERATOR.name} · {OPERATOR.country} · {OPERATOR.email}</Muted>
    </Screen>
  )
}
