import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';
import api from '../../api/api.js';
import { useSettings } from '../../context/SettingsContext.jsx';

export default function TrainerPayroll() {
  const { currency } = useSettings();
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
  });

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/trainers/payroll?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      setPayrollData(res.data || []);
    } catch (err) {
      console.error('Failed to fetch payroll data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [dateRange]);

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="page-shell pb-12 pt-8">
        <AdminHeader 
          title="Trainer Payroll" 
          description="View earnings and calculate payouts based on completed sessions."
        />

        <div className="mb-8 rounded-[32px] bg-white p-6 shadow-sm border border-slate-100 flex gap-4 items-center">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink/50 block mb-1">Start Date</label>
            <input 
              type="date" 
              name="startDate" 
              value={dateRange.startDate} 
              onChange={handleDateChange}
              className="rounded-xl border-slate-200 bg-slate-50 p-2 text-sm focus:border-coral focus:ring-0"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink/50 block mb-1">End Date</label>
            <input 
              type="date" 
              name="endDate" 
              value={dateRange.endDate} 
              onChange={handleDateChange}
              className="rounded-xl border-slate-200 bg-slate-50 p-2 text-sm focus:border-coral focus:ring-0"
            />
          </div>
        </div>

        <div className="rounded-[32px] bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-ink/50 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Trainer Name</th>
                  <th className="px-6 py-4">Comp. Type</th>
                  <th className="px-6 py-4">Rate / Salary</th>
                  <th className="px-6 py-4">Sessions Conducted</th>
                  <th className="px-6 py-4 text-right">Total Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-slate-400">Loading payroll data...</td>
                  </tr>
                ) : payrollData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-slate-400">No active trainers found.</td>
                  </tr>
                ) : (
                  payrollData.map((data) => (
                    <tr key={data._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-ink">{data.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold ${data.compensationType === 'SALARY' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                          {data.compensationType === 'SALARY' ? 'Salary (Fixed)' : 'Per Session'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-ink/70">{currency}{data.compensationRate}</td>
                      <td className="px-6 py-4 text-ink/70">
                        {data.compensationType === 'SALARY' ? (
                          <span className="text-ink/40 italic">N/A</span>
                        ) : (
                          <span className="font-medium text-ink">{data.sessionsCount}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-display text-lg text-coral">
                        {currency}{data.totalPayout}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}
