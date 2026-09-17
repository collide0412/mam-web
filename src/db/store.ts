import { openDB, type DBSchema } from 'idb'
import type { MealEntry, Profile } from '../types'
import { firebaseAuth, firebaseEnabled } from '../firebase'
import { getCloudMeals, getCloudProfile, saveCloudMeal, saveCloudProfile } from '../firebaseStore'

interface MamDB extends DBSchema {
  profiles: {
    key: string
    value: Profile
  }
  meals: {
    key: string
    value: MealEntry
    indexes: { 'by-profile': string; 'by-date': string }
  }
  syncQueue: {
    key: string
    value: SyncQueueItem
  }
}

const DB_NAME = 'mam-web-db'
const DB_VERSION = 2
const SELECTED_PROFILE_KEY = 'mam-selected-profile-id'
const IDENTITY_KEY = 'mam-identity-v1'
const LOCKED_KEY = 'mam-app-locked'

export const defaultProfiles: Profile[] = []

export type IdentityRecord = {
  profileId: string
  pinHash: string
}

type SyncQueueItem = {
  id: string
  kind: 'profile' | 'meal'
  payload: Profile | MealEntry
  attempts: number
  updatedAt: string
}

export const dbPromise = openDB<MamDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('profiles')) {
      db.createObjectStore('profiles', { keyPath: 'id' })
    }

    if (!db.objectStoreNames.contains('meals')) {
      const meals = db.createObjectStore('meals', { keyPath: 'id' })
      meals.createIndex('by-profile', 'profileId')
      meals.createIndex('by-date', 'timestamp')
    }

    if (!db.objectStoreNames.contains('syncQueue')) {
      db.createObjectStore('syncQueue', { keyPath: 'id' })
    }
  },
})

export async function seedProfilesIfNeeded() {
  return dbPromise
}

export async function getProfiles(): Promise<Profile[]> {
  if (firebaseEnabled && firebaseAuth?.currentUser) {
    try {
      const cloudProfile = await getCloudProfile(firebaseAuth.currentUser.uid)
      if (cloudProfile) return [cloudProfile]
    } catch { }
  }
  const db = await dbPromise
  const profiles = await db.getAll('profiles')
  if (await getIdentity()) return profiles
  return profiles.filter((profile) => profile.id !== 'linh' && profile.id !== 'an')
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await dbPromise
  await db.put('profiles', profile)
  if (firebaseEnabled && firebaseAuth?.currentUser) {
    try {
      await saveCloudProfile(firebaseAuth.currentUser.uid, profile)
    } catch {
      await queueSync({ id: `profile:${profile.id}`, kind: 'profile', payload: profile })
    }
  }
}

export async function getSelectedProfileId(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(SELECTED_PROFILE_KEY)
}

export async function saveSelectedProfileId(profileId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SELECTED_PROFILE_KEY, profileId)
  }
}

export async function getAppLocked(): Promise<boolean> {
  return typeof window !== 'undefined' && window.localStorage.getItem(LOCKED_KEY) === 'true'
}

export async function setAppLocked(locked: boolean): Promise<void> {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCKED_KEY, String(locked))
  }
}

async function hashPin(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(pin)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function getIdentity(): Promise<IdentityRecord | null> {
  if (typeof window === 'undefined') return null

  const stored = window.localStorage.getItem(IDENTITY_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as IdentityRecord
  } catch {
    window.localStorage.removeItem(IDENTITY_KEY)
    return null
  }
}

export async function setupIdentity(name: string, pin: string, profileId: string = crypto.randomUUID(), existingProfile?: Profile): Promise<IdentityRecord> {
  const profile: Profile = existingProfile ?? {
    id: profileId,
    name: name.trim(),
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

  await saveProfile(profile)
  await saveSelectedProfileId(profile.id)
  const identity: IdentityRecord = { profileId: profile.id, pinHash: await hashPin(pin) }
  window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
  await setAppLocked(false)
  return identity
}

export async function verifyIdentity(pin: string): Promise<boolean> {
  const identity = await getIdentity()
  return Boolean(identity && identity.pinHash === await hashPin(pin))
}

export async function clearIdentity(): Promise<void> {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(IDENTITY_KEY)
    window.localStorage.removeItem(LOCKED_KEY)
  }
}

export async function getMealsForProfile(profileId: string): Promise<MealEntry[]> {
  const db = await dbPromise
  if (firebaseEnabled && firebaseAuth?.currentUser) {
    try {
      const cloudMeals = await getCloudMeals(firebaseAuth.currentUser.uid)
      const localMeals = await getLocalMeals(db, profileId)
      const mealsById = new Map([...localMeals, ...cloudMeals].map((meal) => [meal.id, meal]))
      return [...mealsById.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    } catch {
      return getLocalMeals(db, profileId)
    }
  }
  return getLocalMeals(db, profileId)
}

export async function saveMeal(entry: MealEntry): Promise<void> {
  const db = await dbPromise
  await db.put('meals', entry)
  if (firebaseEnabled && firebaseAuth?.currentUser) {
    try {
      await saveCloudMeal(firebaseAuth.currentUser.uid, entry)
    } catch {
      await queueSync({ id: `meal:${entry.id}`, kind: 'meal', payload: entry })
    }
  }
}

async function getLocalMeals(db: Awaited<typeof dbPromise>, profileId: string): Promise<MealEntry[]> {
  const index = db.transaction('meals', 'readonly').objectStore('meals').index('by-profile')
  const result = await index.getAll(profileId)
  return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

async function queueSync(item: Omit<SyncQueueItem, 'attempts' | 'updatedAt'>): Promise<void> {
  const db = await dbPromise
  const previous = await db.get('syncQueue', item.id)
  await db.put('syncQueue', {
    ...item,
    attempts: previous?.attempts ?? 0,
    updatedAt: new Date().toISOString(),
  })
}

let syncInProgress = false

export async function flushPendingSync(): Promise<void> {
  if (!firebaseEnabled || !firebaseAuth?.currentUser || syncInProgress) return

  syncInProgress = true
  try {
    const db = await dbPromise
    const pending = await db.getAll('syncQueue')
    for (const item of pending) {
      try {
        if (item.kind === 'profile') {
          await saveCloudProfile(firebaseAuth.currentUser.uid, item.payload as Profile)
        } else {
          await saveCloudMeal(firebaseAuth.currentUser.uid, item.payload as MealEntry)
        }
        await db.delete('syncQueue', item.id)
      } catch {
        await db.put('syncQueue', { ...item, attempts: item.attempts + 1, updatedAt: new Date().toISOString() })
        break
      }
    }
  } finally {
    syncInProgress = false
  }
}

export async function getProfile(profileId: string): Promise<Profile | undefined> {
  const db = await dbPromise
  return db.get('profiles', profileId)
}
