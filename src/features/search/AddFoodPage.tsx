import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { searchFoods } from '../../data/catalog'
import type { FoodItem, MealEntry, Profile } from '../../types'
import { calculateMealNutrition } from '../../utils/nutrition'

type AddFoodPageProps = {
  profile?: Profile
  meals?: MealEntry[]
  onAddMeal: (payload: Omit<MealEntry, 'id' | 'profileId' | 'timestamp'> & { foodId: string }) => Promise<void>
}

export function AddFoodPage({ onAddMeal }: AddFoodPageProps) {
  const [query, setQuery] = useState('phở bò')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [mealType, setMealType] = useState<MealEntry['mealType']>('Lunch')
  const [notes, setNotes] = useState('')

  const results = useMemo(() => searchFoods(query, [], []), [query])

  const handleSave = async () => {
    if (!selectedFood) return
    const nutrition = calculateMealNutrition(selectedFood, quantity)
    await onAddMeal({
      foodId: selectedFood.id,
      foodName: selectedFood.name,
      quantity,
      serving: selectedFood.serving,
      mealType,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      notes,
    })
    setNotes('')
  }

  return (
    <main className="page-shell">
      <section className="search-panel">
        <label className="search-box">
          <span>Tìm món ăn</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="phở bò, 200g ức gà..." />
        </label>
      </section>

      <div className="search-layout">
        <section className="list-panel">
          <h3>Gần đây</h3>
          {results.map((food) => (
            <button key={food.id} type="button" className="food-row" onClick={() => setSelectedFood(food)}>
              <div>
                <strong>{food.name}</strong>
                <small>{food.category}</small>
              </div>
              <span>{food.calories} kcal</span>
            </button>
          ))}
        </section>

        <aside className="detail-panel">
          {selectedFood ? (
            <>
              <div className="detail-heading">
                <h2>{selectedFood.name}</h2>
                <Link to={`/food/${selectedFood.id}`}>Xem chi tiết</Link>
              </div>
              <div className="field-row">
                <label>
                  Khẩu phần
                  <input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value) || 1)} />
                </label>
                <label>
                  Bữa
                  <select value={mealType} onChange={(event) => setMealType(event.target.value as MealEntry['mealType'])}>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                </label>
              </div>
              <div className="nutrition-grid">
                <div><span>Calories</span><strong>{calculateMealNutrition(selectedFood, quantity).calories}</strong></div>
                <div><span>Protein</span><strong>{calculateMealNutrition(selectedFood, quantity).protein}g</strong></div>
                <div><span>Carbs</span><strong>{calculateMealNutrition(selectedFood, quantity).carbs}g</strong></div>
                <div><span>Fat</span><strong>{calculateMealNutrition(selectedFood, quantity).fat}g</strong></div>
              </div>
              <label className="notes-field">
                Ghi chú
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Không hành, ít nước, thêm trứng..." />
              </label>
              <button type="button" className="primary-button" onClick={handleSave}>Lưu món ăn</button>
            </>
          ) : (
            <div className="empty-box">Chọn món ăn để xem mô tả và lưu bữa ăn.</div>
          )}
        </aside>
      </div>
    </main>
  )
}
