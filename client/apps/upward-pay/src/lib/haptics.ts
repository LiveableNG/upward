import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

class HapticFeedback {
  private get isNative(): boolean {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform()
  }

  async selection(): Promise<void> {
    if (!this.isNative) return
    try {
      await Haptics.selectionChanged()
    } catch {
    }
  }

  async light(): Promise<void> {
    if (!this.isNative) return
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch {}
  }

  /**
   * Medium impact for primary action buttons (Continue, Next, Save).
   */
  async medium(): Promise<void> {
    if (!this.isNative) return
    try {
      await Haptics.impact({ style: ImpactStyle.Medium })
    } catch {}
  }

  async heavy(): Promise<void> {
    if (!this.isNative) return
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy })
    } catch {}
  }

  async success(): Promise<void> {
    if (!this.isNative) return
    try {
      await Haptics.notification({ type: NotificationType.Success })
    } catch {}
  }

  async warning(): Promise<void> {
    if (!this.isNative) return
    try {
      await Haptics.notification({ type: NotificationType.Warning })
    } catch {}
  }


  async error(): Promise<void> {
    if (!this.isNative) return
    try {
      await Haptics.notification({ type: NotificationType.Error })
    } catch {}
  }
}

export const haptics = new HapticFeedback()
