import { useReducer } from 'react';
import { storage, STORAGE_KEYS } from '../utils/storage';

const SNAPSHOT_KEY = 'fitos_plan_history';
const BASELINE_KEY = 'fitos_baseline';

function loadBaseline() {
  try {
    const stored = localStorage.getItem(BASELINE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore corrupted baseline data and rebuild it from current storage.
  }
  
  const plan = storage.get(STORAGE_KEYS.PLAN) || {};
  const macros = storage.get(STORAGE_KEYS.MACROS);
  
  const snap = { plan: structuredClone(plan), macros: macros ? structuredClone(macros) : null };
  localStorage.setItem(BASELINE_KEY, JSON.stringify(snap));
  return snap;
}

function createInitialState() {
  const rawHistory = storage.get(SNAPSHOT_KEY);
  return {
    profile: storage.get(STORAGE_KEYS.PROFILE),
    macros: storage.get(STORAGE_KEYS.MACROS),
    plan: storage.get(STORAGE_KEYS.PLAN) || {},
    logs: storage.get(STORAGE_KEYS.LOGS) || {},
    meals: storage.get(STORAGE_KEYS.MEALS) || {},
    planHistory: Array.isArray(rawHistory) ? rawHistory : [],
    baseline: loadBaseline(),
    calMonth: new Date(),
    selectedCalDate: null,
    isPopupOpen: false,
  };
}

function pushSnapshot(state) {
  const todayStr = new Date().toISOString().split('T')[0];
  const snap = {
    plan: structuredClone(state.plan),
    macros: state.macros ? structuredClone(state.macros) : null,
    date: todayStr,
  };
  const updated = [...(state.planHistory || []), snap];
  storage.set(SNAPSHOT_KEY, updated);
  return updated;
}

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_POPUP_STATE':
      return { ...state, isPopupOpen: action.payload };
    case 'SET_PLAN': {
      const updatedHistory = pushSnapshot(state);
      storage.set(STORAGE_KEYS.PLAN, action.payload);
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
      storage.set(STORAGE_KEYS.PLAN, updatedPlan);
      return { ...state, plan: updatedPlan, planHistory: updatedHistory };
    }
    case 'DELETE_PLAN_DAY': {
      const updatedHistory = pushSnapshot(state);
      const updatedPlan = { ...state.plan };
      delete updatedPlan[action.payload];
      storage.set(STORAGE_KEYS.PLAN, updatedPlan);
      return { ...state, plan: updatedPlan, planHistory: updatedHistory };
    }
    case 'SET_MACROS': {
      const updatedHistory = pushSnapshot(state);
      storage.set(STORAGE_KEYS.MACROS, action.payload);
      return { ...state, macros: action.payload, planHistory: updatedHistory };
    }
    case 'SET_PROFILE': {
      const updatedHistory = pushSnapshot(state);
      storage.set(STORAGE_KEYS.PROFILE, action.payload);
      return { ...state, profile: action.payload, planHistory: updatedHistory };
    }
    case 'SET_BASELINE': {
      const snap = {
        plan: structuredClone(action.payload.plan),
        macros: action.payload.macros ? structuredClone(action.payload.macros) : null,
      };
      localStorage.setItem(BASELINE_KEY, JSON.stringify(snap));
      return { ...state, baseline: snap };
    }
    case 'LOG_SET': {
      const { date, entry } = action.payload;
      const updatedLogs = { ...state.logs };
      const dayLogs = updatedLogs[date] || [];
      const existingIndex = dayLogs.findIndex(
        log => log.exercise === entry.exercise && log.sets === entry.sets
      );

      if (existingIndex > -1) {
        updatedLogs[date] = dayLogs.map((log, index) => index === existingIndex ? entry : log);
      } else {
        updatedLogs[date] = [...dayLogs, entry];
      }
      
      storage.set(STORAGE_KEYS.LOGS, updatedLogs);
      return { ...state, logs: updatedLogs };
    }
    case 'LOG_MEAL': {
      const { mealDate, meal } = action.payload;
      const updatedMeals = { ...state.meals };
      if (!updatedMeals[mealDate]) updatedMeals[mealDate] = [];
      updatedMeals[mealDate] = [...updatedMeals[mealDate], meal];
      storage.set(STORAGE_KEYS.MEALS, updatedMeals);
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
  const [state, dispatch] = useReducer(appReducer, null, createInitialState);
  return { state, dispatch };
}
