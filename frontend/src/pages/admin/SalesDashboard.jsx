import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';
import api from '../../api/api.js';
import * as XLSX from 'xlsx';
import { useBranch } from '../../context/BranchContext.jsx';

export default function SalesDashboard() {
  const { roleSlug } = useParams();
  const navigate = useNavigate();
  const { selectedBranch, setSelectedBranch, availableBranches } = useBranch();

  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState(selectedBranch === 'all' ? '' : (selectedBranch || ''));
  
  // Date Presets & Compare
  const [datePreset, setDatePreset] = useState('month'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [compare, setCompare] = useState(false);
  const [compareType, setCompareType] = useState('previous_period'); // 'previous_period' or 'previous_year'

  // Current Data
  const [salesReport, setSalesReport] = useState([]);
  const [detailedSales, setDetailedSales] = useState([]);
  
  // Prev Data
  const [prevSalesReport, setPrevSalesReport] = useState([]);
  const [prevDetailedSales, setPrevDetailedSales] = useState([]);

  const [consumption, setConsumption] = useState({
    membership: { used: 0, total: 0, percent: 0 },
    classes: { used: 0, total: 0, percent: 0 }
  });

  const [rawMemberships, setRawMemberships] = useState([]);
  const [rawSessions, setRawSessions] = useState([]);
  const [capacityTab, setCapacityTab] = useState('classes');

  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    api.get('/locations?all=true').then(res => setLocations(res.data || [])).catch(() => {});
  }, []);

  const calculatePrevDates = (start, end, cType) => {
    if (!start || !end) return { prevStart: '', prevEnd: '' };
    const s = new Date(start);
    const e = new Date(end);

    if (cType === 'previous_year') {
      const prevStart = new Date(s.getFullYear() - 1, s.getMonth(), s.getDate());
      const prevEnd = new Date(e.getFullYear() - 1, e.getMonth(), e.getDate());
      return { 
        prevStart: prevStart.toISOString().slice(0, 10), 
        prevEnd: prevEnd.toISOString().slice(0, 10) 
      };
    }

    // Previous Period
    const diffTime = Math.abs(e - s);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (datePreset === 'month') {
      const prevStart = new Date(s.getFullYear(), s.getMonth() - 1, 1);
      const prevEnd = new Date(s.getFullYear(), s.getMonth(), 0);
      return { prevStart: prevStart.toISOString().slice(0, 10), prevEnd: prevEnd.toISOString().slice(0, 10) };
    }

    if (datePreset === 'year') {
      const prevStart = new Date(s.getFullYear() - 1, 0, 1);
      const prevEnd = new Date(s.getFullYear() - 1, 11, 31);
      return { prevStart: prevStart.toISOString().slice(0, 10), prevEnd: prevEnd.toISOString().slice(0, 10) };
    }

    const prevEnd = new Date(s);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - diffDays + 1);

    return {
      prevStart: prevStart.toISOString().slice(0, 10),
      prevEnd: prevEnd.toISOString().slice(0, 10)
    };
  };

  const applyPreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    let start = '';
    let end = '';

    if (preset === 'today') {
      start = now.toISOString().slice(0, 10);
      end = now.toISOString().slice(0, 10);
    } else if (preset === 'week') {
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
      start = firstDay.toISOString().slice(0, 10);
      end = new Date().toISOString().slice(0, 10);
    } else if (preset === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    } else if (preset === 'year') {
      start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      end = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
    } else if (preset === 'all') {
      start = '';
      end = '';
    }

    if (preset !== 'custom') {
      setStartDate(start);
      setEndDate(end);
    }
    setCurrentPage(1); // Reset page on filter change
  };

  useEffect(() => { applyPreset('month'); }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = { startDate, endDate, locationId, all: !locationId ? 'true' : 'false' };
      
      const promises = [
        api.get(`/reports/sales_report`, { params }),
        api.get(`/reports/detailed_sales`, { params }),
        api.get(`/reports/membership_consumption`, { params }),
        api.get(`/sessions`, { params: { start: startDate, end: endDate, locationId, all: !locationId ? 'true' : 'false' } })
      ];

      if (compare && startDate && endDate) {
        const { prevStart, prevEnd } = calculatePrevDates(startDate, endDate, compareType);
        const prevParams = { startDate: prevStart, endDate: prevEnd, locationId, all: !locationId ? 'true' : 'false' };
        promises.push(api.get(`/reports/sales_report`, { params: prevParams }));
        promises.push(api.get(`/reports/detailed_sales`, { params: prevParams }));
      }

      const results = await Promise.all(promises);

      setSalesReport(results[0].data || []);
      setDetailedSales(results[1].data || []);
      
      // Calculate Consumption Metrics
      const memberships = results[2].data || [];
      const sessions = results[3].data || [];
      
      setRawMemberships(memberships);
      setRawSessions(sessions);
      
      let memTotal = 0;
      let memUsed = 0;
      memberships.forEach(m => {
        if (m.totalSessions !== 'Unlimited') {
          memTotal += m.totalSessions;
        }
        memUsed += m.sessionsUsed;
      });

      let classTotal = 0;
      let classUsed = 0;
      sessions.forEach(s => {
        if (s.classType === 'Class') {
          classTotal += (s.capacity || 0);
          classUsed += (s.bookedParticipants || 0);
        }
      });

      setConsumption({
        membership: { used: memUsed, total: memTotal, percent: memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0 },
        classes: { used: classUsed, total: classTotal, percent: classTotal > 0 ? Math.round((classUsed / classTotal) * 100) : 0 }
      });

      if (compare && startDate && endDate) {
        setPrevSalesReport(results[4]?.data || []);
        setPrevDetailedSales(results[5]?.data || []);
      } else {
        setPrevSalesReport([]);
        setPrevDetailedSales([]);
      }
    } catch (err) {
      console.error('Failed to fetch sales dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (datePreset === 'custom' && (!startDate || !endDate)) return;
    fetchDashboardData();
  }, [startDate, endDate, locationId, compare, compareType]);

  const handleStartDateChange = (e) => { setStartDate(e.target.value); setDatePreset('custom'); setCurrentPage(1); };
  const handleEndDateChange = (e) => { setEndDate(e.target.value); setDatePreset('custom'); setCurrentPage(1); };

  // Metrics
  const calcTotals = (detailed) => {
    const totalRev = detailed.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
    const totalTx = detailed.length;
    return {
      revenue: totalRev,
      transactions: totalTx,
      avg: totalTx > 0 ? (totalRev / totalTx) : 0
    };
  };

  const currStats = calcTotals(detailedSales);
  const prevStats = calcTotals(prevDetailedSales);

  const renderGrowthBadge = (curr, prev) => {
    if (!compare || !startDate || prev === 0) return null;
    const diff = curr - prev;
    const percent = Math.round((diff / prev) * 100);
    const isUp = diff >= 0;
    return (
      <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
        <span>{isUp ? '↑' : '↓'}</span>
        <span>{Math.abs(percent)}% vs prev</span>
      </div>
    );
  };

  // Chart Data
  const chartData = useMemo(() => {
    const groupType = (datePreset === 'year' || datePreset === 'all') ? 'Monthly' : 'Daily';
    
    let currFiltered = salesReport.filter(item => item.type === groupType).sort((a, b) => new Date(a.date) - new Date(b.date));
    let prevFiltered = prevSalesReport.filter(item => item.type === groupType).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Map to a common axis
    const mappedData = [];
    const maxLen = Math.max(currFiltered.length, prevFiltered.length);

    for (let i = 0; i < maxLen; i++) {
      const cItem = currFiltered[i];
      const pItem = prevFiltered[i];
      
      let label = `Period ${i+1}`;
      if (groupType === 'Monthly') {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        label = cItem ? months[new Date(cItem.date + '-01').getMonth()] : (pItem ? months[new Date(pItem.date + '-01').getMonth()] : label);
      } else {
        label = cItem ? new Date(cItem.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : `Day ${i+1}`;
      }

      mappedData.push({
        name: label,
        CurrentRevenue: cItem ? cItem.amount : 0,
        PrevRevenue: pItem ? pItem.amount : null, // null so it doesn't draw a line if missing
        origDateCurr: cItem ? cItem.dateDisplay : null,
        origDatePrev: pItem ? pItem.dateDisplay : null
      });
    }
    return mappedData;
  }, [salesReport, prevSalesReport, datePreset, compare]);

  const capacityChartData = useMemo(() => {
    if (capacityTab === 'classes') {
      const map = {};
      rawSessions.forEach(s => {
        if (s.classType === 'Class') {
          const name = s.classId?.title || 'Unknown Class';
          if (!map[name]) map[name] = { name, Capacity: 0, Booked: 0 };
          map[name].Capacity += (s.capacity || 0);
          map[name].Booked += (s.bookedParticipants || 0);
        }
      });
      return Object.values(map);
    } else {
      const map = {};
      rawMemberships.forEach(m => {
        const name = m.planId?.name || 'Unknown Plan';
        if (!map[name]) map[name] = { name, TotalSlots: 0, Consumed: 0 };
        if (m.totalSessions !== 'Unlimited') {
          map[name].TotalSlots += m.totalSessions;
        }
        map[name].Consumed += m.sessionsUsed;
      });
      return Object.values(map);
    }
  }, [rawSessions, rawMemberships, capacityTab]);

  const handleExport = () => {
    if (detailedSales.length === 0) {
      alert('No data to export');
      return;
    }

    const aoa = [
      ['Sales Dashboard Report'],
      ['From:', startDate || 'All Time'],
      ['To:', endDate || 'All Time'],
      ['Location:', locationId ? locations.find(l => l._id === locationId)?.name : 'All Branches'],
      [],
      ['Total Revenue:', currStats.revenue],
      ['Total Transactions:', currStats.transactions],
      ['Avg Transaction Value:', currStats.avg],
      [],
      ['Date', 'Invoice', 'Customer', 'Email', 'Phone', 'Item', 'Qty', 'Unit Price', 'Location', 'Payment Source', 'Payment Mode', 'Discount', 'Total Amount']
    ];

    detailedSales.forEach(s => {
      aoa.push([
        new Date(s.invoiceDate).toLocaleDateString(),
        s.invoiceNumber,
        s.customerName,
        s.customerEmail,
        s.customerPhone,
        s.item,
        s.quantity,
        s.unitPrice,
        s.location,
        s.paymentSource,
        s.paymentMode,
        s.discountType && s.discountType !== 'None' ? `${s.discount} (${s.discountType})` : 0,
        s.totalAmount
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, "Sales_Report");
    XLSX.writeFile(wb, `Sales_Report_${startDate}_${endDate}.xlsx`);
  };

  const formatCurrency = (val) => `AED ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const paginatedSales = detailedSales.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(detailedSales.length / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="page-shell py-12">
        <AdminHeader title="Sales Dashboard" description="Real-time revenue, transactions, and financial trends." backTo={`/${roleSlug}`} />

        <div className="bg-white rounded-[32px] p-8 mb-8 mt-8 shadow-sm border border-slate-200/60">
          <div className="flex flex-col lg:flex-row justify-between gap-6 mb-6">
            <div className="flex-1">
              <label className="block text-[10px] font-black text-ink/40 uppercase tracking-widest mb-3 px-0.5">Quick Filters</label>
              <div className="flex flex-wrap gap-2">
                {[{ id: 'today', label: 'Today' }, { id: 'week', label: 'This Week' }, { id: 'month', label: 'This Month' }, { id: 'year', label: 'This Year' }, { id: 'all', label: 'All Time' }].map(preset => (
                  <button key={preset.id} onClick={() => applyPreset(preset.id)} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${datePreset === preset.id ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20' : 'bg-slate-50 text-ink/60 hover:bg-slate-100'}`}>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2.5 px-0.5">Custom From</label>
                <input type="date" value={startDate} onChange={handleStartDateChange} className="w-full lg:w-36 bg-slate-50/50 border border-slate-100 rounded-2xl py-2.5 px-4 text-xs font-bold text-ink focus:ring-2 focus:ring-brand-blue/10 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2.5 px-0.5">Custom To</label>
                <input type="date" value={endDate} onChange={handleEndDateChange} className="w-full lg:w-36 bg-slate-50/50 border border-slate-100 rounded-2xl py-2.5 px-4 text-xs font-bold text-ink focus:ring-2 focus:ring-brand-blue/10 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2.5 px-0.5">Location</label>
                <select 
                  value={locationId} 
                  onChange={(e) => {
                    setLocationId(e.target.value);
                    if (e.target.value) {
                      setSelectedBranch(e.target.value);
                    } else {
                      setSelectedBranch('all');
                    }
                  }} 
                  className="w-full lg:w-48 bg-slate-50/50 border border-slate-100 rounded-2xl py-2.5 px-4 text-xs font-bold text-ink focus:ring-2 focus:ring-brand-blue/10 outline-none"
                >
                  <option value="">All Branches</option>
                  {locations.filter(loc => availableBranches.includes('all') || availableBranches.includes(loc._id)).map(loc => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          
          {/* Comparison Controls */}
          {datePreset !== 'all' && (
            <div className="pt-6 border-t border-slate-100 flex items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${compare ? 'bg-brand-blue' : 'bg-slate-200'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${compare ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <span className="text-xs font-bold text-ink/60 group-hover:text-ink transition-colors uppercase tracking-widest">Compare vs Previous</span>
              </label>

              {compare && (
                <div className="flex gap-2">
                  <button onClick={() => setCompareType('previous_period')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${compareType === 'previous_period' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-ink/40 hover:bg-slate-200'}`}>
                    Previous Period
                  </button>
                  <button onClick={() => setCompareType('previous_year')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${compareType === 'previous_year' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-ink/40 hover:bg-slate-200'}`}>
                    Previous Year
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* KPI Summary Cards */}
        <section className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-brand-blue/10 relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-brand-blue/5 rounded-full blur-2xl group-hover:bg-brand-blue/10 transition-all duration-500" />
            <p className="text-xs font-bold text-ink/40 uppercase tracking-widest">Total Revenue</p>
            <p className={`mt-3 text-4xl font-black text-brand-blue ${loading ? 'animate-pulse' : ''}`}>{loading ? '—' : formatCurrency(currStats.revenue)}</p>
            {renderGrowthBadge(currStats.revenue, prevStats.revenue)}
          </div>
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200/60 relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-moss/5 rounded-full blur-2xl group-hover:bg-moss/10 transition-all duration-500" />
            <p className="text-xs font-bold text-ink/40 uppercase tracking-widest">Transactions</p>
            <p className={`mt-3 text-4xl font-black text-ink ${loading ? 'animate-pulse' : ''}`}>{loading ? '—' : currStats.transactions.toLocaleString()}</p>
            {renderGrowthBadge(currStats.transactions, prevStats.transactions)}
          </div>
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200/60 relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-500" />
            <p className="text-xs font-bold text-ink/40 uppercase tracking-widest">Avg Transaction</p>
            <p className={`mt-3 text-4xl font-black text-ink ${loading ? 'animate-pulse' : ''}`}>{loading ? '—' : formatCurrency(currStats.avg)}</p>
            {renderGrowthBadge(currStats.avg, prevStats.avg)}
          </div>
        </section>

        {/* Capacity Analysis Chart */}
        <div className="bg-white rounded-[32px] p-8 mb-8 shadow-sm border border-slate-200/60">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h2 className="text-[11px] font-black text-brand-blue uppercase tracking-[0.2em]">Capacity Analysis</h2>
            
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button 
                onClick={() => setCapacityTab('classes')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${capacityTab === 'classes' ? 'bg-white text-brand-blue shadow-sm' : 'text-ink/40 hover:text-ink/70'}`}
              >
                Drop-in Classes
              </button>
              <button 
                onClick={() => setCapacityTab('memberships')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${capacityTab === 'memberships' ? 'bg-white text-indigo-600 shadow-sm' : 'text-ink/40 hover:text-ink/70'}`}
              >
                Memberships
              </button>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
              </div>
            ) : capacityChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capacityChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} dy={10} interval={0} angle={-15} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '16px' }}
                    labelStyle={{ fontSize: '11px', fontWeight: 900, color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                  
                  {capacityTab === 'classes' ? (
                    <>
                      <Bar dataKey="Capacity" fill="#bae6fd" radius={[4, 4, 0, 0]} name="Total Capacity" />
                      <Bar dataKey="Booked" fill="#0284c7" radius={[4, 4, 0, 0]} name="Booked Slots" />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="TotalSlots" fill="#c7d2fe" radius={[4, 4, 0, 0]} name="Included Slots" />
                      <Bar dataKey="Consumed" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Consumed Slots" />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-ink/40 font-bold">
                No capacity data for this period.
              </div>
            )}
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-[32px] p-8 mb-8 shadow-sm border border-slate-200/60">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-[11px] font-black text-brand-blue uppercase tracking-[0.2em]">Revenue Trend</h2>
            <div className="flex items-center gap-4">
              {compare && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                  <span className="text-[10px] font-bold text-ink/40 uppercase tracking-widest">Previous</span>
                  <div className="w-3 h-3 rounded-full bg-brand-blue"></div>
                  <span className="text-[10px] font-bold text-ink/40 uppercase tracking-widest">Current</span>
                </div>
              )}
              <span className="text-[10px] font-bold text-ink/40 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                {(datePreset === 'year' || datePreset === 'all') ? 'Monthly View' : 'Daily View'}
              </span>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0B98C5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0B98C5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} tickFormatter={(val) => `AED ${val}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '16px' }}
                    labelStyle={{ fontSize: '11px', fontWeight: 900, color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}
                    itemStyle={{ fontSize: '14px', fontWeight: 700 }}
                    formatter={(value, name) => {
                      if (name === 'CurrentRevenue') return [`AED ${value}`, 'Current Revenue'];
                      if (name === 'PrevRevenue') return [`AED ${value}`, 'Previous Revenue'];
                      return [`AED ${value}`, name];
                    }}
                  />
                  {compare && <Area type="monotone" dataKey="PrevRevenue" stroke="#cbd5e1" strokeDasharray="5 5" strokeWidth={2} fillOpacity={0} />}
                  <Area type="monotone" dataKey="CurrentRevenue" stroke="#0B98C5" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-ink/40 font-bold">
                No revenue data for this period.
              </div>
            )}
          </div>
        </div>

        {/* Detailed Table Section */}
        <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-200/60">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
            <h2 className="text-[11px] font-black text-brand-blue uppercase tracking-[0.2em]">Transaction Details (Current Period)</h2>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-white border border-slate-200 text-ink rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-moss" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-ink/50 border-b border-slate-100">
                <tr>
                  <th className="p-4 pl-8 font-black">Date</th>
                  <th className="p-4 font-black">Customer</th>
                  <th className="p-4 font-black">Item</th>
                  <th className="p-4 font-black">Location</th>
                  <th className="p-4 font-black">Method</th>
                  <th className="p-4 pr-8 font-black text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailedSales.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-ink/40 font-bold">No transactions found.</td></tr>
                ) : (
                  paginatedSales.map((sale, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-8 font-bold text-ink">{new Date(sale.invoiceDate).toLocaleDateString()}</td>
                      <td className="p-4 font-bold text-ink">{sale.customerName}</td>
                      <td className="p-4 font-bold text-ink">{sale.item}</td>
                      <td className="p-4 text-xs font-bold text-ink/70">{sale.location}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${sale.paymentMode === 'ONLINE' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>{sale.paymentMode}</span></td>
                      <td className="p-4 pr-8 text-right font-black text-brand-blue">{formatCurrency(sale.totalAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-8 py-4 border-t border-slate-100 bg-white flex justify-between items-center">
              <span className="text-[10px] font-black text-ink/40 uppercase tracking-widest">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black text-ink uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black text-ink uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
