import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { MealEntry, Profile } from '../../types'
import { getTodayKey, formatMacro } from '../../utils/nutrition'
import { Icon } from '../../components/Icon'
import { MealList } from '../../components/MealList'
import { MealEditor } from '../../components/MealEditor'
export function DiaryPage({ meals, onUpdateMeal, onDeleteMeal }: { profile: Profile; meals: MealEntry[]; onUpdateMeal: (entry: MealEntry) => Promise<void>; onDeleteMeal: (entry: MealEntry) => Promise<void> }) {
  const [day, setDay] = useState(() => getTodayKey())
  const [editing, setEditing] = useState<MealEntry | null>(null)
  const [pendingId, setPendingId] = useState('')
  const [error, setError] = useState('')
  const entries = meals.filter(meal => getTodayKey(new Date(meal.timestamp)) === day)
  function changeDay(value: string) { if (value) { setDay(value); setEditing(null); setError('') } }
  function shiftDay(amount: number) { const date = new Date(`${day}T12:00`); date.setDate(date.getDate() + amount); changeDay(getTodayKey(date)) }
  async function remove(entry: MealEntry) {
    if (pendingId) return
    setPendingId(entry.id); setError('')
    try { await onDeleteMeal(entry); if (editing?.id === entry.id) setEditing(null) }
    catch { setError('Chưa xóa được món ăn. Hãy thử lại.') }
    finally { setPendingId('') }
  }
  return <section className="page-shell">
    <div className="page-heading"><div><p className="eyebrow">Nhìn lại từng bữa</p><h1>Nhật ký ăn uống</h1><p className="muted">Chọn một ngày để xem và điều chỉnh.</p></div><Link className="primary-button" to="/add"><Icon name="plus" size={20} />Ghi món</Link></div>
    <div className="diary-toolbar"><div className="date-switcher"><button className="icon-button" aria-label="Ngày trước" onClick={() => shiftDay(-1)}><Icon name="chevron-left" /></button><label className="field-block"><span className="sr-only">Ngày trong nhật ký</span><input type="date" value={day} onChange={event => changeDay(event.target.value)} /></label><button className="icon-button" aria-label="Ngày sau" onClick={() => shiftDay(1)}><Icon name="chevron-right" /></button></div><button className="text-button" onClick={() => changeDay(getTodayKey())}>Về hôm nay</button></div>
    <div className="diary-total"><span>{entries.length} món đã ghi</span><strong>{formatMacro(entries.reduce((sum, meal) => sum + meal.calories, 0))} <span>kcal</span></strong></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className={editing ? 'diary-layout' : ''}><div className="panel"><h2 className="sr-only">Các bữa trong ngày</h2>{entries.length ? <MealList meals={entries} onEdit={setEditing} onDelete={entry => void remove(entry)} pendingId={pendingId} /> : <div className="empty-state"><Icon name="book" size={32} /><h2>Ngày này chưa có món ăn</h2><p className="muted">Bạn có thể ghi lại bữa ăn và chọn đúng ngày đã ăn.</p><Link className="primary-button" to="/add">Ghi món ăn</Link></div>}</div>
    {editing && <aside className="panel editor-panel"><MealEditor key={editing.id} initial={editing} editing onSave={async draft => { await onUpdateMeal({ ...editing, ...draft }) }} onCancel={() => setEditing(null)} /></aside>}</div>
  </section>
}
