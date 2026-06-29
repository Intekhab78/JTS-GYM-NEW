import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

const MANUAL_CONTENT = {
  user: {
    title: 'Detailed User Manual',
    subtitle: 'Step-by-step guide for Customers & Trainers',
    sections: [
      {
        id: 'parents',
        title: '👨‍👩‍👧 For Customers',
        content: [
          {
            h: '1. Account Setup & Registration',
            p: [
              'Choose a Branch: When registering, select your "Preferred Branch." This helps us tailor your dashboard to your local class schedule.',
              'Customer Profile: Fill in your details. Add your Instagram handle to link your social activity to our loyalty program!',
              'Dependent Profiles: Enter the correct Birth Date. The booking system uses this to filter classes that are age-appropriate for your dependent.'
            ]
          },
          {
            h: '2. Finding and Booking Classes',
            p: [
              'Select Program: Choose an activity (e.g., Gymnastics, Swimming).',
              'Choose Location: Select the branch where you want to attend.',
              'Select Trainer & Slot: Pick your favorite coach and a time that fits your schedule.',
              'Confirm Participants: Select which dependent (or dependents) will attend. The system validates age requirements automatically.',
              'Payment: Choose Online Payment for instant confirmation, or Pay at Center for desk-side payment.'
            ]
          },
          {
            h: '3. Managing Your Dashboard',
            p: [
              'Bookings: View all upcoming and past sessions.',
              'Invoices: You can print a Tax Invoice for any completed booking. Go to your booking details and click "Print Invoice."',
              'Dependent Updates: Keep medical conditions and school info up-to-date in your profile.'
            ]
          }
        ]
      },
      {
        id: 'trainers',
        title: '👟 For Trainers',
        content: [
          {
            h: '1. Accessing Your Schedule',
            p: [
              'Dashboard: Your home screen shows your "Upcoming Sessions" for the next 7 days.',
              'Email Verification: Ensure your Login Email matches the email on your Trainer Profile. The system uses your unique email to verify your identity across all branches.',
              'Universal Visibility: You will see ALL sessions assigned to you, even if you are not explicitly assigned to a specific branch.'
            ]
          },
          {
            h: '2. Managing Attendance',
            p: [
              'Check-In: On the day of the class, click "Check In" next to each participant as they arrive.',
              'Real-Time Updates: Checking in updates the customer\'s dashboard instantly.',
              'Roster Summary: Use the session view to see total occupancy and prepare your session plan.'
            ]
          }
        ]
      }
    ]
  },
  admin: {
    title: 'Administrative Process Manual',
    subtitle: 'System guide for Superadmins & Branch Managers',
    sections: [
      {
        id: 'sessions',
        title: '🛠️ Session Management',
        content: [
          {
            h: '1. The Bulk Generator Logic',
            p: [
              'Branch Switcher: Select the correct branch in the header. Bulk generation will fail if "All Locations" is selected.',
              'Recurrence: Select all days the class repeats and enter total sessions (e.g., 10 for a term).',
              'Conflicts: The system automatically checks for trainer conflicts and room overlaps during generation.'
            ]
          },
          {
            h: '2. Trainer Synchronization',
            p: [
              'Email Match: If a trainer is missing sessions, verify that their User Email exactly matches their Trainer Profile Email.',
              'Healing Logic: The backend uses Email ID as a master key to consolidate data across multiple branch assignments.'
            ]
          }
        ]
      },
      {
        id: 'financials',
        title: '📊 Reporting & Financials',
        content: [
          {
            h: '1. Trainer Sales Report',
            p: [
              'Payroll Integration: Shows session date, occupancy, and total revenue per trainer.',
              'Audit Trail: Compare Sales vs. Attendance to ensure commissions are only paid for completed sessions.'
            ]
          },
          {
            h: '2. Reconciliation',
            p: [
              'Bookings Report: Filter by "Pending" to see desk-side payments that need finalization.',
              'Export: Always export to Excel for your bank reconciliation and audit teams.'
            ]
          }
        ]
      },
      {
        id: 'technical',
        title: '🏗️ Technical Maintenance',
        content: [
          {
            h: '1. Location Syncing',
            p: [
              'New Branch: After creating a location, remember to link specific Classes and Trainers to it.',
              'RBAC: Manage granular permissions (e.g., "reports:view") in the Role Master.'
            ]
          }
        ]
      }
    ]
  }
};

export default function ManualView() {
  const { type } = useParams();
  const data = MANUAL_CONTENT[type] || MANUAL_CONTENT.user;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="page-shell py-16 print:py-0 print:bg-white">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 print:hidden">
            <div>
              <Link to="/help" className="inline-flex items-center gap-2 text-xs font-black text-brand-blue uppercase tracking-widest mb-6 hover:translate-x-[-4px] transition-transform">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Help Center
              </Link>
              <h1 className="font-display text-5xl font-black text-ink tracking-tight mb-4">{data.title}</h1>
              <p className="text-lg text-ink/50 font-medium">{data.subtitle}</p>
            </div>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-3 bg-white border-2 border-slate-100 text-ink px-8 py-4 rounded-3xl text-sm font-black hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <svg className="w-5 h-5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print Guide
            </button>
          </div>

          <div className="print:block hidden mb-10">
            <h1 className="text-3xl font-bold">{data.title}</h1>
            <p className="text-gray-500">{data.subtitle}</p>
            <hr className="my-6" />
          </div>

          {/* Content */}
          <div className="space-y-16">
            {data.sections.map((section) => (
              <section key={section.id} className="animate-rise">
                <h2 className="font-display text-3xl font-black text-ink mb-10 border-b-4 border-brand-blue/10 pb-4 inline-block">{section.title}</h2>
                <div className="space-y-10">
                  {section.content.map((item, i) => (
                    <div key={i} className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <h3 className="text-xl font-black text-ink mb-6">{item.h}</h3>
                      <ul className="space-y-4">
                        {item.p.map((para, j) => (
                          <li key={j} className="flex gap-4">
                            <div className="w-2 h-2 rounded-full bg-brand-blue mt-2.5 shrink-0 opacity-40"></div>
                            <p className="text-ink/70 font-medium leading-relaxed">{para}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-20 pt-10 border-t border-slate-100 text-center print:hidden">
            <p className="text-ink/30 text-xs font-bold uppercase tracking-widest mb-6">Need more help?</p>
            <Link to="/contact" className="bg-slate-900 text-white px-10 py-5 rounded-full text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">
              Contact Support Team
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
