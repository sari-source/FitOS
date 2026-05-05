import React, { useState } from 'react';
import { formatDate, getDayName } from '../../utils/dateUtils';

export default function LogTab({ state, dispatch }) {
  const today = new Date();
  const todayStr = formatDate(today);
  const dayName = getDayName(today);
  const dayPlan = state.plan[dayName];
  
  const [exerciseName, setExerciseName] = useState('');
  const [row, setRow] = useState({ sets: 3, reps: 8, weight: 60 });
  const [showSuccess, setShowSuccess] = useState(false);

  const updateField = (field, value) => {
    setRow(prev => ({ ...prev, [field]: Number(value) }));
  };

  const handleLog = () => {
    if (!exerciseName) return alert('Please select an exercise');

    dispatch({ 
      type: 'LOG_SET', 
      payload: { 
        date: todayStr, 
        entry: { 
          exercise: exerciseName, 
          ...row, 
          loggedAt: new Date().toISOString() 
        } 
      } 
    });

    setExerciseName('');
    setRow({ sets: 3, reps: 8, weight: 60 });
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="p-6 max-w-md mx-auto pb-32 animate-fade-in">
      <h2 className="text-display text-5xl text-white mb-8 tracking-tighter italic">LOG<br/><span className="text-accent">PERFORMANCE</span></h2>

      {showSuccess && (
        <div className="mb-6 p-4 bg-accent text-white text-center font-black text-display text-lg animate-fade-in border-b-4 border-white shadow-lg">
          ENTRY COMMITTED
        </div>
      )}

      <div className="bg-zinc-900 p-6 border-t-4 border-accent shadow-2xl mb-10">
        <div className="mb-6">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Target Exercise</label>
          
          {dayPlan && !dayPlan.rest && dayPlan.exercises.length > 0 ? (
            <select 
              className="w-full p-4 bg-zinc-800 text-white border border-zinc-700 rounded-none outline-none focus:border-accent text-mono text-sm transition-colors appearance-none cursor-pointer"
              value={exerciseName}
              onChange={e => setExerciseName(e.target.value)}
            >
              <option value="" disabled>SELECT FROM TODAY'S PLAN</option>
              {dayPlan.exercises.map((ex, i) => (
                <option key={i} value={ex}>{ex}</option>
              ))}
            </select>
          ) : (
            <div className="p-4 bg-zinc-800 text-zinc-500 text-mono text-xs uppercase tracking-widest border border-zinc-700 italic">
              {dayPlan?.rest ? 'RECOVERY DAY — NO PLAN EXERCISES' : 'NO PLAN LOADED FOR TODAY'}
            </div>
          )}
        </div>

        <div className="mb-10">
          <div className="grid grid-cols-3 gap-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
            <span>Sets</span>
            <span>Reps</span>
            <span>Weight (kg)</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input 
              type="number" 
              className="p-3 bg-zinc-800 text-white border border-zinc-700 rounded-none outline-none focus:border-accent text-mono text-sm"
              value={row.sets}
              onChange={e => updateField('sets', e.target.value)}
            />
            <input 
              type="number" 
              className="p-3 bg-zinc-800 text-white border border-zinc-700 rounded-none outline-none focus:border-accent text-mono text-sm"
              value={row.reps}
              onChange={e => updateField('reps', e.target.value)}
            />
            <input 
              type="number" 
              className="p-3 bg-zinc-800 text-white border border-zinc-700 rounded-none outline-none focus:border-accent text-mono text-sm"
              value={row.weight}
              onChange={e => updateField('weight', e.target.value)}
            />
          </div>
        </div>

        <button 
          onClick={handleLog}
          className="w-full py-5 bg-accent text-black font-black text-display text-xl tracking-widest hover:bg-white transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          COMMIT LOG
        </button>
      </div>
    </div>
  );
}
