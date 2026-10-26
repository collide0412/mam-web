import type { User } from 'firebase/auth'
import { getFirebaseServices, getLoadedFirebaseServices, firebaseEnabled, type FirebaseServices } from './firebase'
import { CloudDataError, CloudOwnershipError, CloudTimeoutError } from './firebaseStore'

export function watchFirebaseUser(onUser: (user: User | null) => void, onError?: (error: Error) => void): () => void {
  if (!firebaseEnabled) return () => undefined
  let disposed = false
  let unsubscribe: (() => void) | undefined
  void getFirebaseServices().then(({ auth, authSdk }) => {
    if (!disposed) unsubscribe = authSdk.onAuthStateChanged(auth, (user) => { if (!disposed) onUser(user) }, (error) => { if (!disposed) onError?.(error) })
  }).catch((error: unknown) => {
    if (!(error instanceof Error)) throw error
    if (!disposed) {
      if (onError) onError(error)
      else onUser(null)
    }
  })
  return () => { disposed = true; unsubscribe?.() }
}

export async function signIn(email: string, password: string): Promise<User> {
  const { auth, authSdk } = await getFirebaseServices()
  const result = await authSdk.signInWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function register(email: string, password: string): Promise<User> {
  const { auth, authSdk } = await getFirebaseServices()
  const result = await authSdk.createUserWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function logout(): Promise<void> {
  const loaded = getLoadedFirebaseServices()
  if (loaded) {
    const { auth, authSdk } = await loaded
    await authSdk.signOut(auth)
  }
}

let googleServices: FirebaseServices | undefined
let googlePopupPending = false

class GooglePopupError extends Error {
  readonly code: 'auth/popup-blocked' | 'auth/popup-closed-by-user' | 'auth/cancelled-popup-request'
  constructor(code: GooglePopupError['code']) {
    super(code)
    this.name = 'GooglePopupError'
    this.code = code
  }
}

export async function prepareGoogleSignIn(): Promise<void> {
  const services = await getFirebaseServices()
  await services.auth.authStateReady()
  googleServices = services
}

export function signInWithGoogle(): Promise<User> {
  if (!googleServices) throw new Error('Google chưa sẵn sàng. Hãy chờ tải xong rồi thử lại.')
  const { auth, authSdk } = googleServices
  const provider = new authSdk.GoogleAuthProvider()
  // Installed iOS PWAs use the SDK's anchor-based path, not window.open.
  if ('standalone' in navigator && navigator.standalone === true) {
    return authSdk.signInWithPopup(auth, provider).then((result) => result.user)
  }
  if (googlePopupPending) return Promise.reject(new GooglePopupError('auth/cancelled-popup-request'))
  const emulator = auth.emulatorConfig
  const handler = emulator
    ? new URL('/emulator/auth/handler', `${emulator.protocol}://${emulator.host}:${emulator.port}`)
    : new URL(`https://${auth.config.authDomain}/__/auth/handler`)
  const nativeOpen = window.open
  // Safari needs a real window during the click, before the SDK's internal awaits.
  const popup = nativeOpen.call(window, 'about:blank', '_blank', 'popup=yes,width=500,height=600')
  if (!popup) return Promise.reject(new GooglePopupError('auth/popup-blocked'))
  googlePopupPending = true

  let reserved = true
  const restoreOpen = () => {
    reserved = false
    if (window.open === routeGooglePopup) window.open = nativeOpen
  }
  const routeGooglePopup: typeof window.open = (url, target, features) => {
    let destination: URL | undefined
    try { destination = new URL(String(url ?? ''), window.location.href) }
    catch (error: unknown) { if (!(error instanceof TypeError)) throw error }
    if (reserved && destination?.origin === handler.origin && destination.pathname === handler.pathname
      && destination.searchParams.get('providerId') === 'google.com'
      && destination.searchParams.get('authType') === 'signInViaPopup') {
      restoreOpen()
      if (popup.closed) throw new GooglePopupError('auth/popup-closed-by-user')
      popup.location.replace(destination.href)
      return popup
    }
    return nativeOpen.call(window, url, target, features)
  }
  const release = () => {
    restoreOpen()
    googlePopupPending = false
    try { popup.close() }
    catch (error: unknown) { if (!(error instanceof DOMException)) throw error }
  }
  window.open = routeGooglePopup
  try {
    return authSdk.signInWithPopup(auth, provider).then((result) => result.user).finally(release)
  } catch (error: unknown) {
    release()
    return Promise.reject(error)
  }
}

export async function resetPassword(email: string): Promise<void> {
  const { auth, authSdk } = await getFirebaseServices()
  try {
    await authSdk.sendPasswordResetEmail(auth, email)
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'auth/user-not-found') return
    throw error
  }
}


export function firebaseAuthError(error: unknown): string {
  if (error instanceof CloudTimeoutError) return 'Không thể tải hồ sơ. Hãy kiểm tra kết nối và đăng nhập lại.'
  if (error instanceof CloudDataError || error instanceof CloudOwnershipError) return 'Không thể mở hồ sơ tài khoản. Hãy đăng nhập lại hoặc liên hệ hỗ trợ.'
  if (!(error instanceof Error) || !('code' in error) || typeof error.code !== 'string') {
    return error instanceof Error ? error.message : 'Không thể đăng nhập. Hãy thử lại.'
  }
  const messages: Readonly<Record<string, string>> = {
    'auth/invalid-credential': 'Email hoặc mật khẩu chưa đúng.',
    'auth/wrong-password': 'Email hoặc mật khẩu chưa đúng.',
    'auth/user-not-found': 'Email hoặc mật khẩu chưa đúng.',
    'auth/invalid-email': 'Hãy nhập địa chỉ email hợp lệ.',
    'auth/email-already-in-use': 'Email này đã có tài khoản. Hãy đăng nhập.',
    'auth/weak-password': 'Mật khẩu cần có ít nhất 6 ký tự.',
    'auth/password-does-not-meet-requirements': 'Mật khẩu chưa đáp ứng chính sách tài khoản.',
    'auth/operation-not-allowed': 'Phương thức đăng nhập này chưa được bật trong Firebase.',
    'auth/unauthorized-domain': 'Tên miền này chưa được cho phép đăng nhập trong Firebase.',
    'auth/popup-blocked': 'Không mở được cửa sổ Google. Hãy bấm thử lại; nếu vẫn bị chặn, cho phép cửa sổ bật lên cho Măm hoặc dùng email.',
    'auth/popup-closed-by-user': 'Cửa sổ Google đã đóng. Bạn có thể thử lại.',
    'auth/cancelled-popup-request': 'Yêu cầu đăng nhập Google đã bị hủy. Hãy thử lại.',
    'auth/account-exists-with-different-credential': 'Email này đã dùng phương thức khác. Hãy đăng nhập bằng phương thức ban đầu.',
    'auth/too-many-requests': 'Có quá nhiều yêu cầu. Hãy chờ một lúc rồi thử lại.',
    'auth/network-request-failed': 'Không có kết nối. Hãy kết nối mạng để đăng nhập.',
    'auth/user-disabled': 'Tài khoản đã bị vô hiệu hóa.',
  }
  return messages[error.code] ?? 'Không thể đăng nhập. Hãy thử lại hoặc chọn phương thức khác.'
}
