import 'react-native-url-polyfill/auto'
import { AppState, Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@taxsteps/core'
import type { TaxStepsClient } from '@taxsteps/data'
import { createChunkedStorage } from './secure-storage'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

/** Publishable key only — every query is protected by Row Level Security. */
export const supabase: TaxStepsClient = createClient<Database>(url, key, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : createChunkedStorage(SecureStore),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Refresh tokens only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh()
    else supabase.auth.stopAutoRefresh()
  })
}

export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000'
