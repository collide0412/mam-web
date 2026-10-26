import { isMeal } from '../../domain/validation'
import { saveMeal } from '../../db/store'
import type { MealEntry } from '../../types'

const importKey = 'mam-pending-guest-import-v1'
type ImportPlan = { target: string; entries: MealEntry[] }

export function pendingGuestImport(target: string): ImportPlan | null {
  const raw = localStorage.getItem(importKey)
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null || !('target' in value) || value.target !== target || !('entries' in value) || !Array.isArray(value.entries) || !value.entries.every(isMeal)) return null
    return { target, entries: value.entries }
  } catch { return null }
}

export function prepareGuestImport(target: string, entries: MealEntry[]) {
  localStorage.setItem(importKey, JSON.stringify({ target, entries: entries.map((entry) => ({ ...entry, profileId: target })) }))
}

export async function finishGuestImport(target: string): Promise<number> {
  const plan = pendingGuestImport(target)
  if (!plan) return 0
  for (const entry of plan.entries) {
    await saveMeal(entry)
    plan.entries = plan.entries.filter((item) => item.id !== entry.id)
    localStorage.setItem(importKey, JSON.stringify(plan))
  }
  localStorage.removeItem(importKey)
  return 0
}
