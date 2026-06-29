import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { reviewApi } from '../api/reviewApi.js';

export default function ReviewModal({ isOpen, onClose, targetType, targetId, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setLoading(true);
    try {
      await reviewApi.createReview({
        targetType,
        targetId,
        rating,
        comment
      });
      toast.success('Review submitted successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-ink">Write a Review</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label className="mb-2 block text-sm font-bold text-ink">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-transform hover:scale-110 ${
                    rating >= star ? 'text-amber-400' : 'text-slate-200'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-ink">Review Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-sm outline-none transition-colors focus:border-brand-blue focus:bg-white min-h-[120px]"
              placeholder={`How was your experience with this ${targetType.toLowerCase()}?`}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-6 py-3 text-sm font-bold text-ink/60 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-brand-blue px-8 py-3 text-sm font-black text-white hover:bg-brand-blue/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
