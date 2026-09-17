import { useEffect, useMemo, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { defaultProfiles, getMealsForProfile, getProfiles, getSelectedProfileId, saveMeal, saveProfile, saveSelectedProfileId, seedProfilesIfNeeded } from './db/store'
import { AddFoodPage } from './features/search/AddFoodPage'
import { TodayPage } from './features/today/TodayPage'
import { DiaryPage } from './features/diary/DiaryPage'
import { FoodDetailPage } from './features/food-detail/FoodDetailPage'
import { RecommendPage } from './features/recommendations/RecommendPage'
import { TogetherPage } from './features/together/TogetherPage'
import type { MealEntry, Profile } from './types'

const defaultProfile: Profile = defaultProfiles[0]

function App() {
  const [profiles, setProfiles] = useState<Profile[]>(defaultProfiles)
  const [profile, setProfile] = useState<Profile>(defaultProfile)
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [offline, setOffline] = useState(!navigator.onLine)
  const [draftName, setDraftName] = useState(defaultProfile.name)

  useEffect(() => {
    void (async () => {
      await seedProfilesIfNeeded()
      const storedProfiles = await getProfiles()
      const selected = (await getSelectedProfileId()) ?? storedProfiles[0]?.id ?? defaultProfile.id
      const activeProfile = storedProfiles.find((item) => item.id === selected) ?? storedProfiles[0] ?? defaultProfile

      setProfiles(storedProfiles)
      setProfile(activeProfile)
      setDraftName(activeProfile.name)
      setMeals(await getMealsForProfile(activeProfile.id))
    })()
  }, [])

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
      name: `Hồ sơ ${profiles.length + 1}`,
    }

    await saveProfile(nextProfile)
    const updatedProfiles = await getProfiles()
    setProfiles(updatedProfiles)
    await handleProfileChange(nextProfile.id)
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
