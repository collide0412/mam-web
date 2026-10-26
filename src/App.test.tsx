import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IdentityRecord } from './db/store'
import type { Profile } from './types'
import App from './App'

const mocks = vi.hoisted(() => ({
  getIdentity: vi.fn<() => Promise<IdentityRecord | null>>(),
  getProfile: vi.fn<(id: string) => Promise<Profile | undefined>>(),
  getMealsForProfile: vi.fn(async () => []),
  getSyncStatus: vi.fn(async () => ({ pending: 0, error: null, syncing: false })),
  getAppLocked: vi.fn(async () => false),
  setAppLocked: vi.fn(async () => undefined),
  subscribeDataChanges: vi.fn<((listener: () => void) => () => void)>(() => () => undefined),
  refreshCloudProfile: vi.fn(async () => undefined),
  confirmCloudIdentity: vi.fn(async () => null),
  flushPendingSync: vi.fn(async () => undefined),
  clearIdentity: vi.fn(async () => undefined),
  saveProfile: vi.fn<(profile: Profile) => Promise<void>>(),
  saveMeal: vi.fn(async () => undefined), deleteMeal: vi.fn(async () => undefined),
  setupIdentity: vi.fn(async () => undefined), verifyIdentity: vi.fn(async () => true),
  logout: vi.fn(async () => undefined), watchFirebaseUser: vi.fn(() => () => undefined),
}))
vi.mock('./db/store', () => mocks)
vi.mock('./firebaseAuth', async (original) => ({ ...await original<typeof import('./firebaseAuth')>(), logout: mocks.logout, watchFirebaseUser: mocks.watchFirebaseUser }))

const profile: Profile = { id: 'account-a', name: 'Mai', region: 'Việt Nam', language: 'vi', currency: 'VND', calorieGoal: 1650, proteinGoal: 90, carbsGoal: 210, fatGoal: 58, allergens: [], dietary: [] }
const identity = { profileId: profile.id, pinHash: 'existing-hash', cloud: true }

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mocks.getIdentity.mockResolvedValue(identity)
  mocks.getProfile.mockImplementation(async (id) => ({ ...profile, id, name: id === 'account-b' ? 'An' : 'Mai' }))
  mocks.saveProfile.mockResolvedValue(undefined)
  mocks.logout.mockResolvedValue(undefined)
})

function openProfile() { return render(<MemoryRouter initialEntries={['/profile']}><App /></MemoryRouter>) }

describe('account and session flows', () => {
  it('places focus immediately on each destination during rapid keyboard navigation', async () => {
    openProfile()
    await screen.findByLabelText('Tên người dùng')
    const nav = within(screen.getByRole('navigation', { name: 'Điều hướng chính' }))
    for (const label of ['Hôm nay', 'Ghi món', 'Nhật ký', 'Cá nhân']) {
      fireEvent.click(nav.getByRole('link', { name: label }))
      expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
    }
  })
  it('replaces the visible session when another tab switches accounts', async () => {
    let changed: (() => void) | undefined
    mocks.subscribeDataChanges.mockImplementation((listener) => { changed = listener; return () => undefined })
    openProfile()
    expect(await screen.findByLabelText('Tên người dùng')).toHaveValue('Mai')
    mocks.getIdentity.mockResolvedValue({ ...identity, profileId: 'account-b' })
    await act(async () => changed?.())
    expect(await screen.findByLabelText('Tên người dùng')).toHaveValue('An')
    expect(screen.queryByDisplayValue('Mai')).not.toBeInTheDocument()
  })
  it('saves edited daily targets and identifies the pending cloud outbox', async () => {
    mocks.getSyncStatus.mockResolvedValueOnce({ pending: 2, error: null, syncing: false })
    openProfile()
    await screen.findByLabelText('Tên người dùng')
    fireEvent.change(screen.getByLabelText('Tên người dùng'), { target: { value: 'Linh' } })
    fireEvent.change(screen.getByLabelText('Năng lượng (kcal/ngày)'), { target: { value: '2000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))
    await waitFor(() => expect(mocks.saveProfile).toHaveBeenCalledWith({ ...profile, name: 'Linh', calorieGoal: 2000 }))
    expect(await screen.findByText('Đã lưu hồ sơ và mục tiêu trên thiết bị.')).toBeInTheDocument()
  })

  it('retains identity and visible data if sign-out fails', async () => {
    mocks.logout.mockRejectedValueOnce(new Error('Không thể đăng xuất.'))
    openProfile()
    await screen.findByLabelText('Tên người dùng')
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể đăng xuất.')
    expect(mocks.clearIdentity).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Tên người dùng')).toHaveValue('Mai')
  })

  it('keeps the local journal reachable through PIN lock and unlock', async () => {
    mocks.getIdentity.mockResolvedValue({ ...identity, cloud: false })
    openProfile()
    await screen.findByLabelText('Tên người dùng')
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Khóa Măm' }))
    fireEvent.change(await screen.findByLabelText('Mã khóa ứng dụng 6 chữ số'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mở khóa Măm' }))
    expect(await screen.findByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument()
    expect(mocks.clearIdentity).not.toHaveBeenCalled()
  })

  it('prevents account switching while a profile save is pending', async () => {
    let resolveSave: (() => void) | undefined
    mocks.saveProfile.mockReturnValueOnce(new Promise<void>((resolve) => { resolveSave = resolve }))
    openProfile()
    await screen.findByLabelText('Tên người dùng')
    fireEvent.change(screen.getByLabelText('Tên người dùng'), { target: { value: 'Old account save' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeDisabled()
    await act(async () => resolveSave?.())
    mocks.getIdentity.mockResolvedValue(null)
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await screen.findByRole('heading', { name: 'Bắt đầu không gian riêng của bạn' })
    mocks.getIdentity.mockResolvedValue({ ...identity, profileId: 'account-b', cloud: false })
    fireEvent.change(screen.getByLabelText('Tên của bạn'), { target: { value: 'An' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo không gian riêng' }))
    await screen.findByRole('navigation', { name: 'Điều hướng chính' })
    fireEvent.click(screen.getByRole('link', { name: 'Cá nhân' }))
    expect(await screen.findByLabelText('Tên người dùng')).toHaveValue('An')
  })
})
