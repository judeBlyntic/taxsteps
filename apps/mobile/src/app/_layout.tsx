import { useEffect, useState } from 'react'
import { Stack, SplashScreen } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, Caprasimo_400Regular } from '@expo-google-fonts/caprasimo'
import { Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DataProvider, useRealtimeSync } from '@taxsteps/data'
import { ToastProvider } from '@/components/Toast'
import { SessionProvider, useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'

void SplashScreen.preventAutoHideAsync()

function RootNavigator() {
  const { session, loading } = useSession()
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
            <ToastProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </ToastProvider>
          </SessionProvider>
        </DataProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
