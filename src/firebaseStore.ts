import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type DocumentData,
} from 'firebase/firestore'
import type { MealEntry, Profile } from './types'
import { firebaseDb, firebaseEnabled } from './firebase'

function requireDb() {
  if (!firebaseEnabled || !firebaseDb) throw new Error('Firestore chưa được cấu hình.')
  return firebaseDb
}

function userPath(userId: string) {
  return collection(requireDb(), 'users', userId, 'meals')
}

export async function saveCloudProfile(userId: string, profile: Profile): Promise<void> {
  await setDoc(doc(requireDb(), 'users', userId), { profile }, { merge: true })
}

export async function getCloudProfile(userId: string): Promise<Profile | null> {
  const snapshot = await getDoc(doc(requireDb(), 'users', userId))
  return (snapshot.data() as { profile?: Profile } | undefined)?.profile ?? null
}

export async function saveCloudMeal(userId: string, meal: MealEntry): Promise<void> {
  await setDoc(doc(userPath(userId), meal.id), meal)
}

export async function getCloudMeals(userId: string): Promise<MealEntry[]> {
  const snapshot = await getDocs(userPath(userId))
  return snapshot.docs.map((item) => item.data() as DocumentData as MealEntry).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}