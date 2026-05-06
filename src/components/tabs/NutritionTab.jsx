import { useState, useEffect } from 'react';
import { formatDate } from '../../utils/dateUtils';
import { useMacros } from '../../hooks/useMacros';
import MacroBar from '../shared/MacroBar';
import MealRow from '../shared/MealRow';

export default function NutritionTab({ state, dispatch }) {
  const today = new Date();
  const todayStr = formatDate(today);
  const { totals, targets } = useMacros(state.meals, state.macros, today);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [mealName, setMealName] = useState('');
  const [macros, setMacros] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  const [photo, setPhoto] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    dispatch({ type: 'SET_POPUP_STATE', payload: isFormOpen });
  }, [isFormOpen, dispatch]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhoto(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const analyzePhoto = async () => {
    if (!photo) return;
    setIsAnalyzing(true);
    setHasAnalyzed(false);
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `Analyze this food photo and estimate the macros. Return ONLY a JSON object with keys: calories (number), protein (number in grams), carbs (number in grams), fat (number in grams). No extra text, no markdown fences.${notes ? `\n\nUser notes about the meal: ${notes}. Use this context to improve your estimate.` : ''}` },
                { 
                  inline_data: { 
                    mime_type: 'image/jpeg', 
                    data: photo.split(',')[1] 
                  } 
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Scan failed');
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) throw new Error('AI returned no content');
      
      const startIdx = content.indexOf('{');
      const endIdx = content.lastIndexOf('}');
      
      if (startIdx === -1 || endIdx === -1) {
        throw new Error('No JSON found in response');
      }
      
      const jsonString = content.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonString);
      
      setMacros({
        calories: parsed.calories || '',
        protein: parsed.protein || '',
        carbs: parsed.carbs || '',
        fat: parsed.fat || '',
      });
      setHasAnalyzed(true);
    } catch (error) {
      console.error('Analysis failed:', error);
      const errorMsg = document.createElement('div');
      errorMsg.className = 'fixed top-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg z-50 font-bold text-xs uppercase';
      errorMsg.innerText = `ANALYSIS FAILED: ${error.message.toUpperCase()}`;
      document.body.appendChild(errorMsg);
      setTimeout(() => document.body.removeChild(errorMsg), 4000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveMeal = () => {
    if (!mealName) return alert('Please enter a meal name');
    
    const meal = {
      name: mealName,
      calories: Number(macros.calories) || 0,
      protein: Number(macros.protein) || 0,
      carbs: Number(macros.carbs) || 0,
      fat: Number(macros.fat) || 0,
      photoUrl: photo,
      loggedAt: new Date().toISOString(),
    };

    dispatch({ type: 'LOG_MEAL', payload: { mealDate: todayStr, meal } });
    setMealName('');
    setMacros({ calories: '', protein: '', carbs: '', fat: '' });
    setPhoto(null);
    setNotes('');
    setHasAnalyzed(false);
    setManualEntry(false);
    setIsFormOpen(false);
  };

  return (
    <div className="p-6 max-w-md mx-auto pb-32 animate-fade-in">
      <h2 className="text-display text-5xl text-white mb-8 tracking-tighter italic">FUEL<br/><span className="text-accent">INTAKE</span></h2>

      <div className="mb-10 bg-zinc-900 p-6 border-l-4 border-accent shadow-2xl">
        {!targets ? (
          <div className="text-center py-8 text-zinc-600 text-mono text-xs uppercase tracking-widest italic">
            Profile configuration required
          </div>
        ) : (
          <div className="space-y-0">
            <MacroBar type="calories" current={totals.calories} target={targets.calories} />
            <MacroBar type="protein" current={totals.protein} target={targets.protein} />
            <MacroBar type="carbs" current={totals.carbs} target={targets.carbs} />
            <MacroBar type="fat" current={totals.fat} target={targets.fat} />
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-display text-2xl text-zinc-400 uppercase tracking-widest">Daily Log</h3>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-accent text-white w-10 h-10 rounded-full grid place-items-center font-black text-xl shadow-[0_0_15px_rgba(255,255,255,0.4)] hover:scale-110 transition-transform"
          >
            +
          </button>
        </div>
        <div className="space-y-4">
          {(state.meals[todayStr] || []).map((meal, i) => (
            <MealRow key={i} meal={meal} />
          ))}
          {(state.meals[todayStr] || []).length === 0 && (
            <div className="text-center py-12 text-zinc-700 text-mono text-xs uppercase tracking-widest italic">No intake recorded</div>
          )}
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-end">
          <div 
            className="bg-zinc-900 w-full rounded-t-[40px] p-8 animate-slide-up max-h-[90vh] overflow-y-auto border-t border-white/10"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-display text-3xl text-white mb-8 italic">ADD INTAKE</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Meal Identifier</label>
                <input 
                  className="w-full p-4 bg-zinc-800 text-white border border-zinc-700 rounded-none outline-none text-mono text-sm focus:border-accent transition-colors"
                  value={mealName}
                  onChange={e => setMealName(e.target.value)}
                  placeholder="e.g. POST-WORKOUT SHAKE"
                />
              </div>

              <div className="flex gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => { setManualEntry(true); setPhoto(null); setHasAnalyzed(false); setNotes(''); }}
                  className={`flex-1 py-3 text-mono text-[10px] font-bold uppercase tracking-widest rounded-full transition-all border ${manualEntry ? 'bg-accent text-black border-accent' : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300'}`}
                >
                  Manual Entry
                </button>
                <button
                  type="button"
                  onClick={() => { setManualEntry(false); setHasAnalyzed(false); setMacros({ calories: '', protein: '', carbs: '', fat: '' }); }}
                  className={`flex-1 py-3 text-mono text-[10px] font-bold uppercase tracking-widest rounded-full transition-all border ${!manualEntry ? 'bg-accent text-black border-accent' : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300'}`}
                >
                  Photo Scan
                </button>
              </div>

               {!manualEntry && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Context Notes</label>
                    <input 
                      className="w-full p-4 bg-zinc-800 text-white border border-zinc-700 rounded-none outline-none text-mono text-sm focus:border-accent transition-colors"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="e.g. Grilled with olive oil, extra rice, sauce on the side"
                    />
                  </div>

                  <div className="relative w-full h-64 bg-zinc-800 rounded-2xl overflow-hidden border-2 border-dashed border-zinc-700 flex items-center justify-center group">
                    {photo ? (
                      <>
                        <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => { setPhoto(null); setHasAnalyzed(false); setMacros({ calories: '', protein: '', carbs: '', fat: '' }); }}
                          className="absolute bottom-4 right-4 w-10 h-10 flex items-center justify-center hover:scale-110 transition-transform z-10"
                          title="Remove Photo"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full">
                        {!showPhotoOptions ? (
                          <label className="cursor-pointer flex flex-col items-center text-zinc-500 group-hover:text-accent transition-colors">
                            <span className="text-4xl mb-3">📷</span>
                            <span className="text-mono text-[10px] uppercase font-bold tracking-widest">Add Photo</span>
                            <input type="file" className="hidden" readOnly onClick={(e) => { e.preventDefault(); setShowPhotoOptions(true); }} />
                          </label>
                        ) : (
                          <div className="flex flex-col gap-3 animate-fade-in">
                            <label className="cursor-pointer bg-zinc-700 hover:bg-accent hover:text-black text-zinc-300 px-6 py-3 rounded-full text-mono text-xs font-bold uppercase tracking-widest transition-all border border-zinc-600 text-center block">
                              Take Photo
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                            </label>
                            <label className="cursor-pointer bg-zinc-700 hover:bg-accent hover:text-black text-zinc-300 px-6 py-3 rounded-full text-mono text-xs font-bold uppercase tracking-widest transition-all border border-zinc-600 text-center block">
                              Upload Image
                              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                            </label>
                            <button 
                              onClick={() => setShowPhotoOptions(false)}
                              className="text-zinc-600 text-[10px] uppercase font-bold hover:text-zinc-400 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-accent font-bold animate-pulse">
                        <div className="text-display text-xl mb-2">ANALYZING DATA...</div>
                        <div className="text-mono text-[10px] uppercase">Scanning nutrition profile</div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!photo}
                    onClick={analyzePhoto}
                    className={`w-full py-4 font-bold text-mono text-xs uppercase tracking-widest transition-colors rounded-none ${photo ? 'bg-accent text-black hover:bg-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                  >
                    {hasAnalyzed ? 'RESCAN WITH NOTES' : 'ANALYZE PHOTO'}
                  </button>
                </div>
               )}

               {hasAnalyzed && !manualEntry && (
                  <button
                    type="button"
                    onClick={() => { setManualEntry(true); setPhoto(null); setHasAnalyzed(false); }}
                    className="w-full -mt-2 mb-2 text-mono text-[10px] uppercase font-bold tracking-widest text-zinc-500 hover:text-accent transition-colors"
                  >
                    Enter macros manually →
                  </button>
                )}

              {(hasAnalyzed || manualEntry) && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                  {['calories', 'protein', 'carbs', 'fat'].map(type => (
                    <div key={type}>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{type}</label>
                      <input 
                        type="number" 
                        className="w-full p-4 bg-zinc-800 text-white border border-zinc-700 rounded-none outline-none text-mono text-sm focus:border-accent transition-colors"
                        value={macros[type]}
                        onChange={e => setMacros({...macros, [type]: e.target.value})}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-10">
              <button 
                onClick={() => setIsFormOpen(false)}
                className="flex-1 py-4 bg-zinc-800 text-zinc-400 font-bold text-display text-lg rounded-none hover:bg-zinc-700 transition-colors"
              >
                CANCEL
              </button>
              <button 
                onClick={handleSaveMeal}
                className="flex-1 py-4 bg-accent text-black font-black text-display text-lg rounded-none shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:bg-white transition-all"
              >
                SAVE ENTRY
              </button>
            </div>
          </div>
          <div 
            className="absolute inset-0 -z-10" 
            onClick={() => setIsFormOpen(false)}
          ></div>
        </div>
      )}
    </div>
  );
}
