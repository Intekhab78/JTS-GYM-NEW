import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import api from '../../api/api.js';
import * as XLSX from 'xlsx';
import AdminHeader from '../../components/AdminHeader.jsx';

const REPORT_TYPES = [
  { id: 'classes', label: 'Classes Report' },
  { id: 'trainers', label: 'Trainers Report' },
  { id: 'pricing', label: 'Membership Plan Report' },
  { id: 'bookings', label: 'Bookings Report' },
  { id: 'trials', label: 'Trial Requests Report' },
  { id: 'payments', label: 'Payments Report' },
  { id: 'users', label: 'Users Report' },
  { id: 'staff', label: 'Staff Report' },
  { id: 'trainer_sales', label: 'Trainer Sales Report' },
  { id: 'attendance', label: 'Attendance Report' },
  { id: 'membership_consumption', label: 'Membership Consumption Report' },
  { id: 'promotions_usage', label: 'Promotion Usage Report' },
  { id: 'taxes', label: 'Tax Collection Report' },
  { id: 'sales_report', label: 'Sales Summary (Monthly/Daily)' },
  { id: 'detailed_sales', label: 'Detailed Sales Report (Itemized)' },
  { id: 'profit_loss', label: 'Profit & Loss Report' },
  { id: 'expenses', label: 'Expenses Report' },
];

export default function Reports() {
  const { roleSlug } = useParams();
  const [summary, setSummary] = useState(null);
  const [reportType, setReportType] = useState('bookings');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState([]);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [locationId, setLocationId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.get('/reports/summary').then((res) => setSummary(res.data)).catch(() => { });
    api.get('/locations?all=true').then(res => setLocations(res.data || [])).catch(() => { });
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
      const res = await api.get(`/reports/${reportType}`, { params });
      let data = res.data || [];

      // Process bookings to extract capacity and timing
      if (reportType === 'bookings' || reportType === 'payments' || reportType === 'detailed_sales') {
        const process = (list) => (list || []).map(item => {
          const rawMethod = item.paymentMethod || item.paymentMode || 'N/A';
          let source = 'N/A';
          let mode = 'N/A';

          if (rawMethod.toLowerCase().includes('online') || rawMethod.toLowerCase().includes('website')) {
            source = 'WEBSITE';
            mode = 'ONLINE';
          } else {
            source = 'CENTER';
            // Clean up the mode string (remove 'center_', 'pay_at_', etc.)
            let cleaned = rawMethod.toLowerCase()
              .replace('center_', '')
              .replace('pay_at_', '')
              .replace('pay_at', '')
              .trim();
            
            mode = (cleaned === 'center' || !cleaned) ? 'CASH' : cleaned.toUpperCase();
          }

          return {
            ...item,
            paymentSource: source,
            paymentMode: mode,
            paymentType: mode,
            capacity: item.classId?.capacity || 'N/A',
            combinedDiscount: (Number(item.discountAmount) || 0) + (Number(item.couponAmount) || 0),
            slotTiming: item.sessionId ? (
              `${new Date(item.sessionId.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${item.sessionId.endTime ? new Date(item.sessionId.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'TBA'}`
            ) : 'N/A'
          };
        });

        if (reportType === 'bookings' && data.purchases) {
          data = {
            purchases: process(data.purchases),
            sessions: process(data.sessions)
          };
        } else {
          data = process(data);
        }
      }

      setReportData(data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
      alert('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const handleExport = () => {
    // Collect data based on report type, respecting current filters
    let dataToExport = [];
    if (reportType === 'bookings' && reportData.purchases) {
      dataToExport = [...(filteredData.purchases || []), ...(filteredData.sessions || [])];
    } else if (reportType === 'profit_loss' && reportData.revenues) {
      dataToExport = [...(filteredData.revenues || []), ...(filteredData.expenses || [])];
    } else {
      dataToExport = Array.isArray(filteredData) ? filteredData : [];
    }

    if (dataToExport.length === 0) {
      alert('No data to export');
      return;
    }

    // Flatten data for Excel
    let flattenedData;
    if (reportType === 'membership_consumption') {
      flattenedData = dataToExport.map(item => ({
        'Membership ID': item._id ? item._id.slice(-6).toUpperCase() : 'N/A',
        'Customer Name (Child)': item.childName,
        'Customer Name': item.parentName,
        'Customer Email': item.userId?.email || 'N/A',
        'Customer Phone': item.userId?.phone || 'N/A',
        'Plan Name': item.planName,
        'Location': item.locationName,
        'Status': item.status,
        'Sessions Used': item.sessionsUsed,
        'Sessions Remaining': item.sessionsRemaining,
        'Total Sessions': item.totalSessions,
        'Expiry Date': item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'
      }));
    } else {
      flattenedData = dataToExport.map(item => {
        const flat = {};

        // Determine columns based on report type for better organization
        Object.keys(item).forEach(key => {
          if (['_id', '__v', 'updatedAt', 'password'].includes(key)) return;

          let value = item[key];

          // Format Date values to not show timezone
          if (key === 'birthDate') {
            try {
              const d = new Date(value);
              if (!isNaN(d.getTime())) {
                value = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
              }
            } catch (e) {}
          } else {
            const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
            if (
              ['createdAt', 'date', 'paymentDate', 'checkedInAt', 'invoiceDate', 'expiryDate', 'startTime', 'endTime'].includes(key) ||
              (typeof value === 'string' && dateRegex.test(value))
            ) {
              try {
                const d = new Date(value);
                if (!isNaN(d.getTime())) {
                  const formattedDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  const formattedTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  value = `${formattedDate} ${formattedTime}`;
                }
              } catch (e) {}
            }
          }

          // Handle specific nested fields
          if (key === 'children') {
            flat['Participants'] = value;
            return;
          }
          if (key === 'userId' && typeof value === 'object') {
            flat['User Name'] = value?.name || 'N/A';
            flat['User Email'] = value?.email || 'N/A';
            return;
          }
          if (key === 'classId' && typeof value === 'object') {
            flat['Class'] = value?.title || 'N/A';
            flat['Class Capacity'] = value?.capacity || 'N/A';
            return;
          }
          if (key === 'locationId' && typeof value === 'object') {
            flat['Location'] = value?.name || 'N/A';
            return;
          }
          if (key === 'availableTrainers' && Array.isArray(value)) {
            flat['Trainers'] = value.map(t => t.name).join(', ');
            return;
          }
          if (key === 'sessionId' && typeof value === 'object') {
            flat['Trainer'] = value?.trainerId?.name || 'TBA';
            if (value?.startTime) {
              flat['Slot Timing'] = `${new Date(value.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${value.endTime ? new Date(value.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'TBA'}`;
            }
            return;
          }
          if (key === 'participants' && Array.isArray(value)) {
            flat['Participants'] = value.map(p => `${p.name} (${p.relation})`).join(', ');
            return;
          }
          if (Array.isArray(value)) {
            flat[key] = value.join(', ');
            return;
          }

          flat[key] = value;
        });

        return flat;
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    let filename = `${reportType}_report`;
    if (startDate && endDate) {
      filename += `_${startDate}_to_${endDate}`;
    } else {
      filename += `_${new Date().toISOString().split('T')[0]}`;
    }

    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const COLUMNS = {
    bookings: [
      { key: 'bookingNumber', label: 'Booking No.' },
      { key: 'userId', label: 'User' },
      { key: 'participants', label: 'Participants' },
      { key: 'classId', label: 'Class' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'sessionId', label: 'Trainer' },
      { key: 'slotTiming', label: 'Slot Timing' },
      { key: 'date', label: 'Date' },
      { key: 'totalAmount', label: 'Amount' },
      { key: 'status', label: 'Status' },
      { key: 'paymentSource', label: 'Payment Source' },
      { key: 'paymentMode', label: 'Payment Mode' },
      { key: 'transactionId', label: 'Txn ID' },
      { key: 'paymentStatus', label: 'Payment' },
      { key: 'promotionId', label: 'Promotion' },
      { key: 'combinedDiscount', label: 'Discount' },
      { key: 'processedBy', label: 'Cashier' },
      { key: 'locationId', label: 'Location' },
    ],
    membership_sessions: [
      { key: 'bookingNumber', label: 'Session Ref.' },
      { key: 'userId', label: 'Member' },
      { key: 'participants', label: 'Students' },
      { key: 'classId', label: 'Class' },
      { key: 'sessionId', label: 'Trainer' },
      { key: 'slotTiming', label: 'Slot Timing' },
      { key: 'date', label: 'Session Date' },
      { key: 'status', label: 'Activity' },
      { key: 'method', label: 'Check-in' },
      { key: 'locationId', label: 'Branch' },
    ],
    classes: [
      { key: 'title', label: 'Title' },
      { key: 'price', label: 'Price (AED)' },
      { key: 'ageGroup', label: 'Age Group' },
      { key: 'duration', label: 'Duration' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'availableTrainers', label: 'Trainers' },
      { key: 'locationId', label: 'Branch' },
    ],
    trainers: [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'specialties', label: 'Specialties' },
      { key: 'status', label: 'Status' },
      { key: 'locationId', label: 'Branch' },
    ],
    pricing: [
      { key: 'name', label: 'Plan Name' },
      { key: 'price', label: 'Price' },
      { key: 'type', label: 'Type' },
      { key: 'durationWeeks', label: 'Weeks' },
      { key: 'classesIncluded', label: 'Classes' },
      { key: 'locationId', label: 'Branch' },
    ],
    trials: [
      { key: 'parentName', label: 'Customer' },
      { key: 'childName', label: 'Dependent' },
      { key: 'parentPhone', label: 'Phone' },
      { key: 'preferredClass', label: 'Class' },
      { key: 'preferredTime', label: 'Time' },
      { key: 'status', label: 'Status' },
      { key: 'locationId', label: 'Branch' },
      { key: 'createdAt', label: 'Requested' },
    ],
    payments: [
      { key: 'userId', label: 'User' },
      { key: 'amount', label: 'Amount' },
      { key: 'paymentMethod', label: 'Payment Mode' },
      { key: 'paymentType', label: 'Payment Type' },
      { key: 'status', label: 'Status' },
      { key: 'promotionId', label: 'Promotion' },
      { key: 'combinedDiscount', label: 'Discount' },
      { key: 'processedBy', label: 'Cashier' },
      { key: 'reference', label: 'Reference' },
    ],
    attendance: [
      { key: 'bookingId', label: 'Booking' },
      { key: 'sessionId', label: 'Session/Trainer' },
      { key: 'childId', label: 'Customer/Participant' },
      { key: 'checkedInAt', label: 'Checked In' },
      { key: 'status', label: 'Status' },
      { key: 'method', label: 'Method' },
      { key: 'locationId', label: 'Branch' },
    ],
    users: [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'role', label: 'Role' },
      { key: 'locationId', label: 'Branch' },
      { key: 'children', label: 'Participants' },
      { key: 'gender', label: 'Gender' },
      { key: 'city', label: 'City' },
      { key: 'address', label: 'Address' },
      { key: 'points', label: 'Points' },
      { key: 'isCorporate', label: 'Corporate?' },
      { key: 'companyName', label: 'Company' },
      { key: 'createdAt', label: 'Registered' },
    ],
    staff: [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'role', label: 'Role' },
      { key: 'locationId', label: 'Branch' },
      { key: 'gender', label: 'Gender' },
      { key: 'city', label: 'City' },
      { key: 'address', label: 'Address' },
      { key: 'allowUAT', label: 'UAT Access' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Registered' },
    ],
    trainer_sales: [
      { key: 'date', label: 'Session Date' },
      { key: 'classTitle', label: 'Class' },
      { key: 'trainerName', label: 'Trainer' },
      { key: 'bookingsCount', label: 'Bookings' },
      { key: 'totalRevenue', label: 'Total Sales (AED)' },
      { key: 'sessionStatus', label: 'Session Status' },
      { key: 'branchName', label: 'Branch' },
    ],
    promotions_usage: [
      { key: 'date', label: 'Date' },
      { key: 'promoName', label: 'Promotion' },
      { key: 'promoType', label: 'Type' },
      { key: 'customerName', label: 'Customer' },
      { key: 'discount', label: 'Discount Given' },
      { key: 'finalAmount', label: 'Final Paid' },
      { key: 'cashierName', label: 'Cashier' },
      { key: 'branchName', label: 'Branch' },
    ],
    taxes: [
      { key: 'date', label: 'Date' },
      { key: 'customerName', label: 'Customer' },
      { key: 'bookingNumber', label: 'Ref #' },
      { key: 'itemName', label: 'Service/Product' },
      { key: 'taxName', label: 'Tax Rule' },
      { key: 'taxRate', label: 'Rate' },
      { key: 'baseAmount', label: 'Base (AED)' },
      { key: 'taxCollected', label: 'Tax (AED)' },
      { key: 'totalPaid', label: 'Total (AED)' },
      { key: 'branchName', label: 'Branch' },
      { key: 'cashierName', label: 'Staff' },
    ],
    membership_consumption: [
      { key: 'childName', label: 'Student/Customer' },
      { key: 'parentName', label: 'Customer' },
      { key: 'planName', label: 'Plan' },
      { key: 'sessionsUsed', label: 'Used' },
      { key: 'sessionsRemaining', label: 'Remaining' },
      { key: 'totalSessions', label: 'Limit' },
      { key: 'consumptionPercentage', label: 'Usage %' },
      { key: 'expiryDate', label: 'Valid Until' },
      { key: 'status', label: 'Status' },
      { key: 'locationName', label: 'Branch' },
    ],
    sales_report: [
      { key: 'type', label: 'Report Level' },
      { key: 'dateDisplay', label: 'Period' },
      { key: 'transactions', label: 'Txn Count' },
      { key: 'amount', label: 'Total Revenue (AED)' },
    ],
    detailed_sales: [
      { key: 'location', label: 'Location' },
      { key: 'invoiceNumber', label: 'Inv #' },
      { key: 'bookingNumber', label: 'Booking #' },
      { key: 'invoiceDate', label: 'Date' },
      { key: 'customerName', label: 'Customer' },
      { key: 'customerPhone', label: 'Mobile' },
      { key: 'customerEmail', label: 'Email' },
      { key: 'item', label: 'Item' },
      { key: 'unitPrice', label: 'Price' },
      { key: 'quantity', label: 'QTY' },
      { key: 'lineVat', label: 'VAT' },
      { key: 'lineTotal', label: 'Line Total' },
      { key: 'discount', label: 'Discount' },
      { key: 'discountType', label: 'Disc Type' },
      { key: 'paymentSource', label: 'Payment Source' },
      { key: 'paymentMode', label: 'Payment Mode' },
    ],
    expenses: [
      { key: 'date', label: 'Date' },
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category' },
      { key: 'amount', label: 'Amount (AED)' },
      { key: 'location', label: 'Branch' },
    ],
    profit_loss_revenues: [
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'customerName', label: 'Customer' },
      { key: 'bookingNumber', label: 'Booking No.' },
      { key: 'source', label: 'Source' },
      { key: 'amount', label: 'Amount (AED)' },
      { key: 'location', label: 'Branch' },
    ]
  };

  const renderValue = (key, value) => {
    if (value === null || value === undefined) return <span className="text-ink/20">—</span>;

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (key === 'createdAt' || key === 'date' || key === 'paymentDate' || key === 'checkedInAt' || key === 'invoiceDate') {
      try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return String(value);
        const formattedDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const formattedTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        return (
          <div className="flex flex-col">
            <span>{formattedDate}</span>
            <span className="text-[9px] text-ink/30 font-medium">{formattedTime}</span>
          </div>
        );
      } catch (e) { return String(value); }
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-ink/20">None</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((v, i) => (
            <span key={i} className="px-2 py-0.5 bg-slate-100 rounded text-[9px] text-ink/60 font-bold">
              {typeof v === 'object' ? (v.name || v.title || v.childId?.name || 'Item') : String(v)}
            </span>
          ))}
        </div>
      );
    }

    if (typeof value === 'object') {
      return value.bookingNumber || value.name || value.title || value.email || (value.trainerId ? value.trainerId.name : null) || <span className="text-[10px] text-brand-blue truncate max-w-[100px] inline-block">ID: ..{String(value._id || value).slice(-6)}</span>;
    }

    if (typeof value === 'string' && value.length > 50) {
      return <span title={value} className="truncate max-w-[150px] inline-block">{value}</span>;
    }

    if (key === 'status' || key === 'paymentStatus' || key === 'sessionStatus' || key === 'refundStatus') {
      const colors = {
        inactive: 'text-ink/40 bg-slate-100',
        confirmed: 'text-moss bg-moss/10',
        completed: 'text-moss bg-moss/10',
        paid: 'text-moss bg-moss/10',
        pending: 'text-amber-600 bg-amber-50',
        cancelled: 'text-red-600 bg-red-50',
        failed: 'text-red-600 bg-red-50',
        new: 'text-brand-blue bg-brand-blue/10',
        open: 'text-brand-blue bg-brand-blue/10',
        closed: 'text-ink/40 bg-slate-100',
        requested: 'text-amber-600 bg-amber-50',
        refunded: 'text-rose-600 bg-rose-50 border border-rose-100',
        active: 'text-emerald-600 bg-emerald-50 border border-emerald-100',
        frozen: 'text-amber-600 bg-amber-50 border border-amber-100',
        expired: 'text-ink/30 bg-slate-100 border border-slate-200/50',
        upcoming: 'text-indigo-600 bg-indigo-50 border border-indigo-100',
        past: 'text-amber-600 bg-amber-50 border border-amber-100',
        present: 'text-emerald-600 bg-emerald-50 border border-emerald-100'
      };
      const statusValue = String(value).toLowerCase();
      return <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${colors[statusValue] || 'bg-slate-50'}`}>{value}</span>;
    }

    if (key === 'consumptionPercentage') {
      const percentage = Number(value) || 0;
      return (
        <div className="flex items-center gap-2 w-24">
          <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-coral transition-all duration-700" style={{ width: `${percentage}%` }}></div>
          </div>
          <span className="text-[9px] font-black text-ink/40">{percentage}%</span>
        </div>
      );
    }

    if (key === 'amount' || key === 'totalRevenue' || key === 'baseAmount' || key === 'taxCollected' || key === 'totalPaid' || key === 'unitPrice' || key === 'lineTotal' || key === 'lineVat' || key === 'discount') {
      return <span className="font-black text-brand-blue">AED {Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
    }

    if (key === 'type' && (value === 'Monthly' || value === 'Daily')) {
      return (
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${value === 'Monthly' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
          {value}
        </span>
      );
    }

    if (key === 'paymentSource') {
      if (!value) return <span className="text-ink/20">—</span>;
      const str = String(value).toUpperCase();
      return <span className="text-[10px] font-black text-ink/40 tracking-tight">{str}</span>;
    }
    
    if (key === 'paymentMode' || key === 'method') {
      if (!value || value === 'N/A') return <span className="text-ink/20">—</span>;
      const str = String(value).toUpperCase();
      return <span className="text-[10px] font-black text-coral uppercase tracking-tight">{str}</span>;
    }

    return String(value);
  };

  const filterList = (list) => {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return (list || []).filter(item => JSON.stringify(item).toLowerCase().includes(q));
  };

  const filteredData = reportType === 'bookings' && reportData.purchases
    ? { purchases: filterList(reportData.purchases), sessions: filterList(reportData.sessions) }
    : reportType === 'profit_loss' && reportData.revenues
    ? { revenues: filterList(reportData.revenues), expenses: filterList(reportData.expenses) }
    : filterList(reportData);

  const columns = COLUMNS[reportType] || [];

  if (!summary) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="page-shell py-12">
        <AdminHeader 
          title="Analytical Reports" 
          description="Generate and export system-wide data for classes, payments, and users."
          backTo={`/${roleSlug}`}
        />

        <div className="mt-8 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            {/* Header info moved to AdminHeader */}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-white border border-slate-200 text-ink px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-moss" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export Excel
            </button>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-[32px] p-8 mb-8 shadow-sm border border-slate-200/60">
          <div className="grid gap-6 md:grid-cols-4 items-end">
            <div className="md:col-span-1">
              <label className="block text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2.5 px-0.5">Data Source</label>
              <select
                className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3 px-4 text-xs font-bold text-ink focus:ring-2 focus:ring-brand-blue/10 outline-none transition-all cursor-pointer"
                value={reportType}
                onChange={e => setReportType(e.target.value)}
              >
                {REPORT_TYPES.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
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
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : 'Refresh Report'}
              </button>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 grid gap-6 md:grid-cols-4 items-end">
            <div className="md:col-span-1">
              <label className="block text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2.5 px-0.5">Location</label>
              <select
                className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3 px-4 text-xs font-bold text-ink focus:ring-2 focus:ring-brand-blue/10 outline-none transition-all cursor-pointer"
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
              >
                <option value="">All Branches</option>
                {locations.map(loc => (
                  <option key={loc._id} value={loc._id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] font-black text-ink/40 uppercase tracking-widest mb-2.5 px-0.5">Filter results</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Filter by name, ID, or any value..."
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-ink focus:ring-2 focus:ring-brand-blue/10 outline-none transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Selected Range Display */}
        {(startDate || endDate) && (
          <div className="mb-6 flex items-center gap-2 bg-brand-blue/5 border border-brand-blue/10 rounded-2xl px-6 py-4">
            <div className="bg-brand-blue/10 p-2 rounded-xl text-brand-blue">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-brand-blue/40 uppercase tracking-widest">Active Report Range</span>
              <p className="text-xs font-bold text-ink">
                {startDate ? new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Beginning'}
                <span className="mx-2 text-ink/30 italic">to</span>
                {endDate ? new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Present'}
              </p>
            </div>
          </div>
        )}

        {/* Results Sections */}
        <div className="flex flex-col gap-10">
          {reportType === 'bookings' && filteredData.purchases ? (
            <>
              <ReportSection
                title="Orders & Revenue (Single & Package Purchases)"
                data={filteredData.purchases}
                columns={COLUMNS.bookings}
                renderValue={renderValue}
                loading={loading}
              />
              <ReportSection
                title="Membership Utilization (Usage Sessions)"
                data={filteredData.sessions}
                columns={COLUMNS.membership_sessions}
                renderValue={renderValue}
                loading={loading}
              />
            </>
          ) : reportType === 'profit_loss' && filteredData.revenues ? (
            <>
              <ReportSection
                title="Revenues"
                data={filteredData.revenues}
                columns={COLUMNS.profit_loss_revenues}
                renderValue={renderValue}
                loading={loading}
              />
              <ReportSection
                title="Expenses"
                data={filteredData.expenses}
                columns={COLUMNS.expenses}
                renderValue={renderValue}
                loading={loading}
              />
            </>
          ) : (
            <ReportSection
              title={`${REPORT_TYPES.find(t => t.id === reportType)?.label || 'Report'} Results`}
              data={Array.isArray(filteredData) ? filteredData : []}
              columns={columns}
              renderValue={renderValue}
              loading={loading}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ReportSection({ title, data, columns, renderValue, loading }) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const paginatedData = data.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 when the dataset changes (e.g., search/filter)
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  return (
    <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-200/60">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
        <h2 className="text-[11px] font-black text-brand-blue uppercase tracking-[0.2em]">{title}</h2>
        <span className="text-[10px] font-bold text-ink/30 bg-white border border-slate-100 px-3 py-1 rounded-full">{data.length} Records</span>
      </div>
      <div className="overflow-x-auto min-h-[200px]">
        <table className="w-full text-left border-collapse table-auto">
          <thead className="bg-[#F8FAFC] border-b border-slate-100">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-6 py-5 text-[10px] font-black text-ink/40 uppercase tracking-widest whitespace-nowrap">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-5"><div className="h-4 bg-slate-50 rounded-lg w-full"></div></td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length > 0 ? paginatedData.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/40 transition-colors group">
                {columns.map(col => (
                  <td key={col.key} className="px-6 py-5 text-[11px] font-bold text-ink/70">
                    {renderValue(col.key, item[col.key])}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan="100" className="px-6 py-32 text-center">
                  <div className="text-5xl mb-6 opacity-20">📊</div>
                  <h3 className="font-display text-2xl text-ink font-bold">No results found</h3>
                  <p className="text-sm text-ink/40 mt-2 max-w-xs mx-auto font-medium">Try broadening your filters or selecting a different data source.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 1 ? 'text-ink/20 cursor-not-allowed' : 'bg-white text-brand-blue shadow-sm hover:bg-brand-blue hover:text-white'}`}
            >
              ← Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === totalPages ? 'text-ink/20 cursor-not-allowed' : 'bg-white text-brand-blue shadow-sm hover:bg-brand-blue hover:text-white'}`}
            >
              Next →
            </button>
          </div>
          <p className="text-[10px] font-black text-ink/30 uppercase tracking-widest">
            Page {currentPage} of {totalPages}
          </p>
        </div>
      )}
    </div>
  );
}
