import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MealEditor } from './MealEditor'
import type { MealDraft } from './MealEditor'
const meal: MealDraft = { foodId: 'historic', foodName: 'Món đã ghi', quantity: 2, serving: '1 tô', mealType: 'Lunch', calories: 600, protein: 30, carbs: 70, fat: 20, timestamp: new Date(2026, 9, 24, 12, 30).toISOString(), notes: 'Ghi chú cũ' }
describe('MealEditor', () => {
  it('moves keyboard focus into the newly opened editor', () => {
    render(<MealEditor initial={meal} onSave={vi.fn()} />)
    expect(screen.getByRole('heading', { name: meal.foodName })).toHaveFocus()
  })
  it('preserves nutrition when editing a tiny portion back to a full portion', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(<MealEditor initial={{ ...meal, quantity: 0.01, calories: 4.2, protein: 0.28, carbs: 0.46, fat: 0.14 }} onSave={save} editing />)
    fireEvent.change(screen.getByLabelText('Số khẩu phần'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ calories: 420, protein: 28, carbs: 46, fat: 14 })))
  })
  it('scales the stored snapshot and saves chosen local date, meal and notes', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(<MealEditor initial={meal} onSave={save} editing />)
    fireEvent.change(screen.getByLabelText('Số khẩu phần'), { target: { value: '0.5' } })
    fireEvent.change(screen.getByLabelText('Ngày ăn'), { target: { value: '2026-10-23' } })
    fireEvent.change(screen.getByLabelText('Giờ ăn'), { target: { value: '08:15' } })
    fireEvent.change(screen.getByLabelText('Bữa ăn'), { target: { value: 'Breakfast' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    await screen.findByText('Đã lưu vào nhật ký.')
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 0.5, calories: 150, protein: 7.5, carbs: 17.5, fat: 5, mealType: 'Breakfast', timestamp: new Date(2026, 9, 23, 8, 15).toISOString(), notes: 'Ghi chú cũ' }))
  })
  it('keeps entered values after failure and supports retry', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(undefined)
    render(<MealEditor initial={meal} onSave={save} />)
    fireEvent.change(screen.getByLabelText('Số khẩu phần'), { target: { value: '0.25' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu món ăn' }))
    await screen.findByRole('alert')
    expect(screen.getByLabelText('Số khẩu phần')).toHaveValue(0.25)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu món ăn' }))
    await screen.findByText('Đã lưu vào nhật ký.')
    expect(save).toHaveBeenCalledTimes(2)
  })
  it('prevents duplicate pending submissions', async () => {
    let finish: (() => void) | undefined
    const save = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
    render(<MealEditor initial={meal} onSave={save} />)
    const button = screen.getByRole('button', { name: 'Lưu món ăn' })
    fireEvent.click(button); fireEvent.click(button)
    expect(save).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Đang lưu…' })).toBeDisabled()
    await act(async () => { finish?.() })
    await waitFor(() => expect(screen.getByText('Đã lưu vào nhật ký.')).toBeInTheDocument())
  })
})
