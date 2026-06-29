import { useState } from 'react';
import api from '../api/api.js';
import toast from 'react-hot-toast';

export default function ExtensionRequestForm({ membershipId, sessionId, endDate, onClose, onSuccess, type = 'reschedule', timeSlots = [] }) {
  const [reason, setReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [loading, setLoading] = useState(false);

  const isExtend = type === 'extend';

  // Format date for display
  const fmt = (d) => d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  // Compute minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isExtend && !newDate) {
      toast.error('Please select a new end date');
      return;
    }
    setLoading(true);
    try {
      await api.post('/extensions/request', {
        membershipId,
        targetSessionId: sessionId,
        type,
        reason,
        newDate: isExtend ? newDate : (type === 'reschedule' ? newDate : undefined),
        newSlot: type === 'reschedule' ? newSlot : undefined
      });
      toast.success('Request submitted for admin approval');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className={`p-8 text-white ${isExtend ? 'bg-gradient-to-br from-indigo-600 to-purple-600' : 'bg-gradient-to-br from-brand-blue to-teal-500'}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-1">
            {isExtend ? 'Membership Extension' : 'Reschedule Session'}
          </p>
          <h3 className="text-2xl font-black text-white">
            {isExtend ? 'Extend End Date' : 'Reschedule Session'}
          </h3>
          <p className="text-xs text-white/60 font-bold mt-1 uppercase tracking-widest">Admin Approval Required</p>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">

          {/* Date Change Preview — Only for Extend */}
          {isExtend && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-ink/30">Membership End Date</p>

              {/* Old Date (crossed out) */}
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-ink/30 mb-0.5">Current End Date</p>
                  <p className="text-sm font-black text-rose-400 line-through decoration-2 decoration-rose-400">
                    {fmt(endDate)}
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center gap-2 ml-1">
                <div className="w-px h-5 bg-slate-200 ml-0.5" />
                <span className="text-slate-300 text-xs font-black">↓ New</span>
              </div>

              {/* New Date Preview */}
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${newDate ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                <div className="flex-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-ink/30 mb-0.5">New End Date</p>
                  {newDate ? (
                    <p className="text-sm font-black text-emerald-600">
                      {fmt(newDate)}
                    </p>
                  ) : (
                    <p className="text-sm font-bold text-ink/20 italic">Select a date below...</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* New End Date picker — extend only */}
            {isExtend && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-ink/30 mb-2 ml-1">
                  New End Date
                </label>
                <input
                  type="date"
                  required
                  min={minDate}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-sm font-bold text-ink focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 outline-none transition-all"
                />
              </div>
            )}

            {/* Reschedule fields */}
            {type === 'reschedule' && (
              <>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-ink/30 mb-2 ml-1">Suggested New Date</label>
                  <input
                    type="date"
                    required
                    min={minDate}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-sm font-bold text-ink focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-ink/30 mb-2 ml-1">Suggested Time Slot</label>
                  {timeSlots && timeSlots.length > 0 ? (
                    <select
                      required
                      value={newSlot}
                      onChange={(e) => setNewSlot(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-sm font-bold text-ink focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all"
                    >
                      <option value="">Select a slot...</option>
                      {timeSlots.map((slot, idx) => (
                        <option key={idx} value={slot}>{slot}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={newSlot}
                      onChange={(e) => setNewSlot(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-sm font-bold text-ink focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all"
                      placeholder="e.g. 10:00 AM"
                    />
                  )}
                </div>
              </>
            )}

            {/* Reason */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-ink/30 mb-2 ml-1">Reason</label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-sm font-bold text-ink focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all placeholder:text-ink/20 min-h-[90px] resize-none"
                placeholder="e.g. Health issues, travelling..."
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-2xl py-4 text-sm font-black text-white shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${isExtend ? 'bg-indigo-600 shadow-indigo-500/20 hover:shadow-indigo-500/30' : 'bg-brand-blue shadow-brand-blue/20 hover:shadow-brand-blue/30'}`}
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs font-black uppercase tracking-widest text-ink/30 hover:text-ink/60 transition-all"
              >
                Go Back
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
