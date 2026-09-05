import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart]         = useState({ items: [], summary: {} });
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (user) {
      fetchCart();
      fetchWishlist();
    } else {
      setCart({ items: [], summary: {} });
      setWishlist([]);
    }
  }, [user]);

  const fetchCart = async () => {
    try {
      const { data } = await axios.get('/cart');
      setCart(data.data);
    } catch (err) {
      console.error('Cart fetch error:', err);
    }
  };

  const fetchWishlist = async () => {
    try {
      const { data } = await axios.get('/wishlist');
      setWishlist(data.data);
    } catch (err) {
      console.error('Wishlist fetch error:', err);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    if (!user) { toast.error('Please login to add items to cart'); return false; }
    try {
      await axios.post('/cart', { product_id: productId, quantity });
      await fetchCart();
      toast.success('Added to cart! 🛒');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart');
      return false;
    }
  };

  const updateCartItem = async (cartId, quantity) => {
    try {
      await axios.put(`/cart/${cartId}`, { quantity });
      await fetchCart();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update cart');
    }
  };

  const removeFromCart = async (cartId) => {
    try {
      await axios.delete(`/cart/${cartId}`);
      await fetchCart();
      toast.success('Item removed from cart');
    } catch (err) {
      toast.error('Failed to remove item');
    }
  };

  const clearCart = async () => {
    try {
      await axios.delete('/cart/clear');
      setCart({ items: [], summary: {} });
    } catch (err) {
      console.error('Clear cart error:', err);
    }
  };

  const toggleWishlist = async (productId) => {
    if (!user) { toast.error('Please login to save to wishlist'); return; }
    try {
      const { data } = await axios.post('/wishlist/toggle', { product_id: productId });
      await fetchWishlist();
      toast.success(data.inWishlist ? 'Added to wishlist ❤️' : 'Removed from wishlist');
      return data.inWishlist;
    } catch (err) {
      toast.error('Failed to update wishlist');
    }
  };

  const isInWishlist = (productId) => wishlist.some(item => item.product_id === productId);

  const cartCount = cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const wishlistCount = wishlist.length;

  return (
    <CartContext.Provider value={{
      cart, wishlist, loading,
      cartCount, wishlistCount,
      fetchCart, fetchWishlist,
      addToCart, updateCartItem, removeFromCart, clearCart,
      toggleWishlist, isInWishlist,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

export default CartContext;
