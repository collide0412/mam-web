import assert from 'node:assert/strict'
import { initializeApp, deleteApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInWithCredential, GoogleAuthProvider } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, doc, collection, setDoc, getDoc, getDocs, updateDoc, setLogLevel } from 'firebase/firestore'

const projectId = 'demo-mam-web'
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST
assert.equal(authHost, '127.0.0.1:9099', 'Run with the configured Auth emulator')
assert.equal(firestoreHost, '127.0.0.1:8080', 'Run with the configured Firestore emulator')

const apps = []
setLogLevel('silent')
function client(name) {
  const app = initializeApp({ projectId, apiKey: 'demo-key', appId: `demo-${name}` }, `${name}-${Date.now()}`)
  apps.push(app)
  const auth = getAuth(app)
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true })
  const db = getFirestore(app)
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  return { auth, db }
}


const denied = (error) => error?.code === 'permission-denied'
try {
  const alice = client('alice')
  const email = `mam-${Date.now()}@example.test`
  const password = 'Emulator-only-password-123!'
  const registered = await createUserWithEmailAndPassword(alice.auth, email, password)
  const uid = registered.user.uid
  await signOut(alice.auth)
  assert.equal((await signInWithEmailAndPassword(alice.auth, email, password)).user.uid, uid)
  console.log('PASS email/password registration, sign-out, and sign-in')

  const profile = {
    id: uid, name: 'Emulator test', region: 'Việt Nam', language: 'vi', currency: 'VND',
    calorieGoal: 1650, proteinGoal: 90, carbsGoal: 210, fatGoal: 58, allergens: [], dietary: [],
  }
  const meal = {
    id: 'test-meal', profileId: uid, foodId: 'rice', foodName: 'Rice', quantity: 1,
    serving: '1 bowl', mealType: 'Lunch', calories: 200, protein: 4, carbs: 45, fat: 1,
    timestamp: new Date().toISOString(),
  }
  const profileRef = doc(alice.db, 'users', uid)
  const mealRef = doc(alice.db, 'users', uid, 'meals', meal.id)
  await setDoc(profileRef, { profile })
  await setDoc(mealRef, meal)
  assert.deepEqual((await getDoc(profileRef)).data(), { profile })
  assert.equal((await getDocs(collection(alice.db, 'users', uid, 'meals'))).size, 1)
  await assert.rejects(updateDoc(profileRef, { 'profile.calorieGoal': -1 }), denied)
  await assert.rejects(updateDoc(mealRef, { profileId: 'another-user' }), denied)
  await assert.rejects(updateDoc(profileRef, { 'profile.allergens': [42] }), denied)
  await assert.rejects(updateDoc(profileRef, { 'profile.dietary': ['x'.repeat(81)] }), denied)
  const longestList = Array.from({ length: 30 }, () => 'x'.repeat(80))
  await updateDoc(profileRef, { 'profile.allergens': longestList, 'profile.dietary': longestList })
  await assert.rejects(updateDoc(profileRef, { 'profile.allergens': [...longestList, 'extra'] }), denied)
  for (const field of ['allergens', 'dietary']) {
    for (const invalid of [42, false, null, {}, '', 'x'.repeat(81)]) {
      await assert.rejects(updateDoc(profileRef, {
        [`profile.${field}`]: [...longestList.slice(0, 29), invalid],
      }), denied)
    }
    await assert.rejects(updateDoc(profileRef, { [`profile.${field}`]: 'not a list' }), denied)
    await updateDoc(profileRef, { [`profile.${field}`]: ['\n'.repeat(80)] })
  }
  await updateDoc(profileRef, { 'profile.allergens': [], 'profile.dietary': [] })
  await assert.rejects(updateDoc(mealRef, { deleted: 'true' }), denied)
  await assert.rejects(updateDoc(mealRef, { extraField: true }), denied)
  await assert.rejects(updateDoc(mealRef, { quantity: -1 }), denied)
  await setDoc(mealRef, { ...meal, deleted: true })
  assert.equal((await getDoc(mealRef)).data().deleted, true)
  await setDoc(mealRef, meal)
  assert.equal((await getDoc(mealRef)).data().deleted, undefined)
  console.log('PASS durable deletion/undo and list element/schema validation')
  console.log('PASS owner profile/meal writes, reads, queries, invalid update rejection')

  const bob = client('bob')
  await createUserWithEmailAndPassword(bob.auth, `other-${email}`, password)
  await setDoc(doc(bob.db, 'users', bob.auth.currentUser.uid), {
    profile: { ...profile, id: bob.auth.currentUser.uid, allergens: longestList, dietary: longestList },
  })
  await assert.rejects(getDoc(doc(bob.db, 'users', uid)), denied)
  await assert.rejects(setDoc(doc(bob.db, 'users', uid), { profile }), denied)
  await assert.rejects(getDocs(collection(bob.db, 'users', uid, 'meals')), denied)
  await signOut(bob.auth)
  await assert.rejects(getDoc(doc(bob.db, 'users', uid)), denied)
  await assert.rejects(setDoc(doc(bob.db, 'users', uid, 'meals', meal.id), meal), denied)
  console.log('PASS cross-account and unauthenticated Firestore access denied')

  const payload = { sub: `google-${Date.now()}`, email: `google-${email}`, email_verified: true, iss: 'https://accounts.google.com', aud: projectId, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }
  const fakeToken = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.`
  const google = await signInWithCredential(bob.auth, GoogleAuthProvider.credential(fakeToken))
  assert.equal(google.user.providerData[0]?.providerId, 'google.com')
  await signOut(bob.auth)
  console.log('PASS emulated Google credential authentication (no real OAuth popup)')

} finally {
  await Promise.all(apps.map((app) => deleteApp(app)))
}
