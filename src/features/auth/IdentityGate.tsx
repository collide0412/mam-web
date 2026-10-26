import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from 'firebase/auth'
import { getIdentity, setupIdentity, verifyIdentity } from '../../db/store'
import { firebaseEnabled } from '../../firebase'
import { firebaseAuthError, logout, prepareGoogleSignIn, register, resetPassword, signIn, signInWithGoogle } from '../../firebaseAuth'
import { getCloudProfile } from '../../firebaseStore'
import './auth.css'

type Method = 'email' | 'local'

export function IdentityGate({ onAuthenticated, connecting = false, onCancel }: { readonly onAuthenticated: () => void | Promise<void>; readonly connecting?: boolean; readonly onCancel?: () => void }) {
  const [hasIdentity, setHasIdentity] = useState(false)
  const [ready, setReady] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [password, setPassword] = useState('')
  const [registering, setRegistering] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState('')
  const [googleState, setGoogleState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [googleAttempt, setGoogleAttempt] = useState(0)
  const [method, setMethod] = useState<Method>(connecting ? 'email' : 'local')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    void getIdentity().then((identity) => {
      if (!mounted.current) return
      setHasIdentity(!connecting && Boolean(identity))
      setReady(true)
    }).catch(() => {
      if (mounted.current) setError('Không thể đọc dữ liệu trên thiết bị. Hãy tải lại trang và thử lại.')
    })
    return () => { mounted.current = false }
  }, [connecting])

  useEffect(() => {
    if (!firebaseEnabled || !ready || hasIdentity) return
    let active = true
    void prepareGoogleSignIn().then(() => {
      if (active) setGoogleState('ready')
    }).catch(() => {
      if (active) setGoogleState('error')
    })
    return () => { active = false }
  }, [ready, hasIdentity, googleAttempt])

  const run = async (operation: () => Promise<void>, validatePin = true) => {
    if (pending.current) return
    setError('')
    setMessage('')
    if (validatePin && (hasIdentity || pin.length > 0) && !/^\d{6}$/.test(pin)) {
      setError('Mã mở khóa cần có đúng 6 chữ số.')
      return
    }
    pending.current = true
    setBusy(true)
    try {
      await operation()
    } catch (failure) { // no-excuse-ok: catch -- UI boundary translates SDK and storage failures.
      if (mounted.current) setError(firebaseAuthError(failure))
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }

  const completeCloudIdentity = async (user: User, registrationName?: string) => {
    try {
      const existingProfile = await getCloudProfile(user.uid)
      if (!mounted.current) {
        await logout()
        return
      }
      const displayName = registrationName || user.displayName || user.email?.split('@')[0] || 'Bạn'
      await setupIdentity({ name: displayName, pin, profileId: user.uid, existingProfile: existingProfile ?? undefined, cloud: true })
    } catch (failure) {
      await logout()
      throw failure
    }
    if (mounted.current) await onAuthenticated()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void run(async () => {
      if (resetting) {
        await resetPassword(email.trim())
        if (mounted.current) setMessage('Nếu email này có tài khoản, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu. Hãy kiểm tra cả thư rác. Nếu dùng Google, hãy chọn Tiếp tục với Google.')
        return
      }
      if (hasIdentity) {
        if (!(await verifyIdentity(pin))) {
          setError('Mã mở khóa chưa đúng. Hãy thử lại.')
          return
        }
        await onAuthenticated()
        return
      }
      if ((method === 'local' || registering) && name.trim().length < 2) {
        setError('Hãy nhập tên có ít nhất 2 ký tự.')
        return
      }
      if (method === 'local') {
        if (firebaseEnabled) await logout()
        await setupIdentity({ name: name.trim(), pin, cloud: false })
        await onAuthenticated()
        return
      }
      const user = registering ? await register(email.trim(), password) : await signIn(email.trim(), password)
      await completeCloudIdentity(user, registering ? name.trim() : undefined)
    }, !resetting)
  }

  const changeMethod = (next: Method) => {
    setError('')
    setMessage('')
    setResetting(false)
    setRegistering(false)
    setPassword('')
    setMethod(next)
  }

  if (!ready) return <main className="identity-shell"><p role={error ? 'alert' : 'status'}>{error || 'Đang mở Măm…'}</p></main>

  return (
    <main className="identity-shell">
      <section className="identity-card auth-card" aria-labelledby="identity-title" aria-busy={busy}>
        <div className="brand-mark" aria-hidden="true">M</div>
        <p className="eyebrow">Ăn uống, hiểu mình hơn</p>
        <h1 id="identity-title">{resetting ? 'Đặt lại mật khẩu' : hasIdentity ? 'Chào bạn trở lại' : connecting ? 'Kết nối tài khoản' : 'Bắt đầu không gian riêng của bạn'}</h1>
        <p className="identity-copy">{resetting ? 'Nhập email để nhận liên kết đặt lại mật khẩu. Mã khóa thiết bị của bạn không thay đổi.' : hasIdentity ? 'Nhập mã khóa để mở nhật ký trên thiết bị này, kể cả khi offline.' : method === 'local' ? 'Ghi bữa ăn và xem lại mỗi ngày. Bắt đầu ngay trên thiết bị, có thể kết nối tài khoản sau.' : 'Đăng nhập để lưu nhật ký vào tài khoản của bạn. Mật khẩu tài khoản khác với mã khóa thiết bị.'}</p>
        <fieldset className="auth-controls" disabled={busy}>
          <legend className="auth-legend">{hasIdentity ? 'Mở khóa thiết bị' : 'Thiết lập đăng nhập'}</legend>
          {hasIdentity && <label className="field-block">
            <span>Mã khóa ứng dụng 6 chữ số</span>
            <input type="password" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="off" pattern="\d{6}" maxLength={6} required={hasIdentity} aria-describedby={hasIdentity ? undefined : 'pin-help'} />
          </label>}
            <form onSubmit={handleSubmit}>
              {!hasIdentity && !resetting && (method === 'local' || registering) && (
                <label className="field-block"><span>Tên của bạn</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Mai" autoComplete="name" minLength={2} maxLength={80} required /></label>
              )}
              {!hasIdentity && method === 'email' && <>
                <label className="field-block"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
                {!resetting && <label className="field-block"><span>Mật khẩu tài khoản</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 6 : undefined} required /></label>}
              </>}
              <button type="submit" className="primary-button">{resetting ? 'Gửi email đặt lại mật khẩu' : hasIdentity ? 'Mở khóa Măm' : method === 'local' ? 'Tạo không gian riêng' : registering ? 'Tạo tài khoản' : 'Đăng nhập'}</button>
              {!hasIdentity && method === 'email' && !resetting && <>
                {!registering && <button type="button" className="text-button" onClick={() => { setResetting(true); setPassword(''); setError(''); setMessage('') }}>Quên mật khẩu?</button>}
                <button type="button" className="text-button" onClick={() => { setRegistering(!registering); setPassword(''); setError(''); setMessage('') }}>{registering ? 'Đã có tài khoản? Đăng nhập' : 'Tạo tài khoản mới'}</button>
              </>}
              {resetting && <button type="button" className="text-button" onClick={() => { setResetting(false); setError(''); setMessage('') }}>Quay lại đăng nhập</button>}
            </form>
          {firebaseEnabled && !hasIdentity && <div className="auth-alternatives">
            <button type="button" className="secondary-button" disabled={googleState === 'loading'} onClick={() => {
              if (googleState === 'error') { setGoogleState('loading'); setGoogleAttempt((value) => value + 1); return }
              void run(async () => completeCloudIdentity(await signInWithGoogle()))
            }}>{googleState === 'loading' ? 'Đang chuẩn bị Google…' : googleState === 'error' ? 'Thử tải lại Google' : 'Tiếp tục với Google'}</button>
            {googleState === 'error' && <p className="muted" role="status">Chưa tải được Google. Bạn có thể thử lại, dùng email hoặc tiếp tục trên thiết bị.</p>}
            {method !== 'email' && <button type="button" className="text-button" onClick={() => changeMethod('email')}>Dùng email và mật khẩu</button>}
            {!connecting && method !== 'local' && <button type="button" className="text-button" onClick={() => changeMethod('local')}>Chỉ dùng trên thiết bị này</button>}
          </div>}
          {!hasIdentity && <details className="pin-options"><summary>Thêm mã khóa thiết bị (tùy chọn)</summary><label className="field-block"><span>Mã khóa ứng dụng 6 chữ số</span><input type="password" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="off" pattern="\d{6}" maxLength={6} aria-describedby="pin-help" /></label><small id="pin-help" className="muted">Mã khóa chỉ ngăn mở giao diện, không mã hóa dữ liệu trên thiết bị.</small></details>}
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <p className="auth-status" role="status">{busy ? 'Đang xử lý…' : message}</p>
        {onCancel && <button type="button" className="text-button" disabled={busy} onClick={onCancel}>Quay lại nhật ký</button>}
      </section>
    </main>
  )
}
