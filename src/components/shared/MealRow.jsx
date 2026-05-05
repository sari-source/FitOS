import React from 'react';

export default function MealRow({ meal }) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-2xl group hover:border-accent/30 transition-all">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 border border-white/5">
          {meal.photoUrl ? (
            <img src={meal.photoUrl} alt={meal.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl opacity-20">🍽️</div>
          )}
        </div>
        <div>
          <div className="text-display text-lg text-white leading-tight">{meal.name}</div>
          <div className="text-mono text-[10px] text-zinc-500 mt-1 flex gap-3">
            <span>P: <b className="text-zinc-300">{meal.protein}g</b></span>
            <span>C: <b className="text-zinc-300">{meal.carbs}g</b></span>
            <span>F: <b className="text-zinc-300">{meal.fat}g</b></span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-display text-xl font-bold text-accent leading-none">{meal.calories}</div>
        <div className="text-mono text-[8px] text-zinc-600 uppercase">kcal</div>
      </div>
    </div>
  );
}
