import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { isMealType, mealLabels, mealTypes } from './mealDraft'
import type { MealDraft } from './mealDraft'
export type { MealDraft } from './mealDraft'
import { formatMacro, getTodayKey } from '../utils/nutrition'

export function MealEditor({ initial, onSave, onCancel, editing = false }: {
  initial: MealDraft; onSave: (draft: MealDraft) => Promise<void>; onCancel?: () => void; editing?: boolean
}) {
  const initialDate = new Date(initial.timestamp)
  const [quantity, setQuantity] = useState(() => String(initial.quantity))
  const [day, setDay] = useState(getTodayKey(initialDate))
  const [time, setTime] = useState(`${String(initialDate.getHours()).padStart(2, '0')}:${String(initialDate.getMinutes()).padStart(2, '0')}`)
  const [mealType, setMealType] = useState(initial.mealType)
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const saving = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  const amount = Number(quantity)
  const valid = Number.isFinite(amount) && amount >= 0.01 && amount <= 100
  const ratio = valid ? amount / initial.quantity : 0
  const nutrition = {
    calories: Number((initial.calories * ratio).toPrecision(12)),
    protein: Number((initial.protein * ratio).toPrecision(12)),
    carbs: Number((initial.carbs * ratio).toPrecision(12)),
    fat: Number((initial.fat * ratio).toPrecision(12)),
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current || saved) return
    const date = new Date(`${day}T${time}`)
    if (!valid || !day || !time || !Number.isFinite(date.getTime()) || getTodayKey(date) !== day) {
      setError('Kiểm tra khẩu phần, ngày và giờ trước khi lưu.'); return
    }
    saving.current = true; setPending(true); setError('')
    try {
      await onSave({ ...initial, ...nutrition, quantity: amount, mealType, notes: notes.trim(), timestamp: date.toISOString() })
      setSaved(true)
    } catch {
      setError('Chưa lưu được món ăn. Dữ liệu bạn nhập vẫn còn; hãy thử lại.')
    } finally { saving.current = false; setPending(false) }
  }
  return <form className="meal-editor stack" onSubmit={submit}>
    <div><p className="eyebrow">{editing ? 'Điều chỉnh món đã ghi' : 'Ghi vào nhật ký'}</p><h2 ref={heading} tabIndex={-1}>{initial.foodName}</h2><p className="muted">Một khẩu phần: {initial.serving}</p></div>
    <fieldset disabled={pending || saved} className="stack">
      <div className="field-grid">
        <label className="field-block">Số khẩu phần<input type="number" min="0.01" max="100" step="0.01" required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
        <label className="field-block">Bữa ăn<select value={mealType} onChange={(event) => { if (isMealType(event.target.value)) setMealType(event.target.value) }}>{mealTypes.map(type => <option key={type} value={type}>{mealLabels[type]}</option>)}</select></label>
        <label className="field-block">Ngày ăn<input type="date" required value={day} onChange={(event) => setDay(event.target.value)} /></label>
        <label className="field-block">Giờ ăn<input type="time" required value={time} onChange={(event) => setTime(event.target.value)} /></label>
      </div>
      <dl className="nutrition-values">{Object.entries({ 'kcal': nutrition.calories, 'Đạm (g)': nutrition.protein, 'Bột đường (g)': nutrition.carbs, 'Béo (g)': nutrition.fat }).map(([label, value]) => <div key={label}><dd>{formatMacro(value)}</dd><dt>{label}</dt></div>)}</dl>
      <label className="field-block">Ghi chú <span className="muted">(không bắt buộc)</span><textarea maxLength={1000} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ví dụ: ít nước dùng, thêm rau…" /></label>
      <p className="muted fine-print">Dinh dưỡng là ước tính theo khẩu phần, chưa được kiểm chứng.</p>
    </fieldset>
    {error && <p role="alert" className="form-error">{error}</p>}
    {saved ? <p role="status" className="status-message">Đã lưu vào nhật ký.</p> : <button className="primary-button" type="submit" disabled={pending}>{pending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Lưu món ăn'}</button>}
    {onCancel && <button className="text-button" type="button" disabled={pending} onClick={onCancel}>{saved ? 'Chọn món khác' : 'Đóng'}</button>}
  </form>
}
