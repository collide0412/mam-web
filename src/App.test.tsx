import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import App from './App'

const storeMock = vi.hoisted(() => ({
  defaultProfiles: [
    {
      id: 'linh',
      name: 'Linh',
      region: 'Hồ Chí Minh',
      language: 'vi',
      currency: 'VND',
      calorieGoal: 1650,
      proteinGoal: 90,
      carbsGoal: 210,
      fatGoal: 58,
      allergens: [],
      dietary: ['không cay'],
    },
    {
      id: 'an',
      name: 'An',
      region: 'Đà Nẵng',
      language: 'vi',
      currency: 'VND',
      calorieGoal: 1800,
      proteinGoal: 95,
      carbsGoal: 220,
      fatGoal: 62,
      allergens: [],
      dietary: ['ít đường'],
    },
  ],
  seedProfilesIfNeeded: vi.fn(async () => undefined),
  getProfiles: vi.fn(async () => [{
    id: 'linh',
    name: 'Linh',
    region: 'Hồ Chí Minh',
    language: 'vi',
    currency: 'VND',
    calorieGoal: 1650,
    proteinGoal: 90,
    carbsGoal: 210,
    fatGoal: 58,
    allergens: [],
    dietary: ['không cay'],
  }, {
    id: 'an',
    name: 'An',
    region: 'Đà Nẵng',
    language: 'vi',
    currency: 'VND',
    calorieGoal: 1800,
    proteinGoal: 95,
    carbsGoal: 220,
    fatGoal: 62,
    allergens: [],
    dietary: ['ít đường'],
  }]),
  getSelectedProfileId: vi.fn(async () => 'linh'),
  saveSelectedProfileId: vi.fn(async () => undefined),
  getMealsForProfile: vi.fn(async () => []),
  saveMeal: vi.fn(async () => undefined),
  saveProfile: vi.fn(async () => undefined),
}))

vi.mock('./db/store', () => storeMock)

describe('App', () => {
  it('renders the Măm app shell', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Măm/i)).toBeInTheDocument()
  })

  it('switches active profile and persists the selection', async () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Chọn hồ sơ chính')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Chọn hồ sơ chính'), { target: { value: 'an' } })
    })

    await waitFor(() => {
      expect(storeMock.saveSelectedProfileId).toHaveBeenCalledWith('an')
    })

    expect(screen.getByText(/An/i)).toBeInTheDocument()
  })
})
