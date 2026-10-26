import type { MealEntry, Profile } from '../types'

export const testProfile: Profile = {
  id: 'alice', name: 'Alice', region: 'VN', language: 'vi', currency: 'VND',
  calorieGoal: 1650, proteinGoal: 90, carbsGoal: 210, fatGoal: 58, allergens: [], dietary: [],
}
export const testMeal: MealEntry = {
  id: 'meal-1', profileId: 'alice', foodId: 'rice', foodName: 'Rice', quantity: 1,
  serving: 'bowl', mealType: 'Lunch', calories: 200, protein: 5, carbs: 40,
  fat: 1, timestamp: '2026-10-23T00:00:00.000Z',
}
