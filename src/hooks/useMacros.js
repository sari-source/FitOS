import { useMemo } from 'react';
import { formatDate } from '../utils/dateUtils';

export function useMacros(meals, macros, date) {
  const dateStr = useMemo(() => formatDate(date), [date]);
  
  return useMemo(() => {
    const dayMeals = (meals && typeof meals === 'object' && !Array.isArray(meals)) ? (meals[dateStr] || []) : [];
    
    const totals = dayMeals.reduce((acc, meal) => {
      acc.calories += meal.calories || 0;
      acc.protein += meal.protein || 0;
      acc.carbs += meal.carbs || 0;
      acc.fat += meal.fat || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    return { totals, targets: macros };
  }, [meals, dateStr, macros]);
}
