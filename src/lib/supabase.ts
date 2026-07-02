import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

import { env } from '@/lib/env';

/**
 * SecureStore caps values at 2048 bytes; Supabase sessions are larger. This
 * adapter transparently chunks long values across numbered keys.
 */
const CHUNK_SIZE = 1800;

const chunkKey = (key: string, index: number) => (index === 0 ? key : `${key}__chunk_${index}`);

const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    let value = '';
    for (let i = 0; ; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part === null) break;
      value += part;
      if (part.length < CHUNK_SIZE) break;
    }
    return value.length > 0 ? value : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    for (let i = 0; i * CHUNK_SIZE < value.length; i++) {
      await SecureStore.setItemAsync(
        chunkKey(key, i),
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      );
    }
    // Clear any stale trailing chunks from a previously longer value.
    for (let i = Math.ceil(value.length / CHUNK_SIZE) || 1; ; i++) {
      const stale = await SecureStore.getItemAsync(chunkKey(key, i));
      if (stale === null) break;
      await SecureStore.deleteItemAsync(chunkKey(key, i));
    }
  },
  async removeItem(key: string): Promise<void> {
    for (let i = 0; ; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part === null) break;
      await SecureStore.deleteItemAsync(chunkKey(key, i));
    }
  },
};

// Fall back to inert placeholders when env is absent (fresh checkout, CI) so the
// app boots to friendly error states instead of crashing at import time.
const supabaseUrl = env.supabaseUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = env.supabaseAnonKey || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: SecureStoreAdapter } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh sessions only while the app is foregrounded (Supabase RN guidance).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
