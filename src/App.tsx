import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { TodayPage } from './features/today/TodayPage'
import { AddFoodPage } from './features/search/AddFoodPage'
import { DiaryPage } from './features/diary/DiaryPage'
import { FoodDetailPage } from './features/food-detail/FoodDetailPage'
import { RecommendPage } from './features/recommendations/RecommendPage'
import { ProfilePage } from './features/account/ProfilePage'
import { IdentityGate } from './features/auth/IdentityGate'
import { Icon } from './components/Icon'
import type { IconName } from './components/Icon'
import type { MealEntry } from './types'
import { getIdentity } from './db/store'
import { finishGuestImport, pendingGuestImport, prepareGuestImport } from './features/account/guestImport'
import { useJournal } from './useJournal'

const navigation: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Hôm nay', icon: 'home' },
  { to: '/add', label: 'Ghi món', icon: 'plus' },
  { to: '/diary', label: 'Nhật ký', icon: 'book' },
  { to: '/profile', label: 'Cá nhân', icon: 'user' },
]

function App() {
  const journal = useJournal()
  const { profile, identity, meals } = journal
  const [offline, setOffline] = useState(!navigator.onLine)
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('mam-theme')
    return saved === 'dark' || (!saved && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })
  const [connecting, setConnecting] = useState(false)
  const [feedback, setFeedback] = useState({ owner: '', text: '' })
  const notice = feedback.owner === identity?.profileId ? feedback.text : ''
  const setNotice = (text: string) => setFeedback({ owner: identity?.profileId ?? '', text })
  const [undone, setUndone] = useState<MealEntry | null>(null)
  const [undoBusy, setUndoBusy] = useState(false)
  const importSnapshot = useRef<MealEntry[]>([])
  const location = useLocation()
  const navigate = useNavigate()

  const importPending = Boolean(identity?.cloud && pendingGuestImport(identity.profileId))

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('mam-theme', dark ? 'dark' : 'light')
  }, [dark])

  useLayoutEffect(() => {
    document.documentElement.lang = 'vi'
    const label = navigation.find((item) => item.to === location.pathname)?.label ?? 'Món ăn'
    document.title = `${label} · Măm`
    const heading = document.querySelector<HTMLElement>('.content-panel h1')
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }) }
    window.scrollTo(0, 0)
  }, [location.pathname, journal.ready])

  const connect = (copy: boolean) => {
    importSnapshot.current = copy && identity?.cloud === false ? meals.map((entry) => ({ ...entry, id: crypto.randomUUID() })) : []
    setConnecting(true)
    setNotice('')
  }

  const authenticated = async () => {
    if (connecting && importSnapshot.current.length > 0) {
      const target = await getIdentity()
      if (target?.cloud) {
        try {
          prepareGuestImport(target.profileId, importSnapshot.current)
          await finishGuestImport(target.profileId)
          setFeedback({ owner: target.profileId, text: 'Đã sao chép nhật ký vào tài khoản. Bản gốc vẫn lưu trên thiết bị.' })
        } catch {
          setFeedback({ owner: target.profileId, text: 'Chưa sao chép hết nhật ký. Bản gốc vẫn còn trên thiết bị. Dùng Tiếp tục sao chép để thử lại.' })
        }
        importSnapshot.current = []
      }
    }
    setConnecting(false)
    await journal.unlock()
    navigate('/')
  }

  const remove = async (entry: MealEntry) => {
    await journal.removeMeal(entry)
    setUndone(entry)
    setNotice(`Đã xóa ${entry.foodName}.`)
  }

  const undo = async () => {
    if (!undone || undoBusy) return
    setUndoBusy(true)
    try { await journal.updateMeal(undone); setUndone(null); setNotice('Đã khôi phục món ăn.') }
    catch (failure) { setNotice(failure instanceof Error ? failure.message : 'Chưa khôi phục được. Hãy thử lại.') }
    finally { setUndoBusy(false) }
  }

  const retryImport = async () => {
    if (!identity?.cloud || undoBusy) return
    setUndoBusy(true)
    try { await finishGuestImport(identity.profileId); setNotice('Đã hoàn tất sao chép nhật ký.') }
    catch { setNotice('Chưa sao chép được. Hãy kiểm tra bộ nhớ thiết bị rồi thử lại.') }
    finally { setUndoBusy(false) }
  }

  if (!journal.ready) return <main className="identity-shell"><p role="status">Đang mở nhật ký…</p></main>
  if (journal.error && !profile) return <main className="identity-shell"><div className="panel"><h1>Chưa mở được nhật ký</h1><p role="alert">{journal.error}</p><button className="primary-button" onClick={() => void journal.open()}>Thử lại</button></div></main>
  if (!identity || journal.locked || connecting) return <IdentityGate key={connecting ? 'connect' : 'unlock'} connecting={connecting} onCancel={connecting ? () => { setConnecting(false); importSnapshot.current = [] } : undefined} onAuthenticated={authenticated} />
  if (!profile) return null

  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>Đến nội dung chính</a>
    <header className="topbar">
      <Link to="/" className="brand-wrap" aria-label="Măm — Hôm nay"><span className="brand-mark" aria-hidden="true"><Icon name="leaf" /></span><span className="brand-wordmark">Măm<span>Nhật ký ăn uống</span></span></Link>
      <nav className="app-nav" aria-label="Điều hướng chính">{navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><Icon name={item.icon} /><span>{item.label}</span></NavLink>)}</nav>
      <button className="theme-toggle" onClick={() => setDark(!dark)} aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}><Icon name={dark ? 'sun' : 'moon'} /></button>
    </header>
    {offline && <div className="offline-banner" role="status">Đang ngoại tuyến · Bạn vẫn có thể ghi và sửa nhật ký trên thiết bị.</div>}
    <main id="main-content" className="content-panel" tabIndex={-1}>
      {journal.error && <p className="form-error" role="alert">{journal.error}</p>}
      {importPending && <div className="status-message"><span>Còn nhật ký trên thiết bị đang chờ sao chép vào tài khoản này.</span><button className="secondary-button" disabled={undoBusy} onClick={() => void retryImport()}>Tiếp tục sao chép</button></div>}
      {notice && <div className="status-message" role="status"><span>{notice}</span>{undone && <button className="text-button" disabled={undoBusy} onClick={() => void undo()}>{undoBusy ? 'Đang khôi phục…' : 'Hoàn tác xóa'}</button>}<button className="text-button" aria-label="Đóng thông báo" onClick={() => { setNotice(''); setUndone(null) }}><Icon name="close" /></button></div>}
      <Routes>
        <Route path="/" element={<TodayPage profile={profile} meals={meals} onAddFood={() => navigate('/add')} />} />
        <Route path="/add" element={<AddFoodPage profile={profile} meals={meals} onAddMeal={journal.addMeal} />} />
        <Route path="/food/:id" element={<FoodDetailPage profile={profile} onAddMeal={journal.addMeal} />} />
        <Route path="/diary" element={<DiaryPage profile={profile} meals={meals} onUpdateMeal={journal.updateMeal} onDeleteMeal={remove} />} />
        <Route path="/recommend" element={<RecommendPage profile={profile} meals={meals} />} />
        <Route path="/together" element={<Navigate to="/recommend" replace />} />
        <Route path="/profile" element={<ProfilePage key={profile.id} profile={profile} meals={meals} cloud={identity.cloud === true} hasPin={Boolean(identity.pinHash)} sync={journal.sync} onSave={journal.updateProfile} onLock={journal.lock} onConnect={connect} onRetry={journal.retry} onSignOut={async () => { await journal.signOut(); setUndone(null); setNotice(''); navigate('/') }} />} />
        <Route path="*" element={<section className="page-shell"><h1>Không tìm thấy trang</h1><p>Đường dẫn này chưa có trong Măm.</p><Link className="primary-button" to="/">Về hôm nay</Link></section>} />
      </Routes>
    </main>
  </div>
}

export default App
