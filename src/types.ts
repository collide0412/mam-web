export type CurrencyCode = 'VND' | 'KRW'
export type LanguageCode = 'vi' | 'en' | 'ko'

export type FoodItem = {
  id: string
  name: string
  aliases: string[]
  category: string
  cuisine: string
  region: string
  calories: number
  protein: number
  carbs: number
  fat: number
  serving: string
  price: number
  source: string
  confidence: number
  meal: string
  tags: string[]
}

export type Profile = {
  id: string
  name: string
  region: string
  language: LanguageCode
  currency: CurrencyCode
  calorieGoal: number
  proteinGoal: number
  carbsGoal: number
  fatGoal: number
  allergens: string[]
  dietary: string[]
}

export type MealEntry = {
  id: string
  profileId: string
  foodId: string
  foodName: string
  quantity: number
  serving: string
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
  calories: number
  protein: number
  carbs: number
  fat: number
  timestamp: string
  notes?: string
}

export type SearchResult = FoodItem & { score: number }
