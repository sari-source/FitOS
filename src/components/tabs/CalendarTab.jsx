import React, { useState, useEffect } from 'react';
import { getDaysInMonth, getFirstDayOfMonth, formatDate } from '../../utils/dateUtils';
import DaySheet from '../shared/DaySheet';

export default function CalendarTab({ state, dispatch }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const currentMonth = state.calMonth || new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  useEffect(() => {
    if (selectedDate) {
      dispatch({ type: 'SET_POPUP_STATE', payload: true });
    } else {
      dispatch({ type: 'SET_POPUP_STATE', payload: false });
    }
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
      if (isPastDate) {
        const allSnaps = [...(state.planHistory || [])];
        if (state.initialSnapshot) allSnaps.unshift(state.initialSnapshot);
        const relevant = allSnaps.filter(s => s.date <= dateStr);
        if (relevant.length > 0) {
          const snap = relevant[relevant.length - 1];
          hasPlan = snap.plan[dayName] && !snap.plan[dayName].rest;
        }
      } else {
        hasPlan = state.plan[dayName] && !state.plan[dayName].rest;
      }

      let styles = "bg-zinc-900 text-zinc-500";
      if (isToday) styles = "bg-accent text-black font-black";
      else if (hasData) styles = "bg-zinc-800 text-white border border-accent/30";

      days.push(
        <div 
          key={d} 
          onClick={() => setSelectedDate(date)}
          className={`h-20 w-full border border-zinc-800 flex flex-col items-center justify-center cursor-pointer relative transition-all active:scale-90 ${styles}`}
        >
          <span className="text-display text-xl">{d}</span>
          {hasPlan && !isToday && !hasData && (
            <div className="absolute bottom-2 w-1 h-1 bg-accent rounded-full animate-pulse"></div>
          )}
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
          initialSnapshot={state.initialSnapshot}
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
