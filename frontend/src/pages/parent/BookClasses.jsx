import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';

export default function BookClasses() {
  return (
    <div>
      <Navbar />
      <main className="page-shell py-12">
        <h1 className="font-display text-3xl">Book Classes</h1>
        <p className="mt-2 text-sm text-ink/70">Choose class slots and book for your child.</p>
        <Link
          to="/calendar"
          className="mt-6 inline-flex rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white"
        >
          Open booking calendar
        </Link>
      </main>
      <Footer />
    </div>
  );
}

