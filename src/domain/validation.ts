import type { MealEntry, Profile } from '../types'

export class DataValidationError extends Error {}
export type MealRecord = MealEntry & { readonly deleted?: true }

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown, maximum: number, minimum = 1): value is string {
  return typeof value === 'string' && value.trim().length >= minimum && value.length <= maximum
}

function number(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
}

function identifier(value: unknown): value is string {
  return text(value, 128) && !value.includes('/') && value !== '.' && value !== '..'
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 30 && value.every((item: unknown) => text(item, 80))
}

export function isProfile(value: unknown): value is Profile {
  return isRecord(value)
    && Object.keys(value).every((key) => ['id', 'name', 'region', 'language', 'currency', 'calorieGoal', 'proteinGoal', 'carbsGoal', 'fatGoal', 'allergens', 'dietary'].includes(key))
    && identifier(value.id) && text(value.name, 80) && text(value.region, 80)
    && (value.language === 'vi' || value.language === 'en' || value.language === 'ko')
    && (value.currency === 'VND' || value.currency === 'KRW')
    && number(value.calorieGoal, 500, 10000) && number(value.proteinGoal, 0, 1000)
    && number(value.carbsGoal, 0, 2000) && number(value.fatGoal, 0, 1000)
    && strings(value.allergens) && strings(value.dietary)
}

export function isMeal(value: unknown): value is MealRecord {
  return isRecord(value)
    && Object.keys(value).every((key) => ['id', 'profileId', 'foodId', 'foodName', 'quantity', 'serving', 'mealType', 'calories', 'protein', 'carbs', 'fat', 'timestamp', 'notes', 'deleted'].includes(key))
    && identifier(value.id) && identifier(value.profileId) && text(value.foodId, 120)
    && text(value.foodName, 160) && text(value.serving, 120)
    && number(value.quantity, 0.01, 100) && number(value.calories, 0, 100000)
    && ['protein', 'carbs', 'fat'].every((key) => number(value[key], 0, 10000))
    && (value.mealType === 'Breakfast' || value.mealType === 'Lunch' || value.mealType === 'Dinner' || value.mealType === 'Snack')
    && typeof value.timestamp === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.timestamp)
    && Number.isFinite(Date.parse(value.timestamp)) && new Date(value.timestamp).toISOString() === value.timestamp
    && (value.notes === undefined || text(value.notes, 1000, 0))
    && (value.deleted === undefined || value.deleted === true)
}

export function validateProfile(value: unknown): Profile {
  if (!isProfile(value)) throw new DataValidationError('Thông tin hồ sơ không hợp lệ. Hãy kiểm tra tên và mục tiêu.')
  return value
}

export function validateMeal(value: unknown): MealRecord {
  if (!isMeal(value)) throw new DataValidationError('Bữa ăn không hợp lệ. Hãy kiểm tra khẩu phần, ngày và dinh dưỡng.')
  return value
}
