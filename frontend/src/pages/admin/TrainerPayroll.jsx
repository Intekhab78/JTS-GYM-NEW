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

  const downloadCSV = () => {
    const headers = ['Trainer Name', 'Compensation Type', 'Rate / Salary', 'Sessions Conducted', 'Total Payout'];
    const csvContent = [
      headers.join(','),
      ...payrollData.map(data => [
        `"${data.name}"`,
        data.compensationType === 'SALARY' ? 'Salary (Fixed)' : 'Per Session',
        data.compensationRate,
        data.compensationType === 'SALARY' ? 'N/A' : data.sessionsCount,
        data.totalPayout
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `trainer_payroll_${dateRange.startDate}_to_${dateRange.endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="page-shell pb-12 pt-8">
        <AdminHeader 
          title="Trainer Payroll" 
          description="View earnings and calculate payouts based on completed sessions."
        />

        <div className="mb-8 rounded-[32px] bg-white p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 md:items-end">
          <div className="flex-1">
            <label className="text-xs font-bold uppercase tracking-wider text-ink/50 block mb-1">Start Date</label>
            <input 
              type="date" 
              name="startDate" 
              value={dateRange.startDate} 
              onChange={handleDateChange}
              className="w-full rounded-xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold uppercase tracking-wider text-ink/50 block mb-1">End Date</label>
            <input 
              type="date" 
              name="endDate" 
              value={dateRange.endDate} 
              onChange={handleDateChange}
              className="w-full rounded-xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-coral focus:ring-0"
            />
          </div>
          <div className="md:ml-auto w-full md:w-auto mt-2 md:mt-0">
            <button
              onClick={downloadCSV}
              disabled={payrollData.length === 0}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-ocean text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-ocean-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-ocean/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Report
            </button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block rounded-[32px] bg-white border border-slate-100 shadow-sm overflow-hidden">
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

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {loading ? (
             <div className="px-6 py-10 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm">Loading payroll data...</div>
          ) : payrollData.length === 0 ? (
             <div className="px-6 py-10 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm">No active trainers found.</div>
          ) : (
            payrollData.map((data) => (
              <div key={data._id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-ink text-lg">{data.name}</h3>
                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold ${data.compensationType === 'SALARY' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                    {data.compensationType === 'SALARY' ? 'Salary' : 'Per Session'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-2xl">
                  <div>
                    <p className="text-[10px] font-bold text-ink/40 uppercase tracking-widest mb-1">Rate / Salary</p>
                    <p className="font-medium text-ink">{currency}{data.compensationRate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-ink/40 uppercase tracking-widest mb-1">Sessions</p>
                    {data.compensationType === 'SALARY' ? (
                      <p className="text-ink/40 italic">N/A</p>
                    ) : (
                      <p className="font-medium text-ink">{data.sessionsCount}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-end mt-2 pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-ink/40 uppercase tracking-widest">Total Payout</p>
                  <p className="font-display text-2xl text-coral leading-none">{currency}{data.totalPayout}</p>
                </div>
              </div>
            ))
          )}
        </div>

      </main>
      <Footer />
    </div>
  );
}
