'use client'
import { useState } from 'react'
import { Archive, ArchiveRestore, Check, Plus } from 'lucide-react'
import { toUserMessage, type Category } from '@taxsteps/core'
import { useUpsertCategory } from '@taxsteps/data'
import { useToast } from '@/components/ui/Toast'
import { CATEGORY_COLORS, CATEGORY_ICONS, CategoryIcon, ICON, categoryColors } from '@/components/ui/icons'

function CategoryRow({ category }: { category: Category }) {
  const upsert = useUpsertCategory()
  const toast = useToast()
  const [name, setName] = useState(category.name)
  const [editing, setEditing] = useState(false)

  async function save(patch: Partial<Category>) {
    try {
      await upsert.mutateAsync({ id: category.id, name: category.name, icon: category.icon, color: category.color, ...patch })
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
      setName(category.name)
    }
  }

  return (
    <li className="row" style={{ padding: '6px 0', opacity: category.archived ? 0.55 : 1 }}>
      <button type="button" className="cat-dot" style={{ ...categoryColors(category.color), border: 0, cursor: 'pointer', width: 40, height: 40 }}
        aria-label={`Change ${category.name} colour`} onClick={() => setEditing((v) => !v)}>
        <CategoryIcon icon={category.icon} />
      </button>
      <input className="input grow" aria-label="Category name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)}
        onBlur={() => { if (name.trim() && name.trim() !== category.name) void save({ name: name.trim() }) }} />
      <button type="button" className="btn btn-ghost" onClick={() => void save({ archived: !category.archived })}
        aria-label={category.archived ? `Restore ${category.name}` : `Archive ${category.name}`}>
        {category.archived ? <ArchiveRestore {...ICON} /> : <Archive {...ICON} />}
      </button>
      {editing && (
        <div className="stack" style={{ gap: 8, flexBasis: '100%' }}>
          <div className="chips">
            {CATEGORY_COLORS.map((c) => (
              <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={category.color === c} onClick={() => void save({ color: c })}
                style={{ width: 28, height: 28, borderRadius: '50%', border: category.color === c ? '2px solid var(--color-text)' : 0, background: `var(--color-${c})`, cursor: 'pointer' }} />
            ))}
          </div>
          <div className="chips">
            {Object.keys(CATEGORY_ICONS).map((i) => (
              <button key={i} type="button" className="btn btn-secondary btn-icon" aria-label={`Icon ${i}`} aria-pressed={category.icon === i}
                style={category.icon === i ? { background: 'var(--color-text)', color: 'var(--color-bg)' } : undefined} onClick={() => void save({ icon: i })}>
                <CategoryIcon icon={i} width={16} height={16} />
              </button>
            ))}
          </div>
        </div>
      )}
    </li>
  )
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const upsert = useUpsertCategory()
  const toast = useToast()
  const [name, setName] = useState('')
  async function add() {
    if (!name.trim()) return
    try {
      await upsert.mutateAsync({ name: name.trim(), icon: 'tag', color: CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length]!, sort: categories.length })
      setName('')
      toast.show('Category added')
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
    }
  }
  const sorted = [...categories].sort((a, b) => Number(a.archived) - Number(b.archived) || a.sort - b.sort)
  return (
    <section className="tile stack" style={{ gap: 12 }}>
      <h4>Categories</h4>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Rename, recolour or archive. Archived categories stay on past documents.</p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', flexDirection: 'column' }}>
        {sorted.map((c) => <CategoryRow key={c.id} category={c} />)}
      </ul>
      <form className="row" onSubmit={(e) => { e.preventDefault(); void add() }}>
        <input className="input grow" placeholder="New category" aria-label="New category name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-dark" disabled={!name.trim() || upsert.isPending}>{upsert.isPending ? <Check {...ICON} /> : <Plus {...ICON} />}Add</button>
      </form>
    </section>
  )
}
