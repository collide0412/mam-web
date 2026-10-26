import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import * as authSdk from 'firebase/auth'
import * as firestoreSdk from 'firebase/firestore'

export function createFirebaseServices(config: FirebaseOptions) {
  const app = getApps()[0] ?? initializeApp(config)
  const auth = authSdk.getAuth(app)
  const db = firestoreSdk.getFirestore(app)
  if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_USE_EMULATORS === 'true'
    && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    authSdk.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    firestoreSdk.connectFirestoreEmulator(db, '127.0.0.1', 8080)
  }
  return { auth, db, authSdk, firestoreSdk }
}
