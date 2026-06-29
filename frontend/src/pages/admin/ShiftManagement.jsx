import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { shiftApi } from '../../api/shiftApi.js';
import AdminHeader from '../../components/AdminHeader.jsx';
import Footer from '../../components/Footer.jsx';
import Navbar from '../../components/Navbar.jsx';

export default function ShiftManagement() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-ink/50 animate-pulse">
                        Loading shifts...
                      </td>
                    </tr>
                  ) : shifts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-ink/50">
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
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
