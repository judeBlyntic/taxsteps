import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { Archive, ArchiveRestore } from 'lucide-react-native'
import { toUserMessage, type Category } from '@taxsteps/core'
import { useCategories, useUpsertCategory } from '@taxsteps/data'
import { BackHeader } from '@/components/BackHeader'
import { CategoryDot } from '@/components/DocumentRow'
import { useToast } from '@/components/Toast'
import { Button, Muted, Screen, TextField } from '@/components/ui'
import { colors, fonts } from '@/lib/theme'

const COLORS = ['accent-2-300', 'accent-300', 'neutral-300', 'accent-200', 'accent-2-200', 'neutral-200', 'accent-100']

function CategoryItem({ category }: { category: Category }) {
  const upsert = useUpsertCategory()
  const toast = useToast()
  const [name, setName] = useState(category.name)
  const save = async (patch: Partial<Category>) => {
    try {
      await upsert.mutateAsync({ id: category.id, name: category.name, icon: category.icon, color: category.color, ...patch })
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
      setName(category.name)
    }
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, opacity: category.archived ? 0.55 : 1 }}>
      <CategoryDot category={category} size={40} />
      <TextInput value={name} onChangeText={setName} maxLength={60} accessibilityLabel="Category name"
        onEndEditing={() => { if (name.trim() && name.trim() !== category.name) void save({ name: name.trim() }) }}
        style={{ flex: 1, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.surface, fontFamily: fonts.semibold, fontSize: 15, color: colors.text }} />
      <Pressable accessibilityRole="button" accessibilityLabel={category.archived ? `Restore ${category.name}` : `Archive ${category.name}`}
        onPress={() => void save({ archived: !category.archived })} style={{ padding: 8 }}>
        {category.archived ? <ArchiveRestore size={20} color={colors.accentRamp[700]} strokeWidth={2.75} /> : <Archive size={20} color={colors.accentRamp[700]} strokeWidth={2.75} />}
      </Pressable>
    </View>
  )
}

export default function CategoriesScreen() {
  const { data: categories } = useCategories()
  const upsert = useUpsertCategory()
  const toast = useToast()
  const [name, setName] = useState('')
  const list = [...(categories ?? [])].sort((a, b) => Number(a.archived) - Number(b.archived) || a.sort - b.sort)
  const add = async () => {
    if (!name.trim()) return
    try {
      await upsert.mutateAsync({ name: name.trim(), icon: 'tag', color: COLORS[list.length % COLORS.length]!, sort: list.length })
      setName('')
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
    }
  }
  return (
    <Screen style={{ gap: 12 }}>
      <BackHeader title="Categories" />
      <Muted>Rename or archive categories. Archived categories stay on past documents.</Muted>
      {list.map((c) => <CategoryItem key={c.id} category={c} />)}
      <TextField label="New category" value={name} onChangeText={setName} maxLength={60} onSubmitEditing={() => void add()} />
      <Button label="Add category" variant="dark" loading={upsert.isPending} disabled={!name.trim()} onPress={() => void add()} />
    </Screen>
  )
}
