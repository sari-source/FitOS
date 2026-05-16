import { useState, useEffect } from 'react';
import { getDaysInMonth, getFirstDayOfMonth, formatDate } from '../../utils/dateUtils';
import DaySheet from '../shared/DaySheet';

const DEFAULT_COLORS = {
  sunday: '#FF5733',
  monday: '#33FF57',
  tuesday: '#3357FF',
  wednesday: '#F333FF',
  thursday: '#FFFF33',
  friday: '#33FFFF',
  saturday: '#FF8C00',
};

export default function CalendarTab({ state, dispatch }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    if (state.selectedCalDate) {
      const date = state.selectedCalDate;
      dispatch({ type: 'SET_SELECTED_CAL_DATE', payload: null });
      return date;
    }
    return null;
  });
  const currentMonth = state.calMonth || new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  useEffect(() => {
    dispatch({ type: 'SET_POPUP_STATE', payload: !!selectedDate });
  }, [selectedDate, dispatch]);

  const handlePrevMonth = () => {
    const newDate = new Date(year, month - 1, 1);
    dispatch({ type: 'SET_CAL_MONTH', payload: newDate });
  };

  const handleNextMonth = () => {
    const newDate = new Date(year, month + 1, 1);
    dispatch({ type: 'SET_CAL_MONTH', payload: newDate });
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = formatDate(new Date());

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 w-full"></div>);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = formatDate(date);
      const isToday = dateStr === todayStr;
      const hasData = state.logs[dateStr] || state.meals[dateStr];
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const isPastDate = dateStr < todayStr;
      let hasPlan = false;
       let dotColor = DEFAULT_COLORS[dayName] || "var(--accent)";
       if (isPastDate) {
         const allSnaps = [...(state.planHistory || [])];
         const relevant = allSnaps.filter(s => s.date <= dateStr);
         if (relevant.length > 0) {
           const snap = relevant[relevant.length - 1];
           hasPlan = snap.plan[dayName] && !snap.plan[dayName].rest;
           if (hasPlan) dotColor = snap.plan[dayName].color || DEFAULT_COLORS[dayName] || "var(--accent)";
         } else if (state.baseline) {
           hasPlan = state.baseline.plan[dayName] && !state.baseline.plan[dayName]?.rest;
           if (hasPlan) dotColor = state.baseline.plan[dayName].color || DEFAULT_COLORS[dayName] || "var(--accent)";
         }
       } else {
         hasPlan = state.plan[dayName] && !state.plan[dayName].rest;
         if (hasPlan) dotColor = state.plan[dayName].color || DEFAULT_COLORS[dayName] || "var(--accent)";
       }

      let styles = "bg-zinc-900 text-zinc-500";
      if (isToday) styles = "bg-accent text-black font-black";

      const planBorder = hasPlan && !isToday
        ? `border-l-[3px]`
        : '';

      days.push(
        <div 
          key={d} 
          onClick={() => setSelectedDate(date)}
          className={`h-20 w-full border border-zinc-800 flex flex-col items-center justify-center cursor-pointer relative transition-all active:scale-90 ${planBorder} ${styles}`}
          style={hasPlan && !isToday ? { borderLeftColor: dotColor } : {}}
        >
          <span className="text-display text-xl">{d}</span>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="p-6 max-w-md mx-auto pb-32 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <button onClick={handlePrevMonth} className="p-3 bg-zinc-900 text-white rounded-xl border border-zinc-800 hover:border-accent transition-all">
          ←
        </button>
        <h2 className="text-display text-3xl text-white tracking-widest uppercase">
          {currentMonth.toLocaleDateString('en-US', { month: 'long' })} {currentMonth.getFullYear()}
        </h2>
        <button onClick={handleNextMonth} className="p-3 bg-zinc-900 text-white rounded-xl border border-zinc-800 hover:border-accent transition-all">
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0 border-l border-t border-zinc-800 bg-zinc-900/30">
        {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(day => (
          <div key={day} className="h-10 flex items-center justify-center text-[10px] font-bold text-zinc-600 border-r border-b border-zinc-800 bg-zinc-900 uppercase tracking-tighter">
            {day}
          </div>
        ))}
        {renderDays()}
      </div>

      {selectedDate && (
        <DaySheet 
          date={selectedDate} 
          plan={state.plan} 
          logs={state.logs} 
          meals={state.meals} 
          macros={state.macros}
          planHistory={state.planHistory}
          baseline={state.baseline}
          onClose={() => setSelectedDate(null)}
        />
      )}
      
      {selectedDate && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" 
          onClick={() => setSelectedDate(null)}
        ></div>
      )}
    </div>
  );
}
