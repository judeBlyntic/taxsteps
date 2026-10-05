import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { colors } from '@/lib/theme'
import { H } from './ui'

export function BackHeader({ title }: { title: string }) {
  const router = useRouter()
  return (
    <View style={{ gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()}
        style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center' }}>
        <ChevronLeft size={20} color={colors.text} strokeWidth={2.75} />
      </Pressable>
      <H size={32}>{title}</H>
    </View>
  )
}
