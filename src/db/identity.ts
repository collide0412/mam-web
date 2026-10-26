import { isRecord } from '../domain/validation'
import { notifyDataChanges } from './database'

const IDENTITY_KEY = 'mam-identity-v1'
const SELECTED_PROFILE_KEY = 'mam-selected-profile-id'
const LOCKED_KEY = 'mam-app-locked'

export type IdentityRecord = { readonly profileId: string; readonly pinHash: string; readonly cloud?: boolean }

export async function getIdentity(): Promise<IdentityRecord | null> {
  const stored = localStorage.getItem(IDENTITY_KEY)
  if (!stored) return null
  try {
    const value: unknown = JSON.parse(stored)
    if (!isRecord(value) || typeof value.profileId !== 'string' || typeof value.pinHash !== 'string'
      || (value.cloud !== undefined && typeof value.cloud !== 'boolean')) return null
    return { profileId: value.profileId, pinHash: value.pinHash, ...(typeof value.cloud === 'boolean' ? { cloud: value.cloud } : {}) }
  } catch (error) {
    if (error instanceof SyntaxError) return null
    throw error
  }
}

export async function hashPin(pin: string): Promise<string> {
  if (!pin) return ''
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function persistIdentity(identity: IdentityRecord): void {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
}

export async function verifyIdentity(pin: string): Promise<boolean> {
  const identity = await getIdentity()
  return Boolean(identity && identity.pinHash === await hashPin(pin))
}

export async function clearIdentity(): Promise<void> {
  localStorage.removeItem(IDENTITY_KEY)
  localStorage.removeItem(LOCKED_KEY)
  localStorage.removeItem(SELECTED_PROFILE_KEY)
  notifyDataChanges()
}

export async function getSelectedProfileId(): Promise<string | null> {
  return localStorage.getItem(SELECTED_PROFILE_KEY)
}
export async function saveSelectedProfileId(profileId: string): Promise<void> {
  localStorage.setItem(SELECTED_PROFILE_KEY, profileId)
}
export async function getAppLocked(): Promise<boolean> {
  return localStorage.getItem(LOCKED_KEY) === 'true'
}
export async function setAppLocked(locked: boolean): Promise<void> {
  localStorage.setItem(LOCKED_KEY, String(locked))
  notifyDataChanges()
}
