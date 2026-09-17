import { getRecommendationCandidates } from '../../data/catalog'
import type { MealEntry, Profile } from '../../types'

export function RecommendPage({ profile, meals }: { profile: Profile; meals: MealEntry[] }) {
  const picks = getRecommendationCandidates(profile, meals)

  return (
    <main className="page-shell">
      <section className="profile-card large">
        <div className="feature-head">
          <h1>Bây giờ ăn gì?</h1>
          <span className="badge">Solo</span>
        </div>
        <p>“Em ăn gì cũng được.” Măm đang ưu tiên món phù hợp với khẩu vị, mục tiêu calo và những món bạn chưa ăn gần đây.</p>
        <div className="recommend-grid">
          {picks.map((food) => (
            <div key={food.id} className="mini-card recommendation-card" aria-live="polite">
              <strong>{food.name}</strong>
              <small>{food.region}</small>
              <span>{food.calories} kcal • {food.protein}g protein</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
