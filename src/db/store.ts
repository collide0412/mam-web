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
const IDENTITY_KEY = 'mam-identity-v1'

export const defaultProfiles: Profile[] = []

export type IdentityRecord = {
  profileId: string
  pinHash: string
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
  },
})

export async function seedProfilesIfNeeded() {
  return dbPromise
}

export async function getProfiles(): Promise<Profile[]> {
  const db = await dbPromise
  const profiles = await db.getAll('profiles')
  if (await getIdentity()) return profiles
  return profiles.filter((profile) => profile.id !== 'linh' && profile.id !== 'an')
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

export async function setupIdentity(name: string, pin: string): Promise<IdentityRecord> {
  const profile: Profile = {
    id: crypto.randomUUID(),
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
  return identity
}

export async function verifyIdentity(pin: string): Promise<boolean> {
  const identity = await getIdentity()
  return Boolean(identity && identity.pinHash === await hashPin(pin))
}

export async function clearIdentity(): Promise<void> {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(IDENTITY_KEY)
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
