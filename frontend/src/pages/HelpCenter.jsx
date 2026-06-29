import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { getUser } from '../utils/auth.js';

const FAQS = [
  {
    category: 'parent',
    question: 'How do I print a Tax Invoice?',
    answer: 'Go to your dashboard, click on "My Bookings", select the specific booking, and click "View Invoice". You can use the browser print function or the dedicated Print button on that page.'
  },
  {
    category: 'parent',
    question: 'Why can\'t I see any classes for my child?',
    answer: 'Ensure your child\'s age is correct in their profile. Classes are filtered by age group. Also, check if you have selected the correct Branch location in the booking filters.'
  },
  {
    category: 'trainer',
    question: 'My upcoming sessions are missing from the dashboard.',
    answer: 'Check the Branch Switcher in the top header. If "All Branches" is selected and sessions still don\'t appear, ensure your login email matches your professional profile email.'
  },
  {
    category: 'admin',
    question: 'How do I handle a refund request?',
    answer: 'Refunds must be processed via the Payment Manager. Once the refund is issued through your payment gateway (e.g., Stripe), update the booking status to "Cancelled" in the Booking Manager.'
  }
];

const SECTIONS = [
  {
    id: 'parent',
    title: 'Parent Guide',
    icon: '👨‍👩‍👧‍👦',
    manualPath: '/manuals/user',
    content: [
      {
        title: '1. Registration & Child Profiles',
        steps: [
          'Create your parent account with a valid email and phone.',
          'Add each child under "My Children" with their exact birth date for age-appropriate class matching.',
          'Upload photos for both yourself and your children to help trainers identify you at the center.',
          'Maintain medical conditions and school information for safety.'
        ]
      },
      {
        title: '2. Booking & Payment Process',
        steps: [
          'Choose "Family Mode" in the booking flow.',
          'Select your branch to see local trainers and time slots.',
          'Select the specific child for each slot. The system validates age and gender automatically.',
          'Pay online for instant confirmation or select "Pay at Center" to finalize at the desk.'
        ]
      },
      {
        title: '3. Invoices & Loyalty',
        steps: [
          'Official Tax Invoices are generated for every completed payment.',
          'Add your Instagram handle to your profile to participate in social loyalty rewards.',
          'View your membership packages and remaining sessions in the "Account" tab.'
        ]
      }
    ]
  },
  {
    id: 'trainer',
    title: 'Trainer Hub',
    icon: '👟',
    manualPath: '/manuals/user',
    content: [
      {
        title: '1. Schedule Visibility',
        steps: [
          'The system uses your Email ID to pull your sessions from all assigned branches.',
          'Use the Branch Switcher to filter view for a single location.',
          'Active sessions show occupancy rates in real-time (e.g., 8/10 spots filled).'
        ]
      },
      {
        title: '2. Attendance Tracking',
        steps: [
          'Open the class roster before your session starts.',
          'Click "Check In" for each child as they arrive. This updates the parent dashboard instantly.',
          'Mark "No Shows" after the class is finished to maintain accurate attendance logs.'
        ]
      },
      {
        title: '3. Profile Optimization',
        steps: [
          'Keep your Specialties updated so the Admin can link you to new programs.',
          'Add a professional bio and high-quality photo to attract more bookings.',
          'Ensure your assigned branches are correct in your profile settings.'
        ]
      }
    ]
  },
  {
    id: 'admin',
    title: 'Admin Console',
    icon: '⚙️',
    manualPath: '/manuals/admin',
    content: [
      {
        title: '1. Term & Session Management',
        steps: [
          'Use the "Bulk Generator" in Sessions Management to schedule an entire term.',
          'Select a specific branch before generating to ensure correct location mapping.',
          'Monitor session conflicts and trainer availability via the main manager grid.'
        ]
      },
      {
        title: '2. Financial & Sales Reporting',
        steps: [
          'The "Trainer Sales Report" provides data for payroll and commission calculations.',
          'Use the "Bookings Report" for audit trails and daily reconciliation.',
          'Export all reports to Excel for external accounting teams.'
        ]
      },
      {
        title: '3. System Configuration',
        steps: [
          'Manage Granular Role-Based Access (RBAC) in "Role Master".',
          'Configure Pricing Plans (Bulk vs. Per Session) in Pricing Management.',
          'Add new Studios or Branches in Location Management.'
        ]
      }
    ]
  }
];

export default function HelpCenter() {
  const user = getUser();
  const [activeSection, setActiveSection] = useState('parent');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin' || user.role === 'superadmin') {
        setActiveSection('admin');
      } else if (user.role === 'trainer') {
        setActiveSection('trainer');
      }
    }
  }, []);

  const filteredContent = SECTIONS.find(s => s.id === activeSection)?.content.filter(block => 
    block.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    block.steps.some(step => step.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredFaqs = FAQS.filter(f => 
    (f.category === activeSection || activeSection === 'admin') &&
    (f.question.toLowerCase().includes(searchQuery.toLowerCase()) || f.answer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />
      <main className="page-shell flex-1 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16 animate-rise">
            <h1 className="font-display text-5xl md:text-6xl font-black text-ink tracking-tight mb-6">How can we help?</h1>
            <div className="max-w-xl mx-auto relative group">
              <div className="absolute inset-0 bg-brand-blue/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <input 
                type="text" 
                placeholder="Search for guides, workflows, or FAQs..."
                className="w-full bg-white border-2 border-slate-100 rounded-[28px] py-6 px-10 text-lg font-bold text-ink shadow-sm focus:border-brand-blue/30 focus:ring-0 transition-all outline-none relative z-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-ink/20 z-10">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-10">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ink/30 mb-6 ml-4">User Guides</p>
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setActiveSection(s.id); setOpenFaq(null); }}
                  className={`w-full flex items-center justify-between gap-4 p-5 rounded-[28px] text-sm font-black transition-all group ${
                    activeSection === s.id 
                      ? 'bg-brand-blue text-white shadow-glow-blue scale-[1.02]' 
                      : 'bg-white text-ink/50 hover:bg-slate-50 border border-slate-100 hover:border-brand-blue/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{s.icon}</span>
                    <span className="tracking-tight">{s.title}</span>
                  </div>
                  {activeSection === s.id && <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>}
                </button>
              ))}

              <div className="mt-12 p-8 rounded-[36px] bg-slate-900 text-white shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/20 rounded-full blur-3xl group-hover:scale-150 transition-transform"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue mb-4 relative z-10">Full Manual</p>
                <h4 className="text-lg font-black leading-tight mb-4 relative z-10">Download Detailed PDF Process Guide</h4>
                <button 
                  onClick={() => window.open(SECTIONS.find(s => s.id === activeSection)?.manualPath || '/manuals/user', '_blank')}
                  className="w-full bg-white text-ink py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all relative z-10"
                >
                  View Document
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-8 animate-rise">
              {filteredContent?.length === 0 && filteredFaqs.length === 0 && (
                <div className="bg-white rounded-[48px] p-20 text-center border-2 border-dashed border-slate-100">
                  <div className="text-6xl mb-6 grayscale">🔍</div>
                  <h3 className="font-display text-2xl text-ink">No results for "{searchQuery}"</h3>
                  <p className="text-ink/40 font-medium mt-2">Try searching for broader terms like "Booking" or "Attendance".</p>
                  <button onClick={() => setSearchQuery('')} className="mt-8 text-brand-blue font-black underline underline-offset-8">Clear filters</button>
                </div>
              )}

              {filteredContent?.map((block, idx) => (
                <div key={idx} className="bg-white rounded-[48px] p-12 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                  <h3 className="font-display text-3xl font-black text-ink mb-10 pb-6 border-b border-slate-50 group-hover:text-brand-blue transition-colors">{block.title}</h3>
                  <div className="space-y-8">
                    {block.steps.map((step, sIdx) => (
                      <div key={sIdx} className="flex gap-8 group/step">
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-xs font-black text-ink/30 group-hover/step:bg-brand-blue group-hover/step:text-white transition-all transform group-hover/step:rotate-12">
                          {sIdx + 1}
                        </div>
                        <p className="text-base font-bold text-ink/70 leading-relaxed pt-2 transition-all group-hover/step:text-ink">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* FAQ Section */}
              {filteredFaqs.length > 0 && (
                <div className="mt-20 animate-rise">
                  <div className="flex items-center gap-4 mb-10 px-4">
                     <span className="text-3xl">💡</span>
                     <h2 className="font-display text-3xl font-black text-ink">Frequently Asked Questions</h2>
                  </div>
                  <div className="space-y-4">
                    {filteredFaqs.map((faq, fIdx) => (
                      <div key={fIdx} className="rounded-[32px] overflow-hidden border border-slate-100 bg-white transition-all hover:shadow-lg">
                        <button 
                          onClick={() => setOpenFaq(openFaq === fIdx ? null : fIdx)}
                          className="w-full flex items-center justify-between p-8 text-left transition-colors hover:bg-slate-50"
                        >
                          <span className="font-black text-lg text-ink pr-8">{faq.question}</span>
                          <span className={`text-brand-blue transition-transform duration-300 ${openFaq === fIdx ? 'rotate-180' : ''}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                          </span>
                        </button>
                        {openFaq === fIdx && (
                          <div className="px-8 pb-8 animate-in slide-in-from-top-2">
                             <p className="text-ink/60 font-medium leading-relaxed border-t border-slate-50 pt-6">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
