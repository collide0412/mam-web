import { firebaseEnabled } from '../firebase'
import { boundedCloud, cloudUserId, getCloudMeals, getCloudProfile, saveCloudMeal, saveCloudProfile } from '../firebaseStore'
import { dbPromise, mealQueueId, notifyDataChanges, queueOwner } from './database'
import { getIdentity } from './identity'

let running: Promise<void> | undefined
let requested = false
const refreshErrors = new Map<string, string>()
const refreshing = new Map<string, Promise<void>>()

export async function getSyncStatus(profileId: string): Promise<{ pending: number; error: string | null; syncing: boolean }> {
  const pending = (await (await dbPromise).getAll('syncQueue')).filter((item) => queueOwner(item) === profileId)
  return { pending: pending.length, error: pending.find((item) => item.error)?.error ?? refreshErrors.get(profileId) ?? null, syncing: running !== undefined || refreshing.has(profileId) }
}

async function flush(): Promise<void> {
  const identity = await getIdentity()
  if (!identity?.cloud) return
  if (await boundedCloud(cloudUserId()) !== identity.profileId) {
    refreshErrors.set(identity.profileId, 'Hãy đăng nhập lại đúng tài khoản để đồng bộ. Nhật ký vẫn lưu trên thiết bị.')
    return
  }
  const db = await dbPromise
  for (const item of await db.getAll('syncQueue')) {
    if (queueOwner(item) !== identity.profileId) continue
    if ((await getIdentity())?.profileId !== identity.profileId || await boundedCloud(cloudUserId()) !== identity.profileId) break
    try {
      await boundedCloud(item.kind === 'profile'
        ? saveCloudProfile(identity.profileId, item.payload)
        : saveCloudMeal(identity.profileId, item.payload))
      const tx = db.transaction('syncQueue', 'readwrite')
      const current = await tx.store.get(item.id)
      if (current && (current.revision ?? current.updatedAt) === (item.revision ?? item.updatedAt)) await tx.store.delete(item.id)
      await tx.done
    } catch (error) {
      if (!(error instanceof Error)) throw error
      const tx = db.transaction('syncQueue', 'readwrite')
      const current = await tx.store.get(item.id)
      if (current && (current.revision ?? current.updatedAt) === (item.revision ?? item.updatedAt)) {
        await tx.store.put({ ...current, attempts: current.attempts + 1, error: error.message })
      }
      await tx.done
    }
    notifyDataChanges()
  }
}

export function flushPendingSync(): Promise<void> {
  if (!firebaseEnabled) return Promise.resolve()
  if (running) return running
  const drain = async () => {
    do {
      requested = false
      await flush()
    } while (requested)
  }
  const operation = typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('mam-cloud-sync', drain) : drain()
  running = operation.catch((error: unknown) => {
    if (!(error instanceof Error)) throw error
    return getIdentity().then((identity) => { if (identity) refreshErrors.set(identity.profileId, error.message) })
  }).finally(() => { running = undefined; notifyDataChanges() })
  notifyDataChanges()
  return running
}

export function scheduleSync(): void {
  requested = true
  void flushPendingSync()
}

async function refresh(profileId: string): Promise<void> {
  const identity = await getIdentity()
  if (!firebaseEnabled || !identity?.cloud || identity.profileId !== profileId) return
  if (await boundedCloud(cloudUserId()) !== profileId) {
    refreshErrors.set(profileId, 'Hãy đăng nhập lại đúng tài khoản để đồng bộ. Nhật ký vẫn lưu trên thiết bị.')
    return
  }
  const db = await dbPromise
  const beforeProfile = JSON.stringify(await db.get('profiles', profileId))
  const beforeMeals = new Map((await db.getAllFromIndex('mealRecords', 'by-profile', profileId)).map((meal) => [meal.id, JSON.stringify(meal)]))
  const pending = new Set((await db.getAll('syncQueue')).map((item) => item.id))
  try {
    const [profile, meals] = await Promise.all([getCloudProfile(profileId), getCloudMeals(profileId)])
    if ((await getIdentity())?.profileId !== profileId || await boundedCloud(cloudUserId()) !== profileId) return
    const tx = db.transaction(['profiles', 'mealRecords', 'syncQueue'], 'readwrite')
    const profileQueueId = `profile:${profileId}`
    if (profile && !pending.has(profileQueueId) && !await tx.objectStore('syncQueue').get(profileQueueId)
      && JSON.stringify(await tx.objectStore('profiles').get(profileId)) === beforeProfile) await tx.objectStore('profiles').put(profile)
    for (const meal of meals) {
      const key: [string, string] = [profileId, meal.id]
      if (!pending.has(mealQueueId(meal)) && !await tx.objectStore('syncQueue').get(mealQueueId(meal))
        && JSON.stringify(await tx.objectStore('mealRecords').get(key)) === beforeMeals.get(meal.id)) {
        await tx.objectStore('mealRecords').put(meal)
      }
    }
    await tx.done
    refreshErrors.delete(profileId)
  } catch (error) {
    if (!(error instanceof Error)) throw error
    refreshErrors.set(profileId, error.message)
  }
}

export function refreshCloudProfile(profileId: string): Promise<void> {
  const existing = refreshing.get(profileId)
  if (existing) return existing
  const operation = refresh(profileId).catch((error: unknown) => {
    if (!(error instanceof Error)) throw error
    refreshErrors.set(profileId, error.message)
  }).finally(() => { refreshing.delete(profileId); notifyDataChanges() })
  refreshing.set(profileId, operation)
  notifyDataChanges()
  return operation
}

export async function retrySync(): Promise<void> {
  await flushPendingSync()
  const identity = await getIdentity()
  if (identity?.cloud) await refreshCloudProfile(identity.profileId)
}
