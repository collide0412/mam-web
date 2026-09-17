import { describe, expect, it } from 'vitest'
import type { MealEntry, Profile } from '../types'
import { getRecommendationCandidates, searchFoods } from './catalog'

const baseProfile: Profile = {
  id: 'linh',
  name: 'Linh',
  region: 'Hồ Chí Minh',
  language: 'vi',
  currency: 'VND',
  calorieGoal: 1650,
  proteinGoal: 90,
  carbsGoal: 210,
  fatGoal: 58,
  allergens: [],
  dietary: ['ít cay'],
}

describe('catalog recommendations', () => {
  it('recommends foods aligned with the active profile and de-prioritizes repeated meals', () => {
    const repeatedMeals: MealEntry[] = [{
      id: 'm1',
      profileId: 'linh',
      foodId: 'pho-bo',
      foodName: 'Phở bò',
      quantity: 1,
      serving: '1 tô',
      mealType: 'Lunch',
      calories: 420,
      protein: 28,
      carbs: 46,
      fat: 14,
      timestamp: new Date().toISOString(),
    }]

    const picks = getRecommendationCandidates(baseProfile, repeatedMeals)

    expect(picks.length).toBeGreaterThan(0)
    expect(picks[0]?.id).not.toBe('pho-bo')
    expect(picks.some((food) => food.name.toLowerCase().includes('phở'))).toBe(true)
  })

  it('finds food entries by common Vietnamese names', () => {
    const results = searchFoods('cơm tấm')

    expect(results.length).toBeGreaterThan(0)
    expect(results[0]?.name).toBe('Cơm tấm sườn bì chả')
  })
})
