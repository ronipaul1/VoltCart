import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import ProductCard from '../../components/user/ProductCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { productAPI, reviewAPI, formatCurrency, getImageUrl } from '../../utils/api';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { slug } = useParams();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const { user } = useAuth();
  const [product, setProduct]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [quantity, setQuantity]   = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [review, setReview]       = useState({ rating: 5, title: '', body: '' });
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchProduct();
    window.scrollTo(0, 0);
  }, [slug]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const { data } = await productAPI.getBySlug(slug);
      setProduct(data.data);
      if (user) {
        try {
          const eligibility = await reviewAPI.getEligibility(data.data.id);
          setReviewEligibility(eligibility.data.data);
        } catch (_) {
          setReviewEligibility(null);
        }
      } else {
        setReviewEligibility(null);
      }
    } catch { toast.error('Product not found'); }
    finally { setLoading(false); }
  };

  const handleAddToCart = () => addToCart(product.id, quantity);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewEligibility?.canReview) {
      toast.error('You can review this product after it is delivered.');
      return;
    }

    setSubmittingReview(true);
    try {
      await reviewAPI.create({ product_id: product.id, order_id: reviewEligibility.order?.order_id, ...review });
      toast.success('Review submitted!');
      setReview({ rating: 5, title: '', body: '' });
      fetchProduct();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally { setSubmittingReview(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="xl" /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center"><p>Product not found</p></div>;

  const images = product.images?.length ? product.images : [{ image_url: null }];
  const discount = product.compare_price ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : null;
  const inWishlist = isInWishlist(product.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
          <Link to="/" className="hover:text-green-700">Home</Link> /
          <Link to="/products" className="hover:text-green-700">Products</Link> /
          <Link to={`/products?category=${product.category_slug}`} className="hover:text-green-700">{product.category_name}</Link> /
          <span className="text-gray-800 font-medium truncate max-w-48">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
          {/* ── Image Gallery ── */}
          <div className="space-y-3">
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 aspect-square flex items-center justify-center">
              <img
                src={getImageUrl(images[activeImg]?.image_url)}
                alt={product.name}
                className="w-full h-full object-contain p-4"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/400x400?text=🌿'; }}
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${activeImg === i ? 'border-green-600' : 'border-gray-200 hover:border-gray-400'}`}>
                    <img src={getImageUrl(img.image_url)} alt="" className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/80x80?text=🌿'; }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Product Info ── */}
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link to={`/products?category=${product.category_slug}`} className="text-sm text-green-700 font-medium bg-green-50 px-3 py-1 rounded-full hover:bg-green-100">{product.category_name}</Link>
                {product.is_featured === 1 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">⭐ Featured</span>}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-serif">{product.name}</h1>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= Math.round(product.avg_rating) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}
              </div>
              <span className="font-semibold text-gray-800">{parseFloat(product.avg_rating).toFixed(1)}</span>
              <span className="text-gray-500 text-sm">({product.review_count} reviews)</span>
            </div>

            {/* Price */}
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-900">{formatCurrency(product.price)}</span>
                {product.compare_price && <span className="text-lg text-gray-400 line-through">{formatCurrency(product.compare_price)}</span>}
                {discount && <span className="bg-red-500 text-white text-sm font-bold px-2 py-0.5 rounded-full">{discount}% OFF</span>}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                + GST: ₹{parseFloat(product.gst_amount || 0).toFixed(2)} ({product.gst_percent}%) &nbsp;·&nbsp; 
                Price with GST: <strong>{formatCurrency(product.price_with_gst)}</strong>
              </p>
              <p className="text-xs text-green-700 font-medium mt-1">
                {product.free_shipping ? 'Free shipping' : `Shipping: ${formatCurrency(product.shipping_amount || 0)}`}
              </p>
            </div>

            {/* Short description */}
            {product.short_description && <p className="text-gray-600 leading-relaxed">{product.short_description}</p>}

            {/* Stock */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${product.stock > 10 ? 'bg-green-500' : product.stock > 0 ? 'bg-orange-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium text-gray-700">
                {product.stock > 10 ? 'In Stock' : product.stock > 0 ? `Only ${product.stock} left!` : 'Out of Stock'}
              </span>
              {product.sku && <span className="text-xs text-gray-400 ml-2">SKU: {product.sku}</span>}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Quantity:</span>
              <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-lg">−</button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-lg">+</button>
              </div>
              <span className="text-sm text-gray-500">per {product.unit || 'piece'}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={handleAddToCart} disabled={product.stock === 0}
                className={`flex-1 py-3 rounded-xl font-bold text-base transition-all ${product.stock === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-700 hover:bg-green-800 text-white hover:shadow-lg active:scale-95'}`}>
                🛒 Add to Cart
              </button>
              <button onClick={() => toggleWishlist(product.id)}
                className={`w-12 h-12 border-2 rounded-xl flex items-center justify-center text-xl transition-all hover:scale-110 ${inWishlist ? 'border-red-400 bg-red-50 text-red-500' : 'border-gray-300 text-gray-400 hover:border-red-300'}`}>
                {inWishlist ? '❤️' : '🤍'}
              </button>
            </div>

            {/* Key features */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {['100% Natural', 'Lab Tested', 'No Preservatives', 'Ayurvedic'].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-600">✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-10">
          <div className="flex border-b">
            {['description', 'reviews', 'shipping'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-semibold capitalize transition-colors ${activeTab === tab ? 'border-b-2 border-green-700 text-green-700' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab} {tab === 'reviews' ? `(${product.review_count})` : ''}
              </button>
            ))}
          </div>
          <div className="p-6">
            {activeTab === 'description' && (
              <div className="prose max-w-none text-gray-600 leading-relaxed whitespace-pre-line">{product.description || 'No description available.'}</div>
            )}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {/* Rating breakdown */}
                {product.ratingBreakdown?.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-5 mb-6 flex flex-col sm:flex-row gap-6 items-start">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-gray-900">{parseFloat(product.avg_rating).toFixed(1)}</div>
                      <div className="flex justify-center gap-0.5 my-1">{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= Math.round(product.avg_rating) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}</div>
                      <div className="text-sm text-gray-500">{product.review_count} reviews</div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {[5,4,3,2,1].map(star => {
                        const found = product.ratingBreakdown?.find(r => r.rating === star);
                        const count = found?.count || 0;
                        const pct = product.review_count > 0 ? (count / product.review_count) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-2 text-sm">
                            <span className="w-6 text-right text-gray-600">{star}★</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div className="bg-amber-400 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-6 text-gray-500">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reviews list */}
                {product.reviews?.length ? product.reviews.map((r) => (
                  <div key={r.id} className="border-b pb-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center text-white text-sm font-bold">{r.user_name?.charAt(0)}</div>
                      <div>
                        <div className="font-medium text-gray-800 text-sm">{r.user_name}</div>
                        <div className="flex items-center gap-2">
                          <div className="flex">{[1,2,3,4,5].map(s => <span key={s} className={`text-xs ${s <= r.rating ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}</div>
                          {r.is_verified_purchase ? <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">✓ Verified Purchase</span> : null}
                        </div>
                      </div>
                      <span className="ml-auto text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                    {r.title && <h5 className="font-semibold text-gray-800 mb-1">{r.title}</h5>}
                    <p className="text-sm text-gray-600">{r.body}</p>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4">No reviews yet.</p>
                )}

                {/* Write review */}
                {user && reviewEligibility?.canReview && (
                  <form onSubmit={handleReviewSubmit} className="bg-gray-50 rounded-xl p-5 mt-6">
                    <h4 className="font-bold text-gray-800 mb-4">Write a Review</h4>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(s => (
                          <button type="button" key={s} onClick={() => setReview(r => ({ ...r, rating: s }))}
                            className={`text-2xl transition-transform hover:scale-110 ${s <= review.rating ? 'text-amber-400' : 'text-gray-300'}`}>★</button>
                        ))}
                      </div>
                    </div>
                    <input type="text" placeholder="Review title" value={review.title} onChange={(e) => setReview(r => ({ ...r, title: e.target.value }))} className="input-field mb-3 text-sm" />
                    <textarea placeholder="Share your experience..." value={review.body} onChange={(e) => setReview(r => ({ ...r, body: e.target.value }))} rows={3} className="input-field text-sm mb-3" />
                    <button type="submit" disabled={submittingReview} className="btn-primary text-sm">{submittingReview ? 'Submitting...' : 'Submit Review'}</button>
                  </form>
                )}
                {user && reviewEligibility?.alreadyReviewed && (
                  <p className="bg-green-50 text-green-700 rounded-xl p-4 text-sm">You have already reviewed this product.</p>
                )}
                {user && reviewEligibility && !reviewEligibility.canReview && !reviewEligibility.alreadyReviewed && (
                  <p className="bg-amber-50 text-amber-700 rounded-xl p-4 text-sm">Review option will unlock after this product is delivered to you.</p>
                )}
                {!user && (
                  <p className="bg-gray-50 text-gray-600 rounded-xl p-4 text-sm">
                    <Link to="/login" className="text-green-700 font-medium hover:underline">Login</Link> to review products you have purchased after delivery.
                  </p>
                )}
              </div>
            )}
            {activeTab === 'shipping' && (
              <div className="space-y-4 text-sm text-gray-600">
                {[['SH', 'Product Shipping', product.free_shipping ? 'This product has free shipping. Standard delivery takes 3-7 business days.' : `Shipping for this product is ${formatCurrency(product.shipping_amount || 0)}. Standard delivery takes 3-7 business days.`],
                  ['⚡', 'Express Delivery', 'Available in select cities. Get your order in 1–2 days (extra charge applies).'],
                  ['↩️', '7-Day Returns', 'Not satisfied? Return within 7 days for a full refund. No questions asked.'],
                  ['📦', 'Secure Packaging', 'All products are securely packed to preserve freshness and prevent damage.']
                ].map(([icon, title, desc]) => (
                  <div key={title} className="flex gap-3">
                    <span className="text-2xl flex-shrink-0">{icon}</span>
                    <div><p className="font-semibold text-gray-800">{title}</p><p>{desc}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Related Products ── */}
        {product.related?.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-5">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {product.related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
