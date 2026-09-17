import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { clearIdentity, flushPendingSync, getIdentity, getMealsForProfile, getProfiles, getSelectedProfileId, saveMeal, saveProfile, saveSelectedProfileId, setupIdentity, verifyIdentity } from './db/store'
import { AddFoodPage } from './features/search/AddFoodPage'
import { TodayPage } from './features/today/TodayPage'
import { DiaryPage } from './features/diary/DiaryPage'
import { FoodDetailPage } from './features/food-detail/FoodDetailPage'
import { RecommendPage } from './features/recommendations/RecommendPage'
import { TogetherPage } from './features/together/TogetherPage'
import type { MealEntry, Profile } from './types'
import { firebaseEnabled } from './firebase'
import { register, signIn, signInWithGoogle } from './firebaseAuth'
import { getCloudProfile } from './firebaseStore'

const defaultProfile: Profile = {
  id: 'local-profile',
  name: 'Bạn',
  region: 'Việt Nam',
  language: 'vi',
  currency: 'VND',
  calorieGoal: 1650,
  proteinGoal: 90,
  carbsGoal: 210,
  fatGoal: 58,
  allergens: [],
  dietary: [],
}

function IdentityGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [hasIdentity, setHasIdentity] = useState(false)
  const [ready, setReady] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [password, setPassword] = useState('')
  const [cloudMode, setCloudMode] = useState<'signin' | 'register'>('signin')
  const [error, setError] = useState('')

  useEffect(() => {
    void getIdentity().then((identity) => {
      setHasIdentity(Boolean(identity))
      setReady(true)
    })
  }, [])

  if (!ready) return <main className="identity-shell"><p>Đang mở Măm…</p></main>

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!hasIdentity && (!firebaseEnabled || cloudMode === 'register') && name.trim().length < 2) {
      setError('Hãy nhập tên để cá nhân hóa trải nghiệm.')
      return
    }
    if (!/^\d{6}$/.test(pin)) {
      setError('Mã mở khóa cần có đúng 6 chữ số.')
      return
    }

    if (firebaseEnabled && !hasIdentity) {
      if (!email || password.length < 6) {
        setError('Email hợp lệ và mật khẩu cần có ít nhất 6 ký tự.')
        return
      }
      try {
        const user = cloudMode === 'register' ? await register(email, password) : await signIn(email, password)
        const existingProfile = cloudMode === 'signin' ? await getCloudProfile(user.uid) : null
        await setupIdentity(cloudMode === 'register' ? name : (user.displayName ?? email.split('@')[0]), pin, user.uid, existingProfile ?? undefined)
      } catch {
        setError('Không thể xác thực. Kiểm tra email, mật khẩu và Firebase configuration.')
        return
      }
    } else if (hasIdentity) {
      if (!(await verifyIdentity(pin))) {
        setError('Mã mở khóa chưa đúng. Hãy thử lại.')
        return
      }
    } else {
      await setupIdentity(name, pin)
    }
    onAuthenticated()
  }

  const handleGoogleSignIn = async () => {
    setError('')
    if (!/^\d{6}$/.test(pin)) {
      setError('Hãy nhập mã khóa ứng dụng gồm đúng 6 chữ số trước.')
      return
    }
    try {
      const user = await signInWithGoogle()
      const existingProfile = await getCloudProfile(user.uid)
      await setupIdentity(user.displayName ?? user.email?.split('@')[0] ?? 'Bạn', pin, user.uid, existingProfile ?? undefined)
      onAuthenticated()
    } catch {
      setError('Không thể đăng nhập bằng Google. Kiểm tra Authorized domains và cấu hình Firebase.')
    }
  }

  return (
    <main className="identity-shell">
      <section className="identity-card" aria-labelledby="identity-title">
        <div className="brand-mark" aria-hidden="true">M</div>
        <p className="eyebrow">Măm riêng tư</p>
        <h1 id="identity-title">{hasIdentity ? 'Chào bạn trở lại' : 'Bắt đầu không gian riêng của bạn'}</h1>
        <p className="identity-copy">Email và mật khẩu dùng để đồng bộ tài khoản. Mã khóa ứng dụng giúp mở Măm nhanh và giữ nhật ký riêng trên thiết bị này.</p>
        <form onSubmit={(event) => void handleSubmit(event)}>
          {firebaseEnabled && !hasIdentity && (
            <>
              {cloudMode === 'register' && (
                <label className="field-block">
                  <span>Tên của bạn</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Mai" autoComplete="name" required />
                </label>
              )}
              <label className="field-block">
                <span>Email</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
              </label>
              <label className="field-block">
                <span>Mật khẩu tài khoản</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={cloudMode === 'register' ? 'new-password' : 'current-password'} required />
              </label>
              <button type="button" className="secondary-button google-button" onClick={() => void handleGoogleSignIn()}>
                Tiếp tục với Google
              </button>
              <button type="button" className="text-button" onClick={() => setCloudMode(cloudMode === 'register' ? 'signin' : 'register')}>
                {cloudMode === 'register' ? 'Đã có tài khoản? Đăng nhập' : 'Tạo tài khoản mới'}
              </button>
            </>
          )}
          {!firebaseEnabled && !hasIdentity && (
            <label className="field-block">
              <span>Tên của bạn</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Mai" autoComplete="name" required />
            </label>
          )}
          <label className="field-block">
            <span>Mã khóa ứng dụng 6 chữ số</span>
            <input type="password" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="off" pattern="\d{6}" maxLength={6} required />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="primary-button">{hasIdentity ? 'Mở khóa Măm' : 'Tạo không gian riêng'}</button>
        </form>
      </section>
    </main>
  )
}

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [profile, setProfile] = useState<Profile>(defaultProfile)
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [offline, setOffline] = useState(!navigator.onLine)
  const [draftName, setDraftName] = useState(defaultProfile.name)
  const [identity, setIdentity] = useState<{ profileId: string } | null>(null)
  const [identityReady, setIdentityReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)

  useEffect(() => {
    void getIdentity().then((storedIdentity) => {
      setIdentity(storedIdentity ? { profileId: storedIdentity.profileId } : null)
      setIdentityReady(true)
    })
  }, [])

  useEffect(() => {
    if (!identity) return
    void (async () => {
      const storedProfiles = await getProfiles()
      const selected = (await getSelectedProfileId()) ?? identity.profileId
      const activeProfile = storedProfiles.find((item) => item.id === selected) ?? storedProfiles.find((item) => item.id === identity.profileId)
      if (!activeProfile) {
        await clearIdentity()
        setIdentity(null)
        return
      }
      setProfiles(storedProfiles)
      setProfile(activeProfile)
      setDraftName(activeProfile.name)
      setMeals(await getMealsForProfile(activeProfile.id))
      setProfileReady(true)
    })()
  }, [identity])

  useEffect(() => {
    document.documentElement.lang = profile.language
  }, [profile.language])

  useEffect(() => {
    const handleOnline = () => {
      setOffline(false)
      void flushPendingSync()
    }
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!identity) return
    void flushPendingSync()
    const retryTimer = window.setInterval(() => void flushPendingSync(), 30_000)
    return () => window.clearInterval(retryTimer)
  }, [identity])

  const handleAddMeal = async (payload: Omit<MealEntry, 'id' | 'profileId' | 'timestamp'> & { foodId: string }) => {
    const entry: MealEntry = {
      ...payload,
      id: crypto.randomUUID(),
      profileId: profile.id,
      timestamp: new Date().toISOString(),
    }
    await saveMeal(entry)
    setMeals((current) => [entry, ...current])
  }

  const handleProfileChange = async (nextId: string) => {
    const nextProfile = profiles.find((item) => item.id === nextId) ?? profile
    if (!nextProfile) return

    setProfile(nextProfile)
    setDraftName(nextProfile.name)
    await saveSelectedProfileId(nextProfile.id)
    setMeals(await getMealsForProfile(nextProfile.id))
  }

  const handleSaveCurrentProfile = async () => {
    const nextProfile: Profile = {
      ...profile,
      name: draftName.trim() || profile.name,
    }

    await saveProfile(nextProfile)
    setProfile(nextProfile)
    setProfiles((current) => current.some((item) => item.id === nextProfile.id) ? current.map((item) => item.id === nextProfile.id ? nextProfile : item) : [...current, nextProfile])
    await saveSelectedProfileId(nextProfile.id)
    setMeals(await getMealsForProfile(nextProfile.id))
  }

  const handleAddProfile = async () => {
    const nextId = `profile-${Date.now()}`
    const nextProfile: Profile = {
      ...defaultProfile,
      id: nextId,
      name: 'Bạn',
    }

    await saveProfile(nextProfile)
    const updatedProfiles = await getProfiles()
    setProfiles(updatedProfiles)
    await handleProfileChange(nextProfile.id)
  }

  const handleLock = async () => {
    await clearIdentity()
    setProfileReady(false)
    setIdentity(null)
  }

  const navItems = useMemo(
    () => [
      { to: '/', label: 'Hôm nay' },
      { to: '/add', label: 'Thêm món' },
      { to: '/diary', label: 'Nhật ký' },
      { to: '/profile', label: 'Cá nhân' },
    ],
    [],
  )

  if (!identityReady || !identity) return <IdentityGate onAuthenticated={() => void getIdentity().then((storedIdentity) => setIdentity(storedIdentity ? { profileId: storedIdentity.profileId } : null))} />
  if (!profileReady) return <main className="identity-shell"><p>Đang tải dữ liệu riêng tư…</p></main>

  return (
    <div className="app-shell">
      {offline && <div className="offline-banner">Đang offline</div>}
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark" aria-label="Măm brand">M</div>
          <div>
            <strong>Măm</strong>
            <small>Calorie Tracker</small>
          </div>
        </div>
      </header>

      <main className="content-panel">
        <Routes>
          <Route path="/" element={<TodayPage profile={profile} meals={meals} onAddFood={() => window.location.hash = '#/add'} />} />
          <Route path="/add" element={<AddFoodPage profile={profile} meals={meals} onAddMeal={handleAddMeal} />} />
          <Route path="/food/:id" element={<FoodDetailPage profile={profile} onAddMeal={handleAddMeal} />} />
          <Route path="/diary" element={<DiaryPage profile={profile} meals={meals} />} />
          <Route path="/recommend" element={<RecommendPage profile={profile} meals={meals} />} />
          <Route path="/together" element={<TogetherPage profile={profile} meals={meals} />} />
          <Route
            path="/profile"
            element={
              <div className="page-shell">
                <section className="profile-card large" aria-label="Profile settings">
                  <h1>Hồ sơ</h1>
                  <div className="profile-grid">
                    <label className="field-block">
                      <span>Chọn người dùng</span>
                      <select value={profile.id} onChange={(event) => void handleProfileChange(event.target.value)} aria-label="Chọn hồ sơ chính">
                        {profiles.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field-block">
                      <span>Tên hiển thị</span>
                      <input value={draftName} onChange={(event) => setDraftName(event.target.value)} aria-label="Tên người dùng" />
                    </label>
                  </div>
                  <div className="profile-actions">
                    <button type="button" className="primary-button" onClick={() => void handleSaveCurrentProfile()}>Lưu hồ sơ</button>
                    <button type="button" className="secondary-button" onClick={() => void handleAddProfile()}>+ Thêm hồ sơ</button>
                    <button type="button" className="text-button" onClick={() => void handleLock()}>Khóa Măm</button>
                  </div>
                </section>
              </div>
            }
          />
        </Routes>
      </main>

      <nav className="bottom-nav" aria-label="Điều hướng chính">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label={item.label}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default App
