import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import sliderJumping from '../assets/slider-jumping.png';

export default function About() {
  return (
    <div>
      <Navbar />
      <main className="page-shell py-12">
        <SectionTitle
          kicker="Our story"
          title="Movement-first childhoods"
          subtitle="We blend playful coaching with safe progress tracking for every family."
        />
        <div className="grid gap-8 md:grid-cols-2">
          <div className="soft-card rounded-3xl p-6">
            <h3 className="font-display text-xl">What we believe</h3>
            <p className="mt-3 text-sm text-ink/70">
              Kids thrive when movement is joyful and structured. Our sessions focus on coordination,
              balance, and confidence while customers stay in the loop.
            </p>
          </div>
          <div className="soft-card rounded-3xl p-6">
            <h3 className="font-display text-xl">How we coach</h3>
            <p className="mt-3 text-sm text-ink/70">
              Certified trainers guide small groups with clear milestones. Every class ends with a quick
              progress note in the customer dashboard.
            </p>
          </div>
          <div className="soft-card rounded-3xl p-6 md:col-span-2 overflow-hidden flex items-center justify-center">
            <img src={sliderJumping} alt="Kids jumping on trampoline" className="w-full h-auto rounded-3xl shadow-xl hover:scale-[1.02] transition-transform duration-700" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
