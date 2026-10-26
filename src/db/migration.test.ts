import 'fake-indexeddb/auto'
import { openDB } from 'idb'
import { expect, it } from 'vitest'
import { testMeal, testProfile } from './fixtures'

it('upgrades the v2 database without losing historical meals, profiles, or queued revisions', async () => {
  const old = await openDB('mam-web-db', 2, {
    upgrade(db) {
      db.createObjectStore('profiles', { keyPath: 'id' })
      const meals = db.createObjectStore('meals', { keyPath: 'id' })
      meals.createIndex('by-profile', 'profileId')
      meals.createIndex('by-date', 'timestamp')
      db.createObjectStore('syncQueue', { keyPath: 'id' })
    },
  })
  const queued = { id: `meal:${testMeal.id}`, kind: 'meal', payload: testMeal, attempts: 2, updatedAt: '2026-10-23', revision: 'unsent-edit' }
  await old.put('profiles', testProfile)
  await old.put('meals', testMeal)
  await old.put('syncQueue', queued)
  old.close()
  const { dbPromise, mealQueueId } = await import('./database')
  const migrated = await dbPromise
  expect(await migrated.get('profiles', 'alice')).toEqual(testProfile)
  expect(await migrated.get('mealRecords', ['alice', testMeal.id])).toEqual(testMeal)
  expect(await migrated.get('syncQueue', mealQueueId(testMeal))).toEqual({ ...queued, id: mealQueueId(testMeal) })
  expect(await migrated.get('meals', testMeal.id)).toEqual(testMeal)
  migrated.close()
})
