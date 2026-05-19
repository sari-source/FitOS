import { formatDate } from './dateUtils';

export function hasLoggedSets(logs, dateStr) {
  return (logs?.[dateStr] || []).length > 0;
}

export function shouldFreezeDate(date, logs) {
  const dateStr = formatDate(date);
  const todayStr = formatDate(new Date());
  return dateStr < todayStr || hasLoggedSets(logs, dateStr);
}

function planIncludesLoggedExerciseForDay(plan, logsForDate, dayName) {
  const loggedExercises = new Set(logsForDate.map(log => log.exercise));
  return (plan?.[dayName]?.exercises || []).some(exercise => loggedExercises.has(exercise));
}

export function getEffectiveStateForDate({ date, plan, macros, logs, planHistory, baseline }) {
  const dateStr = formatDate(date);

  if (!shouldFreezeDate(date, logs)) {
    return { effectivePlan: plan, effectiveMacros: macros };
  }

  const logsForDate = logs?.[dateStr] || [];
  const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const snapshots = [...(planHistory || [])]
    .filter(snap => snap.date >= dateStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextSnapshot = logsForDate.length > 0
    ? snapshots.find(snap => planIncludesLoggedExerciseForDay(snap.plan, logsForDate, dayName))
    : snapshots[0];

  if (nextSnapshot) {
    return { effectivePlan: nextSnapshot.plan, effectiveMacros: nextSnapshot.macros };
  }

  if (logsForDate.length > 0 && planIncludesLoggedExerciseForDay(plan, logsForDate, dayName)) {
    return { effectivePlan: plan, effectiveMacros: macros };
  }

  return { effectivePlan: baseline?.plan || plan, effectiveMacros: baseline?.macros || macros };
}
