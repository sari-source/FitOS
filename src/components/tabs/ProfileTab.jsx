import { useState } from 'react';
import { calculateMacros } from '../../utils/macroCalc';
import MacroCards from '../shared/MacroCards';
import MacroBar from '../shared/MacroBar';
import { useMacros } from '../../hooks/useMacros';

const INPUT_STYLE = "w-full p-4 bg-zinc-900 text-white border border-zinc-800 rounded-none outline-none text-mono text-sm focus:border-accent transition-colors";
const LABEL_STYLE = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2";

const ACTIVITY_OPTIONS = [
  { value: 1.2, label: 'Sedentary' },
  { value: 1.375, label: 'Lightly Active' },
  { value: 1.55, label: 'Moderately Active' },
  { value: 1.725, label: 'Very Active' },
  { value: 1.9, label: 'Extra Active' },
];

const GOAL_OPTIONS = [
  { value: 'bulk', label: 'Bulk' },
  { value: 'lean_bulk', label: 'Lean Bulk' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'cut', label: 'Cut' },
  { value: 'agg_cut', label: 'Aggressive Cut' },
];

export default function ProfileTab({ state, dispatch, setActiveTab }) {
  const [formData, setFormData] = useState(state.profile || {
    weight: '',
    height: '',
    age: '',
    sex: 'male',
    activityLevel: 1.2,
    goal: 'maintain',
  });
  const [editing, setEditing] = useState(!state.profile);
  const today = new Date();
  const { totals } = useMacros(state.meals, state.macros, today);

  const handleCalculate = () => {
    const macros = calculateMacros(formData);
    if (macros) {
      dispatch({ type: 'SET_PROFILE', payload: formData });
      dispatch({ type: 'SET_MACROS', payload: macros });
      setEditing(false);
    } else {
      alert('Please fill in all fields correctly.');
    }
  };

  const todayDayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todayPlan = state.plan[todayDayName];
  const todayPlanDisplay = (!todayPlan || todayPlan.rest) ? 'Rest Day' : (todayPlan.title || (todayPlan.exercises?.length ? 'WORKOUT' : 'Rest Day'));

  return (
    <div className="p-6 max-w-md mx-auto animate-fade-in">
      <h2 className="text-display text-5xl text-white mb-8 tracking-tighter italic">OPERATOR<br/><span className="text-accent">PROFILE</span></h2>
      <button 
        onClick={() => {
          dispatch({ type: 'SET_SELECTED_CAL_DATE', payload: today });
          setActiveTab('calendar');
        }}
        className="w-full mb-8 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex justify-between items-center group hover:border-accent transition-all active:scale-95"
      >
        <div className="flex flex-col items-start">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Today's Plan</span>
          <span className="text-display text-2xl text-white italic">{todayPlanDisplay}</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 group-hover:text-accent transition-colors">
          <path d="M5 12h14"></path>
          <path d="m12 5 7 7-7 7"></path>
        </svg>
      </button>

      {editing ? (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 gap-6 mb-10">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_STYLE}>Weight (kg)</label>
                <input
                  type="number"
                  className={INPUT_STYLE}
                  value={formData.weight}
                  onChange={e => setFormData({...formData, weight: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className={LABEL_STYLE}>Height (cm)</label>
                <input
                  type="number"
                  className={INPUT_STYLE}
                  value={formData.height}
                  onChange={e => setFormData({...formData, height: Number(e.target.value)})}
                />
              </div>
            </div>
            <div>
              <label className={LABEL_STYLE}>Age</label>
              <input
                type="number"
                className={INPUT_STYLE}
                value={formData.age}
                onChange={e => setFormData({...formData, age: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className={LABEL_STYLE}>Sex</label>
              <select
                className={INPUT_STYLE}
                value={formData.sex}
                onChange={e => setFormData({...formData, sex: e.target.value})}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className={LABEL_STYLE}>Activity Level</label>
              <select
                className={INPUT_STYLE}
                value={formData.activityLevel}
                onChange={e => setFormData({...formData, activityLevel: Number(e.target.value)})}
              >
                {ACTIVITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_STYLE}>Primary Goal</label>
              <select
                className={INPUT_STYLE}
                value={formData.goal}
                onChange={e => setFormData({...formData, goal: e.target.value})}
              >
                {GOAL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleCalculate}
            className="w-full py-5 bg-accent text-black font-black text-display text-xl tracking-widest hover:bg-white transition-all active:scale-95 mb-12 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            CALCULATE TARGETS
          </button>
        </div>
      ) : (
        <div className="animate-fade-in space-y-6">
          {state.macros && (
            <>
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-zinc-800"></div>
                <h3 className="text-display text-2xl text-zinc-400 uppercase tracking-widest">Readout</h3>
                <div className="h-px flex-1 bg-zinc-800"></div>
              </div>
              <MacroCards macros={state.macros} />
              <div className="bg-zinc-900/50 p-6 border border-white/5 rounded-2xl">
                <MacroBar type="calories" current={totals.calories} target={state.macros.calories} />
                <MacroBar type="protein" current={totals.protein} target={state.macros.protein} />
                <MacroBar type="carbs" current={totals.carbs} target={state.macros.carbs} />
                <MacroBar type="fat" current={totals.fat} target={state.macros.fat} />
              </div>
            </>
          )}

          {state.profile && (
            <div className="bg-zinc-900 p-4 border border-zinc-800 rounded-tr-2xl rounded-bl-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-display text-xl text-white uppercase">Profile</span>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-zinc-500 hover:text-accent transition-colors text-mono text-[10px] uppercase font-bold tracking-widest"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Edit
                </button>
              </div>
              <div className="text-mono text-xs text-zinc-500 space-y-1">
                <div>{state.profile.weight} kg · {state.profile.height} cm · {state.profile.age}y</div>
                <div>{state.profile.sex} · {ACTIVITY_OPTIONS.find(o => o.value === state.profile.activityLevel)?.label} · {GOAL_OPTIONS.find(o => o.value === state.profile.goal)?.label}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
