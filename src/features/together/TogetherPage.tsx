import { Navigate } from 'react-router-dom'
import type { MealEntry, Profile } from '../../types'
export function TogetherPage(_props: { profile: Profile; meals: MealEntry[] }) { return <Navigate to="/recommend" replace /> }
