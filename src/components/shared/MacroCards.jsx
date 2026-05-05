const LABELS = {
  calories: 'TOTAL ENERGY',
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

export default function MacroCards({ macros }) {
  if (!macros) return null;

  return (
    <div className="grid grid-cols-2 gap-3 mb-8">
      {Object.entries(macros).map(([key, value]) => (
        <div key={key} className="bg-zinc-900 p-4 border-l-2 border-accent relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
            <div className="w-8 h-8 bg-white rotate-45 translate-x-4 -translate-y-4"></div>
          </div>
          <div className="text-gray-500 text-[10px] font-bold text-mono uppercase tracking-tighter mb-1">
            {LABELS[key]}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-display text-3xl font-bold text-white">{value}</span>
            <span className="text-mono text-[10px] text-gray-500">{UNITS[key]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
