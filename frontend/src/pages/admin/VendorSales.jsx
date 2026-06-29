import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';
import api from '../../api/api.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';

export default function VendorSales() {
  const { currency } = useSettings();
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/vendors')
      .then(res => {
        setVendors(res.data);
        if (res.data.length > 0) setSelectedVendor(res.data[0]._id);
      })
      .catch(err => console.error(err));
  }, []);

  const fetchReport = () => {
    if (!selectedVendor) return toast.error('Please select a vendor');
    setLoading(true);
    const q = new URLSearchParams({
      vendorId: selectedVendor,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });
    api.get(`/vendors/sales?${q.toString()}`)
      .then(res => setReportData(res.data))
      .catch(err => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedVendor) fetchReport();
  }, [selectedVendor, dateRange]);

  const exportPDF = () => {
    if (!reportData) return;
    const vendor = vendors.find(v => v._id === selectedVendor);
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Vendor Sales Report', 14, 22);
    doc.setFontSize(12);
    doc.text(`Vendor: ${vendor?.name} ${vendor?.companyName ? `(${vendor.companyName})` : ''}`, 14, 32);
    doc.text(`Date Range: ${dateRange.startDate} to ${dateRange.endDate}`, 14, 40);

    const tableColumn = ["Date", "Customer", "Plan", "Base Price", "Vendor Sale Price", "Vendor Margin", "Gym Net"];
    const tableRows = [];

    reportData.sales.forEach(sale => {
      const date = new Date(sale.createdAt).toLocaleDateString();
      const customer = sale.userId?.name || 'N/A';
      const plan = sale.planId?.name || 'Package';
      const basePrice = `${currency}${sale.amount || 0}`;
      const salePrice = `${currency}${sale.vendorSalePrice || 0}`;
      const margin = `${currency}${sale.vendorMargin || 0}`;
      const net = `${currency}${sale.gymRevenue || 0}`;
      tableRows.push([date, customer, plan, basePrice, salePrice, margin, net]);
    });

    tableRows.push([
      'TOTALS', '', '', '',
      `${currency}${reportData.summary.totalSalePrice}`,
      `${currency}${reportData.summary.totalMargin}`,
      `${currency}${reportData.summary.totalGymRevenue}`
    ]);

    doc.autoTable({
      startY: 50,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [52, 152, 219] }
    });

    doc.save(`vendor_sales_${vendor?.name}_${dateRange.startDate}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="page-shell flex-1 py-12">
        <AdminHeader 
          title="Vendor Sales Report" 
          description="Track third-party sales, vendor margins, and calculate commission payouts."
        />

        <div className="mt-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap gap-6 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold uppercase tracking-wider text-ink/50 mb-2">Select Vendor</label>
            <select 
              className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm focus:border-brand-blue focus:ring-0"
              value={selectedVendor}
              onChange={e => setSelectedVendor(e.target.value)}
            >
              {vendors.map(v => (
                <option key={v._id} value={v._id}>{v.name} {v.companyName ? `(${v.companyName})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-bold uppercase tracking-wider text-ink/50 mb-2">Start Date</label>
            <input 
              type="date"
              className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm focus:border-brand-blue focus:ring-0"
              value={dateRange.startDate}
              onChange={e => setDateRange(prev => ({...prev, startDate: e.target.value}))}
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-bold uppercase tracking-wider text-ink/50 mb-2">End Date</label>
            <input 
              type="date"
              className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm focus:border-brand-blue focus:ring-0"
              value={dateRange.endDate}
              onChange={e => setDateRange(prev => ({...prev, endDate: e.target.value}))}
            />
          </div>
          <button 
            onClick={exportPDF}
            disabled={!reportData?.sales?.length}
            className="bg-brand-blue text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:-translate-y-1 transition-transform disabled:opacity-50 disabled:hover:translate-y-0"
          >
            Export PDF
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center animate-pulse text-brand-blue font-bold">Calculating Report...</div>
        ) : reportData && (
          <div className="mt-8">
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 text-center shadow-sm">
                <p className="text-xs font-bold text-ink/40 uppercase tracking-widest mb-2">Total Sales Vol.</p>
                <p className="text-3xl font-black text-ink">{currency}{reportData.summary.totalSalePrice}</p>
              </div>
              <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 text-center shadow-sm">
                <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">Vendor Margin Owed</p>
                <p className="text-3xl font-black text-orange-600">{currency}{reportData.summary.totalMargin}</p>
              </div>
              <div className="bg-green-50 p-6 rounded-3xl border border-green-100 text-center shadow-sm">
                <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-2">Net Gym Revenue</p>
                <p className="text-3xl font-black text-green-600">{currency}{reportData.summary.totalGymRevenue}</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-ink/50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-5 font-bold tracking-wider">Date</th>
                      <th className="px-6 py-5 font-bold tracking-wider">Customer</th>
                      <th className="px-6 py-5 font-bold tracking-wider">Base Package</th>
                      <th className="px-6 py-5 font-bold tracking-wider text-right">Vendor Sale Price</th>
                      <th className="px-6 py-5 font-bold tracking-wider text-right text-orange-500">Margin</th>
                      <th className="px-6 py-5 font-bold tracking-wider text-right text-green-500">Gym Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {reportData.sales.map(sale => (
                      <tr key={sale._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-ink/70">
                          {new Date(sale.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-ink">
                          {sale.userId?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-ink/70">
                          {sale.planId?.name || 'Custom Package'} <br/>
                          <span className="text-[10px] uppercase text-ink/40">Base: {currency}{sale.amount}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-display text-lg text-ink">
                          {currency}{sale.vendorSalePrice || 0}
                        </td>
                        <td className="px-6 py-4 text-right font-display text-lg text-orange-500">
                          {currency}{sale.vendorMargin || 0}
                        </td>
                        <td className="px-6 py-4 text-right font-display text-lg text-green-500">
                          {currency}{sale.gymRevenue || 0}
                        </td>
                      </tr>
                    ))}
                    {reportData.sales.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-ink/40 italic">
                          No sales recorded for this vendor in the selected period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
