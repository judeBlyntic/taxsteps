import { useEffect, useState } from 'react'
import { AppState, Platform } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { Stack, SplashScreen, usePathname } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, Caprasimo_400Regular } from '@expo-google-fonts/caprasimo'
import { Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree'
import { Inter_400Regular } from '@expo-google-fonts/inter'
import { QueryClient, QueryClientProvider, focusManager, onlineManager, useQueryClient } from '@tanstack/react-query'
import { DataProvider, useProfile, useRealtimeSync, userChangeGuard } from '@taxsteps/data'
import { ToastProvider } from '@/components/Toast'
import { AppThemeProvider, useAppTheme } from '@/lib/app-theme'
import { SessionProvider, useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { OfflineQueueProvider } from '@/lib/use-offline-queue'
import { PALETTES } from '@/lib/theme'

void SplashScreen.preventAutoHideAsync()

// Tell TanStack Query when the app returns to the foreground or the network comes back,
// so screens refetch anything that changed on other devices meanwhile.
if (Platform.OS !== 'web') {
  focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener('change', (s) => setFocused(s === 'active'))
    return () => sub.remove()
  })
  onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false)))
}

// Screens that may hold typing the user hasn't saved yet (or a scan in progress).
const EDITING = ['/review', '/profile', '/region', '/categories', '/sheets', '/scan']

/** Follows the account's theme, including a change made on another device. */
function ProfileThemeSync() {
  const saved = useProfile().data?.theme
  const { theme, setTheme } = useAppTheme()
  // A theme switch remounts every screen, so one from another device waits until the user leaves an edit.
  const editing = EDITING.includes(usePathname())
  useEffect(() => { if (saved && saved !== theme && !editing) setTheme(saved) }, [saved, theme, setTheme, editing])
  return null
}

function RootNavigator() {
  const { session, loading } = useSession()
  // Screens read theme colours while rendering, so a theme switch remounts them (Stack key below). Navigation
  // state lives outside the navigator in expo-router 58, so the current screen, its params and history stay.
  const { theme } = useAppTheme()
  const qc = useQueryClient()
  const [guard] = useState(() => userChangeGuard(() => qc.clear()))
  guard(session?.user.id ?? null) // a different person signed in: drop the previous user's cached data
  useRealtimeSync(session?.user.id ?? null)
  useEffect(() => { if (!loading) void SplashScreen.hideAsync() }, [loading])
  if (loading) return null
  const signedIn = Boolean(session)
  return (
    <>
      {signedIn && <ProfileThemeSync />}
      {/* PALETTES[theme], not the live `colors`: the React Compiler caches this object and only sees `theme` change. */}
      <Stack key={theme} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: PALETTES[theme].colors.bg } }}>
        {/* SDK 58 needs explicit targets: the default fallback is '/(auth)', which has no index route. */}
        <Stack.Protected guard={!signedIn} redirectTo="/">
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn} redirectTo="/onboarding">
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="review" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="region" />
          <Stack.Screen name="categories" />
          <Stack.Screen name="sheets" />
        </Stack.Protected>
        <Stack.Screen name="legal" />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }))
  const [fontsLoaded] = useFonts({ Caprasimo_400Regular, Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold, Inter_400Regular })
  if (!fontsLoaded) return null
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
      <QueryClientProvider client={queryClient}>
        <DataProvider client={supabase}>
          <SessionProvider>
            <OfflineQueueProvider>
              <ToastProvider>
                <StatusBar style="dark" />
                <RootNavigator />
              </ToastProvider>
            </OfflineQueueProvider>
          </SessionProvider>
        </DataProvider>
      </QueryClientProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  )
}
