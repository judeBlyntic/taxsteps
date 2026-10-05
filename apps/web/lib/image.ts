// Prepares a receipt file for extraction entirely in memory. Nothing is uploaded or stored
// except the single extraction request; references are released as soon as we're done.
import { AppError } from '@taxsteps/core'

const MAX_SIDE = 2000
const MAX_BYTES = 10 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function targetSize(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

export type PreparedFile = { base64: string; mimeType: string; filename: string }

function readAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]+;base64,/, ''))
    reader.onerror = () => reject(new AppError('UNSUPPORTED_FILE'))
    reader.readAsDataURL(blob)
  })
}

export async function prepareFile(file: File): Promise<PreparedFile> {
  if (file.size > MAX_BYTES) throw new AppError('FILE_TOO_LARGE')
  if (file.type === 'application/pdf') {
    return { base64: await readAsBase64(file), mimeType: 'application/pdf', filename: file.name || 'document.pdf' }
  }
  // HEIC from iPhones decodes in Safari; elsewhere createImageBitmap rejects and we report it as unsupported.
  if (!IMAGE_TYPES.includes(file.type) && !/heic|heif/i.test(file.type)) throw new AppError('UNSUPPORTED_FILE')

  let bitmap: ImageBitmap | null = null
  const canvas = document.createElement('canvas')
  try {
    bitmap = await createImageBitmap(file).catch(() => { throw new AppError('UNSUPPORTED_FILE') })
    const size = targetSize(bitmap.width, bitmap.height)
    canvas.width = size.width
    canvas.height = size.height
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, size.width, size.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.8))
    if (!blob) throw new AppError('UNSUPPORTED_FILE')
    return { base64: await readAsBase64(blob), mimeType: 'image/jpeg', filename: 'receipt.jpg' }
  } finally {
    bitmap?.close()
    canvas.width = 0
    canvas.height = 0
  }
}
