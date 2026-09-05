import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { notificationAPI } from '../../utils/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount, wishlistCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery]     = useState('');
  const [mobileMenu, setMobileMenu]       = useState(false);
  const [userMenu, setUserMenu]           = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [notifOpen, setNotifOpen]         = useState(false);
  const [scrolled, setScrolled]           = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenu(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await notificationAPI.getAll();
      setNotifications(data.data.slice(0, 10));
      setUnreadCount(data.data.filter(n => !n.is_read).length);
    } catch {}
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenu(false);
  };

  const markAllRead = async () => {
    await notificationAPI.markAllRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md' : 'bg-white'}`}>
      {/* Top Banner */}
      <div className="bg-green-800 text-white text-xs py-1.5 text-center">
        Product-wise shipping rates &nbsp;|&nbsp; Use code <strong>WELCOME10</strong> for 10% off
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl">🌿</span>
            <div className="hidden sm:block">
              <span className="text-green-800 font-bold text-lg leading-none">Volt</span>
              <span className="text-amber-600 font-bold text-lg leading-none">Cart</span>
            </div>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:flex">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search smartphones, laptops, headphones..."
                className="w-full border-2 border-gray-200 focus:border-green-700 rounded-lg pl-4 pr-12 py-2 text-sm outline-none transition-colors"
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-700 text-white p-1.5 rounded-md hover:bg-green-800 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-2" ref={userMenuRef}>
            {/* Wishlist */}
            {user && (
              <Link to="/wishlist" className="relative p-2 text-gray-600 hover:text-green-800 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">{wishlistCount}</span>
                )}
              </Link>
            )}

            {/* Cart */}
            <Link to="/cart" className="relative p-2 text-gray-600 hover:text-green-800 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-700 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">{cartCount > 9 ? '9+' : cartCount}</span>
              )}
            </Link>

            {/* Notifications */}
            {user && (
              <div className="relative">
                <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 text-gray-600 hover:text-green-800 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">{unreadCount}</span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                      <span className="font-semibold text-sm">Notifications</span>
                      {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-green-700 hover:underline">Mark all read</button>}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">No notifications yet</p>
                      ) : notifications.map((n) => (
                        <div key={n.id} className={`px-4 py-3 border-b hover:bg-gray-50 ${!n.is_read ? 'bg-green-50' : ''}`}>
                          <p className="text-sm font-medium text-gray-800">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button onClick={() => setUserMenu(!userMenu)} className="flex items-center gap-2 text-gray-700 hover:text-green-800 transition-colors p-1">
                  <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium max-w-20 truncate">{user.name?.split(' ')[0]}</span>
                </button>
                {userMenu && (
                  <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                    <div className="px-4 py-2 border-b bg-gray-50">
                      <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    {user.role === 'admin' && (
                      <Link to="/admin" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 font-medium">
                        ⚙️ Admin Panel
                      </Link>
                    )}
                    <Link to="/profile" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">👤 My Profile</Link>
                    <Link to="/orders" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">📦 My Orders</Link>
                    <Link to="/wishlist" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">❤️ Wishlist</Link>
                    <Link to="/addresses" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">📍 Addresses</Link>
                    <div className="border-t mt-1">
                      <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">🚪 Logout</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-green-800 px-3 py-1.5">Login</Link>
                <Link to="/register" className="text-sm font-medium bg-green-700 text-white px-4 py-1.5 rounded-lg hover:bg-green-800 transition-colors">Register</Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button className="md:hidden p-2 text-gray-600" onClick={() => setMobileMenu(!mobileMenu)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Category Nav */}
        <nav className="hidden md:flex items-center gap-6 pb-3 text-sm overflow-x-auto">
          {['Smartphones', 'Laptops', 'Tablets', 'Audio', 'Wearables', 'Gaming'].map((cat) => (
            <Link
              key={cat}
              to={`/products?category=${cat.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
              className={`whitespace-nowrap font-medium transition-colors hover:text-green-800 ${location.search.includes(cat.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')) ? 'text-green-800 border-b-2 border-green-700' : 'text-gray-600'}`}
            >
              {cat}
            </Link>
          ))}
          <Link to="/products" className="whitespace-nowrap font-medium text-amber-600 hover:text-amber-700">
            🔥 All Products
          </Link>
        </nav>

        {/* Mobile Search */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-600"
            />
            <button type="submit" className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800">Search</button>
          </form>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenu && (
        <div className="md:hidden border-t bg-white px-4 pb-4">
          <div className="grid grid-cols-3 gap-2 py-3 text-center text-xs font-medium text-gray-600">
            {['Smartphones', 'Laptops', 'Tablets', 'Audio', 'Wearables', 'Gaming'].map((cat) => (
              <Link
                key={cat}
                to={`/products?category=${cat.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                className="py-2 px-2 bg-gray-50 rounded-lg hover:bg-green-50 hover:text-green-800"
                onClick={() => setMobileMenu(false)}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
