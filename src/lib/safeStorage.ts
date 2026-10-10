import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const memoryStore: Record<string, string> = {};

export const SafeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      const val = await AsyncStorage.getItem(key);
      return val ?? memoryStore[key] ?? null;
    } catch (e) {
      return memoryStore[key] ?? null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryStore[key] = value;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      // Memory store is already updated as fallback
    }
  },

  async removeItem(key: string): Promise<void> {
    delete memoryStore[key];
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // Memory store is already deleted
    }
  },
};

export default SafeStorage;
