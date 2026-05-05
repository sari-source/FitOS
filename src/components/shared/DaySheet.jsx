import MacroBar from './MacroBar';
import { formatDate } from '../../utils/dateUtils';
import { useMacros } from '../../hooks/useMacros';

export default function DaySheet({ date, plan, logs, meals, macros, planHistory, baseline }) {
  const todayStr = formatDate(new Date());
  const dateStr = formatDate(date);
  const isPast = dateStr < todayStr;
  
  const getEffectiveState = () => {
    if (!isPast) return { effectivePlan: plan, effectiveMacros: macros };
    
    const allSnaps = [...(planHistory || [])];
    const relevant = allSnaps.filter(s => s.date <= dateStr);
    
    if (relevant.length > 0) {
      const snap = relevant[relevant.length - 1];
      return { effectivePlan: snap.plan, effectiveMacros: snap.macros };
    }
    
    return { effectivePlan: baseline?.plan || plan, effectiveMacros: baseline?.macros || macros };
  };
  
  const { effectivePlan, effectiveMacros } = getEffectiveState();
  const { totals: effectiveTotals } = useMacros(meals, effectiveMacros, date);
  
  const dayPlan = effectivePlan[new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()];
  const dayLogs = logs[dateStr] || [];

  return (
    <div className="fixed bottom-0 left-0 right-0 glass rounded-t-[40px] p-8 max-h-[90vh] overflow-y-auto animate-slide-up z-50 border-t border-white/10 shadow-2xl">
      <div className="w-16 h-1 bg-zinc-700 rounded-full mx-auto mb-8"></div>
      
      <div className="flex justify-between items-end mb-8">
        <h3 className="text-display text-4xl text-white leading-none">
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          <span className="text-zinc-600 ml-2 text-2xl">{date.getFullYear()}</span>
        </h3>
        <div className="text-mono text-[10px] text-accent uppercase tracking-widest px-2 py-1 border border-accent/30 rounded">
          Daily Report
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {/* Planned Workout */}
        <section>
          <h4 className="text-display text-xl text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-4 h-px bg-zinc-800"></span> Planned
          </h4>
          {dayPlan ? (
            dayPlan.rest ? (
              <div className="text-mono text-sm text-zinc-600 italic border-l-2 border-zinc-800 pl-4">RECOVERY DAY</div>
            ) : (
              <ul className="space-y-3">
                {dayPlan.exercises.map((ex, i) => (
                  <li key={i} className="text-white text-sm flex items-center group cursor-default">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full mr-3 group-hover:scale-150 transition-transform"></span>
                    {ex}
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="text-mono text-sm text-zinc-600 italic border-l-2 border-zinc-800 pl-4">NO PLAN LOADED</div>
          )}
        </section>

        {/* Logged Sets */}
        <section>
          <h4 className="text-display text-xl text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-4 h-px bg-zinc-800"></span> Performance
          </h4>
          {dayLogs.length > 0 ? (
            <div className="space-y-4">
              {Array.from(new Set(dayLogs.map(l => l.exercise))).map(exName => {
                const exSets = dayLogs.filter(l => l.exercise === exName);
                return (
                  <div key={exName} className="bg-zinc-900/50 p-4 rounded-tr-xl rounded-bl-xl border-r border-b border-white/5">
                    <div className="text-display text-lg text-white mb-2">{exName}</div>
                    <div className="text-mono text-xs text-zinc-400 flex flex-wrap gap-x-4 gap-y-2">
                      {exSets.map((s, i) => (
                        <span key={i} className="bg-zinc-800 px-2 py-1 rounded border border-white/5">
                          {s.sets}x{s.reps} <span className="text-accent">{s.weight}kg</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-mono text-sm text-zinc-600 italic border-l-2 border-zinc-800 pl-4">NO SETS LOGGED</div>
          )}
        </section>

        {/* Nutrition */}
        <section className="pb-8">
          <h4 className="text-display text-xl text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-4 h-px bg-zinc-800"></span> Nutrition
          </h4>
          {!effectiveMacros ? (
            <div className="text-mono text-sm text-zinc-600 italic border-l-2 border-zinc-800 pl-4">PROFILE NOT CONFIGURED</div>
          ) : (
            <div className="space-y-0">
              <MacroBar type="calories" current={effectiveTotals.calories} target={effectiveMacros.calories} />
              <MacroBar type="protein" current={effectiveTotals.protein} target={effectiveMacros.protein} />
              <MacroBar type="carbs" current={effectiveTotals.carbs} target={effectiveMacros.carbs} />
              <MacroBar type="fat" current={effectiveTotals.fat} target={effectiveMacros.fat} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
