import type { CurrencyCode, FoodItem } from '../types'

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getTodayKey(date = new Date()): string {
  return new Date(date).toISOString().slice(0, 10)
}

export function calculateMealNutrition(food: FoodItem, quantity: number) {
  return {
    calories: Math.round(food.calories * quantity),
    protein: Math.round(food.protein * quantity),
    carbs: Math.round(food.carbs * quantity),
    fat: Math.round(food.fat * quantity),
  }
}

export function formatCurrency(value: number, currency: CurrencyCode): string {
  if (currency === 'KRW') {
    return `₩${new Intl.NumberFormat('ko-KR').format(value)}`
  }

  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}

export function formatMacro(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
