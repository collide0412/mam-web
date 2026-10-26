import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profile } from '../types'
import type { MealRecord } from '../domain/validation'
import { testMeal as meal, testProfile as profile } from './fixtures'

const cloud = vi.hoisted(() => ({
  user: 'alice' as string | null, ready: Promise.resolve(),
  getProfile: vi.fn<() => Promise<Profile | null>>(), getMeals: vi.fn<() => Promise<MealRecord[]>>(),
  saveProfile: vi.fn<() => Promise<void>>(), saveMeal: vi.fn<() => Promise<void>>(),
}))
vi.mock('../firebase', () => ({ firebaseEnabled: true }))
vi.mock('../firebaseStore', () => ({
  cloudUserId: async () => { await cloud.ready; return cloud.user },
  boundedCloud: <T>(operation: Promise<T>) => operation,
  getCloudProfile: cloud.getProfile, getCloudMeals: cloud.getMeals,
  saveCloudProfile: cloud.saveProfile, saveCloudMeal: cloud.saveMeal,
}))
import { confirmCloudIdentity, dbPromise, deleteMeal, flushPendingSync, getIdentity, getMealsForProfile, getProfiles, getSyncStatus, refreshCloudProfile, saveMeal, saveProfile, setupIdentity } from './store'
import { mealQueueId } from './database'

beforeEach(async () => {
  await flushPendingSync()
  const db = await dbPromise
  await Promise.all([db.clear('profiles'), db.clear('mealRecords'), db.clear('syncQueue')])
  localStorage.clear()
  localStorage.setItem('mam-identity-v1', JSON.stringify({ profileId: 'alice', pinHash: '', cloud: true }))
  cloud.user = 'alice'
  cloud.ready = Promise.resolve()
  cloud.getProfile.mockReset().mockResolvedValue(null)
  cloud.getMeals.mockReset().mockResolvedValue([])
  cloud.saveProfile.mockReset().mockResolvedValue()
  cloud.saveMeal.mockReset().mockResolvedValue()
})

describe('local-first journal repository', () => {
  it('returns cached records without waiting for unresolved authentication or network', async () => {
    const db = await dbPromise
    await db.put('profiles', profile)
    await db.put('mealRecords', meal)
    cloud.ready = new Promise(() => undefined)
    expect(await getProfiles()).toEqual([profile])
    expect(await getMealsForProfile('alice')).toEqual([meal])
    expect(cloud.getMeals).not.toHaveBeenCalled()
    cloud.ready = Promise.resolve()
  })

  it('persists deletion through reload and stale refresh, and restores by saving', async () => {
    cloud.saveMeal.mockRejectedValue(new Error('offline'))
    await saveMeal(meal)
    await flushPendingSync()
    await deleteMeal(meal)
    await flushPendingSync()
    expect(await getMealsForProfile('alice')).toEqual([])
    expect(await (await dbPromise).get('mealRecords', ['alice', meal.id])).toEqual({ ...meal, deleted: true })
    cloud.getMeals.mockResolvedValue([meal])
    await refreshCloudProfile('alice')
    expect(await getMealsForProfile('alice')).toEqual([])
    await saveMeal(meal)
    await flushPendingSync()
    expect(await getMealsForProfile('alice')).toEqual([meal])
    expect((await (await dbPromise).get('syncQueue', mealQueueId(meal)))?.payload).toEqual(meal)
  })

  it('does not acknowledge a newer undo when an older deletion finishes', async () => {
    let acknowledge: (() => void) | undefined
    cloud.saveMeal.mockImplementationOnce(() => new Promise<void>((resolve) => { acknowledge = resolve }))
      .mockRejectedValueOnce(new Error('offline'))
    await deleteMeal(meal)
    await vi.waitFor(() => expect(cloud.saveMeal).toHaveBeenCalledOnce())
    const inFlight = flushPendingSync()
    await saveMeal(meal)
    acknowledge?.()
    await inFlight
    expect((await (await dbPromise).get('syncQueue', mealQueueId(meal)))?.payload).toEqual(meal)
    await flushPendingSync()
    expect(cloud.saveMeal).toHaveBeenLastCalledWith('alice', meal)
    expect((await getSyncStatus('alice')).pending).toBe(0)
  })

  it('isolates same meal IDs by owner and never delivers a different owner queue', async () => {
    cloud.saveMeal.mockRejectedValue(new Error('offline'))
    await saveMeal(meal)
    await flushPendingSync()
    await saveMeal({ ...meal, profileId: 'bob', quantity: 2 })
    await flushPendingSync()
    expect(await getMealsForProfile('alice')).toEqual([meal])
    expect((await getMealsForProfile('bob'))[0]?.quantity).toBe(2)
    cloud.user = 'bob'
    cloud.saveMeal.mockClear()
    await flushPendingSync()
    expect(cloud.saveMeal).not.toHaveBeenCalled()
    expect((await getSyncStatus('alice')).pending).toBe(1)
  })

  it('does not enqueue guest data even with Firebase enabled', async () => {
    cloud.user = null
    await setupIdentity({ name: 'Alice', pin: '', profileId: 'alice', existingProfile: profile })
    await saveMeal(meal)
    await flushPendingSync()
    expect((await getIdentity())?.pinHash).toBe('')
    expect((await getIdentity())?.cloud).toBe(false)
    expect(await (await dbPromise).getAll('syncQueue')).toEqual([])
  })

  it('continues after a permanent failed item and exposes that failure', async () => {
    const db = await dbPromise
    for (const payload of [meal, { ...meal, id: 'meal-2' }]) {
      await db.put('syncQueue', { id: mealQueueId(payload), kind: 'meal', payload, attempts: 0, updatedAt: 'now', revision: payload.id })
    }
    cloud.saveMeal.mockRejectedValueOnce(new Error('permission-denied')).mockResolvedValue()
    await flushPendingSync()
    expect(cloud.saveMeal).toHaveBeenCalledTimes(2)
    expect(await getSyncStatus('alice')).toMatchObject({ pending: 1, error: 'permission-denied', syncing: false })
  })

  it('hydrates explicitly, propagates remote tombstones, and protects pending profiles', async () => {
    cloud.getProfile.mockResolvedValue(profile)
    cloud.getMeals.mockResolvedValue([meal])
    await refreshCloudProfile('alice')
    expect(await getProfiles()).toEqual([profile])
    expect(await getMealsForProfile('alice')).toEqual([meal])
    cloud.getMeals.mockResolvedValue([{ ...meal, deleted: true }])
    await refreshCloudProfile('alice')
    expect(await getMealsForProfile('alice')).toEqual([])
    cloud.saveProfile.mockRejectedValue(new Error('offline'))
    await saveProfile({ ...profile, calorieGoal: 1800 })
    await flushPendingSync()
    await refreshCloudProfile('alice')
    expect((await getProfiles())[0]?.calorieGoal).toBe(1800)
  })

  it('protects an edit acknowledged while a refresh is in flight', async () => {
    let deliver: ((meals: MealRecord[]) => void) | undefined
    cloud.getMeals.mockImplementation(() => new Promise((resolve) => { deliver = resolve }))
    const reading = refreshCloudProfile('alice')
    await vi.waitFor(() => expect(cloud.getMeals).toHaveBeenCalledOnce())
    const edited = { ...meal, quantity: 4 }
    await saveMeal(edited)
    await flushPendingSync()
    deliver?.([meal])
    await reading
    expect(await getMealsForProfile('alice')).toEqual([edited])
  })

  it('rejects invalid data before mutating the local journal', async () => {
    await expect(saveMeal({ ...meal, quantity: Number.NaN })).rejects.toThrow()
    await expect(saveProfile({ ...profile, calorieGoal: -1 })).rejects.toThrow()
    expect(await getMealsForProfile('alice')).toEqual([])
    expect(await getProfiles()).toEqual([])
  })

  it('confirms a legacy cloud identity only against its restored Firebase UID', async () => {
    localStorage.setItem('mam-identity-v1', JSON.stringify({ profileId: 'alice', pinHash: 'legacy' }))
    cloud.user = 'bob'
    expect((await confirmCloudIdentity('alice'))?.cloud).toBeUndefined()
    cloud.user = 'alice'
    expect((await confirmCloudIdentity('alice'))?.cloud).toBe(true)
    expect((await getIdentity())?.pinHash).toBe('legacy')
    await flushPendingSync()
    localStorage.setItem('mam-identity-v1', JSON.stringify({ profileId: 'alice', pinHash: '', cloud: false }))
    expect((await confirmCloudIdentity('alice'))?.cloud).toBe(false)
  })

  it('restores the prior identity and lock selection when setup storage fails', async () => {
    const previous = { profileId: 'guest', pinHash: 'legacy', cloud: false }
    localStorage.setItem('mam-identity-v1', JSON.stringify(previous))
    localStorage.setItem('mam-selected-profile-id', 'guest')
    localStorage.setItem('mam-app-locked', 'true')
    const original = Storage.prototype.setItem
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'mam-selected-profile-id' && value === 'alice') throw new DOMException('Disk full', 'QuotaExceededError')
      original.call(this, key, value)
    })
    try { await expect(setupIdentity({ name: 'Alice', pin: '', profileId: 'alice', existingProfile: profile, cloud: true })).rejects.toThrow('Disk full') }
    finally { storage.mockRestore() }
    await flushPendingSync()
    expect(await getIdentity()).toEqual(previous)
    expect(localStorage.getItem('mam-selected-profile-id')).toBe('guest')
    expect(localStorage.getItem('mam-app-locked')).toBe('true')
  })
})
