import type { CurrencyCode, FoodItem } from '../types'

const vietnameseNumber = new Intl.NumberFormat('vi-VN')
const koreanNumber = new Intl.NumberFormat('ko-KR')

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getTodayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function calculateMealNutrition(food: FoodItem, quantity: number) {
  if (!Number.isFinite(quantity) || quantity < 0.01 || quantity > 100) throw new Error('Khẩu phần phải từ 0,01 đến 100.')
  return {
    calories: Number((food.calories * quantity).toPrecision(12)),
    protein: Number((food.protein * quantity).toPrecision(12)),
    carbs: Number((food.carbs * quantity).toPrecision(12)),
    fat: Number((food.fat * quantity).toPrecision(12)),
  }
}

export function formatCurrency(value: number, currency: CurrencyCode): string {
  if (currency === 'KRW') {
    return `₩${koreanNumber.format(value)}`
  }

  return `${vietnameseNumber.format(value)} ₫`
}

export function formatMacro(value: number): string {
  return vietnameseNumber.format(value)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
