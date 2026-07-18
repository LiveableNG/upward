import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const BIOMETRICS_ENABLED_KEY = 'biometrics_enabled';

export class BiometricsService {
  static async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (error) {
      console.error('Biometrics check failed:', error);
      return false;
    }
  }

  static async getBiometryType(): Promise<BiometryType | null> {
    if (!Capacitor.isNativePlatform()) return null;
    
    try {
      const result = await NativeBiometric.isAvailable();
      return result.biometryType || null;
    } catch {
      return null;
    }
  }

  static async isEnabled(): Promise<boolean> {
    const { value } = await Preferences.get({ key: BIOMETRICS_ENABLED_KEY });
    return value === 'true';
  }

  static async setEnabled(enabled: boolean): Promise<void> {
    await Preferences.set({
      key: BIOMETRICS_ENABLED_KEY,
      value: enabled.toString(),
    });
  }

  static async saveCredentials(email: string, password: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    await NativeBiometric.setCredentials({
      username: email,
      password: password,
      server: 'upward-pm.app',
    });
  }

  static async getCredentials(): Promise<{ email: string; password: string } | null> {
    if (!Capacitor.isNativePlatform()) return null;

    try {
      const result = await NativeBiometric.getCredentials({
        server: 'upward-pm.app',
      });
      
      if (result && result.username && result.password) {
        return {
          email: result.username,
          password: result.password,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get biometric credentials:', error);
      return null;
    }
  }

  static async clearCredentials(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    
    await NativeBiometric.deleteCredentials({
      server: 'upward-pm.app',
    });
    await this.setEnabled(false);
  }

  static async authenticate(reason: string = 'Please authenticate to log in'): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      await NativeBiometric.verifyIdentity({
        reason,
        title: 'Biometric Login',
        subtitle: 'Log in securely',
        description: 'Use your biometrics to access your account',
      });
      return true;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }
}
