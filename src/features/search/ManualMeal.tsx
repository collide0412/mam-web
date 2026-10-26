import { useState } from 'react'
import type { FormEvent } from 'react'
import { MealEditor } from '../../components/MealEditor'
import type { MealDraft } from '../../components/mealDraft'

const nutritionFields = [
  { key: 'calories', label: 'Năng lượng (kcal)', max: 100000 },
  { key: 'protein', label: 'Đạm (g)', max: 10000 },
  { key: 'carbs', label: 'Bột đường (g)', max: 10000 },
  { key: 'fat', label: 'Chất béo (g)', max: 10000 },
] as const

export function ManualMeal({ initialName, onSave, onCancel }: { initialName: string; onSave: (draft: MealDraft) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(initialName)
  const [serving, setServing] = useState('')
  const [values, setValues] = useState({ calories: '', protein: '', carbs: '', fat: '' })
  const [draft, setDraft] = useState<MealDraft | null>(null)
  const [error, setError] = useState('')
  const next = (event: FormEvent) => {
    event.preventDefault()
    const parsed = { calories: Number(values.calories), protein: Number(values.protein), carbs: Number(values.carbs), fat: Number(values.fat) }
    if (!name.trim() || !serving.trim() || nutritionFields.some(({ key, max }) => !values[key].trim() || !Number.isFinite(parsed[key]) || parsed[key] < 0 || parsed[key] > max)) {
      setError('Hãy nhập tên, khẩu phần và đủ bốn số dinh dưỡng hợp lệ.'); return
    }
    const hour = new Date().getHours()
    setDraft({ foodId: `custom:${crypto.randomUUID()}`, foodName: name.trim(), serving: serving.trim(), quantity: 1,
      ...parsed, mealType: hour < 10 ? 'Breakfast' : hour < 15 ? 'Lunch' : hour < 21 ? 'Dinner' : 'Snack', timestamp: new Date().toISOString() })
    setError('')
  }
  if (draft) return <div className="panel stack"><MealEditor initial={draft} onSave={onSave} onCancel={() => setDraft(null)} /></div>
  return <section className="panel stack" aria-labelledby="manual-title">
    <div><p className="eyebrow">Món ngoài danh mục</p><h2 id="manual-title">Tự nhập món ăn</h2><p className="muted">Nhập số liệu cho một khẩu phần từ nhãn sản phẩm hoặc nguồn bạn chọn. Măm không tự đoán các số còn thiếu.</p></div>
    <form className="stack" onSubmit={next}>
      <label className="field-block">Tên món<input maxLength={160} value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label className="field-block">Mô tả một khẩu phần<input maxLength={120} value={serving} onChange={(event) => setServing(event.target.value)} placeholder="Ví dụ: 100 g hoặc 1 hộp 180 ml" required /></label>
      <div className="field-grid">{nutritionFields.map(({ key, label, max }) => <label className="field-block" key={key}>{label}<input type="number" min={0} max={max} step="0.1" required value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></label>)}</div>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="primary-button" type="submit">Chọn bữa ăn & thời gian</button>
      <button className="text-button" type="button" onClick={onCancel}>Về danh mục</button>
    </form>
  </section>
}
