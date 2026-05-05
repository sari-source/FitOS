import React from 'react';

export default function ExerciseRow({ exercise, sets }) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-900 border-l-4 border-accent rounded-r-xl shadow-lg group hover:bg-zinc-800 transition-colors">
      <div>
        <div className="text-display text-lg text-white group-hover:text-accent transition-colors">{exercise}</div>
        <div className="text-mono text-[10px] text-zinc-500 flex flex-wrap gap-x-3 mt-1">
          {sets.map((s, i) => (
            <span key={i}>
              {s.sets}x{s.reps} <span className="text-zinc-300">{s.weight}kg</span>
              {i < sets.length - 1 && <span className="mx-1 opacity-30">•</span>}
            </span>
          ))}
        </div>
      </div>
      <div className="text-display text-sm bg-accent text-black font-black px-2 py-1 rounded">
        {sets.length} SETS
      </div>
    </div>
  );
}
