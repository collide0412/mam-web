import { describe, expect, it } from 'vitest'
import { foodCatalog, searchFoods } from './catalog'
describe('catalog search', () => {
  it('matches accentless Vietnamese including crossed d and all query tokens', () => {
    expect(searchFoods('com tam')[0]?.id).toBe('com-tam-suon')
    expect(searchFoods('duong')[0]?.id).toBe('tra-sua')
    expect(searchFoods('bo pho').every(food => food.name.includes('Phở bò'))).toBe(true)
  })
  it('never returns unrelated foods because of favorites or recent history', () => {
    expect(searchFoods('zzzz not a food', ['pho-bo'], ['banh-mi-trung'])).toEqual([])
    expect(searchFoods('salad', ['pho-bo'], ['banh-mi-trung']).map(food => food.id)).toEqual(['salad-ga'])
  })
  it('shows the whole offline catalog with actual recent foods first', () => {
    const found = searchFoods('', [], ['tra-sua', 'banh-cuon'])
    expect(found).toHaveLength(foodCatalog.length)
    expect(found.slice(0, 2).map(food => food.id)).toEqual(['tra-sua', 'banh-cuon'])
  })
})
