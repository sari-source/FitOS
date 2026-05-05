export function calculateMacros(profile) {
  if (!profile) return null;
  const { weight, height, age, sex, activityLevel, goal } = profile;
  
  if (!weight || !height || !age || !sex || !activityLevel || !goal) {
    return null;
  }

  const bmr = sex === 'male'
    ? (10 * weight) + (6.25 * height) - (5 * age) + 5
    : (10 * weight) + (6.25 * height) - (5 * age) - 161;
    
  const tdee = bmr * activityLevel;
  
  const goalDelta = { 
    bulk: 400, 
    lean_bulk: 200, 
    maintain: 0, 
    cut: -300, 
    agg_cut: -500 
  };
  
  const splits = {
    bulk:      { p: 0.25, c: 0.50, f: 0.25 },
    lean_bulk: { p: 0.30, c: 0.45, f: 0.25 },
    maintain:  { p: 0.30, c: 0.40, f: 0.30 },
    cut:       { p: 0.40, c: 0.35, f: 0.25 },
    agg_cut:   { p: 0.45, c: 0.30, f: 0.25 }
  };
  
  const calories = Math.round(tdee + goalDelta[goal]);
  const sp = splits[goal];
  
  return {
    calories,
    protein: Math.round((calories * sp.p) / 4),
    carbs:   Math.round((calories * sp.c) / 4),
    fat:     Math.round((calories * sp.f) / 9)
  };
}
