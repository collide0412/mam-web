import type { MealEntry, Profile } from '../../types'
import { formatCurrency, formatMacro, getTodayKey } from '../../utils/nutrition'

const moodText = ['Chào buổi tối', 'Chào buổi trưa', 'Chào buổi sáng']

type TodayPageProps = {
  profile: Profile
  meals: MealEntry[]
  onAddFood: () => void
}

export function TodayPage({ profile, meals, onAddFood }: TodayPageProps) {
  const todayMeals = meals.filter((meal) => getTodayKey(new Date(meal.timestamp)) === getTodayKey())
  const totals = todayMeals.reduce(
    (acc, meal) => {
      acc.calories += meal.calories
      acc.protein += meal.protein
      acc.carbs += meal.carbs
      acc.fat += meal.fat
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  const remaining = Math.max(profile.calorieGoal - totals.calories, 0)
  const progress = Math.min((totals.calories / profile.calorieGoal) * 100, 100)

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="eyebrow">{moodText[1]}</div>
        <h1>Chào buổi tối, {profile.name}</h1>
        <div className="hero-metrics">
          <div>
            <span className="metric-value">{formatMacro(totals.calories)} / {formatMacro(profile.calorieGoal)} kcal</span>
            <small>Còn khoảng {formatMacro(remaining)} kcal</small>
          </div>
          <button type="button" className="primary-button" onClick={onAddFood}>+ Thêm món ăn</button>
        </div>
        <div className="progress-bar" aria-label="Tiến độ calo hôm nay">
          <span style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="summary-grid">
        <div className="mini-card">
          <span>Protein</span>
          <strong>{totals.protein} / {profile.proteinGoal} g</strong>
        </div>
        <div className="mini-card">
          <span>Carb</span>
          <strong>{totals.carbs} / {profile.carbsGoal} g</strong>
        </div>
        <div className="mini-card">
          <span>Fat</span>
          <strong>{totals.fat} / {profile.fatGoal} g</strong>
        </div>
      </section>

      <section className="feature-card">
        <div className="feature-head">
          <h2>Bây giờ ăn gì?</h2>
          <span className="badge">Gợi ý ngay</span>
        </div>
        <p>“Em ăn gì cũng được.” Cho đến khi món được đề xuất.</p>
        <button type="button" className="secondary-button">Ngẫu nhiên & phù hợp</button>
      </section>

      <section className="list-panel">
        <h3>Hôm nay</h3>
        {todayMeals.length === 0 ? <p className="muted">Bạn chưa ghi bữa ăn nào hôm nay.</p> : todayMeals.map((meal) => (
          <div key={meal.id} className="meal-row">
            <div>
              <strong>{meal.foodName}</strong>
              <small>{meal.mealType}</small>
            </div>
            <div className="meal-meta">
              <span>{meal.calories} kcal</span>
              {profile.currency === 'KRW' ? formatCurrency(meal.calories * 12, 'KRW') : formatCurrency(meal.calories * 350, 'VND')}
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
