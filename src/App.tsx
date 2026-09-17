import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { clearIdentity, getIdentity, getMealsForProfile, getProfiles, getSelectedProfileId, saveMeal, saveProfile, saveSelectedProfileId, setupIdentity, verifyIdentity } from './db/store'
import { AddFoodPage } from './features/search/AddFoodPage'
import { TodayPage } from './features/today/TodayPage'
import { DiaryPage } from './features/diary/DiaryPage'
import { FoodDetailPage } from './features/food-detail/FoodDetailPage'
import { RecommendPage } from './features/recommendations/RecommendPage'
import { TogetherPage } from './features/together/TogetherPage'
import type { MealEntry, Profile } from './types'

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
  const [pin, setPin] = useState('')
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
    if (!hasIdentity && name.trim().length < 2) {
      setError('Hãy nhập tên để cá nhân hóa trải nghiệm.')
      return
    }
    if (!/^\d{6}$/.test(pin)) {
      setError('Mã mở khóa cần có đúng 6 chữ số.')
      return
    }

    if (hasIdentity) {
      if (!(await verifyIdentity(pin))) {
        setError('Mã mở khóa chưa đúng. Hãy thử lại.')
        return
      }
    } else {
      await setupIdentity(name, pin)
    }
    onAuthenticated()
  }

  return (
    <main className="identity-shell">
      <section className="identity-card" aria-labelledby="identity-title">
        <div className="brand-mark" aria-hidden="true">M</div>
        <p className="eyebrow">Măm riêng tư</p>
        <h1 id="identity-title">{hasIdentity ? 'Chào bạn trở lại' : 'Bắt đầu không gian riêng của bạn'}</h1>
        <p className="identity-copy">Dữ liệu ăn uống được lưu trên thiết bị này và chỉ mở khi có mã của bạn.</p>
        <form onSubmit={(event) => void handleSubmit(event)}>
          {!hasIdentity && (
            <label className="field-block">
              <span>Tên của bạn</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Mai" autoComplete="name" required />
            </label>
          )}
          <label className="field-block">
            <span>Mã mở khóa 6 chữ số</span>
            <input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="current-password" pattern="\d{6}" required />
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
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

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
