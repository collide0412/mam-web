import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getFirebaseServices: vi.fn(), popup: vi.fn(), reset: vi.fn() }))
vi.mock('./firebase', () => ({ getFirebaseServices: mocks.getFirebaseServices, firebaseEnabled: true, getLoadedFirebaseServices: vi.fn() }))

beforeEach(() => { vi.resetModules(); vi.resetAllMocks() })
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

const handler = 'https://mam-app-877da.firebaseapp.com/__/auth/handler?providerId=google.com&authType=signInViaPopup&eventId=test'

function googleServices() {
  return { auth: { config: { authDomain: 'mam-app-877da.firebaseapp.com' }, authStateReady: vi.fn().mockResolvedValue(undefined) }, authSdk: { signInWithPopup: mocks.popup, GoogleAuthProvider: class {} } }
}

function reservedWindow() {
  // Partial browser-window fixture; the SDK only needs this handle in these tests.
  return { closed: false, location: { replace: vi.fn() }, close: vi.fn() }
}

it('reserves the window during the click when the SDK delays its actual window.open', async () => {
  const reserved = reservedWindow()
  let gesture = true
  const nativeOpen = vi.fn(() => gesture ? reserved : null)
  vi.stubGlobal('open', nativeOpen)
  mocks.getFirebaseServices.mockResolvedValue(googleServices())
  mocks.popup.mockImplementation(async () => {
    await Promise.resolve()
    const handle = window.open(handler, 'firebase-generated-name')
    if (!handle) throw Object.assign(new Error('Blocked after async SDK work'), { code: 'auth/popup-blocked' })
    expect(handle).toBe(reserved)
    return { user: { uid: 'google-user' } }
  })
  const auth = await import('./firebaseAuth')
  await auth.prepareGoogleSignIn()
  const result = auth.signInWithGoogle()
  gesture = false
  await expect(result).resolves.toEqual({ uid: 'google-user' })
  expect(nativeOpen).toHaveBeenCalledOnce()
  expect(reserved.location.replace).toHaveBeenCalledWith(handler)
  expect(window.open).toBe(nativeOpen)
  expect(reserved.close).toHaveBeenCalledOnce()
})

it('restores window.open and closes the reservation when the SDK rejects before handoff', async () => {
  const reserved = reservedWindow()
  const nativeOpen = vi.fn().mockReturnValue(reserved)
  vi.stubGlobal('open', nativeOpen)
  mocks.getFirebaseServices.mockResolvedValue(googleServices())
  mocks.popup.mockRejectedValue(new Error('Network failed'))
  const auth = await import('./firebaseAuth')
  await auth.prepareGoogleSignIn()
  await expect(auth.signInWithGoogle()).rejects.toThrow('Network failed')
  expect(window.open).toBe(nativeOpen)
  expect(reserved.close).toHaveBeenCalledOnce()
})

it('does not start the SDK if the direct click cannot reserve a window', async () => {
  vi.stubGlobal('open', vi.fn().mockReturnValue(null))
  mocks.getFirebaseServices.mockResolvedValue(googleServices())
  const auth = await import('./firebaseAuth')
  await auth.prepareGoogleSignIn()
  await expect(auth.signInWithGoogle()).rejects.toMatchObject({ code: 'auth/popup-blocked' })
  expect(mocks.popup).not.toHaveBeenCalled()
})

it('routes only the configured Firebase Google handler and delegates unrelated windows', async () => {
  const reserved = reservedWindow()
  const unrelated = reservedWindow()
  const nativeOpen = vi.fn().mockReturnValueOnce(reserved).mockReturnValue(unrelated)
  vi.stubGlobal('open', nativeOpen)
  mocks.getFirebaseServices.mockResolvedValue(googleServices())
  mocks.popup.mockImplementation(async () => {
    await Promise.resolve()
    const otherDestinations = [
      handler.replace('mam-app-877da.firebaseapp.com', 'attacker.example'),
      handler.replace('/__/auth/handler', '/unrelated'),
      handler.replace('google.com', 'github.com'),
      handler.replace('signInViaPopup', 'signInViaRedirect'),
    ]
    for (const destination of otherDestinations) expect(window.open(destination)).toBe(unrelated)
    expect(reserved.location.replace).not.toHaveBeenCalled()
    expect(window.open(handler)).toBe(reserved)
    expect(window.open).toBe(nativeOpen)
    return { user: { uid: 'google-user' } }
  })
  const auth = await import('./firebaseAuth')
  await auth.prepareGoogleSignIn()
  await auth.signInWithGoogle()
  expect(nativeOpen).toHaveBeenCalledTimes(5)
  expect(unrelated.close).not.toHaveBeenCalled()
})

it('rejects overlapping direct calls and permits retry after failure', async () => {
  const nativeOpen = vi.fn().mockReturnValue(reservedWindow())
  vi.stubGlobal('open', nativeOpen)
  mocks.getFirebaseServices.mockResolvedValue(googleServices())
  let fail: ((reason: Error) => void) | undefined
  mocks.popup.mockReturnValueOnce(new Promise((_resolve, reject) => { fail = reject }))
  const auth = await import('./firebaseAuth')
  await auth.prepareGoogleSignIn()
  const first = auth.signInWithGoogle()
  const failure = expect(first).rejects.toThrow('Network failed')
  await expect(auth.signInWithGoogle()).rejects.toMatchObject({ code: 'auth/cancelled-popup-request' })
  expect(nativeOpen).toHaveBeenCalledOnce()
  fail?.(new Error('Network failed'))
  await failure
  mocks.popup.mockResolvedValueOnce({ user: { uid: 'retry' } })
  await expect(auth.signInWithGoogle()).resolves.toEqual({ uid: 'retry' })
  expect(nativeOpen).toHaveBeenCalledTimes(2)
})

it('restores the opener when the SDK throws synchronously', async () => {
  const reserved = reservedWindow()
  const nativeOpen = vi.fn().mockReturnValue(reserved)
  vi.stubGlobal('open', nativeOpen)
  mocks.getFirebaseServices.mockResolvedValue(googleServices())
  mocks.popup.mockImplementation(() => { throw new Error('SDK failed') })
  const auth = await import('./firebaseAuth')
  await auth.prepareGoogleSignIn()
  await expect(auth.signInWithGoogle()).rejects.toThrow('SDK failed')
  expect(window.open).toBe(nativeOpen)
  expect(reserved.close).toHaveBeenCalledOnce()
})

it('does not navigate a reserved window closed before the SDK handoff', async () => {
  const reserved = reservedWindow()
  const nativeOpen = vi.fn().mockReturnValue(reserved)
  vi.stubGlobal('open', nativeOpen)
  mocks.getFirebaseServices.mockResolvedValue(googleServices())
  mocks.popup.mockImplementation(async () => {
    await Promise.resolve()
    window.open(handler)
    return { user: { uid: 'unused' } }
  })
  const auth = await import('./firebaseAuth')
  await auth.prepareGoogleSignIn()
  const result = auth.signInWithGoogle()
  Object.defineProperty(reserved, 'closed', { value: true })
  await expect(result).rejects.toMatchObject({ code: 'auth/popup-closed-by-user' })
  expect(reserved.location.replace).not.toHaveBeenCalled()
  expect(window.open).toBe(nativeOpen)
})

it('preserves the SDK anchor-based path for installed iOS PWAs without reserving a blank tab', async () => {
  vi.stubGlobal('navigator', { standalone: true })
  const nativeOpen = vi.fn()
  vi.stubGlobal('open', nativeOpen)
  mocks.getFirebaseServices.mockResolvedValue(googleServices())
  mocks.popup.mockResolvedValue({ user: { uid: 'standalone' } })
  const auth = await import('./firebaseAuth')
  await auth.prepareGoogleSignIn()
  await expect(auth.signInWithGoogle()).resolves.toEqual({ uid: 'standalone' })
  expect(nativeOpen).not.toHaveBeenCalled()
})

it('calls the popup SDK synchronously after preparing auth', async () => {
  const user = { uid: 'google-user' }
  const authStateReady = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('open', vi.fn().mockReturnValue(reservedWindow()))
  mocks.getFirebaseServices.mockResolvedValue({ ...googleServices(), auth: { ...googleServices().auth, authStateReady } })
  mocks.popup.mockResolvedValue({ user })
  const auth = await import('./firebaseAuth')
  await auth.prepareGoogleSignIn()
  const result = auth.signInWithGoogle()
  expect(mocks.popup).toHaveBeenCalledOnce()
  expect(authStateReady).toHaveBeenCalledOnce()
  expect(await result).toBe(user)
})

it('hands off the Auth emulator URL using its protocol without an embedded colon', async () => {
  const reserved = reservedWindow()
  vi.stubGlobal('open', vi.fn().mockReturnValue(reserved))
  const services = googleServices()
  mocks.getFirebaseServices.mockResolvedValue({ ...services, auth: { ...services.auth, emulatorConfig: { protocol: 'http', host: '127.0.0.1', port: 9099 } } })
  const emulatorHandler = 'http://127.0.0.1:9099/emulator/auth/handler?providerId=google.com&authType=signInViaPopup'
  mocks.popup.mockImplementation(async () => {
    await Promise.resolve()
    expect(window.open(emulatorHandler)).toBe(reserved)
    return { user: { uid: 'emulator' } }
  })
  const auth = await import('./firebaseAuth')
  await auth.prepareGoogleSignIn()
  await expect(auth.signInWithGoogle()).resolves.toEqual({ uid: 'emulator' })
  expect(reserved.location.replace).toHaveBeenCalledWith(emulatorHandler)
})

it('leaves a later window.open replacement intact and deactivates its captured route', async () => {
  const reserved = reservedWindow()
  const unrelated = reservedWindow()
  const nativeOpen = vi.fn().mockReturnValueOnce(reserved).mockReturnValue(unrelated)
  vi.stubGlobal('open', nativeOpen)
  mocks.getFirebaseServices.mockResolvedValue(googleServices())
  let complete: ((value: { user: { uid: string } }) => void) | undefined
  mocks.popup.mockReturnValue(new Promise((resolve) => { complete = resolve }))
  const auth = await import('./firebaseAuth')
  await auth.prepareGoogleSignIn()
  const result = auth.signInWithGoogle()
  const route = window.open
  const laterOpen: typeof window.open = (...args) => route(...args)
  window.open = laterOpen
  complete?.({ user: { uid: 'google-user' } })
  await result
  expect(window.open).toBe(laterOpen)
  expect(window.open(handler)).toBe(unrelated)
  expect(reserved.location.replace).not.toHaveBeenCalled()
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
