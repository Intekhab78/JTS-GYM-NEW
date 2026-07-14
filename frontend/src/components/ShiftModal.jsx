import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { shiftApi } from '../api/shiftApi.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { getDenominations, formatDenominationLabel } from '../utils/currencyUtils.js';

export default function ShiftModal({ isOpen, onClose, currentShift, isExpired, onShiftChange }) {
  const { currency, globalSettings } = useSettings();
  const blindClosing = globalSettings?.blind_closing_allow;
  const denominationsList = getDenominations(currency).sort((a, b) => b - a); // highest to lowest

  const initialDenominations = denominationsList.reduce((acc, val) => ({ ...acc, [val]: '' }), {});
  const [denominations, setDenominations] = useState(initialDenominations);

  const [actualCardBrands, setActualCardBrands] = useState({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const [expectedTotals, setExpectedTotals] = useState(null);
  const [loadingTotals, setLoadingTotals] = useState(false);

  // Calculate total cash from denominations
  const totalCash = Object.entries(denominations).reduce((sum, [value, count]) => {
    return sum + (Number(value) * (Number(count) || 0));
  }, 0);

  const hasDenominationMismatch = expectedTotals?.currentDenominations && denominationsList.some(val => {
    const expected = Number(expectedTotals.currentDenominations[val]) || 0;
    const actual = Number(denominations[val]) || 0;
    return expected !== actual;
  });

  useEffect(() => {
    if (isOpen && currentShift) {
      // Fetch expected totals when closing shift
      setLoadingTotals(true);
      shiftApi.getCurrentShiftTotals()
        .then(data => setExpectedTotals(data))
        .catch(err => {
          console.error(err);
          toast.error('Failed to load expected shift totals');
        })
        .finally(() => setLoadingTotals(false));
    } else {
      setExpectedTotals(null);
    }
  }, [isOpen, currentShift]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setDenominations(initialDenominations);
      setActualCardBrands({});
      setNotes('');
    }
  }, [isOpen, currency, currentShift]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalCash < 0) {
      toast.error('Please enter a valid cash amount');
      return;
    }

    setLoading(true);
    try {
      if (currentShift) {
        // Closing Shift

        // Ensure discrepancy note if required
        const cashDiscrepancy = totalCash - (expectedTotals?.startingCash + expectedTotals?.expectedCash);
        let cardDiscrepancyTotal = 0;
        if (expectedTotals?.expectedCardBrands) {
          Object.keys(expectedTotals.expectedCardBrands).forEach(brand => {
            const actual = Number(actualCardBrands[brand] || 0);
            const expected = expectedTotals.expectedCardBrands[brand];
            if (actual !== expected) cardDiscrepancyTotal += Math.abs(actual - expected);
          });
        }

        const hasDiscrepancy = cashDiscrepancy !== 0 || cardDiscrepancyTotal !== 0;

        if (hasDiscrepancy && !notes.trim()) {
          toast.error('A discrepancy was found. You must provide notes to explain the difference.');
          setLoading(false);
          return;
        }

        await shiftApi.closeShift({
          actualCash: totalCash,
          actualCardBrands: actualCardBrands,
          closingDenominations: denominations,
          notes
        });
        toast.success('Shift closed successfully');
      } else {
        // Opening Shift
        await shiftApi.openShift({
          startingCash: totalCash,
          openingDenominations: denominations
        });
        toast.success('Shift opened successfully');
      }
      onShiftChange();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update shift');
    } finally {
      setLoading(false);
    }
  };

  const handleDenominationChange = (value, count) => {
    setDenominations(prev => ({
      ...prev,
      [value]: count
    }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm overflow-y-auto py-10">
      <div className="w-full max-w-4xl rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-ink font-black">
            {currentShift ? 'Close Shift Reconciliation' : 'Open Shift'}
          </h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink transition-colors">
            ✕
          </button>
        </div>

        {currentShift && expectedTotals && !blindClosing && (
          <div className="mb-6 rounded-2xl bg-amber-50 p-4 border border-amber-100 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">Shift Started</p>
              <p className="text-sm font-black text-amber-900">
                {new Date(currentShift.openedAt).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">Total System Expected Cash</p>
              <p className="text-2xl font-black text-amber-900">
                {currency} {(expectedTotals.startingCash + expectedTotals.expectedCash).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {isExpired && currentShift && (
          <div className="mb-6 rounded-2xl bg-rose-50 p-4 border border-rose-200">
            <h3 className="text-rose-700 font-bold text-sm">⚠️ Attention Required</h3>
            <p className="text-rose-600 text-xs mt-1">This shift was left open from a previous day. You must reconcile and close it before you can start a new shift for today.</p>
          </div>
        )}

        {loadingTotals ? (
          <div className="py-10 text-center text-ink/60 font-bold">Loading shift totals...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Cash Denominations */}
              <div>
                <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-ink/40">
                  {currentShift ? 'Count Actual Cash in Drawer' : 'Set Starting Cash in Drawer'}
                </h3>
                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                  <div className="grid grid-cols-3 gap-2 mb-2 pb-2 border-b-2 border-slate-200">
                    <span className="text-xs font-bold text-ink/40">Denomination</span>
                    <span className="text-xs font-bold text-ink/40 text-center">Count</span>
                    <span className="text-xs font-bold text-ink/40 text-right">Total</span>
                  </div>

                  {denominationsList.map((value) => {
                    const expectedCount = currentShift && expectedTotals?.currentDenominations ? (Number(expectedTotals.currentDenominations[value]) || 0) : null;
                    const isMismatch = expectedCount !== null && expectedCount !== (Number(denominations[value]) || 0);

                    return (
                      <div key={value} className="grid grid-cols-3 gap-2 items-start pt-1">
                        <span className="text-sm font-bold text-ink whitespace-nowrap pt-2">
                          {formatDenominationLabel(value, currency)}
                        </span>
                        <div className="flex flex-col items-center">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={denominations[value]}
                            onChange={(e) => handleDenominationChange(value, e.target.value.replace(/\D/g, ''))}
                            className={`w-full rounded-xl border-2 bg-white py-2 px-1 text-center text-sm font-bold text-ink outline-none transition-colors ${!blindClosing && expectedCount !== null
                                ? (isMismatch ? 'border-amber-300 focus:border-amber-500 bg-amber-50/50' : 'border-emerald-300 focus:border-emerald-500 bg-emerald-50/50')
                                : 'border-slate-200 focus:border-brand-blue'
                              }`}
                            placeholder="0"
                          />
                          {!blindClosing && expectedCount !== null && (
                            <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isMismatch ? 'text-amber-500' : 'text-emerald-500'}`}>
                              Exp: {expectedCount}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-black text-ink text-right pt-2">
                          {(Number(value) * (Number(denominations[value]) || 0)).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}

                  <div className="pt-4 mt-4 border-t-2 border-slate-200 flex justify-between items-center">
                    <span className="text-sm font-black text-ink">Total Cash Counted:</span>
                    <span className="text-xl font-black text-brand-blue">
                      {currency} {totalCash.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Card Reconciliation (Only when closing) */}
              {currentShift && expectedTotals && (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-ink/40">
                      Card Reconciliation (Z-Out)
                    </h3>
                    <div className="space-y-4">
                      {expectedTotals.expectedCardBrands && Object.keys(expectedTotals.expectedCardBrands).length > 0 ? (
                        Object.keys(expectedTotals.expectedCardBrands).map(brand => (
                          <div key={brand} className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-black text-blue-800 flex items-center gap-2 capitalize">
                                <span className="w-8 h-5 bg-blue-100 rounded-sm flex items-center justify-center text-[8px] font-black uppercase">
                                  {brand === 'mastercard' ? 'MC' : brand === 'american express' || brand === 'amex' ? 'AMEX' : brand}
                                </span>
                                {brand}
                              </span>
                              {!blindClosing && <span className="text-xs font-bold text-ink/40">Expected: {currency} {expectedTotals.expectedCardBrands[brand].toFixed(2)}</span>}
                            </div>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40 font-bold">{currency}</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={actualCardBrands[brand] || ''}
                                onChange={(e) => setActualCardBrands(prev => ({ ...prev, [brand]: e.target.value }))}
                                className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-black text-ink outline-none transition-colors focus:border-brand-blue"
                                placeholder="Actual terminal total..."
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs font-bold text-ink/40 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 text-center">
                          No card transactions recorded for this shift.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Variance Summary */}
                  <div>
                    <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-ink/40">
                      Discrepancy Summary
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 space-y-2">
                      <VarianceRow
                        label="Cash"
                        expected={expectedTotals.startingCash + expectedTotals.expectedCash}
                        actual={totalCash}
                        currency={currency}
                        isBlind={blindClosing}
                      />
                      {expectedTotals.expectedCardBrands && Object.keys(expectedTotals.expectedCardBrands).map(brand => (
                        <VarianceRow
                          key={brand}
                          label={<span className="capitalize">{brand}</span>}
                          expected={expectedTotals.expectedCardBrands[brand]}
                          actual={Number(actualCardBrands[brand] || 0)}
                          currency={currency}
                          isBlind={blindClosing}
                        />
                      ))}

                      {!blindClosing && expectedTotals?.currentDenominations && (
                        hasDenominationMismatch ? (
                          <div className="text-xs font-bold text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between">
                            <span>Denominations Check</span>
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] uppercase tracking-widest">Mismatch</span>
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                            <span>Denominations Check</span>
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] uppercase tracking-widest">Match</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-ink">Closing Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-sm text-ink outline-none transition-colors focus:border-brand-blue focus:bg-white min-h-[100px]"
                      placeholder="Explain any discrepancies here..."
                      required={(
                        (totalCash - (expectedTotals.startingCash + expectedTotals.expectedCash) !== 0) ||
                        (expectedTotals.expectedCardBrands && Object.keys(expectedTotals.expectedCardBrands).some(brand =>
                          Number(actualCardBrands[brand] || 0) - expectedTotals.expectedCardBrands[brand] !== 0
                        )) ||
                        hasDenominationMismatch
                      )}
                    />
                    <p className="text-xs text-ink/40 font-bold mt-2">
                      * Notes are required if there is any variance between expected and actual totals.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t-2 border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-6 py-3 text-sm font-bold text-ink/60 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`rounded-xl px-10 py-3 text-sm font-black text-white transition-colors shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${currentShift ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
                  }`}
              >
                {loading ? 'Processing...' : currentShift ? 'Close Shift & Submit' : 'Confirm Open Shift'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Helper component for variance rows
function VarianceRow({ label, expected, actual, currency, isBlind }) {
  const diff = actual - expected;
  const isMatch = Math.abs(diff) < 0.01;
  const isOver = diff > 0.01;

  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm font-bold text-ink/60">{label}</span>
      <div className="flex items-center gap-3">
        {isMatch ? (
          <span className="text-xs font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md">MATCH</span>
        ) : (
          <span className={`text-xs font-black px-2 py-1 rounded-md ${isOver ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50'}`}>
            {isBlind ? 'NOT MATCHING' : `${isOver ? '+' : ''}${diff.toFixed(2)} ${currency}`}
          </span>
        )}
      </div>
    </div>
  );
}
