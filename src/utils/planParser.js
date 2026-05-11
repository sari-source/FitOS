export function cleanExercise(ex) {
  return ex
    .replace(/\s*\d+[sxX]\d+.*$/, '')
    .replace(/\s*\d+\s*(sets?|reps?).*$/, '')
    .replace(/\.$/, '')
    .trim();
}

export function parseDayContent(content) {
  let title = '';
  let exercises = [];
  const trimmed = content.trim();

  if (!trimmed) return { title, exercises };

  const noLeadingColon = trimmed.replace(/^:\s*/, '');
  const separatorRegex = /\s*[—-]\s*|\s*:\s*/;
  const parts = noLeadingColon.split(separatorRegex);

  if (parts.length > 1) {
    title = parts[0].trim();
    const exercisesPart = parts.slice(1).join(', ');
    exercises = exercisesPart.split(/[,;\n]/).map(cleanExercise).filter(ex => ex.length > 0);
  } else {
    if (trimmed.includes(',') || trimmed.includes(';') || trimmed.includes('\n')) {
      exercises = trimmed.split(/[,;\n]/).map(cleanExercise).filter(ex => ex.length > 0);
    } else {
      title = trimmed;
    }
  }

  return { title, exercises };
}

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
      
      const content = trimmed.substring(foundDay.length).trim();
      const { title, exercises } = parseDayContent(content);
      
      let finalTitle = isRest ? 'Recovery' : title;
      let finalExercises = [...exercises];

      plan[currentDay] = { 
        rest: isRest, 
        title: finalTitle, 
        exercises: finalExercises 
      };
    } else if (currentDay) {
      const lowerLine = trimmed.toLowerCase();
      if (lowerLine.includes('rest')) {
        plan[currentDay].rest = true;
        plan[currentDay].title = 'Recovery';
      } else {
        const { title, exercises } = parseDayContent(trimmed);
        const allExercises = title ? [title, ...exercises] : exercises;
        plan[currentDay].exercises.push(...allExercises);
      }
    }
  });

  return plan;
}
