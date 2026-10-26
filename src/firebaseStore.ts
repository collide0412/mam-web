import type { Profile } from './types'
import { isRecord, isProfile, isMeal, validateMeal, validateProfile, type MealRecord } from './domain/validation'
import { getFirebaseServices, firebaseEnabled, type FirebaseServices } from './firebase'

export class CloudOwnershipError extends Error {}
export class CloudTimeoutError extends Error {}
export class CloudDataError extends Error {}

export async function cloudUserId(): Promise<string | null> {
  if (!firebaseEnabled) return null
  const { auth } = await getFirebaseServices()
  await auth.authStateReady()
  return auth.currentUser?.uid ?? null
}

export async function boundedCloud<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new CloudTimeoutError('Cloud request timed out')), 5000)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

function requireOwner(userId: string, services: FirebaseServices) {
  if (!firebaseEnabled || services.auth.currentUser?.uid !== userId) {
    throw new CloudOwnershipError('Cloud account does not own this record')
  }
  return services.db
}

export async function saveCloudProfile(userId: string, profile: Profile): Promise<void> {
  await cloudUserId()
  if (profile.id !== userId) throw new CloudOwnershipError('Profile owner mismatch')
  validateProfile(profile)
  const services = await getFirebaseServices()
  const { doc, setDoc } = services.firestoreSdk
  await setDoc(doc(requireOwner(userId, services), 'users', userId), { profile }, { merge: true })
}

export async function getCloudProfile(userId: string): Promise<Profile | null> {
  await cloudUserId()
  const services = await getFirebaseServices()
  const { doc, getDocFromServer } = services.firestoreSdk
  const snapshot = await boundedCloud(getDocFromServer(doc(requireOwner(userId, services), 'users', userId)))
  requireOwner(userId, services)
  const data: unknown = snapshot.data()
  if (data === undefined) return null
  if (!isRecord(data) || !isProfile(data.profile)) throw new CloudDataError('Invalid cloud profile')
  if (data.profile.id !== userId) throw new CloudOwnershipError('Profile owner mismatch')
  return data.profile
}

export async function saveCloudMeal(userId: string, meal: MealRecord): Promise<void> {
  await cloudUserId()
  if (meal.profileId !== userId) throw new CloudOwnershipError('Meal owner mismatch')
  validateMeal(meal)
  const services = await getFirebaseServices()
  const { doc, setDoc } = services.firestoreSdk
  await setDoc(doc(requireOwner(userId, services), 'users', userId, 'meals', meal.id), meal)
}

export async function getCloudMeals(userId: string): Promise<MealRecord[]> {
  await cloudUserId()
  const services = await getFirebaseServices()
  const { collection, getDocsFromServer } = services.firestoreSdk
  const snapshot = await boundedCloud(getDocsFromServer(collection(requireOwner(userId, services), 'users', userId, 'meals')))
  requireOwner(userId, services)
  return snapshot.docs.map((item) => {
    const meal: unknown = item.data()
    if (!isMeal(meal) || meal.id !== item.id) throw new CloudDataError('Invalid cloud meal')
    return meal
  }).filter((meal) => meal.profileId === userId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}
