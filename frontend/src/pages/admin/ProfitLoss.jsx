import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';
import api from '../../api/api.js';
import * as XLSX from 'xlsx';
import { useBranch } from '../../context/BranchContext.jsx';

export default function ProfitLoss() {
  const { roleSlug } = useParams();
  const navigate = useNavigate();
  const { selectedBranch, setSelectedBranch, availableBranches } = useBranch();
  const [locations, setLocations] = useState([]);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [locationId, setLocationId] = useState(selectedBranch === 'all' ? '' : (selectedBranch || ''));
  const [excludedCategories, setExcludedCategories] = useState([]);
  
  const [reportData, setReportData] = useState({ revenues: [], expenses: [] });
  const [loading, setLoading] = useState(false);
  const [viewingBookingDetails, setViewingBookingDetails] = useState(null);

  const fetchBookingDetails = async (bookingId) => {
    try {
      const res = await api.get(`/bookings/${bookingId}`);
      setViewingBookingDetails(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch booking details');
    }
  };
  useEffect(() => {
    api.get('/locations?all=true').then(res => setLocations(res.data || [])).catch(() => {});
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {
        startDate,
        endDate,
        locationId,
        all: !locationId ? 'true' : 'false'
      };
      const res = await api.get(`/reports/profit_loss`, { params });
      setReportData(res.data || { revenues: [], expenses: [] });
    } catch (error) {
      console.error('Failed to fetch profit loss report:', error);
      alert('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const activeExpenses = reportData.expenses.filter(e => !excludedCategories.includes(e.category));

  const totalRevenue = reportData.revenues.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalExpenses = activeExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  const uniqueCategories = Array.from(new Set(reportData.expenses.map(e => e.category))).filter(Boolean);

  const toggleCategory = (cat) => {
    setExcludedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleExport = () => {
    if (reportData.revenues.length === 0 && reportData.expenses.length === 0) {
      alert('No data to export');
      return;
    }

    const locationName = locationId ? locations.find(l => l._id === locationId)?.name || 'Unknown' : 'All Branches';
    
    const aoa = [
      ['Profit & Loss Report'],
      ['Location / Store:', locationName],
      ['From:', startDate || 'Start'],
      ['To:', endDate || 'End'],
      [],
      ['Summary'],
      ['Total Sales:', totalRevenue],
      ['Total Expenses:', totalExpenses],
      ['Net Profit:', netProfit],
      [],
      ['Sales Details']
    ];

    if (reportData.revenues.length > 0) {
      aoa.push(['Date', 'Type', 'Customer', 'Booking Number', 'Source', 'Location', 'Amount']);
      reportData.revenues.forEach(item => {
        aoa.push([
          new Date(item.date).toLocaleDateString('en-GB'),
          item.type,
          item.customerName,
          item.bookingNumber || 'N/A',
          item.source || 'N/A',
          item.location,
          item.amount
        ]);
      });
    } else {
      aoa.push(['No sales in this period.']);
    }

    aoa.push([]);
    aoa.push(['Expense Details']);

    if (activeExpenses.length > 0) {
      aoa.push(['Date', 'Title', 'Category', 'Location', 'Amount']);
      activeExpenses.forEach(item => {
        aoa.push([
          new Date(item.date).toLocaleDateString('en-GB'),
          item.title,
          item.category,
          item.location,
          item.amount
        ]);
      });
    } else {
      aoa.push(['No expenses in this period.']);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, "Profit_Loss_Report");

    let filename = `Profit_Loss_Report`;
    if (startDate && endDate) {
      filename += `_${startDate}_to_${endDate}`;
    }
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  // Render helpers
  const formatCurrency = (val) => `AED ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="page-shell py-12">
        <AdminHeader 
          title="Profit & Loss" 
          description="Analyze total sales versus expenses for your business."
          backTo={`/${roleSlug}`}
        />

        <div className="bg-white rounded-[32px] p-8 mb-8 mt-8 shadow-sm border border-slate-200/60">
          <div className="grid gap-6 md:grid-cols-5 items-end">
             <div className="md:col-span-1">
              <label className="block text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2.5 px-0.5">Location / Store</label>
              <select
                className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3 px-4 text-xs font-bold text-ink focus:ring-2 focus:ring-brand-blue/10 outline-none transition-all cursor-pointer"
                value={locationId}
                onChange={e => {
                  setLocationId(e.target.value);
                  if (e.target.value) {
                    setSelectedBranch(e.target.value);
                  } else {
                    setSelectedBranch('all');
                  }
                }}
              >
                <option value="">All Branches</option>
                {locations.filter(loc => availableBranches.includes('all') || availableBranches.includes(loc._id)).map(loc => (
                  <option key={loc._id} value={loc._id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2.5 px-0.5">From Date</label>
              <input
                type="date"
                className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3 px-4 text-xs font-bold text-ink focus:ring-2 focus:ring-brand-blue/10 outline-none transition-all"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2.5 px-0.5">To Date</label>
              <input
                type="date"
                className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3 px-4 text-xs font-bold text-ink focus:ring-2 focus:ring-brand-blue/10 outline-none transition-all"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <button
                onClick={fetchReport}
                disabled={loading}
                className="w-full bg-brand-blue text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-brand-blue/15 disabled:opacity-50"
              >
                {loading ? 'Calculating...' : 'Calculate'}
              </button>
            </div>
            <div>
              <button
                onClick={handleExport}
                className="w-full bg-white border border-slate-200 text-ink py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-moss" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Category Exclusion Filters */}
        {uniqueCategories.length > 0 && (
          <div className="mb-8 max-w-sm">
            <label className="block text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2.5 px-0.5">Exclude Expense Categories</label>
            <select
                className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3 px-4 text-xs font-bold text-ink focus:ring-2 focus:ring-brand-blue/10 outline-none transition-all cursor-pointer"
                value=""
                onChange={(e) => {
                  if (e.target.value && !excludedCategories.includes(e.target.value)) {
                    setExcludedCategories(prev => [...prev, e.target.value]);
                  }
                }}
            >
              <option value="">Select category to exclude...</option>
              {uniqueCategories.filter(cat => !excludedCategories.includes(cat)).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            
            {excludedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {excludedCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all border bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 flex items-center gap-2"
                  >
                    <span>{cat}</span>
                    <span>✕</span>
                  </button>
                ))}
              </div>
            )}
            
            {excludedCategories.length > 0 && (
              <p className="mt-3 text-[10px] text-rose-500 font-bold">
                * Note: Excluded categories are not counted in Total Expense or Net Profit.
              </p>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="soft-card block rounded-2xl p-6 transition-all shadow-sm bg-white border border-slate-200">
            <p className="text-xs font-bold text-ink/40 uppercase tracking-widest">Total Sales</p>
            <p className={`mt-3 text-3xl font-black text-moss ${loading ? 'animate-pulse' : ''}`}>
              {loading ? '—' : formatCurrency(totalRevenue)}
            </p>
            <div className="mt-4 h-1 w-10 rounded-full bg-moss/70" />
          </div>
          <div className="soft-card block rounded-2xl p-6 transition-all shadow-sm bg-white border border-slate-200">
            <p className="text-xs font-bold text-ink/40 uppercase tracking-widest">Total Expense</p>
            <p className={`mt-3 text-3xl font-black text-rose-500 ${loading ? 'animate-pulse' : ''}`}>
              {loading ? '—' : formatCurrency(totalExpenses)}
            </p>
            <div className="mt-4 h-1 w-10 rounded-full bg-rose-500/70" />
          </div>
          <div className={`soft-card block rounded-2xl p-6 transition-all shadow-sm border ${netProfit >= 0 ? 'bg-moss/5 border-moss/20' : 'bg-rose-50 border-rose-200'}`}>
            <p className={`text-xs font-bold uppercase tracking-widest ${netProfit >= 0 ? 'text-moss/70' : 'text-rose-500/70'}`}>Net Profit</p>
            <p className={`mt-3 text-3xl font-black ${loading ? 'animate-pulse' : ''} ${netProfit >= 0 ? 'text-moss' : 'text-rose-600'}`}>
              {loading ? '—' : formatCurrency(netProfit)}
            </p>
            <div className={`mt-4 h-1 w-10 rounded-full ${netProfit >= 0 ? 'bg-moss' : 'bg-rose-500'}`} />
          </div>
        </section>

        <div className="mt-10 grid md:grid-cols-2 gap-8">
          {/* Revenue Breakdown */}
          <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-200/60">
             <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30">
               <h2 className="text-[11px] font-black text-brand-blue uppercase tracking-[0.2em]">Sales Details</h2>
             </div>
             <div className="p-6 max-h-[500px] overflow-y-auto">
               {reportData.revenues.length === 0 ? (
                 <p className="text-sm text-ink/40 text-center py-10">No sales in this period.</p>
               ) : (
                 <ul className="space-y-4">
                   {reportData.revenues.map(item => (
                     <li 
                       key={item._id} 
                       className="flex justify-between items-center p-4 border border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-slate-100 hover:border-brand-blue/30 transition-all cursor-pointer group"
                       onClick={() => {
                         if (item.bookingNumber && item.bookingNumber !== 'N/A') {
                           navigate(`/${roleSlug}/bookings?search=${encodeURIComponent(item.bookingNumber)}`);
                         } else {
                           navigate(`/${roleSlug}/bookings`);
                         }
                       }}
                       title="View Booking Details"
                     >
                       <div>
                         <p className="text-xs font-bold text-ink group-hover:text-brand-blue transition-colors">
                           {item.type} - {item.customerName}
                           {item.bookingNumber && item.bookingNumber !== 'N/A' && ` (${item.bookingNumber})`}
                         </p>
                         <p className="text-[10px] text-ink/40 mt-1">{new Date(item.date).toLocaleDateString()} • {item.location}</p>
                       </div>
                       <div className="flex items-center gap-3">
                         <span className="font-black text-moss text-sm">{formatCurrency(item.amount)}</span>
                         {item.bookingId && (
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               fetchBookingDetails(item.bookingId);
                             }}
                             className="px-3 py-1.5 bg-brand-blue/10 text-brand-blue rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all ml-2 hidden sm:block"
                           >
                             View Detail
                           </button>
                         )}
                         <span className="text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                       </div>
                     </li>
                   ))}
                 </ul>
               )}
             </div>
          </div>
          
          {/* Expense Breakdown */}
          <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-200/60">
             <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30">
               <h2 className="text-[11px] font-black text-brand-blue uppercase tracking-[0.2em]">Expense Details</h2>
             </div>
             <div className="p-6 max-h-[500px] overflow-y-auto">
               {activeExpenses.length === 0 ? (
                 <p className="text-sm text-ink/40 text-center py-10">No expenses in this period.</p>
               ) : (
                 <ul className="space-y-4">
                   {activeExpenses.map(item => (
                     <li 
                       key={item._id} 
                       className="flex justify-between items-center p-4 border border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-slate-100 hover:border-brand-blue/30 transition-all cursor-pointer group"
                       onClick={() => navigate(`/${roleSlug}/expenses`)}
                       title="Manage Expenses"
                     >
                       <div>
                         <p className="text-xs font-bold text-ink group-hover:text-brand-blue transition-colors">{item.title}</p>
                         <p className="text-[10px] text-ink/40 mt-1">
                           <span className="px-1.5 py-0.5 bg-slate-200 rounded text-ink/60 uppercase font-bold mr-2">{item.category}</span>
                           {new Date(item.date).toLocaleDateString()} • {item.location}
                         </p>
                       </div>
                       <div className="flex items-center gap-3">
                         <span className="font-black text-rose-500 text-sm">-{formatCurrency(item.amount)}</span>
                         <span className="text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                       </div>
                     </li>
                   ))}
                 </ul>
               )}
             </div>
          </div>
        </div>

      </main>
      <Footer />

      {/* Booking Details Modal */}
      {viewingBookingDetails && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-8 text-white flex justify-between items-start shrink-0 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-lg uppercase tracking-widest">Booking Record</span>
                  {viewingBookingDetails.bookingNumber && (
                    <span className="text-[10px] font-black bg-white text-indigo-600 px-2 py-1 rounded-lg uppercase tracking-widest">{viewingBookingDetails.bookingNumber}</span>
                  )}
                </div>
                <h3 className="font-display text-3xl font-black text-white">Full Details</h3>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">ID: {viewingBookingDetails._id}</p>
              </div>
              <button onClick={() => setViewingBookingDetails(null)} className="relative z-10 rounded-full bg-white/10 p-2 hover:bg-white/20 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
              <div className="grid md:grid-cols-2 gap-8">
                <section>
                  <h4 className="text-[10px] font-black text-ink uppercase tracking-[0.2em] mb-4">Service Information</h4>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <div>
                      <p className="text-[9px] font-black text-ink/20 uppercase tracking-widest mb-1">Type</p>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${viewingBookingDetails.bookingType === 'package' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
                        {viewingBookingDetails.bookingType === 'package' ? '📦 Membership / Package' : '🎟️ Single Session'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-ink/20 uppercase tracking-widest mb-1">Service Name</p>
                      <p className="text-sm font-black text-ink">{viewingBookingDetails.classId?.title || viewingBookingDetails.planId?.name || 'Package Purchase'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-ink/20 uppercase tracking-widest mb-1">Booking Date</p>
                      <p className="text-sm font-black text-ink">{new Date(viewingBookingDetails.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-ink/20 uppercase tracking-widest mb-1">Schedule Date</p>
                      <p className="text-sm font-black text-ink">{viewingBookingDetails.date ? new Date(viewingBookingDetails.date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-black text-ink uppercase tracking-[0.2em] mb-4">Payment & Finance</h4>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[9px] font-black text-ink/20 uppercase tracking-widest">Total Amount</p>
                        <p className="text-lg font-black text-brand-blue">AED {viewingBookingDetails.totalAmount?.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-ink/20 uppercase tracking-widest">Status</p>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${viewingBookingDetails.paymentStatus === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {viewingBookingDetails.paymentStatus}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                      <div>
                        <p className="text-[9px] font-black text-ink/20 uppercase tracking-widest">Method</p>
                        <p className="text-[11px] font-bold text-ink">{viewingBookingDetails.paymentMethod?.toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-ink/20 uppercase tracking-widest">Reference</p>
                        <p className="text-[11px] font-bold text-ink truncate">{viewingBookingDetails.paymentReference || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <section>
                <h4 className="text-[10px] font-black text-ink uppercase tracking-[0.2em] mb-4">Customer Details</h4>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <p className="text-[9px] font-black text-ink/20 uppercase tracking-widest">Name</p>
                       <p className="text-[11px] font-bold text-ink">{viewingBookingDetails.userId?.name || viewingBookingDetails.guestDetails?.name || 'N/A'}</p>
                     </div>
                     <div>
                       <p className="text-[9px] font-black text-ink/20 uppercase tracking-widest">Email</p>
                       <p className="text-[11px] font-bold text-ink">{viewingBookingDetails.userId?.email || viewingBookingDetails.guestDetails?.email || 'N/A'}</p>
                     </div>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-black text-ink uppercase tracking-[0.2em] mb-4">Participants ({viewingBookingDetails.participants?.length})</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  {viewingBookingDetails.participants?.map((p, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg">👤</div>
                      <div>
                        <p className="text-sm font-black text-ink">{p.name}</p>
                        <p className="text-[10px] font-bold text-ink/30 uppercase tracking-widest">{p.relation || 'N/A'} • {p.age} Years</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="p-8 border-t border-slate-100 bg-white flex justify-end gap-4 shrink-0">
              <button onClick={() => window.open(`/invoice/booking/${viewingBookingDetails._id}`, '_blank')} className="px-8 py-4 rounded-2xl bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2">
                <span>📜</span> View Invoice
              </button>
              <button onClick={() => setViewingBookingDetails(null)} className="px-10 py-4 rounded-2xl bg-slate-50 text-ink/40 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
