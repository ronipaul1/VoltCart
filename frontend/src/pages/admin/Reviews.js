import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { reviewAPI, formatDate } from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', rating: '' });
  const [busyId, setBusyId] = useState(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data } = await reviewAPI.getAdminAll(filters);
      setReviews(data.data || []);
    } catch (_) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filters]);

  const deleteReview = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    setBusyId(id);
    try {
      await reviewAPI.delete(id);
      setReviews((current) => current.filter((review) => review.id !== id));
      toast.success('Review deleted');
    } catch (_) {
      toast.error('Failed to delete review');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Customer Reviews</h1>
          <span className="text-sm text-gray-500">{reviews.length} reviews</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search product, customer, title, or review..."
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-600"
          />
          <select
            value={filters.rating}
            onChange={(event) => setFilters((current) => ({ ...current, rating: event.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none bg-white"
          >
            <option value="">All Ratings</option>
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>{rating} stars</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  {['Product', 'Customer', 'Rating', 'Review', 'Order', 'Date', 'Actions'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : reviews.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No reviews found</td></tr>
                ) : reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3">
                      <Link to={`/products/${review.product_slug}`} target="_blank" className="font-medium text-gray-800 hover:text-green-700">
                        {review.product_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{review.user_name}</p>
                      <p className="text-xs text-gray-400">{review.user_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={star <= review.rating ? 'text-amber-400' : 'text-gray-300'}>★</span>
                        ))}
                      </div>
                      {review.is_verified_purchase ? <p className="text-xs text-green-700 mt-1">Verified purchase</p> : null}
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      {review.title && <p className="font-semibold text-gray-800">{review.title}</p>}
                      <p className="text-gray-600">{review.body || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{review.order_number ? `#${review.order_number}` : '-'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(review.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteReview(review.id)}
                        disabled={busyId === review.id}
                        className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 disabled:opacity-60"
                      >
                        {busyId === review.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
