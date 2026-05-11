import { useState, useEffect } from 'react';
import { parsePlan, parseDayContent } from '../../utils/planParser';

const DAYS_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DEFAULT_COLORS = {
  sunday: '#FF5733',
  monday: '#33FF57',
  tuesday: '#3357FF',
  wednesday: '#F333FF',
  thursday: '#FFFF33',
  friday: '#33FFFF',
  saturday: '#FF8C00',
};

export default function PlanTab({ state, dispatch }) {
  const [text, setText] = useState('');
  const [addDayOpen, setAddDayOpen] = useState(false);
  const [editingDay, setEditingDay] = useState(null);
  const [editDayName, setEditDayName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editColor, setEditColor] = useState('#ff0000');
  const [editExercises, setEditExercises] = useState([]);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState(null);
  const [newExerciseText, setNewExerciseText] = useState('');

  const [newDayName, setNewDayName] = useState('');
  const [newDayTitle, setNewDayTitle] = useState('');
  const [newDayExercisesText, setNewDayExercisesText] = useState('');
  const [expandedDay, setExpandedDay] = useState(null);

  const hasPlan = Object.keys(state.plan).length > 0;

  const handleParse = () => {
    const parsedPlan = parsePlan(text);
    dispatch({ type: 'SET_PLAN', payload: parsedPlan });
    setText('');
  };

  const handleAddDay = () => {
    if (!newDayName) return;
    if (!newDayExercisesText.trim()) return;
    const dayKey = newDayName.toLowerCase().trim();
    if (!DAYS_ORDER.includes(dayKey)) {
      alert('Please enter a valid day name (Monday - Sunday)');
      return;
    }
    const { title: parsedTitle, exercises } = parseDayContent(newDayExercisesText);
    const finalTitle = newDayTitle.trim() || parsedTitle;
    dispatch({ type: 'UPDATE_PLAN_DAY', payload: { day: dayKey, data: { rest: false, title: finalTitle, exercises, color: DEFAULT_COLORS[dayKey] } } });
    setExpandedDay(dayKey);
    setNewDayName('');
    setNewDayTitle('');
    setNewDayExercisesText('');
    setAddDayOpen(false);
  };

  const openAddDay = () => {
    setNewDayName('');
    setNewDayTitle('');
    setNewDayExercisesText('');
    setAddDayOpen(true);
  };

  const startEditDay = (day, data) => {
    setEditingDay(day);
    setEditDayName(day);
    setEditTitle(data.title || '');
    setEditColor(data.color || DEFAULT_COLORS[day] || '#ff0000');
    setEditExercises(data.exercises || []);
  };

  const saveEditDay = () => {
    const newDay = editDayName.toLowerCase();
    if (!DAYS_ORDER.includes(newDay)) return;
    
    dispatch({ 
      type: 'UPDATE_PLAN_DAY', 
      payload: { 
        day: newDay, 
        oldDay: editingDay, 
        data: { rest: false, title: editTitle, color: editColor, exercises: editExercises } 
      } 
    });
    setExpandedDay(newDay);
    closeEdit();
  };

  const closeEdit = () => {
    setEditingDay(null);
    setEditDayName('');
    setEditTitle('');
    setEditColor('#ff0000');
    setEditExercises([]);
    setEditingExerciseIndex(null);
    setNewExerciseText('');
  };

  const startEditExercise = (index) => {
    setEditingExerciseIndex(index);
    setNewExerciseText(editExercises[index]);
  };

  const saveExercise = () => {
    const cleaned = newExerciseText.replace(/\s*\d+[sxX]\d+.*$/, '').replace(/\s*\d+\s*(sets?|reps?).*$/, '').trim();
    if (!cleaned) return;
    const updated = [...editExercises];
    updated[editingExerciseIndex] = cleaned;
    setEditExercises(updated);
    setEditingExerciseIndex(null);
    setNewExerciseText('');
  };

  const addExercise = () => {
    const cleaned = newExerciseText.replace(/\s*\d+[sxX]\d+.*$/, '').replace(/\s*\d+\s*(sets?|reps?).*$/, '').trim();
    if (!cleaned) return;
    setEditExercises([...editExercises, cleaned]);
    setNewExerciseText('');
  };

  const deleteExercise = (index) => {
    const updated = editExercises.filter((_, i) => i !== index);
    setEditExercises(updated);
    if (editingExerciseIndex === index) {
      setEditingExerciseIndex(null);
      setNewExerciseText('');
    }
  };

  const deleteDay = (day) => {
    dispatch({ type: 'DELETE_PLAN_DAY', payload: day });
  };

  const capitalizeDay = (day) => day.charAt(0).toUpperCase() + day.slice(1);

  const canAddDay = newDayName && newDayExercisesText.trim().length > 0;

  useEffect(() => {
    dispatch({ type: 'SET_POPUP_STATE', payload: addDayOpen || editingDay });
  }, [addDayOpen, editingDay, dispatch]);

  return (
    <div className="p-6 max-w-md mx-auto animate-fade-in">
      <h2 className="text-display text-5xl text-white mb-8 tracking-tighter italic">STRATEGY<br/><span className="text-accent">PLAN</span></h2>

      {!hasPlan ? (
        <div className="mb-10 animate-fade-in">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Input Raw Plan Data</label>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-transparent rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <textarea
              className="relative w-full h-64 p-6 bg-zinc-900 text-accent border border-zinc-800 rounded-2xl focus:border-accent outline-none font-mono text-xs leading-relaxed shadow-inner"
              placeholder="Monday: Chest, Triceps — Bench Press, Incline DB Press, Cable Flyes..."
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </div>
          <button
            onClick={handleParse}
            className="w-full mt-6 py-5 bg-zinc-100 text-black font-black text-display text-xl tracking-widest hover:bg-accent transition-all active:scale-95"
          >
            EXECUTE PARSER
          </button>
        </div>
      ) : (
        <button
          onClick={openAddDay}
          className="w-full mb-8 py-4 border-2 border-dashed border-zinc-700 text-zinc-500 text-mono text-xs font-bold uppercase tracking-widest hover:border-accent hover:text-accent transition-all rounded-2xl flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span> Add Day
        </button>
      )}

      {hasPlan && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-zinc-800"></div>
            <h3 className="text-display text-2xl text-zinc-400 uppercase tracking-widest">Deployed Plan</h3>
            <div className="h-px flex-1 bg-zinc-800"></div>
          </div>
          <div className="space-y-4">
            {Object.entries(state.plan)
              .sort((a, b) => DAYS_ORDER.indexOf(a[0]) - DAYS_ORDER.indexOf(b[0]))
              .map(([day, data]) => {
              const isExpanded = expandedDay === day;
              return (
                <div key={day} className="bg-zinc-900 border border-white/5 rounded-tr-2xl rounded-bl-2xl overflow-hidden hover:border-accent/30 transition-all">
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : day)}
                    className="w-full p-5 flex justify-between items-center"
                  >
                     <div className="flex items-center gap-4">
                       <div 
                         className="w-3 h-3 rounded-full shadow-sm" 
                         style={{ backgroundColor: data.color || DEFAULT_COLORS[day] }}
                       ></div>
                       <svg 
                         xmlns="http://www.w3.org/2000/svg" 
                         width="16" 
                         height="16" 
                         viewBox="0 0 24 24" 
                         fill="none" 
                         stroke="currentColor" 
                         strokeWidth="2" 
                         strokeLinecap="round" 
                         strokeLinejoin="round" 
                         className={`text-zinc-600 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                       >
                         <polyline points="9 18 15 12 9 6"></polyline>
                       </svg>
                       <span className="text-display text-2xl text-white uppercase">{data.title || capitalizeDay(day)}</span>
                     </div>
                    <span className={`text-mono text-[10px] font-bold px-2 py-1 rounded border ${data.rest ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : 'bg-accent/10 text-accent border-accent/30'}`}>
                      {data.rest ? 'RECOVERY' : `${data.exercises.length} UNITS`}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-white/5 pt-4 animate-fade-in">
                      {!data.rest ? (
                        <ul className="text-mono text-xs text-zinc-400 space-y-2">
                          {data.exercises.map((ex, i) => (
                            <li key={i} className="flex items-start group/item hover:text-zinc-200 transition-colors">
                              <span className="mr-2 text-accent">[{i+1}]</span>
                              <span className="flex-1">{ex}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-zinc-600 text-mono text-xs uppercase tracking-widest">Rest day</div>
                      )}
                      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-white/5">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditDay(day, data); }}
                          className="flex items-center gap-1 text-zinc-500 hover:text-accent transition-colors text-mono text-[10px] uppercase font-bold tracking-widest"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteDay(day); }}
                          className="flex items-center gap-1 text-zinc-500 hover:text-red-500 transition-colors text-mono text-[10px] uppercase font-bold tracking-widest"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {addDayOpen && (
        <>
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-end">
            <div
              className="bg-zinc-900 w-full rounded-t-[40px] p-8 animate-slide-up max-h-[90vh] overflow-y-auto border-t border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-display text-3xl text-white mb-6 italic">ADD DAY</h3>
            
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Day Name</label>
                  <select
                    className="w-full p-4 bg-zinc-800 text-white border border-zinc-700 rounded-none outline-none text-mono text-sm focus:border-accent transition-colors appearance-none"
                    value={newDayName}
                    onChange={e => setNewDayName(e.target.value)}
                  >
                    <option value="" disabled>Select a day</option>
                    {DAYS_ORDER.map(d => (
                      <option key={d} value={d}>{capitalizeDay(d)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Workout Title</label>
                  <input
                    className="w-full p-4 bg-zinc-800 text-white border border-zinc-700 rounded-none outline-none text-mono text-sm focus:border-accent transition-colors"
                    placeholder="e.g. Push Day, Leg Day..."
                    value={newDayTitle}
                    onChange={e => setNewDayTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Exercises</label>
                  <textarea
                    className="w-full h-40 p-4 bg-zinc-800 text-white border border-zinc-700 rounded-none outline-none text-mono text-sm focus:border-accent transition-colors resize-none"
                    placeholder="Bench Press, Incline DB Press, Cable Flyes..."
                    value={newDayExercisesText}
                    onChange={e => setNewDayExercisesText(e.target.value)}
                  />
                </div>
              </div>
            
              <div className="flex gap-4 mt-10">
                <button
                  onClick={() => setAddDayOpen(false)}
                  className="flex-1 py-4 bg-zinc-800 text-zinc-400 font-bold text-display text-lg rounded-none hover:bg-zinc-700 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleAddDay}
                  disabled={!canAddDay}
                  className={`flex-1 py-4 font-black text-display text-lg rounded-none transition-all ${canAddDay ? 'bg-accent text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:bg-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                >
                  SAVE DAY
                </button>
              </div>
            </div>
            <div
              className="absolute inset-0 -z-10"
              onClick={() => setAddDayOpen(false)}
            ></div>
          </div>
        </>
      )}

      {editingDay && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-end">
          <div
            className="bg-zinc-900 w-full rounded-t-[40px] p-8 animate-slide-up max-h-[90vh] overflow-y-auto border-t border-white/10"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-display text-3xl text-white mb-6 italic">EDIT DAY</h3>

            <div className="space-y-6">
               <div>
                 <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Day</label>
                 <select
                   className="w-full p-4 bg-zinc-800 text-white border border-zinc-700 rounded-none outline-none text-mono text-sm focus:border-accent transition-colors appearance-none"
                   value={editDayName}
                   onChange={e => setEditDayName(e.target.value)}
                 >
                   {DAYS_ORDER.map(d => (
                     <option key={d} value={d}>{capitalizeDay(d)}</option>
                   ))}
                 </select>
               </div>
               <div>
                 <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Day Title</label>
                 <div className="flex gap-3">
                   <input
                     className="flex-1 p-4 bg-zinc-800 text-white border border-zinc-700 rounded-none outline-none text-mono text-sm focus:border-accent transition-colors"
                     placeholder="e.g. Upper Body / Pull Day"
                     value={editTitle}
                     onChange={e => setEditTitle(e.target.value)}
                   />
                   <input
                     type="color"
                     className="w-14 h-14 p-1 bg-zinc-800 border border-zinc-700 rounded-none outline-none cursor-pointer"
                     value={editColor}
                     onChange={e => setEditColor(e.target.value)}
                   />
                 </div>
               </div>
               <div>
                     <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Exercises</label>
                    <div className="space-y-2">
                      {editExercises.map((ex, i) => (
                        <div key={i} className="flex items-center gap-2 bg-zinc-800 p-3 border border-zinc-700">
                          {editingExerciseIndex === i ? (
                            <input
                              className="flex-1 bg-zinc-700 text-white border border-accent outline-none text-mono text-xs p-2"
                              value={newExerciseText}
                              onChange={e => setNewExerciseText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveExercise()}
                              autoFocus
                            />
                          ) : (
                            <span
                              className="flex-1 text-mono text-xs text-zinc-300 cursor-pointer hover:text-white transition-colors"
                              onClick={() => startEditExercise(i)}
                            >
                              <span className="text-accent mr-2">[{i+1}]</span>{ex}
                            </span>
                          )}
                          {editingExerciseIndex === i ? (
                            <div className="flex gap-1">
                              <button onClick={saveExercise} className="text-accent text-xs font-bold px-2">✓</button>
                              <button onClick={() => { setEditingExerciseIndex(null); setNewExerciseText(''); }} className="text-zinc-500 text-xs font-bold px-2">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => deleteExercise(i)} className="text-zinc-600 hover:text-red-500 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      className="flex-1 p-3 bg-zinc-800 text-white border border-zinc-700 rounded-none outline-none text-mono text-xs focus:border-accent transition-colors"
                      placeholder="Exercise name..."
                      value={newExerciseText}
                      onChange={e => setNewExerciseText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addExercise()}
                    />
                    <button
                      onClick={addExercise}
                      className="bg-accent text-black w-12 flex items-center justify-center font-black text-xl hover:bg-white transition-all"
                    >
                      +
                    </button>
                  </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button
                onClick={closeEdit}
                className="flex-1 py-4 bg-zinc-800 text-zinc-400 font-bold text-display text-lg rounded-none hover:bg-zinc-700 transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={saveEditDay}
                className="flex-1 py-4 bg-accent text-black font-black text-display text-lg rounded-none shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:bg-white transition-all"
              >
                SAVE
              </button>
            </div>
          </div>
          <div
            className="absolute inset-0 -z-10"
            onClick={closeEdit}
          ></div>
        </div>
      )}
    </div>
  );
}
