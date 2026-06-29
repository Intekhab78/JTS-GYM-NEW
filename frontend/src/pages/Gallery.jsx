import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import g1 from '../assets/gallery-1.png';
import g2 from '../assets/gallery-2.png';
import g3 from '../assets/gallery-3.png';
import g4 from '../assets/gallery-4.png';
import g5 from '../assets/gallery-5.png';
import g6 from '../assets/gallery-6.png';

const gallery = [
  { label: 'Balance beams', image: g1 },
  { label: 'Parent + child sessions', image: g2 },
  { label: 'Team challenges', image: g3 },
  { label: 'Ballet stretch flow', image: g4 },
  { label: 'Combat focus drills', image: g5 },
  { label: 'Active play circuits', image: g6 }
];

export default function Gallery() {
  return (
    <div>
      <Navbar />
      <main className="page-shell py-12">
        <SectionTitle
          kicker="Gallery"
          title="Inside the studio"
          subtitle="Snapshots from our sessions, events, and mini tournaments."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {gallery.map((item, index) => (
            <div 
              key={item.label} 
              className="group relative overflow-hidden rounded-[2.5rem] bg-surface ring-1 ring-ink/5 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/20"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src={item.image} 
                  alt={item.label} 
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                />
              </div>
              
              {/* Overlay with details */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <p className="translate-y-4 text-lg font-semibold text-white transition-transform duration-500 group-hover:translate-y-0">
                  {item.label}
                </p>
                <div className="mt-2 h-1 w-12 origin-left scale-x-0 bg-primary transition-transform duration-500 group-hover:scale-x-100" />
              </div>

              {/* Static label for non-hover state */}
              <div className="p-6 transition-opacity duration-300 group-hover:opacity-0">
                <h3 className="text-lg font-medium text-ink">{item.label}</h3>
                <p className="mt-1 text-sm text-ink/50">Studio Session</p>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
