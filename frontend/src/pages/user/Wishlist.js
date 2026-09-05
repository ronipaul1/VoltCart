import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { useCart } from '../../context/CartContext';
import { formatCurrency, getImageUrl } from '../../utils/api';

export default function Wishlist() {
  const { wishlist, toggleWishlist, addToCart } = useCart();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Wishlist ({wishlist.length})</h1>
        {wishlist.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl">
            <div className="text-7xl mb-4">❤️</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Your wishlist is empty</h3>
            <Link to="/products" className="btn-primary mt-4 inline-block">Browse Products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {wishlist.map((item) => (
              <div key={item.wishlist_id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <Link to={`/products/${item.slug}`}>
                  <img src={getImageUrl(item.image)} alt={item.name} className="w-full h-40 object-cover"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/200?text=🌿'; }} />
                </Link>
                <div className="p-3">
                  <Link to={`/products/${item.slug}`} className="text-sm font-medium text-gray-800 line-clamp-2 hover:text-green-700">{item.name}</Link>
                  <p className="text-green-700 font-bold text-sm mt-1">{formatCurrency(item.price)}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => addToCart(item.product_id)} className="flex-1 bg-green-700 text-white text-xs py-1.5 rounded-lg hover:bg-green-800">Add to Cart</button>
                    <button onClick={() => toggleWishlist(item.product_id)} className="text-red-500 text-xs p-1.5 border border-red-200 rounded-lg hover:bg-red-50">🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
