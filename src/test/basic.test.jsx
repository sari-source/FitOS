import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useMacros } from '../hooks/useMacros'
import { calculateMacros } from '../utils/macroCalc'
import { cleanExercise, parseDayContent, parsePlan } from '../utils/planParser'
import { formatDate, getDayName, getDaysInMonth, getFirstDayOfMonth } from '../utils/dateUtils'
import { getEffectiveStateForDate, shouldFreezeDate } from '../utils/effectiveState'
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
    expect(getDaysInMonth(2028, 1)).toBe(29) // Leap year February
  })

  it('gets first day of month correctly', () => {
    expect(getFirstDayOfMonth(2026, 0)).toBe(4) // Jan 1, 2026 is Thursday
  })

  it('formats dates from strings and pads month/day', () => {
    expect(formatDate('2026-03-04T12:00:00')).toBe('2026-03-04')
  })
})

// =====================
// EFFECTIVE STATE
// =====================
describe('effectiveState', () => {
  const buildPlan = (day, title) => ({
    [day]: { rest: false, title, exercises: [`${title} Lift`] },
  })

  it('uses current plan for today until sets are logged', () => {
    const today = new Date()
    const day = getDayName(today)
    const dateStr = formatDate(today)
    const oldPlan = buildPlan(day, 'Old')
    const currentPlan = buildPlan(day, 'Current')

    const { effectivePlan } = getEffectiveStateForDate({
      date: today,
      plan: currentPlan,
      macros: null,
      logs: {},
      planHistory: [{ date: dateStr, plan: oldPlan, macros: null }],
      baseline: { plan: oldPlan, macros: null },
    })

    expect(shouldFreezeDate(today, {})).toBe(false)
    expect(effectivePlan[day].title).toBe('Current')
  })

  it('keeps today on the first logged plan after sets are logged', () => {
    const today = new Date()
    const day = getDayName(today)
    const dateStr = formatDate(today)
    const firstLoggedPlan = buildPlan(day, 'Logged')
    const laterPlan = buildPlan(day, 'Later')
    const currentPlan = buildPlan(day, 'Current')

    const { effectivePlan } = getEffectiveStateForDate({
      date: today,
      plan: currentPlan,
      macros: null,
      logs: { [dateStr]: [{ exercise: 'Logged Lift', sets: 1, reps: 8, weight: 60 }] },
      planHistory: [
        { date: dateStr, plan: firstLoggedPlan, macros: null },
        { date: dateStr, plan: laterPlan, macros: null },
      ],
      baseline: { plan: firstLoggedPlan, macros: null },
    })

    expect(shouldFreezeDate(today, { [dateStr]: [{ exercise: 'Logged Lift' }] })).toBe(true)
    expect(effectivePlan[day].title).toBe('Logged')
  })

  it('does not freeze a converted rest day to a snapshot that had the exercise on another day', () => {
    const today = new Date()
    const day = getDayName(today)
    const otherDay = day === 'monday' ? 'tuesday' : 'monday'
    const dateStr = formatDate(today)
    const oldPlan = {
      [day]: { rest: true, title: 'Recovery', exercises: [] },
      [otherDay]: { rest: false, title: 'Other Push', exercises: ['Bench Press'] },
    }
    const currentPlan = {
      ...oldPlan,
      [day]: { rest: false, title: 'Converted Push', exercises: ['Bench Press'] },
    }

    const { effectivePlan } = getEffectiveStateForDate({
      date: today,
      plan: currentPlan,
      macros: null,
      logs: { [dateStr]: [{ exercise: 'Bench Press', sets: 1, reps: 8, weight: 60 }] },
      planHistory: [{ date: dateStr, plan: oldPlan, macros: null }],
      baseline: { plan: oldPlan, macros: null },
    })

    expect(effectivePlan[day].title).toBe('Converted Push')
    expect(effectivePlan[day].rest).toBe(false)
  })

  it('uses the next snapshot for frozen past dates', () => {
    const today = new Date()
    const pastDate = new Date(today)
    pastDate.setDate(today.getDate() - 3)
    const firstChange = new Date(today)
    firstChange.setDate(today.getDate() - 2)
    const secondChange = new Date(today)
    secondChange.setDate(today.getDate() - 1)

    const day = getDayName(pastDate)
    const originalPlan = buildPlan(day, 'Original')
    const middlePlan = buildPlan(day, 'Middle')
    const currentPlan = buildPlan(day, 'Current')

    const { effectivePlan } = getEffectiveStateForDate({
      date: pastDate,
      plan: currentPlan,
      macros: null,
      logs: {},
      planHistory: [
        { date: formatDate(firstChange), plan: originalPlan, macros: null },
        { date: formatDate(secondChange), plan: middlePlan, macros: null },
      ],
      baseline: { plan: originalPlan, macros: null },
    })

    expect(effectivePlan[day].title).toBe('Original')
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

  it('returns null for invalid stored JSON', () => {
    localStorage.setItem('broken', '{nope')
    expect(storage.get('broken')).toBeNull()
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

  it('calculates female profile and aggressive cut', () => {
    const result = calculateMacros({ weight: 65, height: 165, age: 30, sex: 'female', activityLevel: 1.375, goal: 'agg_cut' })
    expect(result.calories).toBeGreaterThan(0)
    expect(result.protein).toBeGreaterThan(result.fat)
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
  it('cleans exercise metadata', () => {
    expect(cleanExercise('1. Bench Press 3x8 @ 60kg')).toBe('Bench Press')
    expect(cleanExercise('- Squat (warm up) 4 sets')).toBe('Squat')
  })

  it('parses day content with title and exercises', () => {
    expect(parseDayContent('Push: Bench Press, Shoulder Press')).toEqual({
      title: 'Push',
      exercises: ['Bench Press', 'Shoulder Press'],
    })
  })

  it('parses rest day content', () => {
    expect(parseDayContent('Off day')).toEqual({ title: 'Recovery', exercises: [] })
  })

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

  it('parses abbreviated weekdays with bullets and set details', () => {
    const text = 'Mon - Push\n- Bench Press 3x8\n- Incline DB Press 3x10\nTue: Pull\n1. Deadlift 3x5'
    const plan = parsePlan(text)
    expect(plan.monday.title).toBe('Push')
    expect(plan.monday.exercises).toEqual(['Bench Press', 'Incline DB Press'])
    expect(plan.tuesday.title).toBe('Pull')
    expect(plan.tuesday.exercises).toEqual(['Deadlift'])
  })

  it('parses exercise labels as exercises instead of titles', () => {
    const text = 'Monday: Chest\nExercise 1: Bench Press\nEx 2: Cable Flyes'
    const plan = parsePlan(text)
    expect(plan.monday.title).toBe('Chest')
    expect(plan.monday.exercises).toEqual(['Bench Press', 'Cable Flyes'])
  })

  it('merges duplicate days', () => {
    const text = 'Monday: Chest\nExercise 1: Bench Press\nMon: Triceps\nExercise 2: Rope Pushdown'
    const plan = parsePlan(text)
    expect(Object.keys(plan)).toHaveLength(1)
    expect(plan.monday.title).toBe('Triceps')
    expect(plan.monday.exercises).toEqual(['Bench Press', 'Rope Pushdown'])
  })

  it('parses day number plans', () => {
    const text = 'Day 1 - Push: Bench Press, Shoulder Press\nDay 2 - Recovery\nDay 3 - Legs\n- Squat 4x6'
    const plan = parsePlan(text)
    expect(plan.monday.exercises).toEqual(['Bench Press', 'Shoulder Press'])
    expect(plan.tuesday.rest).toBe(true)
    expect(plan.wednesday.title).toBe('Legs')
    expect(plan.wednesday.exercises).toEqual(['Squat'])
  })

  it('ignores lines before the first day', () => {
    const plan = parsePlan('Weekly plan\nNotes first\nFriday: Legs\n- Squat')
    expect(Object.keys(plan)).toEqual(['friday'])
    expect(plan.friday.exercises).toEqual(['Squat'])
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

  it('ignores malformed meals data', () => {
    const { container } = render(
      <MacrosTestWrapper meals={[]} macros={null} date={new Date()} />
    )
    expect(container.querySelector('[data-testid="calories"]').textContent).toBe('0')
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

  it('renders unknown macro type without crashing', () => {
    const { container } = render(<MacroBar type="calories" current={0} target={100} />)
    expect(container.textContent).toContain('0 / 100 KCAL')
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

  it('renders individual logged set details', () => {
    const sets = [{ sets: 1, reps: 8, weight: 60 }]
    const { container } = render(<ExerciseRow exercise="Squat" sets={sets} />)
    expect(container.textContent).toContain('1x8')
    expect(container.textContent).toContain('60kg')
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
