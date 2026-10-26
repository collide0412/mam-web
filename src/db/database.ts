import { openDB, type DBSchema } from 'idb'
import type { MealEntry, Profile } from '../types'
import type { MealRecord } from '../domain/validation'

export type SyncQueueItem = {
  readonly id: string
  readonly attempts: number
  readonly updatedAt: string
  readonly revision?: string
  readonly error?: string
} & ({ readonly kind: 'profile'; readonly payload: Profile } | { readonly kind: 'meal'; readonly payload: MealRecord })

interface MamDB extends DBSchema {
  profiles: { key: string; value: Profile }
  meals: { key: string; value: MealEntry; indexes: { 'by-profile': string; 'by-date': string } }
  mealRecords: { key: [string, string]; value: MealRecord; indexes: { 'by-profile': string } }
  syncQueue: { key: string; value: SyncQueueItem }
}

export function queueOwner(item: SyncQueueItem): string {
  return item.kind === 'profile' ? item.payload.id : item.payload.profileId
}

export function mealQueueId(meal: MealEntry): string {
  return `meal:${JSON.stringify([meal.profileId, meal.id])}`
}

export const dbPromise = openDB<MamDB>('mam-web-db', 3, {
  async upgrade(db, oldVersion, _newVersion, tx) {
    if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('meals')) {
      const meals = db.createObjectStore('meals', { keyPath: 'id' })
      meals.createIndex('by-profile', 'profileId')
      meals.createIndex('by-date', 'timestamp')
    }
    if (!db.objectStoreNames.contains('syncQueue')) db.createObjectStore('syncQueue', { keyPath: 'id' })
    if (oldVersion < 3) {
      db.createObjectStore('mealRecords', { keyPath: ['profileId', 'id'] }).createIndex('by-profile', 'profileId')
      for (const meal of await tx.objectStore('meals').getAll()) await tx.objectStore('mealRecords').put(meal)
      for (const item of await tx.objectStore('syncQueue').getAll()) {
        if (item.kind === 'meal') {
          await tx.objectStore('syncQueue').delete(item.id)
          await tx.objectStore('syncQueue').put({ ...item, id: mealQueueId(item.payload) })
        }
      }
    }
  },
  blocking() { void dbPromise.then((db) => db.close()) },
})

const listeners = new Set<() => void>()
const channel = typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function'
  ? new window.BroadcastChannel('mam-data-changes') : null
channel?.addEventListener('message', () => { for (const listener of listeners) listener() })
export function notifyDataChanges(): void {
  for (const listener of listeners) listener()
  channel?.postMessage(null)
}
if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
  if (event.key === 'mam-data-revision') for (const listener of listeners) listener()
})
export function subscribeDataChanges(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
