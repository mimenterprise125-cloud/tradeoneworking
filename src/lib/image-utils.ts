import supabase from './supabase'

/**
 * Compress an image File (png/jpg) to WebP, resize to maxWidth, and return a Blob.
 * Uses browser canvas APIs; no external deps required.
 */
export async function compressImageFileToWebP(
  file: File,
  opts: { maxWidth?: number; quality?: number } = {}
): Promise<Blob> {
  const maxWidth = opts.maxWidth ?? 1200
  const quality = opts.quality ?? 0.75

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  let blob: Blob
  
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')
    ctx.drawImage(bitmap, 0, 0, width, height)
    blob = await canvas.convertToBlob({ type: 'image/webp', quality })
  } else {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')
    ctx.drawImage(bitmap, 0, 0, width, height)
    
    blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b: Blob | null) => {
          if (!b) return reject(new Error('Failed to create blob'))
          resolve(b)
        },
        'image/webp',
        quality
      )
    })
  }

  return blob
}

/**
 * Upload blob to Supabase Storage under `journal-screenshots/{userId}/{filename}`.
 * Returns the public URL (if bucket public) and the path.
 */
export async function uploadJournalImage(
  blob: Blob,
  userId: string,
  filename?: string
): Promise<{ path: string; publicUrl?: string }> {
  const bucket = 'journal-screenshots'
  const name = filename ?? `journal-${Date.now()}.webp`
  const path = `${userId}/${name}`

  const { data, error } = await supabase.storage.from(bucket).upload(path, blob as any, {
    contentType: 'image/webp',
    upsert: false,
  })
  if (error) throw error

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path)

  return { path: data.path, publicUrl: publicData?.publicUrl }
}
