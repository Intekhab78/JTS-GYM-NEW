import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { shiftApi } from '../api/shiftApi.js';
import DenominationInput from './DenominationInput.jsx';

export default function ExchangeDenominationsModal({ isOpen, onClose, currentShift, onUpdate }) {
  const [denominations, setDenominations] = useState({});
  const [reason, setReason] = useState('Manual Cash Exchange');
  const [loading, setLoading] = useState(false);
  const [initialTotal, setInitialTotal] = useState(0);

  useEffect(() => {
    if (isOpen && currentShift) {
      const currentDenoms = currentShift.currentDenominations || currentShift.openingDenominations || {};
      setDenominations(currentDenoms);
      const total = Object.entries(currentDenoms).reduce((sum, [val, count]) => sum + (Number(val) * (Number(count) || 0)), 0);
      setInitialTotal(total);
      setReason('Manual Cash Exchange');
    }
  }, [isOpen, currentShift]);

  if (!isOpen || !currentShift) return null;

  const currentTotal = Object.entries(denominations).reduce((sum, [val, count]) => sum + (Number(val) * (Number(count) || 0)), 0);
  const diff = currentTotal - initialTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Math.abs(diff) > 0.01) {
      toast.error('The total cash amount must remain exactly the same during an exchange.');
      return;
    }

    setLoading(true);
    try {
      await shiftApi.exchangeDenominations({
        newDenominations: denominations,
        reason
      });
      toast.success('Denominations exchanged successfully');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to exchange denominations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-ink font-black">Exchange Cash Denominations</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink transition-colors">✕</button>
        </div>

        <div className="mb-6 rounded-2xl bg-amber-50 p-4 border border-amber-100">
          <p className="text-sm font-bold text-amber-900 mb-2">
            Use this to record when you break a larger note or swap coins, keeping your register accurate.
          </p>
          <p className="text-xs text-amber-800">
            <strong>Important:</strong> The total value must remain exactly the same.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <DenominationInput 
            denominations={denominations}
            onChange={setDenominations}
            type="receive"
            title="Adjust Drawer Denominations"
            totalLabel="New Drawer Total:"
          />

          <div className={`p-4 rounded-xl border-2 flex justify-between items-center ${Math.abs(diff) > 0.01 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
            <span className="font-bold text-sm">Target Total: {initialTotal.toFixed(2)}</span>
            <span className="font-bold text-sm">Current Total: {currentTotal.toFixed(2)}</span>
            <span className={`font-black text-sm ${Math.abs(diff) > 0.01 ? 'text-rose-600' : 'text-emerald-600'}`}>
              Difference: {diff > 0 ? '+' : ''}{diff.toFixed(2)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-2">Reason / Note (Optional)</label>
            <input 
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 p-3 text-sm font-bold outline-none focus:border-brand-blue"
              placeholder="e.g. Swapped a 500 note for 5x 100s"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-6 py-3 text-sm font-bold text-ink/60 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || Math.abs(diff) > 0.01}
              className="rounded-xl px-8 py-3 text-sm font-black text-white bg-brand-blue hover:bg-brand-blue/90 shadow-lg shadow-brand-blue/30 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Processing...' : 'Confirm Exchange'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
