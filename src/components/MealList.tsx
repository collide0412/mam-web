import type { MealEntry } from '../types'
import { formatMacro } from '../utils/nutrition'
import { mealLabels, mealTypes } from './mealDraft'
import { Icon } from './Icon'
export function MealList({ meals, onEdit, onDelete, pendingId }: { meals: MealEntry[]; onEdit?: (meal: MealEntry) => void; onDelete?: (meal: MealEntry) => void; pendingId?: string }) {
  return <div className="meal-groups">{mealTypes.map(type => {
    const entries = meals.filter(meal => meal.mealType === type).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    if (!entries.length) return null
    return <section className="meal-group" key={type}><div className="section-heading"><h3>{mealLabels[type]}</h3><span className="muted">{formatMacro(entries.reduce((sum, meal) => sum + meal.calories, 0))} kcal</span></div>
      {entries.map(meal => <article className="meal-row" key={meal.id}><div className="meal-description"><strong>{meal.foodName}</strong><small>{formatMacro(meal.quantity)} × {meal.serving} · {new Date(meal.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small>{meal.notes && <p className="meal-note">{meal.notes}</p>}</div><div className="meal-meta"><strong>{formatMacro(meal.calories)} <small>kcal</small></strong>{onEdit && onDelete && <div className="row-actions"><button className="icon-button" aria-label={`Sửa ${meal.foodName}`} onClick={() => onEdit(meal)} disabled={pendingId === meal.id}><Icon name="edit" size={20} /></button><button className="icon-button danger-text" aria-label={`Xóa ${meal.foodName}`} onClick={() => onDelete(meal)} disabled={pendingId === meal.id}><Icon name="trash" size={20} /></button></div>}</div></article>)}
    </section>
  })}</div>
}
