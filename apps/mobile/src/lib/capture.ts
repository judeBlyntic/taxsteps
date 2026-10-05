// Turns a camera/gallery photo into an in-memory JPEG for extraction, then deletes every
// temporary file. Receipt images never persist on the device or anywhere else.
import { Platform } from 'react-native'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { File } from 'expo-file-system'

const MAX_SIDE = 2000

export function discardUri(uri: string | null | undefined): void {
  if (!uri || Platform.OS === 'web' || !uri.startsWith('file:')) return
  try {
    const f = new File(uri)
    if (f.exists) f.delete()
  } catch {
    // already gone
  }
}

export async function prepareCapture(
  uri: string, width?: number, height?: number,
): Promise<{ base64: string; mimeType: 'image/jpeg'; filename: string }> {
  let resultUri: string | null = null
  try {
    const ctx = ImageManipulator.manipulate(uri)
    if (width && height && Math.max(width, height) > MAX_SIDE) {
      ctx.resize(width >= height ? { width: MAX_SIDE, height: null } : { width: null, height: MAX_SIDE })
    } else if (!width || !height) {
      ctx.resize({ width: MAX_SIDE, height: null }) // unknown size: cap the width
    }
    const rendered = await ctx.renderAsync()
    const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true })
    resultUri = saved.uri
    if (!saved.base64) throw new Error('No image data')
    return { base64: saved.base64.replace(/^data:[^;]+;base64,/, ''), mimeType: 'image/jpeg', filename: 'receipt.jpg' }
  } finally {
    discardUri(uri)
    discardUri(resultUri)
  }
}
