import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { searchFoods } from '../../data/catalog'
import type { FoodItem, MealEntry, Profile } from '../../types'
import { Icon } from '../../components/Icon'
import { MealEditor } from '../../components/MealEditor'
import { draftFromFood } from '../../components/mealDraft'
import type { MealDraft } from '../../components/MealEditor'
import { ManualMeal } from './ManualMeal'
export function AddFoodPage({ meals = [], onAddMeal }: { profile?: Profile; meals?: MealEntry[]; onAddMeal: (payload: MealDraft) => Promise<void> }) {
  const [query, setQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [manual, setManual] = useState(false)
  const searchInput = useRef<HTMLInputElement>(null)
  const recentIds = [...new Set([...meals].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map(meal => meal.foodId))]
  const results = searchFoods(query, [], recentIds)
  return <section className="page-shell">
    <div className="page-heading"><div><p className="eyebrow">Một bữa ăn, vài thao tác</p><h1>Hôm nay bạn ăn gì?</h1><p className="muted">Tìm món, chọn khẩu phần rồi lưu vào nhật ký.</p></div><button className="secondary-button" onClick={() => { setManual(true); setSelectedFood(null) }}>Tự nhập món</button></div>
    {manual ? <ManualMeal initialName={query} onSave={onAddMeal} onCancel={() => setManual(false)} /> : <>
    <label className="search-field"><Icon name="search" /><span className="sr-only">Tìm món ăn</span><input ref={searchInput} type="search" value={query} onChange={event => { setQuery(event.target.value); setSelectedFood(null) }} placeholder="Tìm phở bò, cơm tấm, salad…" /></label>
    <div className={`search-layout${selectedFood ? ' has-selection' : ''}`}>
      {selectedFood && <aside className="panel editor-panel"><MealEditor key={selectedFood.id} initial={draftFromFood(selectedFood)} onSave={onAddMeal} onCancel={() => { setSelectedFood(null); searchInput.current?.focus() }} /><Link className="text-button" to={`/food/${selectedFood.id}`}>Thông tin món ăn <Icon name="arrow-right" size={20} /></Link></aside>}
      <section className="panel search-results"><div className="section-heading"><h2>{query.trim() ? 'Kết quả tìm kiếm' : 'Danh mục món ăn'}</h2><span className="muted">{results.length} món</span></div>
        {!query.trim() && recentIds.length > 0 && <p className="muted fine-print">Món bạn đã ghi gần đây được xếp trước.</p>}
        {results.length ? <div className="food-list">{results.map(food => <button key={food.id} type="button" className="food-row" aria-pressed={selectedFood?.id === food.id} onClick={() => setSelectedFood(food)}><span className="food-symbol"><Icon name="leaf" size={20} /></span><span className="food-description"><strong>{food.name}</strong><small>{food.serving} · {food.category}</small></span><span className="food-energy">{food.calories}<small>kcal</small></span><Icon name="plus" size={20} /></button>)}</div> : <div className="empty-state"><h3>Chưa tìm thấy món này</h3><p className="muted">Thử tên ngắn hơn hoặc bỏ dấu tiếng Việt.</p><button className="secondary-button" onClick={() => setQuery('')}>Xem tất cả món</button></div>}
        <p className="catalog-note muted">Danh mục ngoại tuyến · Dinh dưỡng ước tính, chưa được kiểm chứng.</p>
      </section>
      {!selectedFood && <aside className="daily-aside search-hint"><p className="eyebrow">Ghi đúng khẩu phần của bạn</p><h2>Một nửa tô? Vẫn ghi được.</h2><p>Chọn món để điều chỉnh số khẩu phần, bữa ăn và thời gian. Những ngày trước cũng có thể ghi lại.</p><Icon name="leaf" size={48} /></aside>}
    </div>
    </>}
  </section>
}
