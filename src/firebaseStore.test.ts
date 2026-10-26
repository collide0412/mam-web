import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MealEntry, Profile } from './types'

const sdk = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'alice' } as { uid: string } | null, authStateReady: vi.fn<() => Promise<void>>() },
  getDoc: vi.fn(), getDocs: vi.fn(), setDoc: vi.fn(),
}))
vi.mock('./firebase', () => ({ firebaseEnabled: true, getFirebaseServices: async () => ({
  auth: sdk.auth, db: {}, firestoreSdk: {
    collection: (...parts: unknown[]) => parts, doc: (...parts: unknown[]) => parts,
    getDocFromServer: sdk.getDoc, getDocsFromServer: sdk.getDocs, setDoc: sdk.setDoc,
  },
}) }))
import { boundedCloud, CloudDataError, CloudOwnershipError, getCloudMeals, getCloudProfile, saveCloudMeal, saveCloudProfile } from './firebaseStore'

const profile: Profile = {
  id: 'alice', name: 'Alice', region: 'VN', language: 'vi', currency: 'VND',
  calorieGoal: 1650, proteinGoal: 90, carbsGoal: 210, fatGoal: 58, allergens: [], dietary: [],
}
const meal: MealEntry = {
  id: 'meal', profileId: 'alice', foodId: 'rice', foodName: 'Rice', quantity: 1,
  serving: 'bowl', mealType: 'Lunch', calories: 200, protein: 5, carbs: 40,
  fat: 1, timestamp: '2026-10-23T00:00:00.000Z',
}

beforeEach(() => {
  vi.useRealTimers()
  sdk.auth.currentUser = { uid: 'alice' }
  sdk.auth.authStateReady.mockReset().mockResolvedValue()
  sdk.setDoc.mockReset().mockResolvedValue(undefined)
  sdk.getDoc.mockReset().mockResolvedValue({ data: () => ({ profile }) })
  sdk.getDocs.mockReset().mockResolvedValue({ docs: [{ id: meal.id, data: () => meal }] })
})

describe('cloud account boundary', () => {
  it('rejects foreign read paths and mismatched write payloads', async () => {
    await expect(getCloudProfile('bob')).rejects.toBeInstanceOf(CloudOwnershipError)
    await expect(getCloudMeals('bob')).rejects.toBeInstanceOf(CloudOwnershipError)
    await expect(saveCloudProfile('alice', { ...profile, id: 'bob' })).rejects.toBeInstanceOf(CloudOwnershipError)
    await expect(saveCloudMeal('alice', { ...meal, profileId: 'bob' })).rejects.toBeInstanceOf(CloudOwnershipError)
    expect(sdk.getDoc).not.toHaveBeenCalled()
    expect(sdk.getDocs).not.toHaveBeenCalled()
    expect(sdk.setDoc).not.toHaveBeenCalled()
  })

  it('waits for restoration and blocks writes if the restored account differs', async () => {
    sdk.auth.currentUser = null
    sdk.auth.authStateReady.mockImplementation(async () => { sdk.auth.currentUser = { uid: 'bob' } })
    await expect(saveCloudMeal('alice', meal)).rejects.toBeInstanceOf(CloudOwnershipError)
    expect(sdk.setDoc).not.toHaveBeenCalled()
  })

  it('discards reads after an account switch and rejects foreign profile data', async () => {
    sdk.getDoc.mockImplementation(async () => {
      sdk.auth.currentUser = { uid: 'bob' }
      return { data: () => ({ profile }) }
    })
    await expect(getCloudProfile('alice')).rejects.toBeInstanceOf(CloudOwnershipError)
    sdk.auth.currentUser = { uid: 'alice' }
    sdk.getDoc.mockResolvedValue({ data: () => ({ profile: { ...profile, id: 'bob' } }) })
    await expect(getCloudProfile('alice')).rejects.toBeInstanceOf(CloudOwnershipError)
  })

  it('filters meals with foreign owners and writes to the matching account path', async () => {
    sdk.getDocs.mockResolvedValue({ docs: [{ id: meal.id, data: () => meal }, { id: meal.id, data: () => ({ ...meal, profileId: 'bob' }) }] })
    expect(await getCloudMeals('alice')).toEqual([meal])
    await saveCloudProfile('alice', profile)
    await saveCloudMeal('alice', meal)
    expect(sdk.setDoc).toHaveBeenCalledWith([{}, 'users', 'alice'], { profile }, { merge: true })
    expect(sdk.setDoc).toHaveBeenCalledWith([{}, 'users', 'alice', 'meals', 'meal'], meal)
  })

  it('rejects malformed cloud records and mismatched meal document IDs', async () => {
    sdk.getDoc.mockResolvedValue({ data: () => ({ profile: { id: 'alice' } }) })
    await expect(getCloudProfile('alice')).rejects.toBeInstanceOf(CloudDataError)
    sdk.getDocs.mockResolvedValue({ docs: [{ id: meal.id, data: () => ({ ...meal, calories: '200' }) }] })
    await expect(getCloudMeals('alice')).rejects.toBeInstanceOf(CloudDataError)
    sdk.getDocs.mockResolvedValue({ docs: [{ id: 'other-id', data: () => meal }] })
    await expect(getCloudMeals('alice')).rejects.toBeInstanceOf(CloudDataError)
  })

  it('bounds an unresolved cloud operation to five seconds', async () => {
    vi.useFakeTimers()
    const request = boundedCloud(new Promise<void>(() => undefined))
    const rejected = expect(request).rejects.toThrow('Cloud request timed out')
    await vi.advanceTimersByTimeAsync(5000)
    await rejected
    expect(vi.getTimerCount()).toBe(0)
    vi.useRealTimers()
  })
})
