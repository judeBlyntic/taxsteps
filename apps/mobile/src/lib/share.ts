import { Platform } from 'react-native'
import * as Sharing from 'expo-sharing'
import { File, Paths } from 'expo-file-system'
import type { ExportFile } from '@taxsteps/data'

/** Writes the export to the cache, opens the share sheet, then removes the file. */
export async function shareExport(file: ExportFile): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([file.bytes], { type: file.contentType }))
    const a = document.createElement('a')
    a.href = url
    a.download = file.filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return
  }
  const f = new File(Paths.cache, file.filename)
  if (f.exists) f.delete()
  f.create()
  f.write(new Uint8Array(file.bytes))
  try {
    await Sharing.shareAsync(f.uri, { mimeType: file.contentType, dialogTitle: file.filename })
  } finally {
    // Android may still be handing the file to the target app when shareAsync resolves.
    setTimeout(() => { try { if (f.exists) f.delete() } catch { /* already removed */ } }, Platform.OS === 'android' ? 120_000 : 0)
  }
}
