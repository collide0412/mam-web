import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProfilePage } from './ProfilePage'
import { testProfile as profile, testMeal as meal } from '../../db/fixtures'
import { isRecord } from '../../domain/validation'

afterEach(() => vi.unstubAllGlobals())

describe('journal export', () => {
  it('prepares a complete JSON snapshot and releases its object URL', async () => {
    let captured: Blob | undefined
    const revoke = vi.fn()
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL(value: Blob | MediaSource) { if (value instanceof Blob) captured = value; return 'blob:test-journal' }
      static revokeObjectURL = revoke
    })
    const noop = vi.fn(async () => undefined)
    const view = render(<ProfilePage profile={profile} meals={[meal]} cloud={false} hasPin={false} sync={{ pending: 0, error: null, syncing: false }} onSave={noop} onLock={noop} onSignOut={noop} onConnect={vi.fn()} onRetry={noop} />)
    fireEvent.click(screen.getByRole('button', { name: 'Xuất bản sao nhật ký' }))
    expect(screen.getByRole('link', { name: 'Tải tệp JSON' })).toHaveAttribute('href', 'blob:test-journal')
    const blob = captured
    if (!blob) throw new Error('Export did not create a Blob')
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Invalid export text'))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(blob)
    })
    const snapshot: unknown = JSON.parse(text)
    if (!isRecord(snapshot)) throw new Error('Invalid export object')
    expect(snapshot).toMatchObject({ version: 1, profile, meals: [meal] })
    expect(Object.keys(snapshot).sort()).toEqual(['exportedAt', 'meals', 'profile', 'version'])
    view.unmount()
    expect(revoke).toHaveBeenCalledWith('blob:test-journal')
  })
})
