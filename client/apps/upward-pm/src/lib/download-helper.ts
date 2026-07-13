import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1]
          
          const savedFile = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Cache
          })

          await Share.share({
            title: filename,
            url: savedFile.uri,
            dialogTitle: 'Save or share file'
          })
          resolve()
        } catch (err) {
          console.error('Native download/sharing failed:', err)
          reject(err)
        }
      }
      reader.onerror = reject
    })
  } else {
    // Standard web download
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }
}
