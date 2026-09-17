import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { firebaseAuth, firebaseEnabled } from './firebase'

export function watchFirebaseUser(onUser: (user: User | null) => void): () => void {
  if (!firebaseEnabled || !firebaseAuth) return () => undefined
  return onAuthStateChanged(firebaseAuth, onUser)
}

export async function signIn(email: string, password: string): Promise<User> {
  if (!firebaseEnabled || !firebaseAuth) throw new Error('Firebase chưa được cấu hình.')
  const result = await signInWithEmailAndPassword(firebaseAuth, email, password)
  return result.user
}

export async function register(email: string, password: string): Promise<User> {
  if (!firebaseEnabled || !firebaseAuth) throw new Error('Firebase chưa được cấu hình.')
  const result = await createUserWithEmailAndPassword(firebaseAuth, email, password)
  return result.user
}

export async function logout(): Promise<void> {
  if (firebaseAuth) await signOut(firebaseAuth)
}

export async function signInWithGoogle(): Promise<User> {
  if (!firebaseEnabled || !firebaseAuth) throw new Error('Firebase chưa được cấu hình.')
  const result = await signInWithPopup(firebaseAuth, new GoogleAuthProvider())
  return result.user
}