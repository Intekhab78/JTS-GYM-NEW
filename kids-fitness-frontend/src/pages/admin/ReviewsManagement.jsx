import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { reviewApi } from '../../api/reviewApi.js';
import AdminHeader from '../../components/AdminHeader.jsx';
import Footer from '../../components/Footer.jsx';

export default function ReviewsManagement() {
  const [reviews, setReviewsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const data = await reviewApi.getAdminReviews();
      setReviewsList(data);
    } catch (error) {
      toast.error('Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        await reviewApi.deleteReview(id);
        toast.success('Review deleted successfully');
        fetchReviews();
      } catch (error) {
        toast.error('Failed to delete review');
      }
    }
  };

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <main className="page-shell flex-1 pb-12 pt-8">
        <AdminHeader 
          title="Reviews Management" 
          description="View and manage customer reviews for classes, plans, and trainers."
        />

        <section className="mt-8">
          <div className="soft-card overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-ink/50">
                  <tr>
                    <th className="px-6 py-4 font-black tracking-wider">Customer</th>
                    <th className="px-6 py-4 font-black tracking-wider">Target</th>
                    <th className="px-6 py-4 font-black tracking-wider">Rating</th>
                    <th className="px-6 py-4 font-black tracking-wider">Comment</th>
                    <th className="px-6 py-4 font-black tracking-wider">Date</th>
                    <th className="px-6 py-4 font-black tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-ink/50 animate-pulse">
                        Loading reviews...
                      </td>
                    </tr>
                  ) : reviews.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-ink/50">
                        No reviews found.
                      </td>
                    </tr>
                  ) : (
                    reviews.map((review) => (
                      <tr key={review._id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <p className="font-bold text-ink">{review.userId?.name || 'Unknown User'}</p>
                          <p className="text-xs text-ink/50">{review.userId?.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-xs font-bold text-brand-blue uppercase">
                            {review.targetType}
                          </span>
                          <p className="mt-1 text-xs font-semibold text-ink">
                            {review.targetId?.title || review.targetId?.name || 'Deleted Target'}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-amber-400 text-lg">
                          {renderStars(review.rating)}
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate" title={review.comment}>
                          {review.comment}
                        </td>
                        <td className="px-6 py-4 text-xs text-ink/60 font-medium whitespace-nowrap">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(review._id)}
                            className="text-rose-500 hover:text-rose-700 font-bold text-xs bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
