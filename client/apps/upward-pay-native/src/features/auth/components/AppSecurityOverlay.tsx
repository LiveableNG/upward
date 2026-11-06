import { PinLockScreen } from '@/features/auth/components/PinLockScreen'
import { PinSetupModal } from '@/features/auth/components/PinSetupModal'
import { getUserDisplayName } from '@/features/auth/session'
import { type PinUserInfo } from '@/features/auth/security/pinService'
import { type UserProfile } from '@/features/auth/types'

type AppSecurityOverlayProps = {
  user: UserProfile | null
  isPinLocked: boolean
  pinSetupVisible: boolean
  onUnlock: () => void
  onLogout: () => void
  onPinSetupComplete: () => void
  onPinSetupDismiss: () => void
}

function toPinUser(user: UserProfile): PinUserInfo {
  const name = getUserDisplayName(user)
  const [firstName = name, lastName] = name.split(/\s+/)
  return {
    email: user.email,
    firstName: user.firstName || firstName,
    lastName: user.lastName || lastName,
  }
}

export function AppSecurityOverlay({
  user,
  isPinLocked,
  pinSetupVisible,
  onUnlock,
  onLogout,
  onPinSetupComplete,
  onPinSetupDismiss,
}: AppSecurityOverlayProps) {
  if (!user) return null

  const pinUser = toPinUser(user)

  return (
    <>
      <PinLockScreen visible={isPinLocked} user={pinUser} onUnlock={onUnlock} onLogout={onLogout} />
      <PinSetupModal
        visible={pinSetupVisible && !isPinLocked}
        user={pinUser}
        onComplete={onPinSetupComplete}
        onDismiss={onPinSetupDismiss}
        allowDismiss={true}
      />
    </>
  )
}
