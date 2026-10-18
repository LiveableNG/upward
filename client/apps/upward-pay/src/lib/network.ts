import { Network, ConnectionStatus } from '@capacitor/network'
import { Capacitor } from '@capacitor/core'

export interface NetworkState {
  connected: boolean
  connectionType: string
}

class NetworkMonitor {
  private listeners: Set<(status: NetworkState) => void> = new Set()
  private state: NetworkState = {
    connected: true,
    connectionType: 'unknown',
  }
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized || typeof window === 'undefined') return
    this.initialized = true

    if (Capacitor.isNativePlatform()) {
      try {
        const status = await Network.getStatus()
        this.updateState({
          connected: status.connected,
          connectionType: status.connectionType,
        })

        await Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
          this.updateState({
            connected: status.connected,
            connectionType: status.connectionType,
          })
        })
        return
      } catch {
        // Fall back to browser events
      }
    }

    // Web fallback
    this.updateState({
      connected: typeof navigator !== 'undefined' ? navigator.onLine : true,
      connectionType: 'web',
    })

    window.addEventListener('online', () => {
      this.updateState({ connected: true, connectionType: 'web' })
    })

    window.addEventListener('offline', () => {
      this.updateState({ connected: false, connectionType: 'none' })
    })
  }

  getState(): NetworkState {
    return this.state
  }

  subscribe(callback: (status: NetworkState) => void): () => void {
    this.listeners.add(callback)
    callback(this.state)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private updateState(newState: NetworkState): void {
    this.state = newState
    this.listeners.forEach((listener) => listener(newState))
  }
}

export const networkMonitor = new NetworkMonitor()
