import type { MealEntry, Profile } from '../types'
import { formatMacro } from '../utils/nutrition'
export function NutritionSummary({ meals, profile }: { meals: MealEntry[]; profile: Profile }) {
  const totals = meals.reduce((sum, meal) => ({ calories: sum.calories + meal.calories, protein: sum.protein + meal.protein, carbs: sum.carbs + meal.carbs, fat: sum.fat + meal.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  const progress = Math.min(totals.calories / profile.calorieGoal, 1)
  return <section className="nutrition-summary" aria-label="Tổng dinh dưỡng">
    <div className="energy-ring"><svg viewBox="0 0 160 160" aria-hidden="true"><circle className="ring-track" cx="80" cy="80" r="68" />{progress > 0 && <circle className="ring-value" cx="80" cy="80" r="68" pathLength="100" strokeDasharray={`${progress * 100} 100`} />}</svg><div><strong>{formatMacro(totals.calories)}</strong><span>kcal đã ghi</span></div></div>
    <div className="nutrition-detail"><p className="eyebrow">Năng lượng trong ngày</p><h2>{totals.calories > profile.calorieGoal ? `Vượt ${formatMacro(totals.calories - profile.calorieGoal)} kcal` : `Còn ${formatMacro(profile.calorieGoal - totals.calories)} kcal`}</h2><p className="muted">So với mục tiêu {formatMacro(profile.calorieGoal)} kcal của bạn.</p>
      <div className="macro-bars">{([{ key: 'protein', label: 'Đạm', goal: profile.proteinGoal }, { key: 'carbs', label: 'Bột đường', goal: profile.carbsGoal }, { key: 'fat', label: 'Chất béo', goal: profile.fatGoal }] as const).map(({ key, label, goal }) => <div key={key}><div className="section-heading"><span>{label}</span><span>{formatMacro(totals[key])} / {formatMacro(goal)} g</span></div><progress aria-label={label} max={Math.max(goal, 1)} value={Math.min(totals[key], Math.max(goal, 1))} /></div>)}</div>
    </div>
  </section>
}
