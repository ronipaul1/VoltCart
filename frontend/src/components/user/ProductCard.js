import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { formatCurrency, getImageUrl } from '../../utils/api';

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const [imageFailed, setImageFailed] = useState(false);

  const productId = product.product_id || product.id;
  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : null;
  const inWishlist = isInWishlist(productId);
  const imageSrc = imageFailed ? null : getImageUrl(product.primary_image || product.image);

  return (
    <div className="product-card group relative flex h-full min-h-[26rem] flex-col justify-between">
      <button
        onClick={(e) => {
          e.preventDefault();
          toggleWishlist(productId);
        }}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition-transform hover:scale-110"
      >
        <svg
          className={`h-4 w-4 ${inWishlist ? 'fill-current text-red-500' : 'text-gray-400'}`}
          fill={inWishlist ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>

      {discount ? (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
          -{discount}%
        </div>
      ) : null}

      <Link to={`/products/${product.slug}`} className="flex min-h-full flex-1 flex-col">
        <div className="flex h-52 items-center justify-center overflow-hidden bg-gray-50">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={product.name}
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-amber-50 px-4 text-center">
              <span className="mb-2 text-3xl font-black text-slate-900">VoltCart</span>
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-green-700">
                Image unavailable
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            <p className="mb-1 min-h-[1rem] text-xs font-medium text-green-700">
              {product.category_name}
            </p>
            <h3 className="line-clamp-2 min-h-[2.5rem] overflow-hidden text-sm font-medium leading-snug text-gray-900">
              {product.name}
            </h3>
          </div>

          <div className="mb-2 flex min-h-[1rem] items-center gap-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`h-3 w-3 ${
                    star <= Math.round(product.avg_rating) ? 'fill-current text-amber-400' : 'fill-current text-gray-300'
                  }`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-xs text-gray-500">({product.review_count || 0})</span>
          </div>

          <div className="mb-3 flex min-h-[1.5rem] items-baseline gap-2">
            <span className="text-lg font-bold text-gray-900">{formatCurrency(product.price)}</span>
            {product.compare_price ? (
              <span className="text-sm text-gray-400 line-through">
                {formatCurrency(product.compare_price)}
              </span>
            ) : null}
          </div>

          <div className="mb-2 min-h-[1.25rem]">
            {product.stock <= 5 && product.stock > 0 ? (
              <p className="text-xs font-medium text-orange-600">Only {product.stock} left!</p>
            ) : null}
            {product.stock === 0 ? (
              <p className="text-xs font-medium text-red-600">Out of stock</p>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4">
        <button
          onClick={() => addToCart(productId)}
          disabled={product.stock === 0}
          className={`w-full rounded-lg py-2 text-sm font-semibold transition-all duration-200 ${
            product.stock === 0
              ? 'cursor-not-allowed bg-gray-100 text-gray-400'
              : 'bg-green-700 text-white hover:bg-green-800 hover:shadow-md active:scale-95'
          }`}
        >
          {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
