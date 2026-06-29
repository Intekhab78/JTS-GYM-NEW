import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import ClassCard from '../components/ClassCard.jsx';
import PricingCard from '../components/PricingCard.jsx';
import HeroSlider from '../components/HeroSlider.jsx';
import heroImage from '../assets/hero-motion.svg';
import classBaby from '../assets/class-baby.svg';
import classBallet from '../assets/class-ballet.svg';
import classCombat from '../assets/class-combat.svg';
import api from '../api/api.js';
import { useEffect, useState } from 'react';

const highlights = [
  { title: 'Member login', desc: 'Customers track classes and payments in one portal.' },
  { title: 'QR check-in', desc: 'Fast attendance capture with QR tokens.' },
  { title: 'Class calendar', desc: 'See today’s schedule and upcoming sessions.' }
];

export default function Home() {
  const [plans, setPlans] = useState([]);
  const [classes, setClasses] = useState([]);
  const [cmsBlocks, setCmsBlocks] = useState([]);

  const fetchData = () => {
    api.get('/plans').then(res => {
      const list = res.data || [];
      const featured = list.filter(p => p.isFeatured);
      const others = list.filter(p => !p.isFeatured);
      setPlans([...featured, ...others].slice(0, 3));
    }).catch(() => { });

    api.get('/classes').then(res => {
      setClasses((res.data || []).slice(0, 3));
    }).catch(() => { });

    api.get('/cms/public').then(res => {
      setCmsBlocks(res.data || []);
    }).catch(() => { });
  };

  useEffect(() => {
    fetchData();

    const handleChange = () => fetchData();
    window.addEventListener('location-change', handleChange);
    return () => window.removeEventListener('location-change', handleChange);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSlider />
      <main className="space-y-12 mt-8">
        {cmsBlocks.length > 0 ? (
          cmsBlocks.map(block => {
            if (block.type === 'IntroSection') {
              return (
                <section key={block._id} className="page-shell pb-10 pt-10">
                  <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.4em] text-brand-black flex items-center gap-3">
                        <span className="w-8 h-[2px] bg-brand-blue"></span>
                        {block.content?.kicker || 'Kids fitness hub'}
                      </p>
                      <h1 className="mt-6 font-display text-4xl font-black text-brand-blue md:text-5xl leading-tight">
                        {block.content?.headline || 'Where energy turns into confidence.'}
                      </h1>
                      <p className="mt-6 text-lg text-brand-black/70 font-medium max-w-xl">
                        {block.content?.description || 'A joyful studio for movement, balance, and coordination.'}
                      </p>
                      <div className="mt-8 flex flex-wrap gap-4">
                        <Link to="/book-trial" className="rounded-full bg-brand-blue px-8 py-4 text-sm font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
                          Book A Trial
                        </Link>
                        <Link
                          to="/programs"
                          className="rounded-full border-2 border-brand-black/10 px-8 py-4 text-sm font-bold text-brand-black transition-all hover:bg-brand-black hover:text-white"
                        >
                          Explore Programs
                        </Link>
                      </div>
                      <div className="mt-10 grid gap-4 sm:grid-cols-3">
                        {highlights.map((item) => (
                          <div key={item.title} className="bg-white/50 border border-brand-black/5 rounded-2xl p-5 backdrop-blur-sm shadow-sm">
                            <p className="text-sm font-bold text-brand-blue">{item.title}</p>
                            <p className="mt-2 text-xs text-brand-black/60 font-medium leading-relaxed">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="soft-card rounded-[40px] p-8 border-2 border-brand-black/5">
                      <img src={heroImage} alt="Kids fitness energy" className="w-full rounded-3xl shadow-2xl" />
                      <div className="mt-8 rounded-[32px] bg-brand-black p-8 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-yellow/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/50">Live classes today</p>
                        <h2 className="mt-4 font-display text-4xl font-black italic">8 Sessions</h2>
                        <p className="mt-3 text-sm text-white/70 font-medium">Member login, QR check-in, and attendance tracking.</p>
                      </div>
                    </div>
                  </div>
                </section>
              );
            }

            if (block.type === 'ProgramsSection') {
              return (
                <section key={block._id} className="page-shell">
                  <SectionTitle
                    kicker={block.content?.kicker || 'Programs'}
                    title={block.content?.headline || 'Classes crafted for every stage'}
                    subtitle={block.content?.description || ''}
                  />
                  <div className="grid gap-6 md:grid-cols-3">
                    {classes.length > 0 ? (
                      classes.map((item) => (
                        <ClassCard key={item._id} item={item} />
                      ))
                    ) : (
                      <p className="text-sm text-ink/50 md:col-span-3">Loading classes...</p>
                    )}
                  </div>
                </section>
              );
            }

            if (block.type === 'PricingSection') {
              return (
                <section key={block._id} className="page-shell">
                  <div className="section-soft rounded-[32px] p-8">
                    <SectionTitle
                      kicker={block.content?.kicker || 'Pricing'}
                      title={block.content?.headline || 'Simple plans that fit your family'}
                      subtitle={block.content?.description || ''}
                    />
                    <div className="grid gap-6 md:grid-cols-3">
                      {plans.length > 0 ? (
                        plans.map((plan) => (
                          <PricingCard key={plan._id} plan={plan} />
                        ))
                      ) : (
                        <p className="text-sm text-ink/50 md:col-span-3">Loading plans...</p>
                      )}
                    </div>
                  </div>
                </section>
              );
            }

            if (block.type === 'CTASection') {
              return (
                <section key={block._id} className="page-shell pb-16 pt-8">
                  <div className="rounded-[40px] bg-brand-black p-12 shadow-2xl relative overflow-hidden md:flex md:items-center md:justify-between group">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="relative z-10">
                      <h3 className="font-display text-3xl font-black text-white italic">{block.content?.headline || 'Ready For A Complimentary Class?'}</h3>
                      <p className="mt-3 text-lg text-white/70 font-medium">
                        {block.content?.description || 'Book a trial session and our team will confirm your slot by SMS.'}
                      </p>
                    </div>
                    <Link to="/book-trial" className="mt-8 relative z-10 inline-flex items-center gap-3 rounded-full bg-brand-blue px-10 py-5 text-base font-black text-white shadow-xl transition-all hover:scale-105 active:scale-95 md:mt-0 group/btn">
                      <span>Book A Trial Now</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 transition-transform group-hover/btn:translate-x-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  </div>
                </section>
              );
            }

            // Fallback for simple CMS blocks
            return (
              <section key={block._id} className="page-shell pb-10 pt-10">
                <div className="section-soft rounded-[32px] p-8 border border-slate-100 shadow-sm bg-white">
                  <SectionTitle title={block.title} kicker={block.type} subtitle={block.content?.subtitle || ''} />
                  {block.type === 'TextSection' && <p className="mt-4 text-slate-600">{block.content?.text}</p>}
                  {block.type === 'ImageBanner' && block.content?.imageUrl && <img src={block.content.imageUrl} alt={block.title} className="w-full rounded-2xl mt-4" />}
                  {block.type === 'VideoBlock' && block.content?.videoUrl && (
                    <div className="mt-4 aspect-video bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center text-white">
                      Video Player: {block.content.videoUrl}
                    </div>
                  )}
                </div>
              </section>
            );
          })
        ) : (
          <div className="py-20 text-center text-slate-500">
            <p>Welcome to our fitness hub!</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
