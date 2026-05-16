const COLORS = {
  calories: 'var(--color-accent)',
  protein: '#3b82f6',
  carbs: '#f59e0b',
  fat: '#ef4444',
};

const LABELS = {
  calories: 'CALORIES',
  protein: 'PROTEIN',
  carbs: 'CARBS',
  fat: 'FAT',
};

const UNITS = {
  calories: 'KCAL',
  protein: 'G',
  carbs: 'G',
  fat: 'G',
};

export default function MacroBar({ type, current, target }) {
  const percentage = target ? Math.min((current / target) * 100, 100) : 0;
  
  return (
    <div className="mb-6 group">
      <div className="flex justify-between text-[10px] font-bold text-mono mb-2 tracking-widest uppercase">
        <span className="text-gray-500 group-hover:text-white transition-colors">{LABELS[type]}</span>
        <span className="text-white">{current} / {target} {UNITS[type]}</span>
      </div>
      <div className="w-full bg-zinc-800 rounded-none h-1.5 overflow-hidden relative">
        <div 
          className="h-full macro-bar-fill" 
          style={{ 
            width: `${percentage}%`, 
            backgroundColor: COLORS[type],
            '--glow-color': COLORS[type],
          }}
        ></div>
      </div>
    </div>
  );
}
