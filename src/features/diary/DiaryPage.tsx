import type { MealEntry, Profile } from '../../types'

export function DiaryPage({ meals }: { profile?: Profile; meals: MealEntry[] }) {
  return (
    <main className="page-shell">
      <section className="profile-card large">
        <h1>Nhật ký</h1>
        {meals.length === 0 ? <p className="muted">Chưa có món ăn nào được lưu.</p> : meals.map((meal) => (
          <div key={meal.id} className="meal-row diary-row">
            <div>
              <strong>{meal.foodName}</strong>
              <small>{meal.mealType} • {new Date(meal.timestamp).toLocaleDateString('vi-VN')}</small>
            </div>
            <div className="meal-meta">
              <span>{meal.calories} kcal</span>
              <small>{meal.quantity} x {meal.serving}</small>
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
