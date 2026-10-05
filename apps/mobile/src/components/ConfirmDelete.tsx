import { useState } from 'react'
import { Modal, View } from 'react-native'
import { colors } from '@/lib/theme'
import { Button, H, T, TextField } from './ui'

/** Destructive confirmation that requires typing DELETE. */
export function ConfirmDelete({ title, body, busy, onConfirm, onCancel }: {
  title: string; body: string; busy: boolean; onConfirm: () => void; onCancel: () => void
}) {
  const [typed, setTyped] = useState('')
  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 18, backgroundColor: 'rgba(46,43,37,0.45)' }}>
        <View style={{ gap: 14, padding: 24, borderRadius: 34, backgroundColor: colors.bg }} accessibilityViewIsModal>
          <H size={24}>{title}</H>
          <T>{body} This can&apos;t be undone — consider exporting your data first.</T>
          <TextField label="Type DELETE to confirm" value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} />
          <Button label={busy ? 'Deleting…' : 'Delete permanently'} disabled={typed !== 'DELETE'} loading={busy} onPress={onConfirm} />
          <Button label="Cancel" variant="secondary" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  )
}
