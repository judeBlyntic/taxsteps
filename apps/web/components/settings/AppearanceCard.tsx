'use client'
import { THEME_OPTIONS, toUserMessage, type Profile, type ThemeName } from '@taxsteps/core'
import { useUpdateProfile } from '@taxsteps/data'
import { useToast } from '@/components/ui/Toast'

export function AppearanceCard({ profile }: { profile: Profile }) {
  const update = useUpdateProfile()
  const toast = useToast()
  const current = update.isPending ? update.variables.theme : profile.theme

  async function choose(theme: ThemeName) {
    if (theme === profile.theme) return
    try {
      await update.mutateAsync({ theme }) // AppShell applies the saved theme on this and every other device
    } catch (err) {
      toast.show(toUserMessage(err), 'error')
    }
  }

  return (
    <section className="tile stack" style={{ gap: 14 }}>
      <h4>Appearance</h4>
      <div className="chips" role="group" aria-label="App theme">
        {THEME_OPTIONS.map((t) => (
          <button key={t.value} type="button" className="chip" aria-pressed={current === t.value}
            onClick={() => void choose(t.value)} style={{ height: 'auto', padding: '10px 16px' }}>
            <span className="row" style={{ gap: 3 }} aria-hidden>
              {t.swatch.map((c) => <i key={c} style={{ width: 14, height: 14, borderRadius: '50%', background: c, boxShadow: 'inset 0 0 0 1px var(--color-divider)' }} />)}
            </span>
            <span style={{ textAlign: 'left' }}>{t.label}<br /><span style={{ fontSize: 12, opacity: 0.8 }}>{t.note}</span></span>
          </button>
        ))}
      </div>
    </section>
  )
}
