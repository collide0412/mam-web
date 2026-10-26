import { Link } from 'react-router-dom'
import { foodCatalog } from '../../data/catalog'
import type { MealEntry, Profile } from '../../types'
export function RecommendPage(_props: { profile: Profile; meals: MealEntry[] }) {
  return <section className="page-shell"><div className="page-heading"><div><p className="eyebrow">Danh mục ngoại tuyến</p><h1>Khám phá món ăn</h1><p className="muted">Một vài lựa chọn để bạn tự chọn theo sở thích.</p></div></div><div className="panel"><p>Dinh dưỡng chỉ là ước tính chưa kiểm chứng. Danh sách này không phải đề xuất dinh dưỡng cá nhân hay hướng dẫn về dị ứng.</p>{foodCatalog.map(food => <Link key={food.id} className="food-row" to={`/food/${food.id}`}><span className="food-description"><strong>{food.name}</strong><small>{food.region} · {food.serving}</small></span><span>{food.calories} kcal</span></Link>)}</div></section>
}
