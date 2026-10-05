import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { View } from 'react-native'
import { AlertTriangle, Check } from 'lucide-react-native'
import { colors, shadow } from '@/lib/theme'
import { T } from './ui'

type ToastApi = { show: (message: string, kind?: 'success' | 'error') => void }
const ToastContext = createContext<ToastApi>({ show: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = useCallback((message: string, kind: 'success' | 'error' = 'success') => {
    setToast({ message, kind })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), kind === 'error' ? 5000 : 2600)
  }, [])
  const api = useMemo(() => ({ show }), [show])
  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && (
        <View accessibilityLiveRegion="polite" pointerEvents="none"
          style={[{ position: 'absolute', left: 20, right: 20, bottom: 118, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingHorizontal: 18, borderRadius: 999, backgroundColor: colors.selected }, shadow.lg]}>
          <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: toast.kind === 'error' ? colors.accentRamp[400] : colors.accent2Ramp[400] }}>
            {toast.kind === 'error' ? <AlertTriangle size={12} color={colors.accentRamp[900]} strokeWidth={2.75} /> : <Check size={12} color={colors.accent2Ramp[900]} strokeWidth={2.75} />}
          </View>
          <T weight="semibold" size={14} color={colors.bg} style={{ flex: 1 }}>{toast.message}</T>
        </View>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
