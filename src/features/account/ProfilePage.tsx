import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { MealEntry, Profile } from '../../types'
import { validateProfile } from '../../domain/validation'
import { firebaseEnabled } from '../../firebase'
import { getTodayKey } from '../../utils/nutrition'

type ProfilePageProps = {
  profile: Profile
  meals: MealEntry[]
  cloud: boolean
  hasPin: boolean
  sync: { pending: number; error: string | null; syncing: boolean }
  onSave: (profile: Profile) => Promise<void>
  onLock: () => Promise<void>
  onSignOut: () => Promise<void>
  onConnect: (copy: boolean) => void
  onRetry: () => Promise<void>
}

export function ProfilePage(props: ProfilePageProps) {
  const { profile, meals, cloud, hasPin, sync, onSave, onLock, onSignOut, onConnect, onRetry } = props
  const [draft, setDraft] = useState(profile)
  const [goals, setGoals] = useState(() => ({ calorieGoal: String(profile.calorieGoal), proteinGoal: String(profile.proteinGoal), carbsGoal: String(profile.carbsGoal), fatGoal: String(profile.fatGoal) }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [copy, setCopy] = useState(true)
  const [download, setDownload] = useState<{ url: string; name: string } | null>(null)
  useEffect(() => () => { if (download) URL.revokeObjectURL(download.url) }, [download])

  const run = async (operation: () => Promise<void>, success = '') => {
    if (busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try { await operation(); setMessage(success) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Chưa hoàn tất. Hãy thử lại.') }
    finally { setBusy(false) }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void run(async () => {
      if (Object.values(goals).some((value) => !value.trim() || !Number.isFinite(Number(value)))) throw new Error('Hãy nhập đủ bốn mục tiêu dinh dưỡng.')
      await onSave(validateProfile({ ...draft, name: draft.name.trim(), calorieGoal: Number(goals.calorieGoal), proteinGoal: Number(goals.proteinGoal), carbsGoal: Number(goals.carbsGoal), fatGoal: Number(goals.fatGoal) }))
    }, 'Đã lưu hồ sơ và mục tiêu trên thiết bị.')
  }

  const exportJournal = () => {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), profile, meals }, null, 2)], { type: 'application/json' })
    setDownload({ url: URL.createObjectURL(blob), name: `mam-nhat-ky-${getTodayKey()}.json` })
    setMessage('Tệp đã sẵn sàng. Chọn Tải tệp JSON để lưu và giữ ở nơi riêng tư.')
  }

  return <div className="page-shell">
    <header className="page-heading"><div><p className="eyebrow">Theo cách của bạn</p><h1>Cá nhân</h1><p className="muted">Một vài điều chỉnh nhỏ cho nhật ký mỗi ngày.</p></div></header>
    <div className="account-layout">
      <section className="panel" aria-labelledby="profile-title">
        <h2 id="profile-title">Hồ sơ & mục tiêu</h2>
        <p className="muted">Mục tiêu khởi đầu có thể chỉnh lại. Đây không phải khuyến nghị dinh dưỡng cá nhân.</p>
        <form onSubmit={submit}>
          <fieldset disabled={busy} className="form-fields">
            <legend className="sr-only">Thông tin và mục tiêu hằng ngày</legend>
            <label className="field-block"><span>Tên người dùng</span><input value={draft.name} maxLength={80} required onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <div className="field-grid">
              <label className="field-block"><span>Năng lượng (kcal/ngày)</span><input type="number" min={500} max={10000} required value={goals.calorieGoal} onChange={(event) => setGoals({ ...goals, calorieGoal: event.target.value })} /></label>
              <label className="field-block"><span>Đạm (g/ngày)</span><input type="number" min={0} max={1000} required value={goals.proteinGoal} onChange={(event) => setGoals({ ...goals, proteinGoal: event.target.value })} /></label>
              <label className="field-block"><span>Tinh bột (g/ngày)</span><input type="number" min={0} max={2000} required value={goals.carbsGoal} onChange={(event) => setGoals({ ...goals, carbsGoal: event.target.value })} /></label>
              <label className="field-block"><span>Chất béo (g/ngày)</span><input type="number" min={0} max={1000} required value={goals.fatGoal} onChange={(event) => setGoals({ ...goals, fatGoal: event.target.value })} /></label>
            </div>
            <button type="submit" className="primary-button">{busy ? 'Đang lưu…' : 'Lưu hồ sơ'}</button>
          </fieldset>
        </form>
      </section>
      <div className="account-sections">
        <section className="panel" aria-labelledby="account-title">
          <p className="eyebrow">{cloud ? 'Tài khoản của bạn' : 'Không gian trên thiết bị'}</p>
          <h2 id="account-title">{cloud ? 'Lưu & đồng bộ' : 'Dữ liệu của bạn'}</h2>
          <p className="muted">{cloud ? 'Mỗi tài khoản có hồ sơ và nhật ký riêng. Thay đổi được lưu vào thiết bị trước khi gửi lên tài khoản.' : 'Hồ sơ và nhật ký chỉ lưu trên thiết bị này. Xóa dữ liệu trình duyệt có thể làm mất nhật ký.'}</p>
          {cloud ? <>
            <p role="status">{sync.syncing ? 'Đang đồng bộ…' : sync.pending ? `${sync.pending} thay đổi đang chờ gửi` : 'Không có thay đổi đang chờ gửi'}</p>
            {sync.error && <p className="form-error">{sync.error}</p>}
            <div className="profile-actions"><button className="secondary-button" disabled={busy || sync.syncing} onClick={() => void run(onRetry, 'Đã thử kết nối lại.')}>Thử đồng bộ</button><button className="text-button" disabled={busy} onClick={() => onConnect(false)}>Đăng nhập lại</button></div>
          </> : firebaseEnabled && <>
            <label className="auth-consent"><input type="checkbox" checked={copy} onChange={(event) => setCopy(event.target.checked)} /><span>Sao chép {meals.length} món đã ghi vào tài khoản khi đăng nhập. Bản gốc vẫn lưu trên thiết bị.</span></label>
            <button className="primary-button" disabled={busy} onClick={() => onConnect(copy)}>Kết nối tài khoản</button>
          </>}
          <div className="profile-actions">
            <button className="secondary-button" disabled={busy} onClick={exportJournal}>Xuất bản sao nhật ký</button>
            {download && <a className="secondary-button" href={download.url} download={download.name}>Tải tệp JSON</a>}
            {hasPin && <button className="text-button" disabled={busy} onClick={() => void run(onLock)}>Khóa Măm</button>}
            {cloud && <button className="text-button" disabled={busy} onClick={() => void run(onSignOut)}>Đăng xuất</button>}
          </div>
          <p className="muted small-copy">{hasPin ? 'Mã khóa chỉ bảo vệ giao diện trên thiết bị, không mã hóa dữ liệu.' : 'Thiết bị này chưa đặt mã khóa. Dùng khóa màn hình của thiết bị để bảo vệ nhật ký.'}</p>
        </section>
        <section className="panel"><h2>Về số liệu món ăn</h2><p className="muted">Danh mục nhỏ được tích hợp sẵn để dùng ngoại tuyến. Năng lượng và dinh dưỡng là ước lượng chưa được xác minh; công thức và khẩu phần thực tế có thể khác.</p></section>
      </div>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <p className="status-message" role="status">{message}</p>
  </div>
}
