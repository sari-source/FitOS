const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DAY_ALIASES = {
  monday: 'monday', mon: 'monday',
  tuesday: 'tuesday', tue: 'tuesday', tues: 'tuesday',
  wednesday: 'wednesday', wed: 'wednesday',
  thursday: 'thursday', thu: 'thursday', thur: 'thursday', thurs: 'thursday',
  friday: 'friday', fri: 'friday',
  saturday: 'saturday', sat: 'saturday',
  sunday: 'sunday', sun: 'sunday',
};

const NON_TITLE_LABELS = /^(details?|exercises?|workout|training|movement|movements?|lift|lifts?)$/i;
const EXERCISE_LABEL = /^(?:exercise|ex|movement|lift)\s*#?\d*$/i;
const REST_PATTERN = /^(?:rest|recovery|off|off day|no training|none)$/i;

function stripListMarker(text) {
  return text
    .replace(/^\s*[-*•]\s+/, '')
    .replace(/^\s*\d+[.)]\s+/, '')
    .trim();
}

function stripExerciseLabel(text) {
  return text.replace(/^\s*(?:exercise|ex|movement|lift)\s*#?\d+\s*[:.)-]\s*/i, '').trim();
}

function isRestContent(text) {
  return REST_PATTERN.test(stripListMarker(text).replace(/^[:\s-]+/, '').trim());
}

function splitExercises(text) {
  return text
    .split(/[,;\n]/)
    .map(cleanExercise)
    .filter(Boolean);
}

export function cleanExercise(ex) {
  return ex
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s*@\s*\d+\s*(?:kg|lbs?|lb)?\s*$/i, '')
    .replace(/\s+\d+\s*(?:kg|lbs?|lb)\s*$/i, '')
    .replace(/\s+\d+\s*[-–]\s*\d+\s*(?:reps?)?\s*$/i, '')
    .replace(/\s*\d+[sxX]\d+.*$/, '')
    .replace(/\s*\d+\s*(sets?|reps?).*$/, '')
    .replace(/^\s*[-*•]\s+/, '')
    .replace(/^\s*\d+[.)]\s+/, '')
    .replace(/^\s*(?:exercise|ex|movement|lift)\s*#?\d+\s*[:.)-]\s*/i, '')
    .replace(/\.$/, '')
    .trim();
}

export function parseDayContent(content) {
  let title = '';
  let exercises = [];
  const trimmed = stripListMarker(content.trim());

  if (!trimmed) return { title, exercises };
  if (isRestContent(trimmed)) return { title: 'Recovery', exercises };

  const noLeadingColon = trimmed.replace(/^[:\s-]+/, '');
  const lines = noLeadingColon.split('\n').map(stripListMarker).filter(Boolean);
  if (lines.length > 1) {
    const firstLine = lines[0];
    const firstParts = firstLine.split(/\s*[—-]\s*|\s*:\s*/).filter(Boolean);

    if (firstParts.length === 1 && !firstLine.includes(',') && !EXERCISE_LABEL.test(firstParts[0])) {
      title = firstLine.trim();
      exercises = lines.slice(1).flatMap(splitExercises);
    } else {
      exercises = lines.flatMap(splitExercises);
    }
    return { title, exercises };
  }

  const separatorRegex = /\s*[—-]\s*|\s*:\s*/;
  const parts = noLeadingColon.split(separatorRegex).filter(Boolean);

  if (parts.length > 1) {
    const label = parts[0].trim();
    title = NON_TITLE_LABELS.test(label) || EXERCISE_LABEL.test(label) ? '' : label;
    const exercisesPart = parts.slice(1).join(', ');
    exercises = splitExercises(exercisesPart);
  } else {
    if (trimmed.includes(',') || trimmed.includes(';') || trimmed.includes('\n')) {
      exercises = splitExercises(trimmed);
    } else {
      const cleaned = cleanExercise(noLeadingColon);
      if (cleaned && cleaned !== noLeadingColon) {
        exercises = [cleaned];
      } else {
        title = noLeadingColon;
      }
    }
  }

  return { title, exercises };
}

function findDayStart(line) {
  const cleaned = stripListMarker(line).trim();
  const dayMatch = cleaned.match(/^([a-z]+)\b\.?/i);
  if (dayMatch) {
    const day = DAY_ALIASES[dayMatch[1].toLowerCase()];
    if (day) return { day, content: cleaned.slice(dayMatch[0].length).trim() };
  }

  const numberedDayMatch = cleaned.match(/^day\s*(\d+)\s*[:.)-]?\s*(.*)$/i);
  if (numberedDayMatch) {
    const index = Number(numberedDayMatch[1]) - 1;
    if (index >= 0 && index < DAYS_ORDER.length) {
      return { day: DAYS_ORDER[index], content: numberedDayMatch[2].trim() };
    }
  }

  return null;
}

function mergeDay(plan, day, data) {
  if (!plan[day]) {
    plan[day] = data;
    return;
  }

  plan[day] = {
    rest: data.exercises.length > 0 ? false : plan[day].rest || data.rest,
    title: data.title || plan[day].title,
    exercises: [...(plan[day].exercises || []), ...data.exercises],
  };
}

export function parsePlan(text) {
  const lines = text.split('\n');
  const plan = {};
  let currentDay = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const dayStart = findDayStart(trimmed);

    if (dayStart) {
      currentDay = dayStart.day;
      const isRest = isRestContent(dayStart.content);
      
      const { title, exercises } = parseDayContent(dayStart.content);
      
      mergeDay(plan, currentDay, { 
        rest: isRest, 
        title: isRest ? 'Recovery' : title, 
        exercises: isRest ? [] : exercises 
      });
    } else if (currentDay) {
      if (isRestContent(trimmed)) {
        plan[currentDay].rest = true;
        plan[currentDay].title = 'Recovery';
      } else {
        const content = stripExerciseLabel(stripListMarker(trimmed));
        const { title, exercises } = parseDayContent(content);
        const allExercises = title && EXERCISE_LABEL.test(title) ? exercises : (title ? [title, ...exercises] : exercises);
        if (allExercises.length > 0) {
          plan[currentDay].rest = false;
          plan[currentDay].exercises.push(...allExercises);
        }
      }
    }
  });

  return plan;
}
