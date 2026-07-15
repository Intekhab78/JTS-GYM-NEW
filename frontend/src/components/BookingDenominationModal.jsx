import React, { useEffect, useState } from 'react';
import DenominationInput from './DenominationInput.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

export default function BookingDenominationModal({ isOpen, onClose, onConfirm, initialReceived, initialChange, amountToPay }) {
  const { currency, globalSettings } = useSettings();
  const [receivedDenominations, setReceivedDenominations] = useState({});
  const [changeDenominations, setChangeDenominations] = useState({});

  const enableDenominations = globalSettings?.enable_denomination_check !== false;
  const [simpleCashReceived, setSimpleCashReceived] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReceivedDenominations(initialReceived || {});
      setChangeDenominations(initialChange || {});
    }
  }, [isOpen, initialReceived, initialChange]);

  useEffect(() => {
    if (isOpen && !enableDenominations && initialReceived) {
      const total = Object.entries(initialReceived).reduce((sum, [val, count]) => sum + (Number(val) * (Number(count) || 0)), 0);
      setSimpleCashReceived(total || '');
    }
  }, [isOpen, enableDenominations, initialReceived]);

  if (!isOpen) return null;

  const receivedTotal = Object.entries(receivedDenominations).reduce((sum, [val, count]) => sum + (Number(val) * (Number(count) || 0)), 0);

  const handleConfirm = () => {
    if (globalSettings?.enable_denomination_check === false) {
      onConfirm({ "1": simpleCashReceived }, {});
    } else {
      onConfirm(receivedDenominations, changeDenominations);
    }
    onClose();
  };



  const changeDueAmount = enableDenominations 
    ? Math.max(0, receivedTotal - amountToPay)
    : Math.max(0, Number(simpleCashReceived) - amountToPay);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-ink font-black">Cash Denominations</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink transition-colors">✕</button>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-sm font-bold text-ink/60">Total Amount to Pay:</span>
            <span className="text-lg font-black text-brand-blue">{currency} {amountToPay.toFixed(2)}</span>
          </div>

          {enableDenominations ? (
            <>
              <div>
                <h3 className="text-sm font-black uppercase text-ink mb-2 tracking-widest">Received from Customer</h3>
                <DenominationInput 
                  denominations={receivedDenominations} 
                  onChange={setReceivedDenominations}
                  type="receive"
                />
              </div>

              {changeDueAmount > 0 && (
                <div>
                  <div className="flex justify-between mb-2 mt-4 pt-4 border-t-2 border-slate-100">
                    <h3 className="text-sm font-black uppercase text-ink tracking-widest">Change Given Back</h3>
                    <span className="text-sm font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-md">
                      Target: {currency} {changeDueAmount.toFixed(2)}
                    </span>
                  </div>
                  <DenominationInput 
                    denominations={changeDenominations} 
                    onChange={setChangeDenominations}
                    type="change"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase text-ink mb-2 tracking-widest">Total Cash Received</h3>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40 font-black">{currency}</span>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-14 pr-4 text-2xl font-black text-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                    placeholder="0.00"
                    value={simpleCashReceived}
                    onChange={(e) => setSimpleCashReceived(e.target.value)}
                  />
                </div>
              </div>

              {changeDueAmount > 0 && (
                <div>
                  <div className="flex justify-between mb-2 mt-4 pt-4 border-t-2 border-slate-100">
                    <h3 className="text-sm font-black uppercase text-ink tracking-widest">Change Due</h3>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 rounded-xl py-4 px-4">
                    <span className="text-2xl font-black text-rose-500">{currency} {changeDueAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-100">
            <button
              onClick={onClose}
              className="rounded-xl px-6 py-3 text-sm font-bold text-ink/60 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="rounded-xl px-8 py-3 text-sm font-black text-white bg-brand-blue hover:bg-brand-blue/90 shadow-lg shadow-brand-blue/30 transition-all active:scale-95"
            >
              Confirm Denominations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
