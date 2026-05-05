import { useMemo } from 'react';
import { formatDate } from '../utils/dateUtils';

export function useMacros(meals, macros, date) {
  return useMemo(() => {
    const dateStr = formatDate(date);
    const dayMeals = meals[dateStr] || [];
    
    const totals = dayMeals.reduce((acc, meal) => {
      acc.calories += meal.calories || 0;
      acc.protein += meal.protein || 0;
      acc.carbs += meal.carbs || 0;
      acc.fat += meal.fat || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    return {
      totals,
      targets: macros,
      percentages: macros ? {
        calories: (totals.calories / macros.calories) * 100,
        protein: (totals.protein / macros.protein) * 100,
        carbs: (totals.carbs / macros.carbs) * 100,
        fat: (totals.fat / macros.fat) * 100,
      } : null,
    };
  }, [meals, macros, date]);
}
