const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const requiredConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
].every(Boolean)
export const firebaseEnabled = import.meta.env.VITE_FIREBASE_ENABLED === 'true' && requiredConfig

export type FirebaseServices = ReturnType<typeof import('./firebaseClient').createFirebaseServices>
let services: Promise<FirebaseServices> | undefined

export function getFirebaseServices(): Promise<FirebaseServices> {
  if (!firebaseEnabled) return Promise.reject(new Error('Firebase chưa được cấu hình.'))
  services ??= import('./firebaseClient').then((client) => client.createFirebaseServices(firebaseConfig)).catch((error: unknown) => {
    services = undefined
    throw error
  })
  return services
}

export function getLoadedFirebaseServices(): Promise<FirebaseServices> | undefined {
  return services
}
