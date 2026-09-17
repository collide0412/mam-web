import type { MealEntry, Profile } from '../../types'

export function TogetherPage({ profile, meals }: { profile: Profile; meals: MealEntry[] }) {
  const voteOptions = [
    { label: 'Bún chả Hà Nội', score: 4 },
    { label: 'Cơm tấm sườn bì chả', score: 3 },
    { label: 'Salad gà', score: 2 },
  ]

  return (
    <main className="page-shell">
      <section className="profile-card large">
        <div className="feature-head">
          <h1>Together</h1>
          <span className="badge">Private vote</span>
        </div>
        <p>Chế độ ăn cùng nhau: {profile.name} đang chọn món hợp nhất cho cả nhóm.</p>
        <div className="vote-list">
          {voteOptions.map((option) => (
            <div key={option.label} className="vote-row">
              <strong>{option.label}</strong>
              <span>{option.score} votes</span>
            </div>
          ))}
        </div>
        <div className="muted" style={{ marginTop: '12px' }}>
          {meals.length} món đã lưu trong hồ sơ hiện tại.
        </div>
      </section>
    </main>
  )
}
