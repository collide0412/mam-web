import { describe, expect, it } from 'vitest'
import { calculateMealNutrition, getTodayKey, normalizeText } from './nutrition'
import { foodCatalog } from '../data/catalog'
describe('meal calculations', () => {
  it('uses the device calendar rather than the UTC date', () => {
    const date = new Date(2026, 9, 25, 0, 30)
    expect(getTodayKey(date)).toBe('2026-10-25')
    expect(getTodayKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })
  it('normalizes Vietnamese crossed d', () => { expect(normalizeText('Đậu đỏ')).toBe('dau do') })
  it('supports fractional servings and rejects invalid quantities', () => {
    const food = foodCatalog.find(item => item.id === 'pho-bo')
    if (!food) throw new Error('Missing historic catalog entry')
    expect(calculateMealNutrition(food, 0.25)).toEqual({ calories: 105, protein: 7, carbs: 11.5, fat: 3.5 })
    for (const quantity of [NaN, Infinity, 0, -1, 101]) expect(() => calculateMealNutrition(food, quantity)).toThrow()
  })
})
