import { getImageUrl  } from '../api/api.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Helper function to convert number to words for {currency}
const numberToWords = (num) => {
   const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
   const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
   const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];

   const convert = (n) => {
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 !== 0 ? ' AND ' + convert(n % 100) : '');
      return n.toString();
   };

   if (num === 0) return 'ZERO FILS';
   
   const integerPart = Math.floor(num);
   const decimalPart = Math.round((num - integerPart) * 100);

   let words = convert(integerPart);
   if (decimalPart > 0) {
      words += ' AND ' + convert(decimalPart) + ' FILS';
   } else {
      words += ' AND ZERO FILS';
   }
   
   return words + ' ONLY';
};

const defaultCompanyInfo = {
  name: 'JTS Booking',
  tagline: 'Building confidence and coordination through joyful movement.',
  address: 'SRTIP Free Zone, Block B - B20-017, Sharjah, UAE',
  email: 'info@jtsmiddleeast.com',
  phone: '+971 522542550',
  invoiceTerms: 'Thank you for choosing us. Please present this invoice for entry.',
  logoUrl: ''
};

export default function InvoiceView() {
  const { currency } = useSettings();
   const { id, bookingId } = useParams();
   const navigate = useNavigate();
   const [invoice, setInvoice] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [companyInfo, setCompanyInfo] = useState(defaultCompanyInfo);

   useEffect(() => {
      const fetchInvoice = async () => {
         try {
            const url = bookingId ? `/invoices/booking/${bookingId}` : `/invoices/${id}`;
            const res = await api.get(url);
            setInvoice(res.data);
         } catch (err) {
            console.error('Invoice fetch error:', err);
            setError('Invoice not found or could not be generated.');
         } finally {
            setLoading(false);
         }
      };
      
      const fetchCompany = async () => {
         try {
           const res = await api.get('/settings/global');
           const companySetting = res.data.find(s => s.key === 'company_info');
           if (companySetting && companySetting.value) {
             setCompanyInfo({ ...defaultCompanyInfo, ...companySetting.value });
           }
         } catch (err) {}
      };

      fetchInvoice();
      fetchCompany();
   }, [id, bookingId]);

   if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-brand-blue uppercase tracking-widest animate-pulse font-display">Generating Official Receipt...</div>;
   
   if (error || !invoice) return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 font-display">
         <div className="soft-card p-12 text-center max-w-md">
            <span className="text-6xl mb-6 block grayscale">📄</span>
            <h2 className="text-2xl font-black text-ink mb-4">Invoice Processing</h2>
            <p className="text-sm font-bold text-ink/40 mb-8 leading-relaxed uppercase tracking-widest">The invoice for this booking is being finalized. Please check back in a moment.</p>
            <button onClick={() => navigate(-1)} className="w-full py-4 bg-brand-blue text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-blue/20 transition-all hover:-translate-y-1">Go Back</button>
         </div>
      </div>
   );

   const itemAmount = invoice.items?.reduce((sum, item) => {
      const val = (item.unitPrice || 0) * (item.quantity || 1);
      return val > 0 ? sum + val : sum;
   }, 0) || 0;

   const storedDiscount = (invoice.discountAmount || 0) + (invoice.couponAmount || 0);
   const itemsDiscount = invoice.items?.reduce((sum, item) => {
      const val = (item.unitPrice || 0) * (item.quantity || 1);
      return val < 0 ? sum + Math.abs(val) : sum;
   }, 0) || 0;
   const discountAmount = storedDiscount > 0 ? storedDiscount : itemsDiscount;

   const discountItem = invoice.items?.find(i => (i.unitPrice || 0) * (i.quantity || 1) < 0);
   const discountLabel = discountItem?.description ||
      (invoice.couponCode ? `Coupon: ${invoice.couponCode}` : 'Promotion Applied');

   const amountAfterDiscount = itemAmount - discountAmount;

   const taxAmount = invoice.taxAmount || invoice.items?.reduce((sum, i) => {
      const expected = (i.unitPrice || 0) * (i.quantity || 1);
      const detected = (i.total > expected + 0.01) ? (i.total - expected) : (i.taxAmount || 0);
      return sum + detected;
   }, 0) || 0;

   const totalAmount = invoice.amount || (amountAfterDiscount + taxAmount);
   const isInclusive = Math.abs(totalAmount - amountAfterDiscount) < 0.1 && taxAmount > 0;
   const totalInWords = numberToWords(totalAmount);

   const displayCurrency = invoice.currency || currency;
   const displayCompany = invoice.companySnapshot || companyInfo;
   const displayCustomer = invoice.customerSnapshot || {
      name: invoice.userId?.companyName || invoice.userId?.name || invoice.guestDetails?.name || 'Valued Customer',
      email: invoice.userId?.email || invoice.guestDetails?.email,
      phone: invoice.userId?.phone || 'Not Provided',
      address: invoice.userId?.address || 'Customer Address'
   };

   const brandMark = displayCompany.name === 'JTS Booking' ? 'JTS' : displayCompany.name.substring(0, 3).toUpperCase();
   const logoSrc = displayCompany.logoUrl ? (
     getImageUrl(displayCompany.logoUrl)
   ) : null;

   return (
      <div className="min-h-screen bg-white md:bg-slate-50 flex flex-col font-display">
         <style>
            {`
          @media print {
            @page {
              size: A4;
              margin: 0mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print\\:hidden, 
            .site-header, 
            .site-footer, 
            button, 
            [id*="chat"], 
            [class*="chat"], 
            iframe {
              display: none !important;
            }
            main {
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
            }
            .invoice-container {
              width: 210mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              display: block !important;
            }
            .invoice-content {
                padding: 15mm !important;
                box-sizing: border-box;
                min-height: 297mm;
            }
          }
        `}
         </style>

         <Navbar className="print:hidden" />
          <main className="flex-1 py-12 px-4 md:py-16 flex justify-center print:p-0 print:bg-white overflow-x-hidden">
            <div className="invoice-container w-full max-w-[850px] print:w-full">
               <div className="invoice-content bg-white md:rounded-[2.5rem] md:shadow-2xl md:border md:border-slate-100/50 overflow-hidden relative">
                  
                  <div className="absolute top-0 right-0 w-96 h-96 bg-brand-blue/5 rounded-full -mr-48 -mt-48 blur-3xl print:hidden" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-coral/5 rounded-full -ml-32 -mb-32 blur-3xl print:hidden" />

                  <div className="relative p-6 md:p-12 print:p-10">
                     <div className="flex flex-col md:flex-row justify-end items-end md:items-center gap-4 mb-8 print:hidden">
                        <button 
                           onClick={() => window.print()} 
                           className="px-6 py-2.5 bg-brand-blue text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-brand-blue/20 hover:shadow-brand-blue/30 hover:-translate-y-0.5 transition-all flex items-center gap-3"
                        >
                           <span>🖨️</span> Print Receipt
                        </button>
                        <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm flex items-center gap-2 border ${
                                invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 
                                invoice.status === 'cancelled' ? 'bg-slate-50 text-slate-400 border-slate-100' : 
                                'bg-amber-50 text-amber-500 border-amber-100'}`}>
                           <span className="text-xs">✓</span> {invoice.status === 'paid' ? 'Paid In Full' : 
                            invoice.status === 'cancelled' ? 'Cancelled / Refunded' : 
                            'Payment Due'}
                        </div>
                     </div>

                     <div className="grid md:grid-cols-2 gap-12 items-start print:grid-cols-2 print:gap-4 mb-12 print:mb-8">
                        <div className="space-y-4">
                           <div className="flex items-center gap-4">
                              {logoSrc ? (
                                <img src={logoSrc} className="h-16 w-auto object-contain rounded-2xl shadow-sm" alt={displayCompany.name} />
                              ) : (
                                <span className="bg-brand-blue text-white p-2 rounded-xl not-italic text-2xl h-10 w-10 flex items-center justify-center font-black">{brandMark}</span>
                              )}
                              <h1 className="font-display text-3xl font-black text-brand-blue tracking-tight print:text-2xl uppercase">
                                {displayCompany.name}
                              </h1>
                           </div>
                           <div className="pl-1 space-y-1">
                              <h4 className="text-base font-black text-ink tracking-tight">{invoice.locationId?.name || 'Main Branch'}</h4>
                              <p className="text-[9px] font-black text-ink/20 uppercase tracking-[0.3em]">{displayCompany.address.split(',').pop().trim()}</p>
                           </div>
                        </div>

                        <div className="md:text-right pt-2 md:pt-4">
                           <div className="space-y-3 inline-block text-left md:text-right">
                              <div className="grid grid-cols-[80px_1fr] md:flex md:items-baseline md:justify-end gap-2">
                                 <span className="text-[8px] font-black text-ink/20 uppercase tracking-[0.3em] whitespace-nowrap">Invoice No</span>
                                 <span className="text-lg font-black text-brand-blue tracking-tighter leading-none">{invoice.invoiceNumber}</span>
                              </div>
                              <div className="grid grid-cols-[80px_1fr] md:flex md:items-baseline md:justify-end gap-2">
                                 <span className="text-[8px] font-black text-ink/20 uppercase tracking-[0.3em] whitespace-nowrap">Date</span>
                                 <span className="text-xs font-black text-ink">{new Date(invoice.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-12 mb-12 print:mb-8 print:gap-8">
                        <div className="space-y-4">
                           <p className="inline-block px-3 py-1 bg-brand-blue/5 rounded-lg text-[9px] font-black text-brand-blue uppercase tracking-[0.3em]">Bill From</p>
                           <div className="space-y-2">
                              <h3 className="font-black text-ink text-xl tracking-tight">{displayCompany.name}</h3>
                              <div className="text-[10px] text-ink/40 leading-relaxed font-bold uppercase tracking-wider">
                                 <p>{displayCompany.address}</p>
                                 <div className="mt-2 space-y-0.5">
                                    <p><span className="text-brand-blue/30 mr-2">T:</span> {displayCompany.phone}</p>
                                    <p><span className="text-brand-blue/30 mr-2">E:</span> {displayCompany.email}</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <p className="inline-block px-3 py-1 bg-brand-blue/5 rounded-lg text-[9px] font-black text-brand-blue uppercase tracking-[0.3em]">Bill To</p>
                           <div className="space-y-2">
                              <h3 className="font-black text-ink text-xl tracking-tight leading-tight">
                                 {displayCustomer.name}
                              </h3>
                              <div className="text-[10px] text-ink/40 leading-relaxed font-bold uppercase tracking-wider">
                                 <p>{displayCustomer.address}</p>
                                 <div className="mt-2 space-y-0.5">
                                    <p><span className="text-brand-blue/30 mr-2">E:</span> {displayCustomer.email}</p>
                                    <p><span className="text-brand-blue/30 mr-2">T:</span> {displayCustomer.phone}</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="mb-12 print:mb-8">
                        <table className="w-full border-collapse">
                           <thead>
                              <tr className="border-b-2 border-slate-100">
                                 <th className="py-4 text-[9px] font-black text-ink/20 uppercase tracking-[0.3em] text-left">Description</th>
                                 <th className="py-4 px-4 text-[9px] font-black text-ink/20 uppercase tracking-[0.3em] text-center">Qty</th>
                                 <th className="py-4 px-4 text-[9px] font-black text-ink/20 uppercase tracking-[0.3em] text-right">Rate</th>
                                 <th className="py-4 text-[9px] font-black text-ink/20 uppercase tracking-[0.3em] text-right">Amount</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                               {invoice.items.filter(item => item.quantity > 0 || item.unitPrice !== 0).map((item, idx) => (
                                  <tr key={idx}>
                                     <td className="py-6">
                                        <p className="font-black text-ink text-lg tracking-tighter uppercase">{item.description}</p>
                                     </td>
                                     <td className="py-6 px-4 text-center font-black text-ink/40 leading-none">{item.quantity}</td>
                                     <td className="py-6 px-4 text-right font-black text-ink/40 text-xs">{displayCurrency} {item.unitPrice.toFixed(2)}</td>
                                     <td className="py-6 text-right font-black text-ink text-xl tracking-tighter">{displayCurrency} {(item.unitPrice * item.quantity).toFixed(2)}</td>
                                  </tr>
                               ))}
                           </tbody>
                        </table>
                     </div>

                     <div className="rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between px-8 py-4 bg-slate-50/80 border-b border-slate-100">
                           <span className="text-[10px] font-black text-ink/40 uppercase tracking-[0.3em]">Gross Subtotal</span>
                           <span className="text-sm font-black text-ink tracking-tight">{displayCurrency} {itemAmount.toFixed(2)}</span>
                        </div>
                        {discountAmount > 0 && (
                           <div className="flex items-center justify-between px-8 py-4 bg-emerald-50/60 border-b border-emerald-100">
                              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.3em]">Discount ({discountLabel})</span>
                              <span className="text-sm font-black text-emerald-600 tracking-tight">- {displayCurrency} {discountAmount.toFixed(2)}</span>
                           </div>
                        )}
                        <div className="flex items-center justify-between px-8 py-4 bg-slate-50/80 border-b border-slate-100">
                           <span className="text-[10px] font-black text-ink/40 uppercase tracking-[0.3em]">Net Amount (Excl. VAT)</span>
                           <span className="text-sm font-black text-ink tracking-tight">{displayCurrency} {Math.max(0, amountAfterDiscount - (isInclusive ? taxAmount : 0)).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between px-8 py-4 bg-slate-50/80 border-b border-slate-100">
                           <span className="text-[10px] font-black text-ink/40 uppercase tracking-[0.3em]">{isInclusive ? 'VAT (Included in Total)' : 'VAT (Additional)'}</span>
                           <span className="text-sm font-black text-ink/60 tracking-tight">{isInclusive ? '' : '+ '}{displayCurrency} {taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-8 py-6 bg-brand-blue">
                           <div className="space-y-1">
                              <h4 className="text-[10px] font-black text-white/60 uppercase tracking-[0.4em]">Total Amount</h4>
                              <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">{totalInWords}</p>
                           </div>
                           <span className="text-5xl font-black text-white tracking-tighter leading-none">{displayCurrency} {totalAmount.toFixed(2)}</span>
                        </div>
                     </div>

                     <div className="mt-8 pt-8 border-t border-slate-50">
                        <h5 className="text-[10px] font-black text-ink/30 uppercase tracking-[0.3em] mb-3">Terms & Conditions</h5>
                        <p className="text-[11px] font-bold text-ink/40 leading-relaxed uppercase tracking-wider whitespace-pre-line">
                           {displayCompany.invoiceTerms}
                        </p>
                     </div>
                  </div>
               </div>
            </div>
         </main>
         <Footer className="print:hidden" />
      </div>
   );
}
