import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IdentityGate } from './IdentityGate'

const mocks = vi.hoisted(() => ({
  enabled: true,
  getIdentity: vi.fn(), setupIdentity: vi.fn(), verifyIdentity: vi.fn(),
  signIn: vi.fn(), register: vi.fn(), signInWithGoogle: vi.fn(), logout: vi.fn(),
  getCloudProfile: vi.fn(),
}))
vi.mock('../../firebase', () => ({ get firebaseEnabled() { return mocks.enabled } }))
vi.mock('../../db/store', () => mocks)
vi.mock('../../firebaseStore', () => mocks)
vi.mock('../../firebaseAuth', () => ({ ...mocks, firebaseAuthError: () => 'Không thể xác thực. Hãy thử lại.' }))

const user = { uid: 'account-a', displayName: 'Mai', email: 'mai@example.com' }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.enabled = true
  mocks.getIdentity.mockResolvedValue(null)
  mocks.setupIdentity.mockResolvedValue({ profileId: user.uid })
  mocks.getCloudProfile.mockResolvedValue(null)
  mocks.signIn.mockResolvedValue(user)
  mocks.register.mockResolvedValue(user)
  mocks.signInWithGoogle.mockResolvedValue(user)
})
afterEach(cleanup)

async function openGate() {
  const authenticated = vi.fn()
  const view = render(<IdentityGate onAuthenticated={authenticated} />)
  await screen.findByLabelText('Mã khóa ứng dụng 6 chữ số')
  fireEvent.change(screen.getByLabelText('Mã khóa ứng dụng 6 chữ số'), { target: { value: '123456' } })
  const emailMethod = screen.queryByRole('button', { name: 'Dùng email và mật khẩu' })
  if (emailMethod) fireEvent.click(emailMethod)
  return { ...view, authenticated }
}

describe('IdentityGate', () => {
  it('restores the cloud profile when email sign-in succeeds', async () => {
    const profile = { id: user.uid, name: 'Mai đã lưu' }
    mocks.getCloudProfile.mockResolvedValue(profile)
    const { authenticated } = await openGate()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'mai@example.com' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu tài khoản'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    await waitFor(() => expect(authenticated).toHaveBeenCalledOnce())
    expect(mocks.signIn).toHaveBeenCalledWith('mai@example.com', 'password123')
    expect(mocks.setupIdentity).toHaveBeenCalledWith({ name: 'Mai', pin: '123456', profileId: user.uid, existingProfile: profile, cloud: true })
  })

  it('registers an email account when a name and password are supplied', async () => {
    const { authenticated } = await openGate()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản mới' }))
    fireEvent.change(screen.getByLabelText('Tên của bạn'), { target: { value: 'An' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'an@example.com' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu tài khoản'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
    await waitFor(() => expect(authenticated).toHaveBeenCalledOnce())
    expect(mocks.register).toHaveBeenCalledWith('an@example.com', 'password123')
    expect(mocks.setupIdentity).toHaveBeenCalledWith({ name: 'An', pin: '123456', profileId: user.uid, existingProfile: undefined, cloud: true })
  })

  it('signs in with Google without requiring email fields', async () => {
    const { authenticated } = await openGate()
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục với Google' }))
    await waitFor(() => expect(authenticated).toHaveBeenCalledOnce())
    expect(mocks.signInWithGoogle).toHaveBeenCalledOnce()
  })

  it('signs out and stays at the gate when local setup fails after provider sign-in', async () => {
    mocks.setupIdentity.mockRejectedValue(new Error('Storage unavailable'))
    const { authenticated } = await openGate()
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục với Google' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể xác thực')
    expect(mocks.logout).toHaveBeenCalledOnce()
    expect(authenticated).not.toHaveBeenCalled()
  })

  it('disables duplicate actions while Google sign-in is pending', async () => {
    let complete: ((value: typeof user) => void) | undefined
    mocks.signInWithGoogle.mockReturnValue(new Promise<typeof user>((resolve) => { complete = resolve }))
    await openGate()
    const button = screen.getByRole('button', { name: 'Tiếp tục với Google' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(button).toBeDisabled()
    expect(mocks.signInWithGoogle).toHaveBeenCalledOnce()
    await act(async () => complete?.(user))
  })

  it('creates an offline identity without contacting a provider', async () => {
    mocks.enabled = false
    const { authenticated } = await openGate()
    fireEvent.change(screen.getByLabelText('Tên của bạn'), { target: { value: 'Mai' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo không gian riêng' }))
    await waitFor(() => expect(authenticated).toHaveBeenCalledOnce())
    expect(mocks.setupIdentity).toHaveBeenCalledWith({ name: 'Mai', pin: '123456', cloud: false })
    expect(mocks.signIn).not.toHaveBeenCalled()
  })

  it('starts a local journal without a PIN or Firebase SDK action', async () => {
    const authenticated = vi.fn()
    render(<IdentityGate onAuthenticated={authenticated} />)
    fireEvent.change(await screen.findByLabelText('Tên của bạn'), { target: { value: 'Mai' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo không gian riêng' }))
    await waitFor(() => expect(authenticated).toHaveBeenCalledOnce())
    expect(mocks.setupIdentity).toHaveBeenCalledWith({ name: 'Mai', pin: '', cloud: false })
    expect(mocks.signIn).not.toHaveBeenCalled()
  })

  it('keeps local-only mode available when Firebase is configured', async () => {
    const { authenticated } = await openGate()
    fireEvent.click(screen.getByRole('button', { name: 'Chỉ dùng trên thiết bị này' }))
    fireEvent.change(screen.getByLabelText('Tên của bạn'), { target: { value: 'Mai' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo không gian riêng' }))
    await waitFor(() => expect(authenticated).toHaveBeenCalledOnce())
    expect(mocks.logout).toHaveBeenCalledOnce()
    expect(mocks.setupIdentity).toHaveBeenCalledWith({ name: 'Mai', pin: '123456', cloud: false })
  })

  it('rejects an incorrect device PIN without calling Firebase', async () => {
    mocks.getIdentity.mockResolvedValue({ profileId: 'local' })
    mocks.verifyIdentity.mockResolvedValue(false)
    const { authenticated } = await openGate()
    fireEvent.click(screen.getByRole('button', { name: 'Mở khóa Măm' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Mã mở khóa chưa đúng')
    expect(authenticated).not.toHaveBeenCalled()
    expect(mocks.signIn).not.toHaveBeenCalled()
  })

})

describe('auth cleanup', () => {

  it('signs out without creating a default profile when cloud recovery fails', async () => {
    mocks.getCloudProfile.mockRejectedValue(new Error('Permission denied'))
    const { authenticated } = await openGate()
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục với Google' }))
    await screen.findByRole('alert')
    expect(mocks.logout).toHaveBeenCalledOnce()
    expect(mocks.setupIdentity).not.toHaveBeenCalled()
    expect(authenticated).not.toHaveBeenCalled()
  })

  it('rejects a short PIN before opening a provider', async () => {
    await openGate()
    fireEvent.change(screen.getByLabelText('Mã khóa ứng dụng 6 chữ số'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục với Google' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('đúng 6 chữ số')
    expect(mocks.signInWithGoogle).not.toHaveBeenCalled()
  })
})
