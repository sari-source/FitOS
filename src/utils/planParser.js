export function parsePlan(text) {
  const lines = text.split('\n');
  const plan = {};
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  let currentDay = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const lowerLine = trimmed.toLowerCase();
    const foundDay = dayNames.find(d => lowerLine.startsWith(d));

    if (foundDay) {
      currentDay = foundDay;
      const isRest = lowerLine.includes('rest');
      plan[currentDay] = { rest: isRest, exercises: [] };
    } else if (currentDay) {
      if (lowerLine.includes('rest')) {
        plan[currentDay].rest = true;
      } 
      else if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        const exercisesPart = parts.slice(1).join(':');
        const exercises = exercisesPart
          .split(/[,;\n]/)
          .map(ex => ex.replace(/\s*\d+[sxX]\d+.*$/, '').replace(/\s*\d+\s*(sets?|reps?).*$/, '').replace(/\.$/, '').trim())
          .filter(ex => ex.length > 0);
        
        plan[currentDay].exercises.push(...exercises);
      }
    }
  });

  return plan;
}
