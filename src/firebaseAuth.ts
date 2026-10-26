import type { User } from 'firebase/auth'
import { getFirebaseServices, getLoadedFirebaseServices, firebaseEnabled } from './firebase'
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

export async function signInWithGoogle(): Promise<User> {
  const { auth, authSdk } = await getFirebaseServices()
  const result = await authSdk.signInWithPopup(auth, new authSdk.GoogleAuthProvider())
  return result.user
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
    'auth/popup-blocked': 'Trình duyệt chặn cửa sổ Google. Hãy cho phép cửa sổ bật lên.',
    'auth/popup-closed-by-user': 'Cửa sổ Google đã đóng. Bạn có thể thử lại.',
    'auth/cancelled-popup-request': 'Yêu cầu đăng nhập Google đã bị hủy. Hãy thử lại.',
    'auth/account-exists-with-different-credential': 'Email này đã dùng phương thức khác. Hãy đăng nhập bằng phương thức ban đầu.',
    'auth/too-many-requests': 'Có quá nhiều yêu cầu. Hãy chờ một lúc rồi thử lại.',
    'auth/network-request-failed': 'Không có kết nối. Hãy kết nối mạng để đăng nhập.',
    'auth/user-disabled': 'Tài khoản đã bị vô hiệu hóa.',
  }
  return messages[error.code] ?? 'Không thể đăng nhập. Hãy thử lại hoặc chọn phương thức khác.'
}
