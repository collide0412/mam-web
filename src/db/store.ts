import { openDB, type DBSchema } from 'idb'
import type { MealEntry, Profile } from '../types'

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
}

const DB_NAME = 'mam-web-db'
const DB_VERSION = 1
const SELECTED_PROFILE_KEY = 'mam-selected-profile-id'

export const defaultProfiles: Profile[] = [
  {
    id: 'linh',
    name: 'Linh',
    region: 'Hồ Chí Minh',
    language: 'vi',
    currency: 'VND',
    calorieGoal: 1650,
    proteinGoal: 90,
    carbsGoal: 210,
    fatGoal: 58,
    allergens: ['hành'],
    dietary: ['không cay'],
  },
  {
    id: 'an',
    name: 'An',
    region: 'Đà Nẵng',
    language: 'vi',
    currency: 'VND',
    calorieGoal: 1800,
    proteinGoal: 95,
    carbsGoal: 220,
    fatGoal: 62,
    allergens: [],
    dietary: ['ít đường'],
  },
]

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
  },
})

export async function seedProfilesIfNeeded() {
  const db = await dbPromise
  const existing = await db.getAll('profiles')

  if (existing.length === 0) {
    for (const profile of defaultProfiles) {
      await db.put('profiles', profile)
    }
  }
}

export async function getProfiles(): Promise<Profile[]> {
  const db = await dbPromise
  return db.getAll('profiles')
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await dbPromise
  await db.put('profiles', profile)
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

export async function getMealsForProfile(profileId: string): Promise<MealEntry[]> {
  const db = await dbPromise
  const index = db.transaction('meals', 'readonly').objectStore('meals').index('by-profile')
  const result = await index.getAll(profileId)
  return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export async function saveMeal(entry: MealEntry): Promise<void> {
  const db = await dbPromise
  await db.put('meals', entry)
}

export async function getProfile(profileId: string): Promise<Profile | undefined> {
  const db = await dbPromise
  return db.get('profiles', profileId)
}
