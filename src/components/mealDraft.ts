import type { FoodItem, MealEntry } from '../types'

export type MealDraft = Omit<MealEntry, 'id' | 'profileId'>
export const mealLabels = { Breakfast: 'Bữa sáng', Lunch: 'Bữa trưa', Dinner: 'Bữa tối', Snack: 'Bữa phụ' }
export const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const
export function isMealType(value: string): value is MealEntry['mealType'] { return mealTypes.some((type) => type === value) }
export function draftFromFood(food: FoodItem): MealDraft {
  const hour = new Date().getHours()
  return { foodId: food.id, foodName: food.name, serving: food.serving, quantity: 1,
    mealType: hour < 10 ? 'Breakfast' : hour < 15 ? 'Lunch' : hour < 21 ? 'Dinner' : 'Snack',
    calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat, timestamp: new Date().toISOString() }
}
