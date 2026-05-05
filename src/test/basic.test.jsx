import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useMacros } from '../hooks/useMacros'
import { calculateMacros } from '../utils/macroCalc'
import { parsePlan } from '../utils/planParser'
import { formatDate, getDayName, getDaysInMonth, getFirstDayOfMonth } from '../utils/dateUtils'
import { storage } from '../utils/storage'
import MacroBar from '../components/shared/MacroBar'
import MealRow from '../components/shared/MealRow'
import ExerciseRow from '../components/shared/ExerciseRow'
import MacroCards from '../components/shared/MacroCards'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Test wrapper for hooks
import { useState } from 'react'

function MacrosTestWrapper({ meals, macros, date }) {
  const { totals, targets } = useMacros(meals, macros, date)
  return (
    <div>
      <span data-testid="calories">{totals.calories}</span>
      <span data-testid="protein">{totals.protein}</span>
      <span data-testid="carbs">{totals.carbs}</span>
      <span data-testid="fat">{totals.fat}</span>
      <span data-testid="target-calories">{targets?.calories ?? 'null'}</span>
    </div>
  )
}

// =====================
// DATE UTILS
// =====================
describe('dateUtils', () => {
  it('formats date correctly', () => {
    const date = new Date(2026, 0, 15)
    expect(formatDate(date)).toBe('2026-01-15')
  })

  it('gets day name correctly', () => {
    const sunday = new Date(2026, 0, 4) // Jan 4, 2026 is a Sunday
    expect(getDayName(sunday)).toBe('sunday')
  })

  it('gets days in month correctly', () => {
    expect(getDaysInMonth(2026, 0)).toBe(31) // January
    expect(getDaysInMonth(2026, 1)).toBe(28) // February
  })

  it('gets first day of month correctly', () => {
    expect(getFirstDayOfMonth(2026, 0)).toBe(4) // Jan 1, 2026 is Thursday
  })
})

// =====================
// STORAGE
// =====================
describe('storage', () => {
  it('stores and retrieves data', () => {
    const keys = storage.getKeys()
    storage.set(keys.PROFILE, { weight: 80 })
    expect(storage.get(keys.PROFILE)).toEqual({ weight: 80 })
  })

  it('returns null for missing keys', () => {
    expect(storage.get('fitos_nonexistent')).toBeNull()
  })

  it('clears data', () => {
    const keys = storage.getKeys()
    storage.set(keys.PROFILE, { weight: 80 })
    storage.clear(keys.PROFILE)
    expect(storage.get(keys.PROFILE)).toBeNull()
  })

  it('uses correct fitos_* keys', () => {
    const keys = storage.getKeys()
    expect(keys.PROFILE).toBe('fitos_profile')
    expect(keys.MACROS).toBe('fitos_macros')
    expect(keys.PLAN).toBe('fitos_plan')
    expect(keys.LOGS).toBe('fitos_logs')
    expect(keys.MEALS).toBe('fitos_meals')
    expect(keys.PLAN_HISTORY).toBe('fitos_plan_history')
  })
})

// =====================
// MACRO CALCULATOR
// =====================
describe('macroCalc', () => {
  const profile = { weight: 80, height: 180, age: 25, sex: 'male', activityLevel: 1.55, goal: 'maintain' }

  it('calculates macros for male maintaining', () => {
    const result = calculateMacros(profile)
    expect(result).not.toBeNull()
    expect(result.calories).toBeGreaterThan(0)
    expect(result.protein).toBeGreaterThan(0)
    expect(result.carbs).toBeGreaterThan(0)
    expect(result.fat).toBeGreaterThan(0)
  })

  it('calculates bulk with calorie surplus', () => {
    const maintain = calculateMacros({ ...profile, goal: 'maintain' })
    const bulk = calculateMacros({ ...profile, goal: 'bulk' })
    expect(bulk.calories).toBeGreaterThan(maintain.calories)
  })

  it('calculates cut with calorie deficit', () => {
    const maintain = calculateMacros({ ...profile, goal: 'maintain' })
    const cut = calculateMacros({ ...profile, goal: 'cut' })
    expect(cut.calories).toBeLessThan(maintain.calories)
  })

  it('returns null for incomplete profile', () => {
    expect(calculateMacros(null)).toBeNull()
    expect(calculateMacros({ weight: 80 })).toBeNull()
  })
})

// =====================
// PLAN PARSER
// =====================
describe('planParser', () => {
  it('parses simple plan text', () => {
    const text = 'Monday: Chest\nDetails: Bench Press, Incline DB Press'
    const plan = parsePlan(text)
    expect(plan.monday).toBeDefined()
    expect(plan.monday.rest).toBe(false)
    expect(plan.monday.exercises.length).toBeGreaterThan(0)
  })

  it('parses rest day', () => {
    const text = 'Sunday: Rest'
    const plan = parsePlan(text)
    expect(plan.sunday.rest).toBe(true)
  })

  it('parses multiple days', () => {
    const text = 'Monday: Chest\nTuesday: Back\nWednesday: Rest'
    const plan = parsePlan(text)
    expect(Object.keys(plan)).toHaveLength(3)
    expect(plan.monday).toBeDefined()
    expect(plan.tuesday).toBeDefined()
    expect(plan.wednesday).toBeDefined()
  })

  it('returns empty object for empty text', () => {
    expect(parsePlan('')).toEqual({})
  })
})

// =====================
// USEMACROS HOOK
// =====================
describe('useMacros hook', () => {
  it('returns zero totals for empty meals', () => {
    const { container } = render(
      <MacrosTestWrapper meals={{}} macros={null} date={new Date()} />
    )
    expect(container.querySelector('[data-testid="calories"]').textContent).toBe('0')
    expect(container.querySelector('[data-testid="protein"]').textContent).toBe('0')
    expect(container.querySelector('[data-testid="carbs"]').textContent).toBe('0')
    expect(container.querySelector('[data-testid="fat"]').textContent).toBe('0')
  })

  it('sums meals for a specific date', () => {
    const date = new Date(2026, 0, 15)
    const dateStr = '2026-01-15'
    const meals = {
      [dateStr]: [
        { calories: 500, protein: 40, carbs: 60, fat: 10 },
        { calories: 300, protein: 20, carbs: 30, fat: 15 },
      ]
    }
    const { container } = render(
      <MacrosTestWrapper meals={meals} macros={null} date={date} />
    )
    expect(container.querySelector('[data-testid="calories"]').textContent).toBe('800')
    expect(container.querySelector('[data-testid="protein"]').textContent).toBe('60')
    expect(container.querySelector('[data-testid="carbs"]').textContent).toBe('90')
    expect(container.querySelector('[data-testid="fat"]').textContent).toBe('25')
  })

  it('returns targets when macros provided', () => {
    const macros = { calories: 2500, protein: 180, carbs: 250, fat: 80 }
    const { container } = render(
      <MacrosTestWrapper meals={{}} macros={macros} date={new Date()} />
    )
    expect(container.querySelector('[data-testid="target-calories"]').textContent).toBe('2500')
  })
})

// =====================
// SHARED COMPONENTS
// =====================
describe('MacroBar', () => {
  it('renders with correct label and values', () => {
    const { container } = render(<MacroBar type="calories" current={1500} target={2500} />)
    expect(container.textContent).toContain('CALORIES')
    expect(container.textContent).toContain('1500 / 2500 KCAL')
  })

  it('renders protein bar correctly', () => {
    const { container } = render(<MacroBar type="protein" current={120} target={180} />)
    expect(container.textContent).toContain('PROTEIN')
    expect(container.textContent).toContain('120 / 180 G')
  })

  it('renders zero percentage when no target', () => {
    const { container } = render(<MacroBar type="carbs" current={100} target={0} />)
    const fill = container.querySelector('.macro-bar-fill')
    expect(fill.style.width).toBe('0%')
  })

  it('caps at 100% when over target', () => {
    const { container } = render(<MacroBar type="fat" current={200} target={80} />)
    const fill = container.querySelector('.macro-bar-fill')
    expect(fill.style.width).toBe('100%')
  })

  it('applies CSS class instead of inline transition', () => {
    const { container } = render(<MacroBar type="calories" current={100} target={200} />)
    const fill = container.querySelector('.macro-bar-fill')
    expect(fill.classList.contains('macro-bar-fill')).toBe(true)
    expect(fill.style.boxShadow).toBe('')
    expect(fill.style.transition).toBe('')
  })
})

describe('MealRow', () => {
  it('renders meal data', () => {
    const meal = { name: 'Breakfast', calories: 450, protein: 30, carbs: 50, fat: 15 }
    const { container } = render(<MealRow meal={meal} />)
    expect(container.textContent).toContain('Breakfast')
    expect(container.textContent).toContain('450')
    expect(container.textContent).toContain('P:')
    expect(container.textContent).toContain('C:')
    expect(container.textContent).toContain('F:')
  })

  it('renders photo when available', () => {
    const meal = { name: 'Lunch', calories: 600, protein: 40, carbs: 70, fat: 20, photoUrl: 'data:image/jpeg;base64,abc' }
    const { container } = render(<MealRow meal={meal} />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.src).toContain('data:image/jpeg')
  })
})

describe('ExerciseRow', () => {
  it('renders exercise name and sets', () => {
    const sets = [
      { sets: 3, reps: 10, weight: 80 },
      { sets: 3, reps: 8, weight: 90 },
    ]
    const { container } = render(<ExerciseRow exercise="Bench Press" sets={sets} />)
    expect(container.textContent).toContain('Bench Press')
    expect(container.textContent).toContain('2 SETS')
  })
})

describe('MacroCards', () => {
  it('renders all macro cards', () => {
    const macros = { calories: 2500, protein: 180, carbs: 250, fat: 80 }
    const { container } = render(<MacroCards macros={macros} />)
    expect(container.textContent).toContain('TOTAL ENERGY')
    expect(container.textContent).toContain('PROTEIN')
    expect(container.textContent).toContain('CARBS')
    expect(container.textContent).toContain('FAT')
    expect(container.textContent).toContain('2500')
    expect(container.textContent).toContain('180')
  })

  it('returns null when no macros', () => {
    const { container } = render(<MacroCards macros={null} />)
    expect(container.innerHTML).toBe('')
  })
})
