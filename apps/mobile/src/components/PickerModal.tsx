import { FlatList, Modal, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, X } from 'lucide-react-native'
import { colors } from '@/lib/theme'
import { H, T } from './ui'

export type PickerOption = { value: string; label: string }

export function PickerModal({ title, options, value, onPick, onClose }: {
  title: string; options: PickerOption[]; value: string; onPick: (v: string) => void; onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  return (
    <Modal animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(46,43,37,0.35)' }} onPress={onClose} accessibilityLabel="Close" />
      <View style={{ maxHeight: '70%', backgroundColor: colors.bg, borderTopLeftRadius: 34, borderTopRightRadius: 34, paddingBottom: insets.bottom + 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 }}>
          <H size={22}>{title}</H>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close"><X size={22} color={colors.text} strokeWidth={2.75} /></Pressable>
        </View>
        <FlatList data={options} keyExtractor={(o) => o.value || '_none'} renderItem={({ item }) => (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: item.value === value }} onPress={() => { onPick(item.value); onClose() }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 22, backgroundColor: pressed ? colors.surface : 'transparent' })}>
            <T weight={item.value === value ? 'bold' : 'body'} size={16}>{item.label}</T>
            {item.value === value && <Check size={18} color={colors.accent2Ramp[700]} strokeWidth={2.75} />}
          </Pressable>
        )} />
      </View>
    </Modal>
  )
}
