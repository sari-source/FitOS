import { useReducer, useRef, useEffect } from 'react';
import { storage } from '../utils/storage';

const SNAPSHOT_KEY = 'fitos_plan_history';
const BASELINE_KEY = 'fitos_baseline';

function loadBaseline() {
  const stored = localStorage.getItem(BASELINE_KEY);
  if (stored) return JSON.parse(stored);
  
  const profile = storage.get(storage.getKeys().PROFILE);
  const macros = storage.get(storage.getKeys().MACROS);
  const plan = storage.get(storage.getKeys().PLAN) || {};
  
  const snap = { plan: JSON.parse(JSON.stringify(plan)), macros: macros ? JSON.parse(JSON.stringify(macros)) : null };
  localStorage.setItem(BASELINE_KEY, JSON.stringify(snap));
  return snap;
}

const baseline = loadBaseline();
const rawHistory = storage.get(SNAPSHOT_KEY);
const initialPlanHistory = Array.isArray(rawHistory) ? rawHistory : [];

const initialState = {
  profile: storage.get(storage.getKeys().PROFILE),
  macros: storage.get(storage.getKeys().MACROS),
  plan: storage.get(storage.getKeys().PLAN) || {},
  logs: storage.get(storage.getKeys().LOGS) || {},
  meals: (storage.get(storage.getKeys().MEALS) && typeof storage.get(storage.getKeys().MEALS) === 'object' && !Array.isArray(storage.get(storage.getKeys().MEALS))) ? storage.get(storage.getKeys().MEALS) : {},
  planHistory: initialPlanHistory,
  baseline,
  calMonth: new Date(),
  selectedCalDate: null,
  isPopupOpen: false,
};

function appReducer(state, action) {
  const todayStr = new Date().toISOString().split('T')[0];

  const pushSnapshot = (currentState) => {
    const snap = { plan: JSON.parse(JSON.stringify(currentState.plan)), macros: currentState.macros ? JSON.parse(JSON.stringify(currentState.macros)) : null, date: todayStr };
    const updated = [...(currentState.planHistory || []), snap];
    storage.set(SNAPSHOT_KEY, updated);
    return updated;
  };

  switch (action.type) {
    case 'SET_POPUP_STATE':
      return { ...state, isPopupOpen: action.payload };
    case 'SET_PLAN': {
      const updatedHistory = pushSnapshot(state);
      storage.set(storage.getKeys().PLAN, action.payload);
      return { ...state, plan: action.payload, planHistory: updatedHistory };
    }
    case 'UPDATE_PLAN_DAY': {
      const updatedHistory = pushSnapshot(state);
      const { day, data, oldDay } = action.payload;
      const updatedPlan = { ...state.plan };
      
      if (oldDay && oldDay !== day) {
        const existingData = updatedPlan[day];
        if (existingData) {
          updatedPlan[oldDay] = existingData;
        } else {
          delete updatedPlan[oldDay];
        }
      }
      
      updatedPlan[day] = data;
      storage.set(storage.getKeys().PLAN, updatedPlan);
      return { ...state, plan: updatedPlan, planHistory: updatedHistory };
    }
    case 'DELETE_PLAN_DAY': {
      const updatedHistory = pushSnapshot(state);
      const updatedPlan = { ...state.plan };
      delete updatedPlan[action.payload];
      storage.set(storage.getKeys().PLAN, updatedPlan);
      return { ...state, plan: updatedPlan, planHistory: updatedHistory };
    }
    case 'SET_MACROS': {
      const updatedHistory = pushSnapshot(state);
      storage.set(storage.getKeys().MACROS, action.payload);
      return { ...state, macros: action.payload, planHistory: updatedHistory };
    }
    case 'SET_PROFILE': {
      const updatedHistory = pushSnapshot(state);
      storage.set(storage.getKeys().PROFILE, action.payload);
      return { ...state, profile: action.payload, planHistory: updatedHistory };
    }
    case 'SET_BASELINE': {
      const snap = { plan: JSON.parse(JSON.stringify(action.payload.plan)), macros: action.payload.macros ? JSON.parse(JSON.stringify(action.payload.macros)) : null };
      localStorage.setItem(BASELINE_KEY, JSON.stringify(snap));
      return { ...state, baseline: snap };
    }
    case 'LOG_SET': {
      const { date, entry } = action.payload;
      const updatedLogs = { ...state.logs };
      if (!updatedLogs[date]) updatedLogs[date] = [];
      
      const existingIndex = updatedLogs[date].findIndex(
        log => log.exercise === entry.exercise && log.sets === entry.sets
      );

      if (existingIndex > -1) {
        const newLogs = [...updatedLogs[date]];
        newLogs[existingIndex] = entry;
        updatedLogs[date] = newLogs;
      } else {
        updatedLogs[date] = [...updatedLogs[date], entry];
      }
      
      storage.set(storage.getKeys().LOGS, updatedLogs);
      return { ...state, logs: updatedLogs };
    }
    case 'LOG_MEAL': {
      const { mealDate, meal } = action.payload;
      const updatedMeals = { ...state.meals };
      if (!updatedMeals[mealDate]) updatedMeals[mealDate] = [];
      updatedMeals[mealDate] = [...(updatedMeals[mealDate] || []), meal];
      storage.set(storage.getKeys().MEALS, updatedMeals);
      return { ...state, meals: updatedMeals };
    }
    case 'SET_CAL_MONTH':
      return { ...state, calMonth: action.payload };
    case 'SET_SELECTED_CAL_DATE':
      return { ...state, selectedCalDate: action.payload };
    default:
      return state;
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (!state.baseline) {
      dispatch({ type: 'SET_BASELINE', payload: { plan: state.plan, macros: state.macros } });
    }
  }, [state.baseline, state.plan, state.macros, dispatch]);

  return { state, dispatch };
}
