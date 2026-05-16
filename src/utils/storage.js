export const STORAGE_KEYS = {
  PROFILE: 'fitos_profile',
  MACROS: 'fitos_macros',
  PLAN: 'fitos_plan',
  LOGS: 'fitos_logs',
  MEALS: 'fitos_meals',
  PLAN_HISTORY: 'fitos_plan_history',
};

export const storage = {
  get: (key) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  },
  clear: (key) => {
    localStorage.removeItem(key);
  },
  getKeys: () => STORAGE_KEYS,
};
