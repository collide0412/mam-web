import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { getFoodById } from '../../data/catalog'
import type { MealEntry, Profile } from '../../types'
import { calculateMealNutrition } from '../../utils/nutrition'

type FoodDetailPageProps = {
  profile?: Profile
  onAddMeal: (payload: Omit<MealEntry, 'id' | 'profileId' | 'timestamp'> & { foodId: string }) => Promise<void>
}

export function FoodDetailPage({ onAddMeal }: FoodDetailPageProps) {
  const { id } = useParams()
  const food = useMemo(() => getFoodById(id ?? ''), [id])

  if (!food) {
    return <main className="page-shell"><div className="empty-box">Món ăn không tồn tại.</div></main>
  }

  const nutrition = calculateMealNutrition(food, 1)

  return (
    <main className="page-shell detail-page">
      <article className="profile-card large">
        <div className="feature-head">
          <h1>{food.name}</h1>
          <span className="badge">{food.region}</span>
        </div>
        <p>{food.category} • {food.meal}</p>
        <div className="nutrition-grid">
          <div><span>Calories</span><strong>{nutrition.calories}</strong></div>
          <div><span>Protein</span><strong>{nutrition.protein}g</strong></div>
          <div><span>Carbs</span><strong>{nutrition.carbs}g</strong></div>
          <div><span>Fat</span><strong>{nutrition.fat}g</strong></div>
        </div>
        <div className="list-panel">
          <div className="meal-row"><div><strong>Serving</strong></div><div>{food.serving}</div></div>
          <div className="meal-row"><div><strong>Price</strong></div><div>{food.price} VND</div></div>
          <div className="meal-row"><div><strong>Source</strong></div><div>{food.source}</div></div>
          <div className="meal-row"><div><strong>Confidence</strong></div><div>{Math.round(food.confidence * 100)}%</div></div>
        </div>
        <button type="button" className="primary-button" onClick={() => onAddMeal({
          foodId: food.id,
          foodName: food.name,
          quantity: 1,
          serving: food.serving,
          mealType: 'Lunch',
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fat,
          notes: '',
        })}>Lưu món này</button>
      </article>
    </main>
  )
}
