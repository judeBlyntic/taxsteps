import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Linking, Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { randomUUID } from 'expo-crypto'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { Check, Image as ImageIcon, PencilLine, ShieldCheck, X, Zap } from 'lucide-react-native'
import { COPY, draftFromExtraction, toUserMessage } from '@taxsteps/core'
import { useQueryClient } from '@tanstack/react-query'
import { extractDocument, getProfile, listCategories, qk, useClient } from '@taxsteps/data'
import { Banner, Button, H, Screen, T } from '@/components/ui'
import { prepareCapture } from '@/lib/capture'
import { setPendingDraft } from '@/lib/draft-store'
import { colors, shadow } from '@/lib/theme'
import { useOfflineQueue } from '@/lib/use-offline-queue'
import { useToday } from '@/lib/use-today'

const STEPS = ['Uploading securely', 'Extracting details', 'Discarding your photo']
type Phase = { kind: 'camera' } | { kind: 'working'; step: number } | { kind: 'error'; message: string }

function ScanLine() {
  const y = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(y, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [y])
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: '8%', right: '8%', top: '6%', height: 3, borderRadius: 3, backgroundColor: colors.accentRamp[400] },
    { transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, 420] }) }] }]} />
}

const corner = (pos: object, r: object) => (
  <View pointerEvents="none" style={[{ position: 'absolute', width: 44, height: 44, borderColor: colors.accentRamp[400] }, pos, r]} />
)

export default function ScanScreen() {
  const router = useRouter()
  const client = useClient()
  const { isOnline } = useOfflineQueue()
  const { today } = useToday()
  const qc = useQueryClient()
  const [permission, requestPermission] = useCameraPermissions()
  const camera = useRef<CameraView>(null)
  const [torch, setTorch] = useState(false)
  const [phase, setPhase] = useState<Phase>({ kind: 'camera' })

  async function process(uri: string, width: number | undefined, height: number | undefined, source: 'scan' | 'upload') {
    if (!isOnline) return setPhase({ kind: 'error', message: toUserMessage(new TypeError('Network request failed')) })
    setPhase({ kind: 'working', step: 0 })
    try {
      // Load (or reuse cached) settings so a quick capture is never silently ignored.
      const [profile, categories] = await Promise.all([
        qc.ensureQueryData({ queryKey: qk.profile, queryFn: () => getProfile(client) }),
        qc.ensureQueryData({ queryKey: qk.categories, queryFn: () => listCategories(client, { includeArchived: true }) }),
      ])
      let file: { base64: string; mimeType: string; filename: string } | null = await prepareCapture(uri, width, height)
      setPhase({ kind: 'working', step: 1 })
      const res = await extractDocument(client, {
        file: file.base64, mimeType: file.mimeType, filename: file.filename,
        hints: { categories: categories.filter((c) => !c.archived).map((c) => c.name), country: profile.country, currency: profile.currency },
      })
      file = null // the in-memory image is released; temp files were deleted in prepareCapture
      setPhase({ kind: 'working', step: 2 })
      await new Promise((r) => setTimeout(r, 400))
      setPendingDraft(draftFromExtraction(res, { profile, categories, today, newId: () => randomUUID() }, source))
      router.replace('/review')
    } catch (e) {
      setPhase({ kind: 'error', message: toUserMessage(e) })
    }
  }

  async function capture() {
    const photo = await camera.current?.takePictureAsync({ quality: 0.9, shutterSound: false })
    if (photo) await process(photo.uri, photo.width, photo.height, 'scan')
  }

  async function pickFromGallery() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
    const asset = r.canceled ? null : r.assets[0]
    if (asset) await process(asset.uri, asset.width, asset.height, 'upload')
  }

  const manual = () => router.replace('/review')

  if (!permission) return <View style={{ flex: 1, backgroundColor: colors.neutral[900] }} />
  if (!permission.granted) {
    return (
      <Screen style={{ paddingTop: 40, gap: 16 }}>
        <H size={30}>Camera access</H>
        <T>Tax Steps uses the camera to photograph receipts. {COPY.photoPrivacy}</T>
        {permission.canAskAgain
          ? <Button label="Allow camera" onPress={() => void requestPermission()} />
          : <Button label="Open settings" onPress={() => void Linking.openSettings()} />}
        <Button label="Choose from photos" variant="secondary" icon={ImageIcon} onPress={() => void pickFromGallery()} />
        <Button label="Enter manually" variant="ghost" icon={PencilLine} onPress={manual} />
        <Button label="Close" variant="ghost" onPress={() => router.back()} />
      </Screen>
    )
  }

  const glass = { backgroundColor: 'rgba(249,244,237,0.14)' }
  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[900] }}>
      <CameraView ref={camera} style={{ position: 'absolute', top: 120, left: 34, right: 34, bottom: 220, borderRadius: 30 }} facing="back" enableTorch={torch} />
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 120, left: 34, right: 34, bottom: 220 }}>
        {corner({ left: 14, top: 14 }, { borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 22 })}
        {corner({ right: 14, top: 14 }, { borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 22 })}
        {corner({ left: 14, bottom: 14 }, { borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 22 })}
        {corner({ right: 14, bottom: 14 }, { borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 22 })}
        <ScanLine />
      </View>

      <View style={{ position: 'absolute', top: 54, left: 18, right: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={[{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }, glass]}>
          <X size={20} color={colors.neutral[100]} strokeWidth={2.75} />
        </Pressable>
        <H size={18} color={colors.neutral[100]}>Scan receipt</H>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: torch }} accessibilityLabel="Flash" onPress={() => setTorch((t) => !t)}
          style={[{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }, torch ? { backgroundColor: colors.accentRamp[300] } : glass]}>
          <Zap size={20} color={torch ? colors.accentRamp[900] : colors.neutral[100]} strokeWidth={2.75} />
        </Pressable>
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 168, alignItems: 'center' }}>
        <View style={[{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 }, glass]}>
          <T size={13} color={colors.neutral[100]}>Place the entire receipt inside the frame.</T>
        </View>
      </View>

      <View style={{ position: 'absolute', left: 30, right: 30, bottom: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose from gallery" onPress={() => void pickFromGallery()} style={{ alignItems: 'center', gap: 4, width: 64 }}>
          <View style={[{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }, glass]}><ImageIcon size={20} color={colors.neutral[100]} strokeWidth={2.75} /></View>
          <T size={11} color={colors.neutral[100]}>Gallery</T>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Take photo" onPress={() => void capture()} disabled={phase.kind === 'working'}
          style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent }} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Enter manually" onPress={manual} style={{ alignItems: 'center', gap: 4, width: 64 }}>
          <View style={[{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }, glass]}><PencilLine size={20} color={colors.neutral[100]} strokeWidth={2.75} /></View>
          <T size={11} color={colors.neutral[100]}>Manual</T>
        </Pressable>
      </View>

      {phase.kind !== 'camera' && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(46,43,37,0.55)', justifyContent: 'flex-end', padding: 10 }}>
          <View style={[{ borderRadius: 38, backgroundColor: colors.bg, padding: 24, gap: 16 }, shadow.lg]} accessibilityLiveRegion="polite">
            {phase.kind === 'working' ? (
              <>
                <H size={24}>Reading your receipt…</H>
                {STEPS.map((label, i) => {
                  const done = phase.step > i
                  const active = phase.step === i
                  return (
                    <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? colors.accent2Ramp[300] : colors.neutral[200] }}>
                        {done ? <Check size={14} color={colors.accent2Ramp[900]} strokeWidth={2.75} /> : active ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} /> : null}
                      </View>
                      <T weight="semibold" color={done || active ? colors.text : colors.neutral[500]}>{label}</T>
                    </View>
                  )
                })}
              </>
            ) : (
              <>
                <Banner>{phase.message}</Banner>
                <Button label="Try again" variant="secondary" onPress={() => setPhase({ kind: 'camera' })} />
                <Button label="Enter manually" onPress={manual} />
              </>
            )}
            <Banner tone="ok" icon={ShieldCheck}>{COPY.photoPrivacy}</Banner>
          </View>
        </View>
      )}
    </View>
  )
}
