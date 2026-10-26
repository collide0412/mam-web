import { beforeEach, describe, expect, it, vi } from 'vitest'
import { finishGuestImport, pendingGuestImport, prepareGuestImport } from './guestImport'
import type { MealEntry } from '../../types'

const save = vi.hoisted(() => vi.fn())
vi.mock('../../db/store', () => ({ saveMeal: save }))

const meal: MealEntry = { id: 'copy-id', profileId: 'guest-id', foodId: 'pho-bo', foodName: 'Phở bò', quantity: 0.5, serving: '1 tô', mealType: 'Breakfast', calories: 210, protein: 14, carbs: 23, fat: 7, timestamp: '2026-10-24T23:30:00.000Z' }

beforeEach(() => { localStorage.clear(); save.mockReset(); save.mockResolvedValue(undefined) })

describe('explicit guest import', () => {
  it('keeps snapshot identifiers stable when a failed import is resumed', async () => {
    prepareGuestImport('cloud-a', [meal, { ...meal, id: 'second-copy' }])
    save.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Disk full'))
    await expect(finishGuestImport('cloud-a')).rejects.toThrow('Disk full')
    expect(pendingGuestImport('cloud-a')?.entries.map((entry) => entry.id)).toEqual(['second-copy'])
    expect(pendingGuestImport('cloud-b')).toBeNull()
    expect(await finishGuestImport('cloud-b')).toBe(0)
    save.mockResolvedValue(undefined)
    await finishGuestImport('cloud-a')
    expect(save).toHaveBeenLastCalledWith({ ...meal, id: 'second-copy', profileId: 'cloud-a' })
    expect(pendingGuestImport('cloud-a')).toBeNull()
    expect(meal.profileId).toBe('guest-id')
  })
})
