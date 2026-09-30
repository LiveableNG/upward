/**
 * High-performance client-side image compression for Alliance photography.
 * Resizes large dimensions (e.g., 4000x3000 down to max 2048px) and optimizes
 * JPEG/WebP quality to reduce file sizes by 90-95% before network transmission.
 */

export interface ImageCompressionOptions {
  maxDimension?: number
  quality?: number
  mimeType?: 'image/jpeg' | 'image/webp'
}

export interface CompressedImageResult {
  base64Data: string
  contentType: string
  filename: string
  originalSize: number
  compressedSize: number
}

export async function compressImageForUpload(
  file: File,
  options: ImageCompressionOptions = {},
): Promise<CompressedImageResult> {
  const maxDimension = options.maxDimension || 2048
  const quality = options.quality !== undefined ? options.quality : 0.85
  const targetMime = options.mimeType || (file.type === 'image/webp' ? 'image/webp' : 'image/jpeg')

  return new Promise((resolve, reject) => {
    // If it's not an image, reject
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image'))
    }

    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let width = img.naturalWidth || img.width
      let height = img.naturalHeight || img.height

      // Calculate scaled dimensions while preserving aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return reject(new Error('Failed to get 2D canvas rendering context'))
      }

      // Smooth resizing
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      const dataUrl = canvas.toDataURL(targetMime, quality)
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl

      // Approximate byte size of base64
      const compressedSize = Math.round((base64Data.length * 3) / 4)

      // Normalize filename extension
      const ext = targetMime === 'image/webp' ? 'webp' : 'jpg'
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
      const normalizedFilename = `${baseName}.${ext}`

      resolve({
        base64Data,
        contentType: targetMime,
        filename: normalizedFilename,
        originalSize: file.size,
        compressedSize,
      })
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error(`Failed to process image file "${file.name}"`))
    }

    img.src = objectUrl
  })
}
