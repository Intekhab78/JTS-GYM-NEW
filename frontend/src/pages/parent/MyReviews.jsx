import { useState, useEffect } from 'react';
import { reviewApi } from '../../api/reviewApi.js';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';

export default function MyReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reviewApi.getMyReviews()
      .then(data => setReviews(data))
      .finally(() => setLoading(false));
  }, []);

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="page-shell flex-1 pb-12 pt-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-ocean to-coral p-8 text-white shadow-glow">
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">Customer Dashboard</p>
            <h1 className="mt-3 font-display text-3xl md:text-4xl">My Reviews</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              View the feedback you've left for classes, memberships, and trainers.
            </p>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 rounded-3xl bg-white border border-slate-100" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-3xl bg-white p-12 text-center border border-slate-100">
              <p className="text-lg text-ink/50">You haven't written any reviews yet.</p>
            </div>
          ) : (
            reviews.map(review => (
              <div key={review._id} className="soft-card rounded-3xl bg-white p-6 border border-slate-100 transition hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="inline-flex items-center rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-[10px] font-black text-brand-blue uppercase tracking-wider">
                      {review.targetType}
                    </span>
                    <h3 className="mt-2 font-display text-lg">
                      {review.targetId?.title || review.targetId?.name || 'Deleted Item'}
                    </h3>
                  </div>
                  <div className="text-amber-400 text-2xl tracking-widest">
                    {renderStars(review.rating)}
                  </div>
                </div>
                <p className="text-sm text-ink/80 leading-relaxed bg-slate-50 p-4 rounded-2xl">
                  "{review.comment}"
                </p>
                <div className="mt-4 text-[10px] font-bold text-ink/30 uppercase tracking-wider">
                  Posted on {new Date(review.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
