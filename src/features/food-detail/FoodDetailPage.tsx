import { Link, useParams } from 'react-router-dom'
import { getFoodById } from '../../data/catalog'
import type { Profile } from '../../types'
import { MealEditor } from '../../components/MealEditor'
import { draftFromFood } from '../../components/mealDraft'
import type { MealDraft } from '../../components/MealEditor'
import { Icon } from '../../components/Icon'
export function FoodDetailPage({ onAddMeal }: { profile?: Profile; onAddMeal: (payload: MealDraft) => Promise<void> }) {
  const { id } = useParams()
  const food = getFoodById(id ?? '')
  if (!food) return <section className="page-shell"><h1>Không tìm thấy món ăn</h1><p className="muted">Món này chưa có trong danh mục hiện tại.</p><Link className="primary-button" to="/add">Về danh mục món ăn</Link></section>
  return <section className="page-shell"><Link className="text-button" to="/add"><Icon name="chevron-left" size={20} />Danh mục món ăn</Link><div className="page-heading"><div><p className="eyebrow">{food.category} · {food.region}</p><h1>{food.name}</h1></div></div><div className="detail-layout"><div className="panel"><MealEditor key={food.id} initial={draftFromFood(food)} onSave={onAddMeal} /></div><aside className="daily-aside"><h2>Về số liệu của món</h2><p>Các giá trị cho {food.serving} là ước tính trong danh mục Măm, chưa có nguồn dinh dưỡng gốc được kiểm chứng.</p><p className="muted">Công thức, nguyên liệu và cách chế biến thực tế có thể làm thay đổi các giá trị này. Chưa có dữ liệu để xác nhận chất gây dị ứng.</p><Link className="text-button" to="/diary">Xem nhật ký <Icon name="arrow-right" size={20} /></Link></aside></div></section>
}
