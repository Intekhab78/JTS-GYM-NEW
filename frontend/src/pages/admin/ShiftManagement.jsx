import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { shiftApi } from '../../api/shiftApi.js';
import AdminHeader from '../../components/AdminHeader.jsx';
import Footer from '../../components/Footer.jsx';
import Navbar from '../../components/Navbar.jsx';

export default function ShiftManagement() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState(null);

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const data = await shiftApi.getAllShifts();
      setShifts(data);
    } catch (error) {
      toast.error('Failed to fetch shifts');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const renderDenominations = (denoms) => {
    if (!denoms || Object.keys(denoms).length === 0) return <p className="text-xs text-ink/50 italic">Not recorded</p>;
    return (
      <div className="flex flex-col gap-2 mt-2">
        {Object.entries(denoms)
          .sort((a, b) => Number(b[0]) - Number(a[0]))
          .map(([val, count]) => {
          if (!count || count === '0' || count === 0) return null;
          const totalAmount = Number(val) * Number(count);
          return (
            <div key={val} className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
              <div className="flex items-center gap-4">
                <span className="w-16 text-xs font-black text-ink/40 uppercase tracking-widest">{val} AED</span>
                <span className="text-sm font-black text-ink">× {count}</span>
              </div>
              <span className="text-xs font-bold text-emerald-600/80">{formatCurrency(totalAmount)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="page-shell flex-1 pb-12 pt-8">
        <AdminHeader 
          title="Shift Management" 
          description="View cashier shift history, drawer totals, and cash discrepancies."
        />

        <section className="mt-8">
          <div className="soft-card overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-ink/50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-black tracking-wider">Cashier</th>
                    <th className="px-6 py-4 font-black tracking-wider">Start Time</th>
                    <th className="px-6 py-4 font-black tracking-wider">End Time</th>
                    <th className="px-6 py-4 font-black tracking-wider">Starting Cash</th>
                    <th className="px-6 py-4 font-black tracking-wider text-amber-600">Expected Total (Cash)</th>
                    <th className="px-6 py-4 font-black tracking-wider text-emerald-600">Actual Counted</th>
                    <th className="px-6 py-4 font-black tracking-wider">Discrepancy</th>
                    <th className="px-6 py-4 font-black tracking-wider">Status</th>
                    <th className="px-6 py-4 font-black tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-8 text-center text-ink/50 animate-pulse">
                        Loading shifts...
                      </td>
                    </tr>
                  ) : shifts.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-8 text-center text-ink/50">
                        No shifts found.
                      </td>
                    </tr>
                  ) : (
                    shifts.map((shift) => {
                      const expectedDrawer = (shift.startingCash || 0) + (shift.expectedCash || 0);
                      const isShort = shift.discrepancy < 0;
                      return (
                        <tr key={shift._id} className="transition-colors hover:bg-slate-50/50">
                          <td className="px-6 py-4">
                            <p className="font-bold text-ink">{shift.cashierId?.name || 'Unknown'}</p>
                            <p className="text-[10px] uppercase font-bold text-ink/50 tracking-wider">{shift.cashierId?.role}</p>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-ink/70">
                            {new Date(shift.openedAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-ink/70">
                            {shift.closedAt ? new Date(shift.closedAt).toLocaleString() : '—'}
                          </td>
                          <td className="px-6 py-4 font-black text-ink/50">
                            {formatCurrency(shift.startingCash)}
                          </td>
                          <td className="px-6 py-4 font-black text-amber-600 bg-amber-50/30">
                            {shift.closedAt ? formatCurrency(expectedDrawer) : '—'}
                          </td>
                          <td className="px-6 py-4 font-black text-emerald-600 bg-emerald-50/30">
                            {shift.closedAt ? formatCurrency(shift.actualCash) : '—'}
                          </td>
                          <td className="px-6 py-4">
                            {shift.closedAt ? (
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black ${
                                isShort ? 'bg-rose-100 text-rose-700' : 
                                shift.discrepancy > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {isShort ? '' : '+'}{formatCurrency(shift.discrepancy)}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                              shift.status === 'open' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {shift.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setSelectedShift(shift)}
                              className="p-2 text-ink/40 hover:text-brand-blue hover:bg-brand-blue/10 rounded-xl transition-all"
                              title="View Details"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {selectedShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/20 backdrop-blur-sm">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-display font-bold text-ink">Shift Details</h2>
                  <p className="text-xs font-black text-ink/40 uppercase tracking-widest mt-1">
                    {selectedShift.cashierId?.name} • {new Date(selectedShift.openedAt).toLocaleDateString()}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedShift(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-ink/50 hover:bg-slate-200 hover:text-ink transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </div>

              <div className="p-8 max-h-[70vh] overflow-y-auto">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-[10px] font-black text-ink/30 uppercase tracking-widest mb-3">Opening Denominations</h3>
                    {renderDenominations(selectedShift.openingDenominations)}
                  </div>
                  
                  {selectedShift.status === 'closed' ? (
                    <div>
                      <h3 className="text-[10px] font-black text-ink/30 uppercase tracking-widest mb-3">Closing Denominations</h3>
                      {renderDenominations(selectedShift.closingDenominations)}
                    </div>
                  ) : (
                    <div className="flex flex-col justify-center items-center h-full bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
                       <span className="text-2xl mb-2">⏳</span>
                       <span className="text-xs font-bold text-ink/40">Shift is still open</span>
                    </div>
                  )}
                </div>

                {selectedShift.notes && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <h3 className="text-[10px] font-black text-ink/30 uppercase tracking-widest mb-3">Closing Notes (Discrepancy)</h3>
                    <p className="text-sm font-medium text-ink bg-amber-50 p-4 rounded-2xl border border-amber-100">{selectedShift.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
