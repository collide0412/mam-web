import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ManualMeal } from './ManualMeal'

describe('manual meal entry', () => {
  it('records explicit nutrition for a food outside the catalog', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(<ManualMeal initialName="Sữa theo nhãn" onSave={save} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Mô tả một khẩu phần'), { target: { value: '1 hộp 180 ml' } })
    for (const [label, value] of [['Năng lượng (kcal)', '120'], ['Đạm (g)', '6'], ['Bột đường (g)', '15'], ['Chất béo (g)', '4']]) {
      if (label && value) fireEvent.change(screen.getByLabelText(label), { target: { value } })
    }
    fireEvent.click(screen.getByRole('button', { name: 'Chọn bữa ăn & thời gian' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu món ăn' }))
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ foodName: 'Sữa theo nhãn', serving: '1 hộp 180 ml', calories: 120, protein: 6, carbs: 15, fat: 4 })))
  })
})
