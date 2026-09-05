// ═══════════════════════════════════════════════════════════
// Cart.js
// ═══════════════════════════════════════════════════════════
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { useCart } from '../../context/CartContext';
import { formatCurrency, getImageUrl } from '../../utils/api';

export function Cart() {
  const { cart, updateCartItem, removeFromCart } = useCart();
  const navigate = useNavigate();
  const { items = [], summary = {} } = cart;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart ({items.length} items)</h1>
        {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl">
            <div className="text-7xl mb-4">🛒</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Your cart is empty</h3>
            <p className="text-gray-500 mb-6">Discover electronics, accessories, and daily deals</p>
            <Link to="/products" className="btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {items.map((item) => (
                <div key={item.cart_id} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4">
                  <img src={getImageUrl(item.image)} alt={item.name} className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/80x80?text=🌿'; }} />
                  <div className="flex-1 min-w-0">
                    <Link to={`/products/${item.slug}`} className="font-semibold text-gray-800 hover:text-green-700 text-sm line-clamp-2">{item.name}</Link>
                    <p className="text-green-700 font-bold mt-1">{formatCurrency(item.price)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.free_shipping ? 'Free shipping' : `Shipping: ${formatCurrency(parseFloat(item.shipping_amount || 0) * item.quantity)}`}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button onClick={() => updateCartItem(item.cart_id, item.quantity - 1)} disabled={item.quantity <= 1}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 font-bold">−</button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => updateCartItem(item.cart_id, item.quantity + 1)} disabled={item.quantity >= item.stock}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 font-bold">+</button>
                      </div>
                      <button onClick={() => removeFromCart(item.cart_id)} className="text-red-500 text-xs hover:underline">Remove</button>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900">{formatCurrency(parseFloat(item.price) * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-24">
                <h3 className="font-bold text-gray-800 mb-4">Order Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{formatCurrency(summary.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">GST</span><span>{formatCurrency(summary.gst)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span className={parseFloat(summary.shipping) === 0 ? 'text-green-600 font-medium' : ''}>{parseFloat(summary.shipping) === 0 ? 'FREE' : formatCurrency(summary.shipping)}</span></div>
                  <div className="border-t pt-3 flex justify-between font-bold text-base">
                    <span>Total</span><span className="text-green-700">{formatCurrency(summary.total)}</span>
                  </div>
                </div>
                <button onClick={() => navigate('/checkout')} className="btn-primary w-full mt-5 text-center">Proceed to Checkout →</button>
                <Link to="/products" className="block text-center text-sm text-green-700 hover:underline mt-3">Continue Shopping</Link>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Wishlist.js
// ═══════════════════════════════════════════════════════════
export function Wishlist() {
  const { wishlist, removeWishlistItem, addToCart } = useCart();

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
                    <button onClick={() => removeWishlistItem(item.wishlist_id)} className="text-red-500 text-xs p-1.5 border border-red-200 rounded-lg hover:bg-red-50">🗑</button>
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

export default Cart;
