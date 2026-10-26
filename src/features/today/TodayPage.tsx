import { Link } from 'react-router-dom'
import type { MealEntry, Profile } from '../../types'
import { getTodayKey } from '../../utils/nutrition'
import { Icon } from '../../components/Icon'
import { MealList } from '../../components/MealList'
import { NutritionSummary } from '../../components/NutritionSummary'
export function TodayPage({ profile, meals, onAddFood }: { profile: Profile; meals: MealEntry[]; onAddFood: () => void }) {
  const today = new Date()
  const todayMeals = meals.filter(meal => getTodayKey(new Date(meal.timestamp)) === getTodayKey(today))
  return <section className="page-shell">
    <div className="page-heading"><div><p className="eyebrow">{today.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>Hôm nay của {profile.name}</h1><p className="muted">Từng bữa ăn, một chút hiểu mình hơn.</p></div><button className="primary-button" onClick={onAddFood}><Icon name="plus" size={20} />Ghi món ăn</button></div>
    <NutritionSummary meals={todayMeals} profile={profile} />
    <div className="today-layout"><section className="panel"><div className="section-heading"><h2>Các bữa đã ghi</h2><Link className="text-button" to="/diary">Xem nhật ký <Icon name="arrow-right" size={20} /></Link></div>
      {todayMeals.length ? <MealList meals={todayMeals} /> : <div className="empty-state"><span className="empty-symbol"><Icon name="book" size={32} /></span><h3>Bắt đầu từ bữa ăn gần nhất</h3><p className="muted">Chọn món và khẩu phần. Bạn có thể sửa lại bất cứ lúc nào.</p><button className="primary-button" onClick={onAddFood}>Ghi món đầu tiên</button></div>}
    </section><aside className="daily-aside"><p className="eyebrow">Một nhịp nhỏ mỗi ngày</p><h2>Ghi đều, hiểu rõ hơn.</h2><p>Nhật ký thuộc về bạn. Mục tiêu có thể thay đổi cùng thói quen của bạn.</p><Link className="text-button" to="/profile">Điều chỉnh mục tiêu <Icon name="arrow-right" size={20} /></Link><hr /><p className="fine-print muted">Các số dinh dưỡng là ước tính theo khẩu phần, chưa được kiểm chứng. Đây là công cụ ghi chép cá nhân.</p></aside></div>
  </section>
}
