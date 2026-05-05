import { useState, useEffect } from 'react';
import { useAppState } from './hooks/useAppState';
import ProfileTab from './components/tabs/ProfileTab';
import PlanTab from './components/tabs/PlanTab';
import CalendarTab from './components/tabs/CalendarTab';
import NutritionTab from './components/tabs/NutritionTab';
import LogTab from './components/tabs/LogTab';

const TABS = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'plan', label: 'Plan', icon: '📅' },
  { id: 'calendar', label: 'Calendar', icon: '🗓️' },
  { id: 'nutrition', label: 'Nutrition', icon: '🍎' },
  { id: 'log', label: 'Log', icon: '💪' },
];

export default function App() {
  const { state, dispatch } = useAppState();
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    document.body.style.overflow = state.isPopupOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [state.isPopupOpen]);

  const renderTab = () => {
    switch (activeTab) {
      case 'profile': return <ProfileTab state={state} dispatch={dispatch} />;
      case 'plan': return <PlanTab state={state} dispatch={dispatch} />;
      case 'calendar': return <CalendarTab state={state} dispatch={dispatch} />;
      case 'nutrition': return <NutritionTab state={state} dispatch={dispatch} />;
      case 'log': return <LogTab state={state} dispatch={dispatch} />;
      default: return <ProfileTab state={state} dispatch={dispatch} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-accent selection:text-black">
      <main className="pb-24">
        {renderTab()}
      </main>

      {!state.isPopupOpen && (
        <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/80 backdrop-blur-xl border-t border-white/5 px-4 py-4 flex justify-around items-center z-40 shadow-2xl transition-opacity duration-300">
          {TABS.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === tab.id ? 'text-accent scale-110' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              <span className="text-2xl">{tab.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-mono">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="w-1 h-1 bg-accent rounded-full mt-1 animate-pulse"></div>
              )}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
