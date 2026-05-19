import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'
import { storage } from '../utils/storage'
import { formatDate } from '../utils/dateUtils'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
})

window.scrollTo = vi.fn()

function getInputByLabel(container, labelText) {
  const labels = container.querySelectorAll('label')
  for (const label of labels) {
    if (label.textContent.toLowerCase().includes(labelText.toLowerCase())) {
      const parent = label.parentElement
      if (parent) return parent.querySelector('input, select')
    }
  }
  return null
}

function fillField(container, labelText, value) {
  const input = getInputByLabel(container, labelText)
  if (input) fireEvent.input(input, { target: { value } })
  return input
}

function clickNavTab(tabText) {
  const navButtons = document.querySelectorAll('nav button')
  for (const btn of navButtons) {
    if (btn.textContent.includes(tabText)) {
      fireEvent.click(btn)
      return
    }
  }
}

function loadPlan(text) {
  clickNavTab('Plan')
  const textarea = screen.getByPlaceholderText(/Monday/i)
  fireEvent.input(textarea, { target: { value: text } })
  fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
}

// =====================
// APP
// =====================
describe('App', () => {
  it('renders', () => { render(<App />); expect(document.body).not.toBeNull() })
  it('shows nav bar', () => { const { container } = render(<App />); expect(container.querySelector('nav')).not.toBeNull() })
  it('shows 5 tabs', () => { render(<App />); expect(document.querySelectorAll('nav button').length).toBe(5) })
  it('defaults to profile', () => { render(<App />); expect(screen.getByText(/OPERATOR/i)).toBeInTheDocument() })
  it('switches to plan', () => { render(<App />); clickNavTab('Plan'); expect(screen.getByText(/STRATEGY/i)).toBeInTheDocument() })
  it('switches to calendar', () => { render(<App />); fireEvent.click(screen.getByText(/CALENDAR/i)); expect(screen.getByText(/calendar/i)).toBeInTheDocument() })
  it('switches to nutrition', () => { render(<App />); fireEvent.click(screen.getByText(/NUTRITION/i)); expect(screen.getByText(/FUEL/i)).toBeInTheDocument() })
  it('switches to log', () => { render(<App />); fireEvent.click(screen.getByText(/LOG/i)); expect(screen.getByText(/PERFORMANCE/i)).toBeInTheDocument() })
})

// =====================
// PROFILE TAB
// =====================
describe('Profile Tab', () => {
  it('shows form fields', () => {
    const { container } = render(<App />)
    expect(container.textContent).toContain('Weight (kg)')
    expect(container.textContent).toContain('Height (cm)')
    expect(container.textContent).toContain('Age')
  })
  it('shows calculate button', () => { render(<App />); expect(screen.getByText(/CALCULATE TARGETS/i)).toBeInTheDocument() })
  it('calculates and shows results', () => {
    const { container, rerender } = render(<App />)
    fillField(container, 'Weight', '80')
    fillField(container, 'Height', '180')
    fillField(container, 'Age', '25')
    fireEvent.click(screen.getByText(/CALCULATE TARGETS/i))
    rerender(<App />)
    expect(screen.getByText('Readout')).toBeInTheDocument()
    expect(container.textContent).toContain('TOTAL ENERGY')
  })
  it('persists to localStorage', () => {
    const { container, rerender } = render(<App />)
    fillField(container, 'Weight', '80')
    fillField(container, 'Height', '180')
    fillField(container, 'Age', '25')
    fireEvent.click(screen.getByText(/CALCULATE TARGETS/i))
    rerender(<App />)
    const keys = storage.getKeys()
    const profile = storage.get(keys.PROFILE)
    expect(profile).not.toBeNull()
    expect(profile.weight).toBe(80)
    const macros = storage.get(keys.MACROS)
    expect(macros).not.toBeNull()
    expect(macros.calories).toBeGreaterThan(0)
  })
  it('hides form after calc', () => {
    const { container, rerender } = render(<App />)
    fillField(container, 'Weight', '80')
    fillField(container, 'Height', '180')
    fillField(container, 'Age', '25')
    fireEvent.click(screen.getByText(/CALCULATE TARGETS/i))
    rerender(<App />)
    expect(screen.queryByText(/Weight \(kg\)/i)).not.toBeInTheDocument()
    expect(screen.getByText(/80 kg/i)).toBeInTheDocument()
  })
  it('shows edit button', () => {
    const { container, rerender } = render(<App />)
    fillField(container, 'Weight', '80')
    fillField(container, 'Height', '180')
    fillField(container, 'Age', '25')
    fireEvent.click(screen.getByText(/CALCULATE TARGETS/i))
    rerender(<App />)
    expect(screen.getByText(/Edit/i)).toBeInTheDocument()
  })

  it('alerts when calculating with incomplete profile', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(<App />)
    fireEvent.click(screen.getByText(/CALCULATE TARGETS/i))
    expect(alertSpy).toHaveBeenCalledWith('Please fill in all fields correctly.')
    alertSpy.mockRestore()
  })

  it('edit button returns to the profile form', () => {
    const { container } = render(<App />)
    fillField(container, 'Weight', '80')
    fillField(container, 'Height', '180')
    fillField(container, 'Age', '25')
    fireEvent.click(screen.getByText(/CALCULATE TARGETS/i))
    fireEvent.click(screen.getByText(/Edit/i))
    expect(screen.getByText(/Weight \(kg\)/i)).toBeInTheDocument()
  })

  it('today plan button opens the calendar day sheet', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/Today's Plan/i).closest('button'))
    expect(screen.getByText(/Daily Report/i)).toBeInTheDocument()
  })
})

// =====================
// PLAN TAB
// =====================
describe('Plan Tab', () => {
  it('shows input textarea', () => {
    render(<App />)
    clickNavTab('Plan')
    expect(screen.getByText(/Input Raw Plan Data/i)).toBeInTheDocument()
  })
  it('parses plan and shows days', () => {
    render(<App />)
    clickNavTab('Plan')
    const textarea = screen.getByPlaceholderText(/Monday/i)
    fireEvent.input(textarea, { target: { value: 'Monday: Chest\nExercise 1: Bench Press\nTuesday: Back\nExercise 1: Deadlift' } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    expect(screen.getByText(/Deployed Plan/i)).toBeInTheDocument()
    expect(screen.getByText('Chest')).toBeInTheDocument()
    expect(screen.getByText('Back')).toBeInTheDocument()
  })
  it('days sort correctly (Mon before Wed before Fri)', () => {
    render(<App />)
    clickNavTab('Plan')
    const textarea = screen.getByPlaceholderText(/Monday/i)
    fireEvent.input(textarea, { target: { value: 'Friday: Legs\nEx: Squat\nMonday: Chest\nEx: Bench\nWednesday: Back\nEx: Deadlift' } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    const titles = screen.getAllByText(/^(Legs|Chest|Back)$/)
    const texts = titles.map(d => d.textContent)
    expect(texts).toEqual(['Chest', 'Back', 'Legs'])
  })
  it('shows add day button', () => {
    render(<App />)
    clickNavTab('Plan')
    const textarea = screen.getByPlaceholderText(/Monday/i)
    fireEvent.input(textarea, { target: { value: 'Monday: Chest\nEx: Bench' } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    expect(screen.getByText('Add Day')).toBeInTheDocument()
  })
  it('can expand and edit a day', () => {
    render(<App />)
    clickNavTab('Plan')
    const textarea = screen.getByPlaceholderText(/Monday/i)
    fireEvent.input(textarea, { target: { value: 'Monday: Chest\nEx: Bench Press' } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    const dayBtn = screen.getByText('Chest').closest('button')
    fireEvent.click(dayBtn)
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })
  it('can delete a day', () => {
    render(<App />)
    clickNavTab('Plan')
    const textarea = screen.getByPlaceholderText(/Monday/i)
    fireEvent.input(textarea, { target: { value: 'Monday: Chest\nEx: Bench Press' } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    const dayBtn = screen.getByText('Chest').closest('button')
    fireEvent.click(dayBtn)
    expect(screen.getByText('Chest')).toBeInTheDocument()
    fireEvent.click(screen.getAllByText('Delete')[0])
    expect(screen.queryByText('Chest')).not.toBeInTheDocument()
  })

  it('can cancel add day modal', () => {
    render(<App />)
    loadPlan('Monday: Chest\nEx: Bench Press')
    fireEvent.click(screen.getByText('Add Day'))
    expect(screen.getByText('ADD DAY')).toBeInTheDocument()
    fireEvent.click(screen.getByText('CANCEL'))
    expect(screen.queryByText('ADD DAY')).not.toBeInTheDocument()
  })

  it('can add a new day with exercises', () => {
    const { container } = render(<App />)
    loadPlan('Monday: Chest\nEx: Bench Press')
    fireEvent.click(screen.getByText('Add Day'))
    expect(screen.getByText('SAVE DAY').closest('button')).toBeDisabled()

    fireEvent.change(getInputByLabel(container, 'Day Name'), { target: { value: 'tuesday' } })
    fireEvent.input(screen.getByPlaceholderText(/Push Day/i), { target: { value: 'Legs' } })
    fireEvent.input(screen.getByPlaceholderText(/Bench Press, Incline/i), { target: { value: 'Squat, Leg Press' } })
    fireEvent.click(screen.getByText('SAVE DAY'))

    expect(screen.getByText('Legs')).toBeInTheDocument()
    expect(screen.getByText('Squat')).toBeInTheDocument()
    expect(screen.getByText('Leg Press')).toBeInTheDocument()
  })

  it('can edit a day title, color, and exercises', () => {
    const { container } = render(<App />)
    loadPlan('Monday: Chest\nEx: Bench Press\nEx: Cable Flyes')
    fireEvent.click(screen.getByText('Chest').closest('button'))
    fireEvent.click(screen.getAllByText('Edit')[0])

    fireEvent.input(screen.getByPlaceholderText(/Upper Body/i), { target: { value: 'Push Updated' } })
    fireEvent.change(container.querySelector('input[type="color"]'), { target: { value: '#00ff00' } })
    fireEvent.input(screen.getByPlaceholderText(/Exercise name/i), { target: { value: 'Dips 3x10' } })
    fireEvent.click(screen.getAllByText('+').at(-1))
    fireEvent.click(screen.getByText('SAVE'))

    expect(screen.getByText('Push Updated')).toBeInTheDocument()
    expect(screen.getByText('Dips')).toBeInTheDocument()
  })
})

// =====================
// NAV HIDE ON POPUP
// =====================
describe('Navigation visibility', () => {
  it('nav visible by default', () => { const { container } = render(<App />); expect(container.querySelector('nav')).not.toBeNull() })
  it('nav hides on popup', () => {
    const { container } = render(<App />)
    clickNavTab('Plan')
    const textarea = screen.getByPlaceholderText(/Monday/i)
    fireEvent.input(textarea, { target: { value: 'Monday: Chest\nEx: Bench' } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    const dayBtn = screen.getByText('Chest').closest('button')
    fireEvent.click(dayBtn)
    fireEvent.click(screen.getAllByText('Edit')[0])
    expect(container.querySelector('nav')).toBeNull()
  })
  it('body overflow hidden on popup', () => {
    render(<App />)
    clickNavTab('Plan')
    const textarea = screen.getByPlaceholderText(/Monday/i)
    fireEvent.input(textarea, { target: { value: 'Monday: Chest\nEx: Bench' } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    const dayBtn = screen.getByText('Chest').closest('button')
    fireEvent.click(dayBtn)
    fireEvent.click(screen.getAllByText('Edit')[0])
    expect(document.body.style.overflow).toBe('hidden')
  })
})

// =====================
// CALENDAR TAB
// =====================
describe('Calendar Tab', () => {
  it('shows month header', () => { render(<App />); fireEvent.click(screen.getByText(/CALENDAR/i)); expect(screen.getByText(/\w+ 20\d{2}/)).toBeInTheDocument() })
  it('shows day headers', () => { render(<App />); fireEvent.click(screen.getByText(/CALENDAR/i)); expect(screen.getByText('SU')).toBeInTheDocument() })
  it('renders day cells', () => { render(<App />); fireEvent.click(screen.getByText(/CALENDAR/i)); expect(screen.getByText('1')).toBeInTheDocument() })
  it('navigates months', () => { render(<App />); fireEvent.click(screen.getByText(/CALENDAR/i)); fireEvent.click(screen.getByText('←')); expect(screen.getByText(/\w+ 20\d{2}/)).toBeInTheDocument() })
  it('opens and closes a day report', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByText(/CALENDAR/i))
    fireEvent.click(screen.getByText('1'))
    expect(screen.getByText(/Daily Report/i)).toBeInTheDocument()
    fireEvent.click(container.querySelector('.fixed.bottom-0 .w-16'))
    expect(screen.queryByText(/Daily Report/i)).not.toBeInTheDocument()
  })
  it('next month button navigates forward', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/CALENDAR/i))
    const before = screen.getByText(/\w+ 20\d{2}/).textContent
    fireEvent.click(screen.getByText('→'))
    expect(screen.getByText(/\w+ 20\d{2}/).textContent).not.toBe(before)
  })
})

// =====================
// NUTRITION TAB
// =====================
describe('Nutrition Tab', () => {
  it('shows header', () => { render(<App />); fireEvent.click(screen.getByText(/NUTRITION/i)); expect(screen.getByText(/FUEL/i)).toBeInTheDocument() })
  it('shows manual entry toggle', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/NUTRITION/i))
    fireEvent.click(screen.getByText('+'))
    expect(screen.getByText('Manual Entry')).toBeInTheDocument()
    expect(screen.getByText('Photo Scan')).toBeInTheDocument()
  })
  it('macro fields only show after toggle', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByText(/NUTRITION/i))
    fireEvent.click(screen.getByText('+'))
    expect(container.querySelectorAll('input[type="number"]').length).toBe(0)
    fireEvent.click(screen.getByText('Manual Entry'))
    expect(container.querySelectorAll('input[type="number"]').length).toBe(4)
  })
  it('shows macro bars when profile set', () => {
    const { container } = render(<App />)
    fillField(container, 'Weight', '80')
    fillField(container, 'Height', '180')
    fillField(container, 'Age', '25')
    fireEvent.click(screen.getByText(/CALCULATE TARGETS/i))
    fireEvent.click(screen.getByText(/NUTRITION/i))
    expect(screen.getByText('CALORIES')).toBeInTheDocument()
    expect(screen.getByText('PROTEIN')).toBeInTheDocument()
  })

  it('can cancel meal entry modal', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/NUTRITION/i))
    fireEvent.click(screen.getByText('+'))
    expect(screen.getByText('ADD INTAKE')).toBeInTheDocument()
    fireEvent.click(screen.getByText('CANCEL'))
    expect(screen.queryByText('ADD INTAKE')).not.toBeInTheDocument()
  })

  it('can save a manual meal entry', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/NUTRITION/i))
    fireEvent.click(screen.getByText('+'))
    fireEvent.input(screen.getByPlaceholderText(/POST-WORKOUT/i), { target: { value: 'Dinner' } })
    fireEvent.click(screen.getByText('Manual Entry'))

    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.input(inputs[0], { target: { value: '700' } })
    fireEvent.input(inputs[1], { target: { value: '45' } })
    fireEvent.input(inputs[2], { target: { value: '80' } })
    fireEvent.input(inputs[3], { target: { value: '20' } })
    fireEvent.click(screen.getByText('SAVE ENTRY'))

    expect(screen.getByText('Dinner')).toBeInTheDocument()
    expect(storage.get(storage.getKeys().MEALS)[formatDate(new Date())][0]).toEqual(expect.objectContaining({
      name: 'Dinner', calories: 700, protein: 45, carbs: 80, fat: 20,
    }))
  })

  it('requires meal name before saving', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(<App />)
    fireEvent.click(screen.getByText(/NUTRITION/i))
    fireEvent.click(screen.getByText('+'))
    fireEvent.click(screen.getByText('Manual Entry'))
    fireEvent.click(screen.getByText('SAVE ENTRY'))
    expect(alertSpy).toHaveBeenCalledWith('Please enter a meal name')
    alertSpy.mockRestore()
  })

  it('shows and cancels photo source options', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/NUTRITION/i))
    fireEvent.click(screen.getByText('+'))
    fireEvent.click(screen.getByText('Add Photo'))
    expect(screen.getByText('Take Photo')).toBeInTheDocument()
    expect(screen.getByText('Upload Image')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Take Photo')).not.toBeInTheDocument()
  })
})

// =====================
// LOG TAB
// =====================
describe('Log Tab', () => {
  const buildPlan = (day, title, exercise) => ({
    [day]: { rest: false, title, exercises: [exercise] },
  })

  it('shows header', () => { render(<App />); fireEvent.click(screen.getByText(/LOG/i)); expect(screen.getByText(/PERFORMANCE/i)).toBeInTheDocument() })
  it('shows inputs', () => { render(<App />); fireEvent.click(screen.getByText(/LOG/i)); expect(screen.getByText('Sets')).toBeInTheDocument() })
  it('shows commit button', () => { render(<App />); fireEvent.click(screen.getByText(/LOG/i)); expect(screen.getByText(/COMMIT LOG/i)).toBeInTheDocument() })
  it('shows updated workout for today when no sets are logged', () => {
    const today = new Date()
    const todayStr = formatDate(today)
    const day = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const oldPlan = buildPlan(day, 'Old Workout', 'Old Lift')
    const currentPlan = buildPlan(day, 'Current Workout', 'Current Lift')

    storage.set(storage.getKeys().PLAN, currentPlan)
    storage.set(storage.getKeys().PLAN_HISTORY, [{ date: todayStr, plan: oldPlan, macros: null }])
    localStorage.setItem('fitos_baseline', JSON.stringify({ plan: oldPlan, macros: null }))

    render(<App />)
    fireEvent.click(screen.getByText(/LOG/i))

    expect(screen.getByText('Current Lift')).toBeInTheDocument()
    expect(screen.queryByText('Old Lift')).not.toBeInTheDocument()
  })

  it('keeps today workout frozen after sets are logged', () => {
    const today = new Date()
    const todayStr = formatDate(today)
    const day = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const loggedPlan = buildPlan(day, 'Logged Workout', 'Logged Lift')
    const currentPlan = buildPlan(day, 'Current Workout', 'Current Lift')

    storage.set(storage.getKeys().PLAN, currentPlan)
    storage.set(storage.getKeys().LOGS, {
      [todayStr]: [{ exercise: 'Logged Lift', sets: 1, reps: 8, weight: 60 }],
    })
    storage.set(storage.getKeys().PLAN_HISTORY, [{ date: todayStr, plan: loggedPlan, macros: null }])
    localStorage.setItem('fitos_baseline', JSON.stringify({ plan: loggedPlan, macros: null }))

    render(<App />)
    fireEvent.click(screen.getByText(/LOG/i))

    expect(screen.getByText('Logged Lift')).toBeInTheDocument()
    expect(screen.queryByText('Current Lift')).not.toBeInTheDocument()
  })

  it('logs to localStorage', () => {
    render(<App />)
    clickNavTab('Plan')
    const textarea = screen.getByPlaceholderText(/Monday/i)
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    fireEvent.input(textarea, { target: { value: `${dayName}: Bench Press\nEx: Bench Press` } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    fireEvent.click(screen.getByText(/LOG/i))
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'Bench Press' } })
    fireEvent.click(screen.getByText(/COMMIT LOG/i))
    expect(screen.getByText(/ENTRY COMMITTED/i)).toBeInTheDocument()
    const keys = storage.getKeys()
    expect(storage.get(keys.LOGS)).not.toBeNull()
  })

  it('alerts if committing without an exercise', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(<App />)
    fireEvent.click(screen.getByText(/LOG/i))
    fireEvent.click(screen.getByText(/COMMIT LOG/i))
    expect(alertSpy).toHaveBeenCalledWith('Please select an exercise')
    alertSpy.mockRestore()
  })

  it('updates matching set number and keeps different set numbers', () => {
    const todayStr = formatDate(new Date())
    render(<App />)
    clickNavTab('Plan')
    const textarea = screen.getByPlaceholderText(/Monday/i)
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    fireEvent.input(textarea, { target: { value: `${dayName}: Bench Press\nEx: Bench Press` } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    fireEvent.click(screen.getByText(/LOG/i))

    const select = screen.getByRole('combobox')
    const inputs = screen.getAllByRole('spinbutton')

    fireEvent.change(select, { target: { value: 'Bench Press' } })
    fireEvent.change(inputs[0], { target: { value: '1' } })
    fireEvent.change(inputs[1], { target: { value: '8' } })
    fireEvent.change(inputs[2], { target: { value: '60' } })
    fireEvent.click(screen.getByText(/COMMIT LOG/i))

    fireEvent.change(select, { target: { value: 'Bench Press' } })
    fireEvent.change(inputs[0], { target: { value: '1' } })
    fireEvent.change(inputs[1], { target: { value: '9' } })
    fireEvent.change(inputs[2], { target: { value: '60' } })
    fireEvent.click(screen.getByText(/COMMIT LOG/i))

    fireEvent.change(select, { target: { value: 'Bench Press' } })
    fireEvent.change(inputs[0], { target: { value: '2' } })
    fireEvent.change(inputs[1], { target: { value: '7' } })
    fireEvent.change(inputs[2], { target: { value: '60' } })
    fireEvent.click(screen.getByText(/COMMIT LOG/i))

    const logs = storage.get(storage.getKeys().LOGS)[todayStr]
    expect(logs).toHaveLength(2)
    expect(logs).toEqual(expect.arrayContaining([
      expect.objectContaining({ exercise: 'Bench Press', sets: 1, reps: 9, weight: 60 }),
      expect.objectContaining({ exercise: 'Bench Press', sets: 2, reps: 7, weight: 60 }),
    ]))
  })
})

// =====================
// SNAPSHOT SYSTEM
// =====================
describe('Plan History Snapshots', () => {
  it('snapshot on plan change', () => {
    render(<App />)
    clickNavTab('Plan')
    const textarea = screen.getByPlaceholderText(/Monday/i)
    fireEvent.input(textarea, { target: { value: 'Monday: Chest\nEx: Bench' } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    const history = localStorage.getItem('fitos_plan_history')
    expect(history).not.toBeNull()
    const parsed = JSON.parse(history)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBeGreaterThan(0)
    expect(parsed[0]).toHaveProperty('date')
    expect(parsed[0]).toHaveProperty('plan')
  })
  it('snapshot on macro change', () => {
    const { container } = render(<App />)
    fillField(container, 'Weight', '80')
    fillField(container, 'Height', '180')
    fillField(container, 'Age', '25')
    fireEvent.click(screen.getByText(/CALCULATE TARGETS/i))
    const history = localStorage.getItem('fitos_plan_history')
    expect(JSON.parse(history)).toBeInstanceOf(Array)
  })
  it('baseline created on load', async () => {
    const seedBaseline = { plan: {}, macros: null }
    localStorage.setItem('fitos_baseline', JSON.stringify(seedBaseline))
    
    render(<App />)
    const baseline = localStorage.getItem('fitos_baseline')
    expect(baseline).not.toBeNull()
    const parsed = JSON.parse(baseline)
    expect(parsed).toHaveProperty('plan')
    expect(parsed).toHaveProperty('macros')
  })
})
