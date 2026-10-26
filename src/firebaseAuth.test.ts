import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getFirebaseServices: vi.fn(), popup: vi.fn(), reset: vi.fn() }))
vi.mock('./firebase', () => ({ getFirebaseServices: mocks.getFirebaseServices, firebaseEnabled: true, getLoadedFirebaseServices: vi.fn() }))

beforeEach(() => { vi.resetModules(); vi.resetAllMocks() })

it('opens Google synchronously from the click after preparing auth', async () => {
  const user = { uid: 'google-user' }
  const authStateReady = vi.fn().mockResolvedValue(undefined)
  mocks.getFirebaseServices.mockResolvedValue({ auth: { authStateReady }, authSdk: { signInWithPopup: mocks.popup, GoogleAuthProvider: class {} } })
  mocks.popup.mockResolvedValue({ user })
  const auth = await import('./firebaseAuth')
  await auth.prepareGoogleSignIn()
  const result = auth.signInWithGoogle()
  expect(mocks.popup).toHaveBeenCalledOnce()
  expect(authStateReady).toHaveBeenCalledOnce()
  expect(await result).toBe(user)
})

it('does not reveal whether a password reset email has an account', async () => {
  mocks.getFirebaseServices.mockResolvedValue({ auth: {}, authSdk: { sendPasswordResetEmail: mocks.reset } })
  mocks.reset.mockRejectedValue(Object.assign(new Error('Missing user'), { code: 'auth/user-not-found' }))
  const auth = await import('./firebaseAuth')
  await expect(auth.resetPassword('mai@example.com')).resolves.toBeUndefined()
  expect(mocks.reset).toHaveBeenCalledWith({}, 'mai@example.com')
  mocks.reset.mockRejectedValue(Object.assign(new Error('Offline'), { code: 'auth/network-request-failed' }))
  await expect(auth.resetPassword('mai@example.com')).rejects.toThrow('Offline')
})
