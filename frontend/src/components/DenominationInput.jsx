import React from 'react';
import { getDenominations, formatDenominationLabel } from '../utils/currencyUtils.js';
import { useSettings } from '../context/SettingsContext.jsx';

export default function DenominationInput({ denominations, onChange, title, type = 'receive', totalLabel }) {
  const { currency } = useSettings();
  const denominationsList = getDenominations(currency).sort((a, b) => b - a);

  const handleDenominationChange = (value, count) => {
    onChange({
      ...denominations,
      [value]: count
    });
  };

  const total = Object.entries(denominations).reduce((sum, [value, count]) => {
    return sum + (Number(value) * (Number(count) || 0));
  }, 0);

  return (
    <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
      {title && <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/60">{title}</h4>}
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2 mb-2 pb-2 border-b-2 border-slate-200">
          <span className="text-[10px] font-bold text-ink/40">Note/Coin</span>
          <span className="text-[10px] font-bold text-ink/40 text-center">Count</span>
          <span className="text-[10px] font-bold text-ink/40 text-right">Total</span>
        </div>
        
        {denominationsList.map((value) => {
          const count = Number(denominations[value]) || 0;
          return (
            <div key={value} className="grid grid-cols-3 gap-2 items-center">
              <span className="text-xs font-bold text-ink whitespace-nowrap">
                {formatDenominationLabel(value, currency)}
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={denominations[value] || ''}
                onChange={(e) => handleDenominationChange(value, e.target.value.replace(/\D/g, ''))}
                className={`w-full rounded-xl border-2 py-1 px-1 text-center text-xs font-bold text-ink outline-none transition-colors ${count > 0 ? (type === 'receive' ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50') : 'border-slate-200 bg-white focus:border-brand-blue'}`}
                placeholder="0"
              />
              <span className="text-xs font-black text-ink/60 text-right">
                {(Number(value) * count).toFixed(2)}
              </span>
            </div>
          );
        })}
        
        <div className="pt-3 mt-3 border-t-2 border-slate-200 flex justify-between items-center">
          <span className="text-xs font-black text-ink">{totalLabel ? totalLabel : `Total ${type === 'receive' ? 'Received' : 'Returned'}:`}</span>
          <span className={`text-sm font-black ${type === 'receive' ? 'text-emerald-500' : 'text-rose-500'}`}>
            {currency} {total.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
