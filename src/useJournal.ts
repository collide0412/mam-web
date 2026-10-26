import { useCallback, useEffect, useRef, useState } from 'react'
import { clearIdentity, confirmCloudIdentity, deleteMeal, flushPendingSync, getAppLocked, getIdentity, getMealsForProfile, getProfile, getSyncStatus, refreshCloudProfile, saveMeal, saveProfile, setAppLocked, subscribeDataChanges } from './db/store'
import type { IdentityRecord } from './db/store'
import type { MealEntry, Profile } from './types'
import type { MealDraft } from './components/MealEditor'
import { logout, watchFirebaseUser } from './firebaseAuth'

const emptySync = { pending: 0, error: null as string | null, syncing: false }

export function useJournal() {
  const [identity, setIdentity] = useState<IdentityRecord | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [sync, setSync] = useState(emptySync)
  const [ready, setReady] = useState(false)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState('')
  const session = useRef(0)

  const open = useCallback(async () => {
    const version = ++session.current
    try {
      const [stored, isLocked] = await Promise.all([getIdentity(), getAppLocked()])
      if (version !== session.current) return
      setReady(false)
      setError('')
      const saved = stored ? await getProfile(stored.profileId) : undefined
      const entries = stored ? await getMealsForProfile(stored.profileId) : []
      if (version !== session.current) return
      if (stored && !saved) throw new Error('Không tìm thấy hồ sơ trên thiết bị. Hãy tải lại; dữ liệu chưa bị xóa.')
      setIdentity(stored)
      setProfile(saved ?? null)
      setMeals(entries)
      setLocked(isLocked)
    } catch (failure) { if (version === session.current) setError(failure instanceof Error ? failure.message : 'Không thể mở nhật ký.') }
    finally { if (version === session.current) setReady(true) }
    }, [])

  useEffect(() => { void open(); return () => { session.current += 1 } }, [open])

  useEffect(() => {
    if (!identity || locked) return
    let active = true
    let lastRefresh = 0
    const owner = identity.profileId
    const reload = async () => {
      try {
        const [currentIdentity, currentLock] = await Promise.all([getIdentity(), getAppLocked()])
        if (!active) return
        if (JSON.stringify(currentIdentity) !== JSON.stringify(identity) || currentLock !== locked) { await open(); return }
        const [saved, entries, status] = await Promise.all([getProfile(owner), getMealsForProfile(owner), getSyncStatus(owner)])
        if (!active) return
        if (saved) setProfile(saved)
        setMeals(entries)
        setSync(status)
      } catch (failure) { if (active) setError(failure instanceof Error ? failure.message : 'Không thể đọc nhật ký.') }
    }
    const refresh = async () => {
      lastRefresh = Date.now()
      await flushPendingSync()
      if (identity.cloud) await refreshCloudProfile(owner)
      await reload()
    }
    const refreshSafely = () => { void refresh().catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Chưa kết nối được tài khoản.') }) }
    const unsubscribe = subscribeDataChanges(() => void reload())
    const unwatch = identity.cloud === false ? () => undefined : watchFirebaseUser((user) => {
      if (user?.uid !== owner) return
      if (identity.cloud === undefined) {
        void confirmCloudIdentity(owner).then((updated) => { if (active && updated?.cloud) setIdentity(updated) }).catch(() => undefined)
      } else refreshSafely()
    }, (failure) => { if (active) setError(failure.message) })
    refreshSafely()
    window.addEventListener('online', refreshSafely)
    const onFocus = () => { if (identity.cloud && Date.now() - lastRefresh > 60_000) refreshSafely() }
    window.addEventListener('focus', onFocus)
    const interval = identity.cloud ? window.setInterval(() => void flushPendingSync(), 30_000) : undefined
    return () => { active = false; unsubscribe(); unwatch(); window.removeEventListener('online', refreshSafely); window.removeEventListener('focus', onFocus); window.clearInterval(interval) }
  }, [identity, locked, open])

  const updateMeal = async (entry: MealEntry) => {
    if (!profile || entry.profileId !== profile.id) throw new Error('Món ăn không thuộc nhật ký đang mở.')
    const version = session.current
    await saveMeal(entry)
    if (version === session.current) setMeals((current) => [entry, ...current.filter((item) => item.id !== entry.id)])
  }

  const addMeal = async (draft: MealDraft) => {
    if (!profile) throw new Error('Hãy mở nhật ký trước khi ghi món.')
    await updateMeal({ ...draft, id: crypto.randomUUID(), profileId: profile.id })
  }

  const removeMeal = async (entry: MealEntry) => {
    if (!profile || entry.profileId !== profile.id) throw new Error('Món ăn không thuộc nhật ký đang mở.')
    const version = session.current
    await deleteMeal(entry)
    if (version === session.current) setMeals((current) => current.filter((item) => item.id !== entry.id))
  }

  const updateProfile = async (next: Profile) => {
    if (!profile || next.id !== profile.id) throw new Error('Hồ sơ đã thay đổi. Hãy mở lại màn hình.')
    const version = session.current
    await saveProfile(next)
    if (version === session.current) setProfile(next)
  }

  const lock = async () => { await setAppLocked(true); setLocked(true) }
  const unlock = async () => { await setAppLocked(false); await open() }
  const signOut = async () => {
    await logout()
    await clearIdentity()
    session.current += 1
    setIdentity(null)
    setProfile(null)
    setMeals([])
    setSync(emptySync)
    setLocked(false)
  }
  const retry = async () => {
    await flushPendingSync()
    if (identity?.cloud) await refreshCloudProfile(identity.profileId)
  }

  return { identity, profile, meals, ready, locked, error, sync, open, unlock, lock, signOut, retry, addMeal, updateMeal, removeMeal, updateProfile }
}
