import { useEffect, useState } from 'react'
import { AppState, Platform } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { Stack, SplashScreen } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, Caprasimo_400Regular } from '@expo-google-fonts/caprasimo'
import { Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree'
import { QueryClient, QueryClientProvider, focusManager, onlineManager, useQueryClient } from '@tanstack/react-query'
import { DataProvider, useRealtimeSync, userChangeGuard } from '@taxsteps/data'
import { ToastProvider } from '@/components/Toast'
import { SessionProvider, useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { OfflineQueueProvider } from '@/lib/use-offline-queue'
import { colors } from '@/lib/theme'

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

function RootNavigator() {
  const { session, loading } = useSession()
  const qc = useQueryClient()
  const [guard] = useState(() => userChangeGuard(() => qc.clear()))
  guard(session?.user.id ?? null) // a different person signed in: drop the previous user's cached data
  useRealtimeSync(session?.user.id ?? null)
  useEffect(() => { if (!loading) void SplashScreen.hideAsync() }, [loading])
  if (loading) return null
  const signedIn = Boolean(session)
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="review" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="region" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="sheets" />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }))
  const [fontsLoaded] = useFonts({ Caprasimo_400Regular, Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold })
  if (!fontsLoaded) return null
  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  )
}
