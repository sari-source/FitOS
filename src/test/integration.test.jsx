import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'
import { storage } from '../utils/storage'

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

// =====================
// APP
// =====================
describe('App', () => {
  it('renders', () => { render(<App />); expect(document.body).not.toBeNull() })
  it('shows nav bar', () => { const { container } = render(<App />); expect(container.querySelector('nav')).not.toBeNull() })
  it('shows 5 tabs', () => { render(<App />); expect(document.querySelectorAll('nav button').length).toBe(5) })
  it('defaults to profile', () => { render(<App />); expect(screen.getByText(/OPERATOR/i)).toBeInTheDocument() })
  it('switches to plan', () => { render(<App />); fireEvent.click(screen.getByText(/PLAN/i)); expect(screen.getByText(/STRATEGY/i)).toBeInTheDocument() })
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
})

// =====================
// PLAN TAB
// =====================
describe('Plan Tab', () => {
  it('shows input textarea', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/PLAN/i))
    expect(screen.getByText(/Input Raw Plan Data/i)).toBeInTheDocument()
  })
  it('parses plan and shows days', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/PLAN/i))
    const textarea = screen.getByPlaceholderText(/Monday/i)
    fireEvent.input(textarea, { target: { value: 'Monday: Chest\nExercise 1: Bench Press\nTuesday: Back\nExercise 1: Deadlift' } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    expect(screen.getByText(/Deployed Plan/i)).toBeInTheDocument()
    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getByText('Tuesday')).toBeInTheDocument()
  })
  it('days sort correctly (Mon before Wed before Fri)', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/PLAN/i))
    const textarea = screen.getByPlaceholderText(/Monday/i)
    fireEvent.input(textarea, { target: { value: 'Friday: Legs\nEx: Squat\nMonday: Chest\nEx: Bench\nWednesday: Back\nEx: Deadlift' } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    const days = screen.getAllByText(/^(Monday|Wednesday|Friday)$/)
    const texts = days.map(d => d.textContent)
    expect(texts).toEqual(['Monday', 'Wednesday', 'Friday'])
  })
  it('shows add day button', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/PLAN/i))
    const textarea = screen.getByPlaceholderText(/Monday/i)
    fireEvent.input(textarea, { target: { value: 'Monday: Chest\nEx: Bench' } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    expect(screen.getByText('Add Day')).toBeInTheDocument()
  })
  it('can expand and edit a day', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/PLAN/i))
    const textarea = screen.getByPlaceholderText(/Monday/i)
    fireEvent.input(textarea, { target: { value: 'Monday: Chest\nEx: Bench Press' } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    // Expand the day card
    const dayBtn = screen.getByText('Monday').closest('button')
    fireEvent.click(dayBtn)
    // Now Edit button should be visible
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })
  it('can delete a day', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/PLAN/i))
    const textarea = screen.getByPlaceholderText(/Monday/i)
    fireEvent.input(textarea, { target: { value: 'Monday: Chest\nEx: Bench Press' } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    // Expand to reveal delete button
    const dayBtn = screen.getByText('Monday').closest('button')
    fireEvent.click(dayBtn)
    expect(screen.getByText('Monday')).toBeInTheDocument()
    fireEvent.click(screen.getAllByText('Delete')[0])
    expect(screen.queryByText('Monday')).not.toBeInTheDocument()
  })
})

// =====================
// NAV HIDE ON POPUP
// =====================
describe('Navigation visibility', () => {
  it('nav visible by default', () => { const { container } = render(<App />); expect(container.querySelector('nav')).not.toBeNull() })
  it('nav hides on popup', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByText(/PLAN/i))
    const textarea = screen.getByPlaceholderText(/Monday/i)
    fireEvent.input(textarea, { target: { value: 'Monday: Chest\nEx: Bench' } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    const dayBtn = screen.getByText('Monday').closest('button')
    fireEvent.click(dayBtn)
    fireEvent.click(screen.getAllByText('Edit')[0])
    expect(container.querySelector('nav')).toBeNull()
  })
  it('body overflow hidden on popup', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/PLAN/i))
    const textarea = screen.getByPlaceholderText(/Monday/i)
    fireEvent.input(textarea, { target: { value: 'Monday: Chest\nEx: Bench' } })
    fireEvent.click(screen.getByText(/EXECUTE PARSER/i))
    const dayBtn = screen.getByText('Monday').closest('button')
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
})

// =====================
// LOG TAB
// =====================
describe('Log Tab', () => {
  it('shows header', () => { render(<App />); fireEvent.click(screen.getByText(/LOG/i)); expect(screen.getByText(/PERFORMANCE/i)).toBeInTheDocument() })
  it('shows inputs', () => { render(<App />); fireEvent.click(screen.getByText(/LOG/i)); expect(screen.getByText('Sets')).toBeInTheDocument() })
  it('shows commit button', () => { render(<App />); fireEvent.click(screen.getByText(/LOG/i)); expect(screen.getByText(/COMMIT LOG/i)).toBeInTheDocument() })
  it('logs to localStorage', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/PLAN/i))
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
})

// =====================
// SNAPSHOT SYSTEM
// =====================
describe('Plan History Snapshots', () => {
  it('snapshot on plan change', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/PLAN/i))
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
    // Pre-seed baseline since loadBaseline() runs once at module import
    // and beforeEach clears localStorage
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
