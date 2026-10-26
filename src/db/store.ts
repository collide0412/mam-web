import type { MealEntry, Profile } from '../types'
import { firebaseEnabled } from '../firebase'
import { boundedCloud, cloudUserId } from '../firebaseStore'
import { validateMeal, validateProfile, type MealRecord } from '../domain/validation'
import { dbPromise, mealQueueId, notifyDataChanges, type SyncQueueItem } from './database'
import { getIdentity, hashPin, persistIdentity, saveSelectedProfileId, setAppLocked, type IdentityRecord } from './identity'
import { scheduleSync } from './sync'

export { dbPromise, subscribeDataChanges } from './database'
export { getIdentity, getAppLocked, setAppLocked, getSelectedProfileId, saveSelectedProfileId, verifyIdentity, clearIdentity, type IdentityRecord } from './identity'
export { flushPendingSync, getSyncStatus, refreshCloudProfile, retrySync } from './sync'

export const defaultProfiles: Profile[] = []
export async function seedProfilesIfNeeded() { return dbPromise }

export async function getProfiles(): Promise<Profile[]> {
  const db = await dbPromise
  const identity = await getIdentity()
  if (identity) {
    const profile = await db.get('profiles', identity.profileId)
    return profile ? [profile] : []
  }
  return (await db.getAll('profiles')).filter((profile) => profile.id !== 'linh' && profile.id !== 'an')
}

export async function getProfile(profileId: string): Promise<Profile | undefined> {
  return (await dbPromise).get('profiles', profileId)
}

export async function getMealsForProfile(profileId: string): Promise<MealEntry[]> {
  return (await (await dbPromise).getAllFromIndex('mealRecords', 'by-profile', profileId))
    .filter((meal) => !meal.deleted).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export async function saveProfile(profile: Profile): Promise<void> {
  validateProfile(profile)
  const identity = await getIdentity()
  const db = await dbPromise
  const tx = db.transaction(['profiles', 'syncQueue'], 'readwrite')
  await tx.objectStore('profiles').put(profile)
  if (firebaseEnabled && identity?.cloud && identity.profileId === profile.id) {
    await tx.objectStore('syncQueue').put({ id: `profile:${profile.id}`, kind: 'profile', payload: profile,
      attempts: 0, updatedAt: new Date().toISOString(), revision: crypto.randomUUID() })
  }
  await tx.done
  notifyDataChanges()
  scheduleSync()
}

async function writeMeal(entry: MealRecord): Promise<void> {
  validateMeal(entry)
  const identity = await getIdentity()
  const db = await dbPromise
  const tx = db.transaction(['mealRecords', 'syncQueue'], 'readwrite')
  await tx.objectStore('mealRecords').put(entry)
  if (firebaseEnabled && identity?.cloud && identity.profileId === entry.profileId) {
    const item: SyncQueueItem = { id: mealQueueId(entry), kind: 'meal', payload: entry,
      attempts: 0, updatedAt: new Date().toISOString(), revision: crypto.randomUUID() }
    await tx.objectStore('syncQueue').put(item)
  }
  await tx.done
  notifyDataChanges()
  scheduleSync()
}

export async function saveMeal(entry: MealEntry): Promise<void> {
  const { deleted: _deleted, ...restored } = validateMeal(entry)
  await writeMeal(restored)
}

export async function deleteMeal(entry: MealEntry): Promise<void> {
  await writeMeal({ ...entry, deleted: true })
}

export async function confirmCloudIdentity(profileId: string): Promise<IdentityRecord | null> {
  const identity = await getIdentity()
  if (!identity || identity.profileId !== profileId || identity.cloud !== undefined) return identity
  if (await boundedCloud(cloudUserId()) !== profileId) return identity
  const current = await getIdentity()
  if (!current || current.profileId !== profileId || current.cloud !== undefined) return current
  const confirmed: IdentityRecord = { ...current, cloud: true }
  persistIdentity(confirmed)
  notifyDataChanges()
  scheduleSync()
  return confirmed
}

export type IdentitySetup = {
  readonly name: string
  readonly pin: string
  readonly profileId?: string
  readonly existingProfile?: Profile
  readonly cloud?: boolean
}

export async function setupIdentity({ name, pin, profileId = crypto.randomUUID(), existingProfile, cloud = false }: IdentitySetup): Promise<IdentityRecord> {
  const db = await dbPromise
  const queued = await db.get('syncQueue', `profile:${profileId}`)
  const profile = validateProfile((queued?.kind === 'profile' ? queued.payload : undefined) ?? existingProfile ?? await db.get('profiles', profileId) ?? {
    id: profileId, name: name.trim(), region: 'Việt Nam', language: 'vi', currency: 'VND',
    calorieGoal: 1650, proteinGoal: 90, carbsGoal: 210, fatGoal: 58, allergens: [], dietary: [],
  })
  const identity: IdentityRecord = { profileId: profile.id, pinHash: await hashPin(pin), cloud: cloud && await boundedCloud(cloudUserId()) === profile.id }
  const previous = ['mam-identity-v1', 'mam-selected-profile-id', 'mam-app-locked'].map((key) => ({ key, value: localStorage.getItem(key) }))
  try {
    persistIdentity(identity)
    await saveProfile(profile)
    await saveSelectedProfileId(profile.id)
    await setAppLocked(false)
  } catch (error) {
    if (localStorage.getItem('mam-identity-v1') === JSON.stringify(identity)) {
      for (const { key, value } of previous) {
        if (value === null) localStorage.removeItem(key)
        else localStorage.setItem(key, value)
      }
    }
    throw error
  }
  return identity
}
