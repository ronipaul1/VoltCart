import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  Bars3Icon,
  CameraIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ComputerDesktopIcon,
  CpuChipIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  EyeIcon,
  EyeSlashIcon,
  FireIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  ShoppingCartIcon,
  SpeakerWaveIcon,
  Squares2X2Icon,
  TagIcon,
  TruckIcon,
  UserCircleIcon,
  WifiIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  addProduct,
  applyTheme,
  changePassword,
  createOrderShipment,
  deleteAddress,
  deleteProduct,
  ELECTRONICS_CATEGORIES,
  ELECTRONICS_BRANDS,
  fetchDummyJsonElectronicsPreview,
  formatCurrency,
  getCategoryUrl,
  isCategoryActive,
  generateInvoiceNumber,
  generateOrderShippingLabel,
  getNotificationPrefs,
  getSession,
  getShippingRatesForCart,
  getStore,
  getThemePreference,
  importDummyJsonProducts,
  loginUser,
  mapExternalCategoryToVoltCart,
  normalizeProduct,
  placeOrder,
  registerUser,
  saveAddress,
  saveNotificationPrefs,
  saveStore,
  saveThemePreference,
  setDefaultAddress,
  setSession,
  subscribeStore,
  updateAddress,
  updateOrderFulfillment,
  updateProduct,
  updateShippingOrigin,
  updateUserProfile,
  validateCoupon,
} from './voltcartStore';
import './index.css';

// Safe electronics image resolver with persistent fallback
export function getProductImage(product, index = 0) {
  if (!product) return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80';
  if (product.primaryImage && index === 0) return product.primaryImage;
  if (Array.isArray(product.images) && product.images.length > 0) {
    const item = product.images[index] || product.images[0];
    return typeof item === 'string' ? item : (item.url || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80');
  }
  return product.thumbnail || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80';
}

const CART_KEY = 'voltcart_cart_v1';
const WISHLIST_KEY = 'voltcart_wishlist_v1';
const orderStatuses = ['Pending', 'Confirmed', 'Processing', 'Ready for Shipment', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
const paymentStatuses = ['Created', 'Pending', 'Paid', 'Failed', 'Refunded'];
const shipmentStatuses = ['Not Created', 'Shipment Created', 'Label Generated', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Delivery Failed', 'Returned'];

// ─── State Hook ───────────────────────────────────────────────────────────────

function useVoltCart() {
  const [store, setStore] = useState(getStore);
  const [user, setUser] = useState(getSession);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem(CART_KEY) || '[]'));
  const [wishlist, setWishlist] = useState(() => JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'));

  useEffect(() => subscribeStore(setStore), []);
  useEffect(() => {
    const handler = () => setUser(getSession());
    window.addEventListener('voltcart-session-change', handler);
    return () => window.removeEventListener('voltcart-session-change', handler);
  }, []);
  useEffect(() => localStorage.setItem(CART_KEY, JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist)), [wishlist]);

  const productById = (id) => store.products.find((p) => p.id === Number(id));
  const cartItems = cart.map((item) => ({ ...item, product: productById(item.productId) })).filter((item) => item.product);
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const addToCart = (product, quantity = 1, variant = {}) => {
    if (!product.active || product.stock <= 0) return toast.error('This product is currently out of stock.');
    setCart((items) => {
      const found = items.find((item) => item.productId === product.id && JSON.stringify(item.variant) === JSON.stringify(variant));
      if (found) return items.map((item) => (item === found ? { ...item, quantity: Math.min(product.stock, item.quantity + quantity) } : item));
      return [...items, { productId: product.id, quantity, variant }];
    });
    toast.success('Added to cart');
  };

  const updateCart = (productId, quantity) => {
    if (quantity <= 0) return setCart((items) => items.filter((item) => item.productId !== productId));
    setCart((items) => items.map((item) => (item.productId === productId ? { ...item, quantity } : item)));
  };

  const toggleWishlist = (id) => {
    setWishlist((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
    toast.success(wishlist.includes(id) ? 'Removed from wishlist' : 'Saved to wishlist');
  };

  return { store, user, setUser, cart, setCart, cartItems, subtotal, wishlist, addToCart, updateCart, toggleWishlist };
}

// ─── Category Icon Resolver ───────────────────────────────────────────────────

export function CategoryIcon({ iconKey, className = 'h-4 w-4' }) {
  switch (iconKey) {
    case 'smartphone':
      return <DevicePhoneMobileIcon className={className} />;
    case 'laptop':
      return <ComputerDesktopIcon className={className} />;
    case 'tablet':
      return <DeviceTabletIcon className={className} />;
    case 'audio':
      return <SpeakerWaveIcon className={className} />;
    case 'camera':
      return <CameraIcon className={className} />;
    case 'gaming':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="4" />
          <path d="M6 12h4m-2-2v4m10-2h.01m-3 0h.01" strokeWidth={2.5} />
        </svg>
      );
    case 'mobile_acc':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v6m0 8v6M8 8h8a2 2 0 012 2v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2a2 2 0 012-2z" />
        </svg>
      );
    case 'computer_acc':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M7 9h.01M11 9h.01M15 9h.01M7 13h.01M11 13h.01M15 13h.01M7 16h10" strokeWidth={2} />
        </svg>
      );
    case 'smart_device':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <rect x="7" y="5" width="10" height="14" rx="3" />
          <path d="M10 2h4m-4 20h4M12 9v3l2 1" />
        </svg>
      );
    case 'networking':
      return <WifiIcon className={className} />;
    case 'other':
      return <CpuChipIcon className={className} />;
    case 'deals':
      return <FireIcon className={className} />;
    case 'all':
    default:
      return <Squares2X2Icon className={className} />;
  }
}

function useWindowWidth() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}

// ─── Shell / Layout ───────────────────────────────────────────────────────────

function Shell({ children, state }) {
  const [open, setOpen] = useState(false);
  const [allCatOpen, setAllCatOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [query, setQuery] = useState('');
  const allCatRef = useRef(null);
  const moreRef = useRef(null);
  const allCatTimeoutRef = useRef(null);
  const moreTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const windowWidth = useWindowWidth();

  const handleAllCatEnter = () => {
    if (allCatTimeoutRef.current) clearTimeout(allCatTimeoutRef.current);
    if (moreTimeoutRef.current) clearTimeout(moreTimeoutRef.current);
    setAllCatOpen(true);
    setMoreOpen(false);
  };
  const handleAllCatLeave = () => {
    allCatTimeoutRef.current = setTimeout(() => {
      setAllCatOpen(false);
    }, 200);
  };

  const handleMoreEnter = () => {
    if (moreTimeoutRef.current) clearTimeout(moreTimeoutRef.current);
    if (allCatTimeoutRef.current) clearTimeout(allCatTimeoutRef.current);
    setMoreOpen(true);
    setAllCatOpen(false);
  };
  const handleMoreLeave = () => {
    moreTimeoutRef.current = setTimeout(() => {
      setMoreOpen(false);
    }, 200);
  };

  // Close menus on route changes
  useEffect(() => {
    setAllCatOpen(false);
    setMoreOpen(false);
    setOpen(false);
  }, [location.pathname, location.search]);

  // Click outside and ESC handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (allCatRef.current && !allCatRef.current.contains(event.target)) {
        setAllCatOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target)) {
        setMoreOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setAllCatOpen(false);
        setMoreOpen(false);
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      if (allCatTimeoutRef.current) clearTimeout(allCatTimeoutRef.current);
      if (moreTimeoutRef.current) clearTimeout(moreTimeoutRef.current);
    };
  }, []);

  const submit = (event) => {
    event.preventDefault();
    if (query.trim()) {
      navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
      setQuery('');
      setOpen(false);
    }
  };

  const logout = () => {
    setSession(null);
    state.setUser(null);
    navigate('/');
  };

  // Centralized categories sorted by priority
  const sortedCategories = useMemo(() => {
    return [...ELECTRONICS_CATEGORIES].sort((a, b) => (a.priority || 99) - (b.priority || 99));
  }, []);

  // Adaptively calculate visible categories based on screen width
  const visibleCount = useMemo(() => {
    if (windowWidth >= 1280) return 6; // XL: 6 categories + Deals
    if (windowWidth >= 1024) return 5; // LG: 5 categories + Deals
    return 3;                          // MD: 3 categories + Deals (Tablets)
  }, [windowWidth]);

  const visibleCategories = useMemo(() => sortedCategories.slice(0, visibleCount), [sortedCategories, visibleCount]);
  const moreCategories = useMemo(() => sortedCategories.slice(visibleCount), [sortedCategories, visibleCount]);

  const isShopAllActive = location.pathname === '/shop' && !new URLSearchParams(location.search).get('category') && !new URLSearchParams(location.search).get('search');
  const isDealsActive = location.pathname === '/deals';
  const isMoreActive = useMemo(() => {
    return moreCategories.some((cat) => isCategoryActive(cat, location.pathname, location.search));
  }, [moreCategories, location.pathname, location.search]);

  return (
    <div className="min-h-screen bg-neutral-100 text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        {/* Top Info Bar */}
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-xs text-slate-600">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-1 md:justify-between">
            <span>Free express delivery above Rs 25,000</span>
            <span>Genuine products & warranty</span>
            <span>Secure Razorpay payments</span>
            <span>Support: +91 80 4567 8900</span>
          </div>
        </div>

        {/* Main Header Bar */}
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 md:h-16">
          <Link to="/" className="flex h-14 w-[170px] shrink-0 items-center md:h-16 md:w-[230px]">
            <img src="/voltcart-logo.png" alt="VoltCart" className="h-11 w-full object-contain object-left md:h-14" />
          </Link>

          {/* Desktop Search Bar */}
          <form onSubmit={submit} className="hidden flex-1 md:block">
            <div className="flex overflow-hidden rounded-md border border-slate-300 bg-white focus-within:border-cyan-600 focus-within:ring-2 focus-within:ring-cyan-100">
              <input
                className="h-10 flex-1 px-4 text-sm outline-none"
                placeholder="Search for smartphones, laptops, audio gear and more"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-cyan-600 px-5 text-sm font-bold text-white hover:bg-cyan-700 transition-colors"
              >
                <MagnifyingGlassIcon className="h-4 w-4" /> Search
              </button>
            </div>
          </form>

          {/* Right Header Actions */}
          <div className="ml-auto flex items-center gap-1 md:ml-0 md:gap-2">
            {state.user ? (
              <div className="group relative">
                <button className="nav-action">
                  <UserCircleIcon className="h-5 w-5" />
                  <span><span>Account</span><strong>{state.user.name.split(' ')[0]}</strong></span>
                </button>
                <div className="absolute right-0 hidden w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-xl group-focus-within:block group-hover:block z-50">
                  <Link className="menu-link" to="/account">Account</Link>
                  <Link className="menu-link" to="/orders">Orders</Link>
                  <Link className="menu-link" to="/wishlist">Wishlist</Link>
                  {state.user.role === 'admin' && <Link className="menu-link text-cyan-700 font-semibold" to="/admin/dashboard">Admin Dashboard</Link>}
                  <button className="menu-link w-full text-left text-red-600" onClick={logout}>Logout</button>
                </div>
              </div>
            ) : (
              <Link className="nav-action" to="/login">
                <UserCircleIcon className="h-5 w-5" />
                <span><span>Account</span><strong>Login</strong></span>
              </Link>
            )}

            <Link className="nav-action hidden sm:flex" to="/wishlist">
              <HeartIcon className="h-5 w-5" />
              <span><span>Wishlist</span><strong>{state.wishlist.length} saved</strong></span>
            </Link>

            <Link className="nav-action" to="/cart">
              <ShoppingCartIcon className="h-5 w-5" />
              <span><span>Cart</span><strong>{state.cart.reduce((sum, item) => sum + item.quantity, 0)} item(s)</strong></span>
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="rounded-md border border-slate-300 p-2 text-sm font-bold md:hidden hover:bg-slate-100"
              aria-label="Open navigation menu"
              onClick={() => setOpen(!open)}
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Professional Desktop / Tablet Category Navigation (NO HORIZONTAL SCROLLBAR & FULLY INTERACTIVE) */}
        <div className="hidden border-t border-slate-100 bg-white md:block relative z-30">
          <nav className="mx-auto flex h-11 max-w-7xl items-center justify-between gap-2 px-4 text-sm font-medium text-slate-700">
            {/* Left: [ ☰ All Categories ▾ ] + Direct Visible Categories */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {/* [ ☰ All Categories ▾ ] Mega Menu Dropdown */}
              <div
                className="relative shrink-0"
                ref={allCatRef}
                onMouseEnter={handleAllCatEnter}
                onMouseLeave={handleAllCatLeave}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (allCatTimeoutRef.current) clearTimeout(allCatTimeoutRef.current);
                    setAllCatOpen((prev) => !prev);
                    setMoreOpen(false);
                  }}
                  className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs lg:text-sm font-bold transition shadow-xs cursor-pointer ${
                    allCatOpen
                      ? 'bg-cyan-700 text-white ring-2 ring-cyan-500'
                      : isShopAllActive
                      ? 'bg-slate-900 text-white ring-2 ring-cyan-500'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                  aria-expanded={allCatOpen}
                  aria-haspopup="true"
                  aria-label="All Categories menu"
                >
                  <Bars3Icon className="h-4 w-4" />
                  <span>All Categories</span>
                  <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform duration-200 ${allCatOpen ? 'rotate-180' : ''}`} />
                </button>

                {allCatOpen && (
                  <div
                    className="absolute left-0 top-full pt-1.5 z-50"
                    onMouseEnter={handleAllCatEnter}
                    onMouseLeave={handleAllCatLeave}
                  >
                    <div className="w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Electronics Catalog</span>
                        <Link
                          to="/shop"
                          onClick={() => setAllCatOpen(false)}
                          className="text-xs font-bold text-cyan-700 hover:underline"
                        >
                          View All →
                        </Link>
                      </div>

                      {/* All Electronics Link */}
                      <div className="py-1">
                        <Link
                          to="/shop"
                          onClick={() => setAllCatOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs md:text-sm transition-colors ${
                            isShopAllActive
                              ? 'bg-cyan-50 text-cyan-700 font-bold border-l-4 border-cyan-600 pl-2'
                              : 'text-slate-800 hover:bg-slate-50 hover:text-cyan-700'
                          }`}
                        >
                          <span className={`flex h-7 w-7 items-center justify-center rounded-md ${
                            isShopAllActive ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            <Squares2X2Icon className="h-4 w-4" />
                          </span>
                          <span className="flex-1 font-semibold">All Electronics</span>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">All</span>
                        </Link>
                      </div>

                      <div className="border-t border-slate-100 my-1"></div>

                      {/* Complete 11 Categories List */}
                      <div className="max-h-[380px] overflow-y-auto space-y-0.5 pr-1">
                        {ELECTRONICS_CATEGORIES.map((cat) => {
                          const active = isCategoryActive(cat, location.pathname, location.search);
                          return (
                            <Link
                              key={cat.id}
                              to={getCategoryUrl(cat)}
                              onClick={() => setAllCatOpen(false)}
                              className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-xs md:text-sm transition-all ${
                                active
                                  ? 'bg-cyan-50 text-cyan-700 font-bold border-l-4 border-cyan-600 pl-2'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-cyan-700'
                              }`}
                            >
                              <span className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                                active ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600 group-hover:bg-cyan-50 group-hover:text-cyan-600'
                              }`}>
                                <CategoryIcon iconKey={cat.iconKey} className="h-4 w-4" />
                              </span>
                              <span className="flex-1 truncate font-medium">{cat.name}</span>
                              <ChevronRightIcon className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Directly Visible Category Links */}
              <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                {visibleCategories.map((cat) => {
                  const active = isCategoryActive(cat, location.pathname, location.search);
                  return (
                    <Link
                      key={cat.id}
                      to={getCategoryUrl(cat)}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 lg:px-3 py-1.5 text-xs lg:text-sm font-semibold transition-colors ${
                        active
                          ? 'bg-cyan-50 text-cyan-700 font-bold border-b-2 border-cyan-600 shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-cyan-700'
                      }`}
                    >
                      <span>{cat.shortName || cat.name}</span>
                    </Link>
                  );
                })}

                {/* Deals link */}
                <Link
                  to="/deals"
                  className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 lg:px-3 py-1.5 text-xs lg:text-sm font-bold transition-colors ${
                    isDealsActive
                      ? 'bg-rose-50 text-rose-700 font-bold border-b-2 border-rose-600 shadow-xs'
                      : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                  }`}
                >
                  <FireIcon className="h-4 w-4 text-rose-500" />
                  <span>Deals</span>
                </Link>
              </div>
            </div>

            {/* Right: [ More ▾ ] Dropdown for remaining categories */}
            {moreCategories.length > 0 && (
              <div
                className="relative shrink-0"
                ref={moreRef}
                onMouseEnter={handleMoreEnter}
                onMouseLeave={handleMoreLeave}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (moreTimeoutRef.current) clearTimeout(moreTimeoutRef.current);
                    setMoreOpen((prev) => !prev);
                    setAllCatOpen(false);
                  }}
                  className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 lg:px-3 py-1.5 text-xs lg:text-sm font-semibold transition-colors cursor-pointer ${
                    isMoreActive
                      ? 'bg-cyan-50 text-cyan-700 font-bold border-b-2 border-cyan-600'
                      : moreOpen
                      ? 'bg-slate-100 text-cyan-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-cyan-700'
                  }`}
                  aria-expanded={moreOpen}
                  aria-haspopup="true"
                  aria-label="More categories"
                >
                  <span>More</span>
                  <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
                </button>

                {moreOpen && (
                  <div
                    className="absolute right-0 top-full pt-1.5 z-50"
                    onMouseEnter={handleMoreEnter}
                    onMouseLeave={handleMoreLeave}
                  >
                    <div className="w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        More Electronics
                      </div>
                      <div className="py-1 space-y-0.5 max-h-80 overflow-y-auto pr-1">
                        {moreCategories.map((cat) => {
                          const active = isCategoryActive(cat, location.pathname, location.search);
                          return (
                            <Link
                              key={cat.id}
                              to={getCategoryUrl(cat)}
                              onClick={() => setMoreOpen(false)}
                              className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs md:text-sm transition-all ${
                                active
                                  ? 'bg-cyan-50 text-cyan-700 font-bold border-l-4 border-cyan-600 pl-2'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-cyan-700'
                              }`}
                            >
                              <span className={`flex h-7 w-7 items-center justify-center rounded-md ${
                                active ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600 group-hover:bg-cyan-50 group-hover:text-cyan-600'
                              }`}>
                                <CategoryIcon iconKey={cat.iconKey} className="h-4 w-4" />
                              </span>
                              <span className="flex-1 truncate font-medium">{cat.name}</span>
                              <ChevronRightIcon className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* Mobile Navigation Drawer */}
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            {/* Slide-out Panel */}
            <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50">
                <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                  <img src="/voltcart-logo.png" alt="VoltCart" className="h-8 w-auto object-contain" />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                  aria-label="Close navigation menu"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Drawer Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {/* Mobile Search */}
                <form onSubmit={submit} className="flex overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-cyan-600">
                  <input
                    className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
                    placeholder="Search electronics..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button type="submit" className="bg-cyan-600 px-3.5 text-white">
                    <MagnifyingGlassIcon className="h-4 w-4" />
                  </button>
                </form>

                {/* Primary Nav Links */}
                <div className="space-y-0.5 border-b border-slate-100 pb-3">
                  <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Navigation</div>
                  <Link
                    to="/"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                      location.pathname === '/' ? 'bg-cyan-50 text-cyan-700 font-bold' : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <span>🏠 Home</span>
                  </Link>
                  <Link
                    to="/shop"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                      isShopAllActive ? 'bg-cyan-50 text-cyan-700 font-bold' : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Squares2X2Icon className="h-4 w-4 text-cyan-600" />
                    <span>All Categories</span>
                  </Link>
                  <Link
                    to="/deals"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                      isDealsActive ? 'bg-rose-50 text-rose-700 font-bold' : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <FireIcon className="h-4 w-4 text-rose-500" />
                    <span>Today's Deals</span>
                    <span className="ml-auto text-[10px] font-black uppercase tracking-wide bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">Hot</span>
                  </Link>
                </div>

                {/* 11 Electronics Categories */}
                <div className="space-y-0.5 border-b border-slate-100 pb-3">
                  <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Electronics Categories</div>
                  {ELECTRONICS_CATEGORIES.map((cat) => {
                    const active = isCategoryActive(cat, location.pathname, location.search);
                    return (
                      <Link
                        key={cat.id}
                        to={getCategoryUrl(cat)}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                          active
                            ? 'bg-cyan-50 text-cyan-700 font-bold border-l-4 border-cyan-600 pl-2'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-cyan-700'
                        }`}
                      >
                        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${
                          active ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <CategoryIcon iconKey={cat.iconKey} className="h-4 w-4" />
                        </span>
                        <span className="flex-1 truncate">{cat.name}</span>
                        <ChevronRightIcon className="h-4 w-4 text-slate-300" />
                      </Link>
                    );
                  })}
                </div>

                {/* My Account & Customer Support */}
                <div className="space-y-1 pb-4">
                  <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">My Account</div>
                  {state.user ? (
                    <>
                      <Link to="/account" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50">👤 My Account</Link>
                      <Link to="/orders" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50">📦 My Orders</Link>
                      <Link to="/wishlist" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50">❤️ Wishlist ({state.wishlist.length})</Link>
                      {state.user.role === 'admin' && (
                        <Link to="/admin/dashboard" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-semibold text-purple-700 hover:bg-purple-50">⚙️ Admin Dashboard</Link>
                      )}
                      <button type="button" onClick={() => { logout(); setOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">🚪 Logout</button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-50">🔐 Login</Link>
                      <Link to="/register" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-semibold text-cyan-700 hover:bg-cyan-50">📝 Register</Link>
                    </>
                  )}
                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 px-3">
                    <p className="font-semibold text-slate-700">Support Helpline</p>
                    <p className="mt-0.5">📞 +91 80 4567 8900</p>
                    <p className="text-[11px] text-slate-400 mt-1">support@voltcart.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white text-center text-[11px] font-bold text-slate-700 shadow-[0_-4px_18px_rgba(15,23,42,.08)] md:hidden">
        <Link className="py-2" to="/">Home</Link>
        <Link className="py-2" to="/shop">Categories</Link>
        <Link className="py-2" to="/wishlist">Wishlist</Link>
        <Link className="py-2" to="/cart">Cart</Link>
        <Link className="py-2" to={state.user ? '/account' : '/login'}>Account</Link>
      </nav>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
        <div>
          <h3 className="text-xl font-black">VoltCart</h3>
          <p className="mt-2 text-sm text-slate-300">Everything Tech, One Cart. Verified electronics, live shipping tracking, and dependable customer support.</p>
        </div>
        <FooterLinks title="Shop" links={['Smartphones', 'Laptops', 'Headphones', 'Gaming']} />
        <FooterLinks title="Fulfillment & Support" links={['Shippo Live Tracking', 'Tax Invoices', 'Secure Payments', 'Support Helpline']} />
        <div><h4 className="font-bold">Contact</h4><p className="mt-3 text-sm text-slate-300">support@voltcart.com<br />+91 80 4567 8900</p></div>
      </div>
    </footer>
  );
}

function FooterLinks({ title, links }) {
  return <div><h4 className="font-bold">{title}</h4><div className="mt-3 grid gap-2 text-sm text-slate-300">{links.map((l) => <Link key={l} to={`/shop?search=${l}`}>{l}</Link>)}</div></div>;
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product, state }) {
  const isOutOfStock = Number(product.stock) <= 0 || product.status === 'out_of_stock';
  return (
    <article className="product-card group relative flex flex-col justify-between">
      <div>
        <Link to={`/products/${product.slug}`} className="block aspect-[4/3] overflow-hidden bg-white p-3 relative">
          <img
            src={getProductImage(product, 0)}
            alt={product.name}
            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80'; }}
            className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
          />
          {isOutOfStock && (
            <span className="absolute top-2 left-2 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow">
              Out of Stock
            </span>
          )}
          {product.isFragile && !isOutOfStock && (
            <span className="absolute top-2 right-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
              Fragile
            </span>
          )}
        </Link>
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wide text-cyan-800">{product.brand}</span>
            <span className="rounded bg-amber-50 px-1.5 py-0.5 font-bold text-amber-700">★ {product.rating || 4.5}</span>
          </div>
          <Link to={`/products/${product.slug}`} className="line-clamp-2 min-h-11 font-bold hover:text-cyan-700 text-sm">
            {product.name}
          </Link>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span className={isOutOfStock ? 'font-black text-rose-600' : product.stock <= 5 ? 'font-bold text-amber-600' : 'text-emerald-700 font-semibold'}>
              {isOutOfStock ? 'Out of stock' : product.stock <= 5 ? `Only ${product.stock} left!` : `In stock (${product.stock})`}
            </span>
            <span className="text-[11px] text-slate-400">{product.category}</span>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-lg font-black text-slate-900">{formatCurrency(product.price)}</span>
            {product.originalPrice > product.price && (
              <span className="text-xs text-slate-400 line-through">{formatCurrency(product.originalPrice)}</span>
            )}
            {product.discount > 0 && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                {product.discount}% off
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 pt-0">
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <button
            className="btn-primary py-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isOutOfStock}
            onClick={() => state.addToCart(product)}
          >
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
          <button
            className="btn-secondary px-3 py-2 text-sm"
            title="Wishlist"
            aria-label="Wishlist"
            onClick={() => state.toggleWishlist(product.id)}
          >
            <HeartIcon className={`h-4 w-4 ${state.wishlist.includes(product.id) ? 'fill-cyan-600 text-cyan-600' : ''}`} />
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Home page components ─────────────────────────────────────────────────────

function Home({ state }) {
  const featured = state.store.products.filter((p) => p.featured && p.active).slice(0, 8);
  const deals = state.store.products.filter((p) => p.discount >= 12 && p.active).slice(0, 8);
  const bestSellers = [...state.store.products].filter((p) => p.active).sort((a, b) => b.sold - a.sold).slice(0, 8);
  const recentlyViewed = [...state.store.products].filter((p) => p.active).sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);
  return (
    <Shell state={state}>
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="grid overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-white md:min-h-[320px] md:grid-cols-[1fr_420px]">
            <div className="p-6 md:p-9">
              <p className="inline-flex rounded bg-cyan-400 px-2 py-1 text-xs font-black uppercase tracking-wide text-slate-950">New arrivals</p>
              <h1 className="mt-4 max-w-xl text-3xl font-black leading-tight md:text-5xl">Latest Tech. Better Prices.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 md:text-base">Shop smartphones, laptops, audio, gaming devices, and everyday accessories with real-time stock visibility and integrated Shippo tracking.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link className="btn-primary" to="/shop">Shop Now</Link>
                <Link className="btn-secondary border-white/30 bg-white text-slate-950 hover:bg-cyan-50" to="/deals">Explore Deals</Link>
              </div>
              <div className="mt-6 grid max-w-xl grid-cols-3 gap-3 text-xs text-slate-300">
                <span>Razorpay & COD</span><span>Shippo Dispatch</span><span>Tax Invoice Included</span>
              </div>
            </div>
            <div className="relative min-h-48 bg-slate-900">
              <img className="h-full w-full object-cover" src="https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1000&q=80" alt="Smartphones, laptop and headphones on a desk" />
            </div>
          </div>
        </div>
      </section>
      <CategoryStrip state={state} />
      <Deals state={state} compact products={deals} title="Today's Deals" />
      <section className="section pt-4">
        <SectionTitle title="Featured Products" subtitle="Curated electronics with strong ratings and active stock." action="/shop?featured=true" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{featured.map((p) => <ProductCard key={p.id} product={p} state={state} />)}</div>
      </section>
      <PromoBanners />
      <Brands state={state} />
      <section className="section pt-4">
        <SectionTitle title="Best Sellers" subtitle="Popular picks from VoltCart customers." action="/shop?sort=popular" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{bestSellers.map((p) => <ProductCard key={p.id} product={p} state={state} />)}</div>
      </section>
      <section className="section pt-4">
        <SectionTitle title="Recently Viewed" subtitle="Fresh arrivals and products worth another look." action="/shop?sort=newest" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{recentlyViewed.map((p) => <ProductCard key={p.id} product={p} state={state} />)}</div>
      </section>
      <WhyShop />
      <Newsletter />
    </Shell>
  );
}

function PromoBanners() {
  const banners = [
    ['Laptop Upgrade Sale', 'Up to 30% off performance notebooks', 'laptops'],
    ['Gaming Week', 'Level up your setup with consoles and gear', 'gaming'],
    ['Premium Audio Collection', 'Noise cancellation, earbuds, and studio sound', 'headphones'],
  ];
  return (
    <section className="section pt-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {banners.map(([title, copy, search]) => (
          <Link key={title} to={`/shop?search=${search}`} className="promo-tile">
            <span className="text-xs font-black uppercase tracking-wide text-cyan-700">Limited offers</span>
            <h2 className="mt-2 text-xl font-black">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{copy}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function WhyShop() {
  return (
    <section className="bg-white">
      <div className="section grid gap-4 md:grid-cols-5">
        {['Genuine Products', 'Razorpay Checkout', 'Shippo Tracking', 'Official Tax Invoices', 'Customer Support'].map((item) => <div className="rounded border border-slate-200 p-4 text-center text-sm font-bold" key={item}>{item}</div>)}
      </div>
    </section>
  );
}

function SectionTitle({ title, subtitle, action }) {
  return <div className="mb-5 flex items-end justify-between gap-4"><div><h2 className="text-2xl font-black">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>{action && <Link className="shrink-0 text-sm font-bold text-cyan-700" to={action}>View all</Link>}</div>;
}

function CategoryStrip({ state }) {
  return (
    <section className="section py-6 md:py-8">
      <SectionTitle title="Shop by Category" action="/shop" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {state.store.categories.filter((c) => c.active).map((cat) => (
          <Link to={`/shop?category=${cat.slug}`} key={cat.id} className="category-tile">
            <img src={cat.image} alt={cat.name} className="h-16 w-full object-cover" />
            <div className="px-2 py-3 text-center text-sm font-black">{cat.name}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Deals({ state, compact = false, products, title = 'Limited Time Offers' }) {
  const sale = products || state.store.products.filter((p) => p.discount >= 12).slice(0, compact ? 4 : 8);
  const [seconds, setSeconds] = useState(21600);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 21600)), 1000);
    return () => clearInterval(id);
  }, []);
  const clock = new Date(seconds * 1000).toISOString().slice(11, 19);
  return (
    <ShellMaybe state={state} enabled={!compact}>
      <section className="section pt-4">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded border border-rose-200 bg-rose-50 p-4">
          <div>
            <h2 className="text-2xl font-black">{title}</h2>
            <p className="text-sm text-slate-600">Fresh price drops end in <strong>{clock}</strong></p>
          </div>
          <Link className="rounded bg-rose-600 px-3 py-2 text-sm font-black text-white" to="/deals">View Deals</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{sale.map((p) => <ProductCard key={p.id} product={p} state={state} />)}</div>
      </section>
    </ShellMaybe>
  );
}

function ShellMaybe({ enabled, state, children }) {
  return enabled ? <Shell state={state}>{children}</Shell> : children;
}

function Brands({ state }) {
  return (
    <section className="section pt-4">
      <SectionTitle title="Shop by Brand" subtitle="Browse products from leading electronics brands." action="/shop" />
      <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {state.store.brands.filter((b) => b.active).map((brand) => <Link className="rounded border border-slate-200 bg-white p-4 text-center font-black shadow-sm hover:border-cyan-400" to={`/shop?brand=${brand.name}`} key={brand.id}><span className="block text-xl text-cyan-700">{brand.logo}</span>{brand.name}</Link>)}
      </div>
    </section>
  );
}

function Newsletter() {
  const [email, setEmail] = useState('');
  return (
    <section className="section">
      <div className="rounded bg-slate-950 p-6 text-white md:flex md:items-center md:justify-between">
        <div><h2 className="text-2xl font-black">Get launch drops and exclusive deals</h2><p className="text-slate-300">Price alerts, new arrivals, and member-only savings in your inbox.</p></div>
        <form className="mt-4 flex gap-2 md:mt-0" onSubmit={(e) => { e.preventDefault(); /\S+@\S+\.\S+/.test(email) ? toast.success('Subscribed to VoltCart updates') : toast.error('Enter a valid email'); }}>
          <input className="rounded-lg px-4 py-3 text-slate-950 outline-none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <button className="rounded-lg bg-cyan-500 px-5 py-3 font-bold text-slate-950">Subscribe</button>
        </form>
      </div>
    </section>
  );
}

// ─── Shop ─────────────────────────────────────────────────────────────────────

function Shop({ state }) {
  const [params, setParams] = useSearchParams();
  const [visible, setVisible] = useState(8);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filters = {
    search: params.get('search') || '',
    category: params.get('category') || '',
    brand: params.get('brand') || '',
    rating: params.get('rating') || '',
    availability: params.get('availability') || '',
    min: params.get('min') || '',
    max: params.get('max') || '',
    sort: params.get('sort') || 'newest',
    featured: params.get('featured') || '',
  };
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next);
    setVisible(8);
  };
  const filtered = useMemo(() => {
    let list = state.store.products.filter((p) => p.active);
    if (filters.search) list = list.filter((p) => `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(filters.search.toLowerCase()));
    if (filters.category) {
      const target = filters.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      list = list.filter((p) => p.category === filters.category || (p.category && p.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') === target));
    }
    if (filters.brand) list = list.filter((p) => p.brand === filters.brand);
    if (filters.rating) list = list.filter((p) => p.rating >= Number(filters.rating));
    if (filters.availability === 'in') list = list.filter((p) => p.stock > 0 && p.status !== 'out_of_stock');
    if (filters.availability === 'out') list = list.filter((p) => p.stock <= 0 || p.status === 'out_of_stock');
    if (filters.min) list = list.filter((p) => p.price >= Number(filters.min));
    if (filters.max) list = list.filter((p) => p.price <= Number(filters.max));
    if (filters.featured) list = list.filter((p) => p.featured);
    const sorters = {
      popular: (a, b) => b.sold - a.sold,
      newest: (a, b) => b.createdAt - a.createdAt,
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
      rated: (a, b) => b.rating - a.rating,
    };
    return [...list].sort(sorters[filters.sort] || sorters.newest);
  }, [state.store.products, params]);

  const filtersPanel = (
    <>
      <FilterSelect label="Electronics Category" value={filters.category} onChange={(v) => setFilter('category', v)} options={state.store.categories.filter((c) => c.active).map((c) => [c.name, c.name])} />
      <FilterSelect label="Brand" value={filters.brand} onChange={(v) => setFilter('brand', v)} options={state.store.brands.filter((b) => b.active).map((b) => [b.name, b.name])} />
      <FilterSelect label="Customer Rating" value={filters.rating} onChange={(v) => setFilter('rating', v)} options={[['4.5', '★ 4.5 and above'], ['4.0', '★ 4.0 and above'], ['3.5', '★ 3.5 and above']]} />
      <FilterSelect label="Stock Availability" value={filters.availability} onChange={(v) => setFilter('availability', v)} options={[['in', 'In Stock Only'], ['out', 'Out of Stock']]} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <input className="input-field text-xs" placeholder="Min (₹)" value={filters.min} onChange={(e) => setFilter('min', e.target.value)} />
        <input className="input-field text-xs" placeholder="Max (₹)" value={filters.max} onChange={(e) => setFilter('max', e.target.value)} />
      </div>
      <button className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-2 font-bold text-xs hover:bg-slate-50" onClick={() => setParams({})}>Clear Filters</button>
    </>
  );

  return (
    <Shell state={state}>
      <section className="section">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Shop Electronics</h1>
            <p className="text-slate-500 text-xs mt-1">Showing {filtered.length} genuine electronics products with certified warranty</p>
          </div>
          <button className="btn-secondary px-4 py-2 lg:hidden text-xs" onClick={() => setFiltersOpen(true)}>Filters</button>
        </div>
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="hidden h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:block">
            {filtersPanel}
          </aside>
          <main>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <input className="input-field max-w-md text-xs" placeholder="Search smartphones, laptops, audio..." value={filters.search} onChange={(e) => setFilter('search', e.target.value)} />
              <select className="input-field max-w-56 text-xs" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}>
                <option value="popular">Featured / Popularity</option>
                <option value="newest">Newest Electronics</option>
                <option value="low">Price: Low to High</option>
                <option value="high">Price: High to Low</option>
                <option value="rated">Highest Rated</option>
              </select>
            </div>
            {filtered.length === 0 ? (
              <Empty title="No electronics found" text="Try another search, brand, category, or price range." />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {filtered.slice(0, visible).map((p) => <ProductCard key={p.id} product={p} state={state} />)}
              </div>
            )}
            {visible < filtered.length && <button className="mx-auto mt-8 block btn-primary text-xs py-2.5 px-6" onClick={() => setVisible(visible + 8)}>Load More</button>}
          </main>
        </div>
        {filtersOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button className="absolute inset-0 bg-slate-950/50" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-[min(86vw,340px)] overflow-y-auto bg-white p-5 shadow-xl">
              <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black">Filters</h2><button className="rounded border px-3 py-1 text-sm font-bold" onClick={() => setFiltersOpen(false)}>Close</button></div>
              {filtersPanel}
            </aside>
          </div>
        )}
      </section>
    </Shell>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return <label className="mb-4 block text-sm font-bold">{label}<select className="input-field mt-2 text-xs" value={value} onChange={(e) => onChange(e.target.value)}><option value="">All</option>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>;
}

// ─── Product Detail ───────────────────────────────────────────────────────────

function ProductDetail({ state }) {
  const { slug } = useParams();
  const product = state.store.products.find((p) => p.slug === slug);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [variant, setVariant] = useState({});

  if (!product) return <Shell state={state}><Empty title="Electronics product not found" text="This item is no longer listed in our verified catalog." /></Shell>;

  const imagesList = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [{ url: product.primaryImage || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80', isPrimary: true }];

  const currentImageUrl = getProductImage(product, activeImageIndex);
  const isOutOfStock = Number(product.stock) <= 0 || product.status === 'out_of_stock';
  const related = state.store.products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  return (
    <Shell state={state}>
      <section className="section">
        <div className="grid gap-8 lg:grid-cols-[1fr_480px]">
          {/* Multi-Image Gallery */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-center min-h-[380px] relative">
              <img
                className="max-h-[440px] w-auto max-w-full object-contain"
                src={currentImageUrl}
                alt={product.name}
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80'; }}
              />
              {product.isFragile && (
                <span className="absolute top-4 right-4 rounded bg-amber-100 border border-amber-300 px-2 py-1 text-xs font-black text-amber-900">
                  ⚠ FRAGILE ELECTRONICS
                </span>
              )}
            </div>

            {/* Thumbnails row */}
            {imagesList.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {imagesList.map((img, i) => {
                  const url = typeof img === 'string' ? img : img.url;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveImageIndex(i)}
                      className={`h-20 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-white p-1 transition ${i === activeImageIndex ? 'border-cyan-500 shadow-md ring-2 ring-cyan-200' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <img
                        className="h-full w-full object-contain"
                        src={url}
                        alt=""
                        onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80'; }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Product Information */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-black uppercase tracking-wider text-cyan-700">{product.brand}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-600">SKU: {product.sku || 'VC-PROD'}</span>
            </div>

            <h1 className="mt-2 text-2xl font-black leading-tight text-slate-900 md:text-3xl">{product.name}</h1>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <span className="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-800">★ {product.rating || 4.5}</span>
              <span className="text-slate-500">Verified Reviews ({product.reviews || 12})</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600 font-semibold">{product.category}</span>
            </div>

            <div className="mt-5 flex items-end gap-3">
              <span className="text-3xl font-black text-slate-900">{formatCurrency(product.price)}</span>
              {product.originalPrice > product.price && (
                <span className="text-xl text-slate-400 line-through">{formatCurrency(product.originalPrice)}</span>
              )}
              {product.discount > 0 && (
                <span className="rounded bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800 text-sm">
                  {product.discount}% OFF
                </span>
              )}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-600">{product.description}</p>

            {/* Variants */}
            {product.variants && Object.entries(product.variants).filter(([, vals]) => vals && vals.length > 0).length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {Object.entries(product.variants).filter(([, vals]) => vals && vals.length > 0).map(([key, vals]) => (
                  <label key={key} className="text-xs font-bold capitalize text-slate-700">
                    {key}:
                    <select
                      className="input-field mt-1.5 text-xs font-normal"
                      value={variant[key] || ''}
                      onChange={(e) => setVariant({ ...variant, [key]: e.target.value })}
                    >
                      <option value="">Select {key}</option>
                      {vals.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            )}

            {/* Stock Availability Box */}
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className={`font-black text-sm ${isOutOfStock ? 'text-rose-600' : product.stock <= 5 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {isOutOfStock ? '● Currently Out of Stock' : product.stock <= 5 ? `● Only ${product.stock} units remaining!` : `● In Stock (${product.stock} units available)`}
                </span>
                <span className="text-slate-500 font-semibold">Weight: {product.weight || 0.5} kg</span>
              </div>
              <p className="mt-1 text-slate-600">Dispatches via Shippo courier with official A4 tax invoice and manufacturer warranty assurance.</p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {!isOutOfStock && (
                <div className="flex items-center rounded border border-slate-300 bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-sm">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    +
                  </button>
                </div>
              )}

              <button
                className="btn-primary py-2.5 px-6 text-sm font-bold flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isOutOfStock}
                onClick={() => state.addToCart(product, quantity, variant)}
              >
                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>

              <button
                className="btn-secondary py-2.5 px-4 text-sm"
                onClick={() => state.toggleWishlist(product.id)}
                title="Wishlist"
              >
                <HeartIcon className={`h-5 w-5 ${state.wishlist.includes(product.id) ? 'fill-cyan-600 text-cyan-600' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Specifications & Shipping Specs */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-3">Product Overview & Features</h2>
            <p className="text-sm leading-relaxed text-slate-600">{product.description}</p>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded bg-slate-50 p-3">
                <span className="text-slate-400 block font-semibold">Genuine Category</span>
                <strong className="text-slate-800">{product.category}</strong>
              </div>
              <div className="rounded bg-slate-50 p-3">
                <span className="text-slate-400 block font-semibold">Certified Brand</span>
                <strong className="text-slate-800">{product.brand}</strong>
              </div>
              <div className="rounded bg-slate-50 p-3">
                <span className="text-slate-400 block font-semibold">SKU Code</span>
                <strong className="text-slate-800">{product.sku}</strong>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-3">Technical & Shipping Specifications</h2>
            <dl className="grid gap-2 text-xs">
              {product.specs && Object.entries(product.specs).map(([k, v]) => (
                <div className="grid grid-cols-2 rounded bg-slate-50 p-2.5" key={k}>
                  <dt className="font-bold text-slate-600">{k}</dt>
                  <dd className="font-semibold text-slate-800">{v}</dd>
                </div>
              ))}
              <div className="grid grid-cols-2 rounded bg-cyan-50/60 p-2.5 border border-cyan-100">
                <dt className="font-bold text-cyan-900">Package Weight</dt>
                <dd className="font-semibold text-cyan-950">{product.weight || 0.5} {product.weightUnit || 'kg'}</dd>
              </div>
              <div className="grid grid-cols-2 rounded bg-cyan-50/60 p-2.5 border border-cyan-100">
                <dt className="font-bold text-cyan-900">Dimensions (L×W×H)</dt>
                <dd className="font-semibold text-cyan-950">{product.length || 20} × {product.width || 15} × {product.height || 10} {product.dimensionUnit || 'cm'}</dd>
              </div>
              <div className="grid grid-cols-2 rounded bg-cyan-50/60 p-2.5 border border-cyan-100">
                <dt className="font-bold text-cyan-900">Fragile Status</dt>
                <dd className="font-semibold text-cyan-950">{product.isFragile ? 'Yes (Special Handling)' : 'Standard Package'}</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-12">
            <SectionTitle title="Related Electronics" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => <ProductCard key={p.id} product={p} state={state} />)}
            </div>
          </div>
        )}
      </section>
    </Shell>
  );
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

function Cart({ state }) {
  return (
    <Shell state={state}>
      <section className="section">
        <h1 className="mb-6 text-3xl font-black">Shopping Cart</h1>
        {state.cartItems.length === 0 ? <Empty title="Your cart is empty" text="Browse VoltCart and add the electronics you need." action="/shop" /> : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-4">{state.cartItems.map(({ product, quantity, variant }) => <div className="rounded-lg border border-slate-200 bg-white p-4 sm:flex sm:items-center sm:gap-4" key={product.id}><img className="h-24 w-28 rounded-lg object-cover" src={product.images[0]} alt={product.name} /><div className="flex-1"><h2 className="font-black">{product.name}</h2><p className="text-sm text-slate-500">{Object.values(variant || {}).filter(Boolean).join(' / ') || 'Standard configuration'}</p><p className="mt-1 font-bold">{formatCurrency(product.price)}</p></div><input className="input-field mt-3 w-24 sm:mt-0" type="number" min="1" max={product.stock} value={quantity} onChange={(e) => state.updateCart(product.id, Number(e.target.value))} /><p className="mt-3 w-32 font-black sm:mt-0">{formatCurrency(product.price * quantity)}</p><button className="mt-3 text-sm font-bold text-red-600 sm:mt-0" onClick={() => state.updateCart(product.id, 0)}>Remove</button></div>)}</div>
            <OrderSummary state={state} checkout />
          </div>
        )}
      </section>
    </Shell>
  );
}

function OrderSummary({ state, checkout = false, couponDiscount = 0, shippingCost = null }) {
  const freeThresh = state.store.settings.freeShippingThreshold || 25000;
  const delivery = shippingCost !== null ? shippingCost : (state.subtotal >= freeThresh ? 0 : (state.store.settings.deliveryCharge || 199));
  const tax = Math.round((state.subtotal - couponDiscount) * (state.store.settings.taxRate / 100));
  const total = state.subtotal - couponDiscount + delivery + tax;
  return <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-36"><h2 className="text-xl font-black">Order Summary</h2><SummaryLine label="Subtotal" value={formatCurrency(state.subtotal)} /><SummaryLine label="Coupon Discount" value={`-${formatCurrency(couponDiscount)}`} /><SummaryLine label="Shipping & Delivery" value={delivery ? formatCurrency(delivery) : 'Free'} /><SummaryLine label="Estimated Tax (18%)" value={formatCurrency(tax)} /><div className="mt-4 flex justify-between border-t pt-4 text-lg font-black"><span>Total</span><span>{formatCurrency(total)}</span></div>{checkout && <Link className="mt-5 block w-full btn-primary text-center" to="/checkout">Proceed to Checkout</Link>}<div className="mt-4 grid gap-2 rounded bg-slate-50 p-3 text-xs font-bold text-slate-600"><span>Official Tax Invoice</span><span>Shippo Courier Dispatch</span><span>7-Day Replacement</span></div><Link className="mt-3 block text-center font-bold text-cyan-700" to="/shop">Continue Shopping</Link></aside>;
}

function SummaryLine({ label, value }) {
  return <div className="mt-3 flex justify-between text-sm text-slate-600"><span>{label}</span><span className="font-bold text-slate-900">{value}</span></div>;
}

// ─── Upgraded 4-Step Realistic Checkout ────────────────────────────────────────

function Checkout({ state }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Address State
  const userAddresses = (state.store.addresses || []).filter((a) => a.userId === state.user?.id);
  const defaultAddr = userAddresses.find((a) => a.isDefault) || userAddresses[0];

  const [form, setForm] = useState({
    name: defaultAddr?.fullName || state.user?.name || '',
    email: state.user?.email || '',
    phone: defaultAddr?.phone || state.user?.phone || '',
    address: defaultAddr?.addressLine || '',
    city: defaultAddr?.city || '',
    stateName: defaultAddr?.state || '',
    postal: defaultAddr?.postalCode || '',
    country: defaultAddr?.country || 'India',
  });

  // Shipping Method State (Shippo rates)
  const [availableRates, setAvailableRates] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('Razorpay'); // 'Razorpay' | 'Cash on Delivery'

  useEffect(() => {
    if (defaultAddr && !form.address) {
      setForm({
        name: defaultAddr.fullName || state.user?.name || '',
        email: state.user?.email || '',
        phone: defaultAddr.phone || state.user?.phone || '',
        address: defaultAddr.addressLine || '',
        city: defaultAddr.city || '',
        stateName: defaultAddr.state || '',
        postal: defaultAddr.postalCode || '',
        country: defaultAddr.country || 'India',
      });
    }
  }, [defaultAddr, state.user]);

  // Load available Shippo shipping rates
  useEffect(() => {
    const rates = getShippingRatesForCart(state.subtotal, form);
    setAvailableRates(rates);
    if (!selectedRate && rates.length > 0) {
      setSelectedRate(rates[0]);
    }
  }, [state.subtotal]);

  if (!state.user) return <Navigate to="/login" replace />;
  if (!state.cartItems.length) return <Navigate to="/cart" replace />;

  const applyCoupon = () => {
    const result = validateCoupon(couponCode, state.subtotal);
    if (!result.ok) return toast.error(result.message);
    setCoupon(result);
    toast.success('Coupon applied');
  };

  const handleAddressContinue = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.address.trim() || !form.city.trim() || !form.postal.trim()) {
      return toast.error('Please complete all required customer and shipping address details.');
    }
    setStep(2);
  };

  const handleShippingContinue = () => {
    if (!selectedRate) return toast.error('Please select a shipping delivery method.');
    setStep(3);
  };

  const finalizeOrderPlacement = (method, paymentId = null, razorpayOrderId = null) => {
    try {
      const order = placeOrder({
        user: state.user,
        items: state.cartItems.map(({ product, quantity, variant }) => ({
          productId: product.id,
          name: product.name,
          quantity,
          price: product.price,
          variant,
        })),
        address: `${form.address}, ${form.city}, ${form.stateName} - ${form.postal}, ${form.country}`,
        paymentMethod: method,
        coupon,
        shippingMethod: selectedRate,
        paymentId,
        razorpayOrderId,
      });

      // Clear cart
      state.setCart([]);
      toast.success(method === 'Cash on Delivery' ? 'COD Order Placed Successfully!' : 'Razorpay Payment Verified & Order Confirmed!');
      navigate(`/order-success/${order.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to finalize order.');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadRazorpaySDK = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    if (paymentMethod === 'Cash on Delivery') {
      finalizeOrderPlacement('Cash on Delivery', 'COD-PENDING');
      return;
    }

    // Direct official Razorpay SDK window
    const loaded = await loadRazorpaySDK();
    if (!loaded || !window.Razorpay) {
      toast.error('Could not load Razorpay SDK. Please check your internet connection.');
      setIsProcessing(false);
      return;
    }

    const rzpKey = process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_TYNhwXxihosiTL';
    const totalPayable = state.subtotal - (coupon?.discount || 0) + shippingCost + Math.round((state.subtotal - (coupon?.discount || 0)) * 0.18);
    const amountInPaise = Math.round(totalPayable * 100);

    try {
      const options = {
        key: rzpKey,
        amount: amountInPaise,
        currency: 'INR',
        name: 'VoltCart Electronics',
        description: 'Order Payment',
        image: 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png',
        handler: function (response) {
          finalizeOrderPlacement('Razorpay', response.razorpay_payment_id, response.razorpay_order_id || `order_${Date.now().toString().slice(-8)}`);
        },
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
        },
        notes: {
          shipping_address: `${form.address}, ${form.city}, ${form.stateName} - ${form.postal}`,
        },
        theme: { color: '#06b6d4' },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            toast('Payment checkout cancelled');
          },
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', function (response) {
        toast.error(response.error?.description || 'Payment failed. Please try again.');
        setIsProcessing(false);
      });
      rzpInstance.open();
    } catch (err) {
      console.error('Razorpay invocation error:', err);
      toast.error(err.message || 'Error opening Razorpay checkout window.');
      setIsProcessing(false);
    }
  };

  const shippingCost = selectedRate ? selectedRate.cost : (state.subtotal >= 25000 ? 0 : 199);

  return (
    <Shell state={state}>
      <section className="section">
        <h1 className="mb-3 text-3xl font-black">Checkout</h1>

        {/* Step Indicator */}
        <div className="mb-6 grid gap-2 text-sm font-bold sm:grid-cols-4">
          <div className={`rounded p-3 text-center transition ${step === 1 ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400 font-black' : step > 1 ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
            1. Delivery Address {step > 1 && '✓'}
          </div>
          <div className={`rounded p-3 text-center transition ${step === 2 ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400 font-black' : step > 2 ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
            2. Shipping Method {step > 2 && '✓'}
          </div>
          <div className={`rounded p-3 text-center transition ${step === 3 ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400 font-black' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
            3. Payment
          </div>
          <div className="rounded p-3 text-center bg-white text-slate-400 ring-1 ring-slate-200">
            4. Order Confirmation
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">

            {/* ── STEP 1: Address ────────────────────────────────────────── */}
            {step === 1 && (
              <div className="grid gap-5">
                {userAddresses.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">Choose From Saved Delivery Addresses</p>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {userAddresses.map((addr) => (
                        <button
                          type="button"
                          key={addr.id}
                          onClick={() => setForm({
                            name: addr.fullName,
                            email: state.user?.email || '',
                            phone: addr.phone,
                            address: addr.addressLine,
                            city: addr.city,
                            stateName: addr.state,
                            postal: addr.postalCode,
                            country: addr.country,
                          })}
                          className={`rounded-md border p-3.5 text-left text-xs transition ${form.address === addr.addressLine && form.postal === addr.postalCode ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200' : 'border-slate-200 hover:border-cyan-300'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black uppercase text-slate-800">{addr.label}</span>
                            {addr.isDefault && <span className="rounded bg-cyan-100 px-1.5 py-0.5 text-[10px] font-bold text-cyan-800">Default</span>}
                          </div>
                          <p className="mt-1 font-bold text-slate-900">{addr.fullName} · {addr.phone}</p>
                          <p className="mt-0.5 text-slate-600">{addr.addressLine}, {addr.city}, {addr.state} - {addr.postalCode}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleAddressContinue} className="grid gap-5">
                  <FormPanel title="Customer & Contact Details">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Input label="Full Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                      <Input label="Email Address *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                      <Input label="Phone Number *" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                    </div>
                  </FormPanel>

                  <FormPanel title="Shipping Destination Address">
                    <Input label="Address Line (House/Street/Area) *" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
                    <div className="grid gap-4 md:grid-cols-4">
                      <Input label="City *" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                      <Input label="State *" value={form.stateName} onChange={(v) => setForm({ ...form, stateName: v })} />
                      <Input label="Postal Code / PIN *" value={form.postal} onChange={(v) => setForm({ ...form, postal: v })} />
                      <Input label="Country *" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
                    </div>
                  </FormPanel>

                  <div className="flex justify-end">
                    <button type="submit" className="btn-primary py-3 px-8 text-base">
                      Continue to Shipping Method →
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── STEP 2: Shipping Method ─────────────────────────────────── */}
            {step === 2 && (
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between border-b pb-3">
                  <h2 className="text-xl font-black text-slate-900">Select Shipping Service (via Shippo Logistics)</h2>
                  <button onClick={() => setStep(1)} className="text-xs font-bold text-cyan-700 hover:underline">Edit Address</button>
                </div>

                <div className="mb-4 rounded bg-slate-50 p-3 text-xs text-slate-600">
                  <p className="font-bold text-slate-800">Delivering to:</p>
                  <p>{form.name}, {form.address}, {form.city}, {form.stateName} - {form.postal}</p>
                </div>

                <div className="grid gap-3">
                  {availableRates.map((rate) => (
                    <label
                      key={rate.id}
                      className={`flex cursor-pointer items-start justify-between rounded-lg border p-4 transition ${selectedRate?.id === rate.id ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="shipping_rate"
                          checked={selectedRate?.id === rate.id}
                          onChange={() => setSelectedRate(rate)}
                          className="mt-1 h-4 w-4 accent-cyan-500"
                        />
                        <div>
                          <p className="font-black text-slate-900">{rate.service}</p>
                          <p className="text-xs text-slate-500">Carrier: <strong className="text-slate-700">{rate.carrier}</strong></p>
                          <p className="mt-1 text-xs text-cyan-800 font-semibold">Estimated: {rate.estimatedDays}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-slate-900">
                          {rate.cost === 0 ? 'FREE' : formatCurrency(rate.cost)}
                        </span>
                        {rate.cost === 0 && <span className="block text-[10px] font-bold text-emerald-700">Orders above ₹25,000</span>}
                      </div>
                    </label>
                  ))}
                </div>

                <div className="mt-6 flex justify-between">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary py-2.5 px-6 text-sm">
                    ← Back to Address
                  </button>
                  <button type="button" onClick={handleShippingContinue} className="btn-primary py-2.5 px-8 text-sm">
                    Continue to Payment →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Payment ─────────────────────────────────────────── */}
            {step === 3 && (
              <form onSubmit={handlePaymentSubmit} className="grid gap-5">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between border-b pb-3">
                    <h2 className="text-xl font-black text-slate-900">Choose Payment Method</h2>
                    <button type="button" onClick={() => setStep(2)} className="text-xs font-bold text-cyan-700 hover:underline">Change Shipping</button>
                  </div>

                  <div className="grid gap-3">
                    {/* Razorpay Option */}
                    <label className={`flex cursor-pointer items-start gap-3.5 rounded-lg border p-4 transition ${paymentMethod === 'Razorpay' ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="Razorpay"
                        checked={paymentMethod === 'Razorpay'}
                        onChange={() => setPaymentMethod('Razorpay')}
                        className="mt-1 h-4 w-4 accent-cyan-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900">Razorpay — Online Payment</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">Pay securely using Credit Cards, Debit Cards, UPI (Google Pay, PhonePe, Paytm), and Net Banking.</p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                          <span>✓ 100% Secure Checkout</span>
                          <span>✓ Instant Confirmation</span>
                          <span>✓ Verified Signature</span>
                        </div>
                      </div>
                    </label>

                    {/* Cash on Delivery Option */}
                    <label className={`flex cursor-pointer items-start gap-3.5 rounded-lg border p-4 transition ${paymentMethod === 'Cash on Delivery' ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="Cash on Delivery"
                        checked={paymentMethod === 'Cash on Delivery'}
                        onChange={() => setPaymentMethod('Cash on Delivery')}
                        className="mt-1 h-4 w-4 accent-cyan-500"
                      />
                      <div className="flex-1">
                        <span className="font-black text-slate-900">Cash on Delivery (COD)</span>
                        <p className="mt-1 text-xs text-slate-600">Pay in cash or UPI when your parcel is delivered to your doorstep.</p>
                        <p className="mt-1 text-[11px] font-semibold text-amber-700">Payment status will remain Pending until package delivery is verified.</p>
                      </div>
                    </label>
                  </div>

                  <div className="mt-6 flex justify-between">
                    <button type="button" onClick={() => setStep(2)} className="btn-secondary py-2.5 px-6 text-sm">
                      ← Back to Shipping
                    </button>
                    <button type="submit" disabled={isProcessing} className="btn-primary py-3 px-8 text-base disabled:opacity-60">
                      {isProcessing ? 'Processing…' : paymentMethod === 'Cash on Delivery' ? 'Place COD Order' : 'Pay with Razorpay'}
                    </button>
                  </div>
                </div>
              </form>
            )}

          </div>

          {/* Right Column: Order Summary & Coupon */}
          <div>
            <div className="mb-4 rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="font-black text-slate-900">Coupon Code</h2>
              <div className="mt-3 flex gap-2">
                <input className="input-field uppercase" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="VOLT10" />
                <button type="button" className="btn-secondary" onClick={applyCoupon}>Apply</button>
              </div>
              {coupon && <p className="mt-2 text-xs font-bold text-emerald-600">Applied: {coupon.coupon?.code} ({formatCurrency(coupon.discount)} off)</p>}
            </div>

            <OrderSummary state={state} couponDiscount={coupon?.discount || 0} shippingCost={shippingCost} />
          </div>
        </div>

        {/* Razorpay Standard Checkout Simulation Modal */}


      </section>
    </Shell>
  );
}

// ─── Shared form components ───────────────────────────────────────────────────

function FormPanel({ title, children }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-black text-slate-900">{title}</h2><div className="grid gap-4">{children}</div></section>;
}

function Input({ label, value, onChange, type = 'text' }) {
  return <label className="block text-xs font-bold text-slate-700">{label}<input type={type} className="input-field mt-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value)} required /></label>;
}

function PasswordInput({ label = 'Password', value, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block text-sm font-bold">
      {label}
      <span className="relative mt-2 block">
        <input type={visible ? 'text' : 'password'} className="input-field pr-11" value={value} onChange={(e) => onChange(e.target.value)} required />
        <button type="button" aria-label={visible ? 'Hide password' : 'Show password'} title={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-950">
          {visible ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        </button>
      </span>
    </label>
  );
}

// ─── STEP 4: Order Confirmation ───────────────────────────────────────────────

function OrderSuccess({ state }) {
  const { id } = useParams();
  const order = state.store.orders.find((o) => String(o.id) === String(id));

  if (!order) {
    return (
      <Shell state={state}>
        <section className="section text-center py-12">
          <p className="font-bold text-slate-700">Order not found.</p>
          <Link to="/orders" className="btn-primary mt-4 inline-block">View All Orders</Link>
        </section>
      </Shell>
    );
  }

  return (
    <Shell state={state}>
      <section className="section max-w-4xl mx-auto py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="text-center pb-6 border-b border-slate-100">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircleIcon className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-900">Order Confirmed!</h1>
            <p className="mt-1 text-slate-600">Thank you for shopping with VoltCart. Your order has been placed.</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="font-black text-slate-800">Order ID: {order.orderNumber}</span>
              <span>·</span>
              <span className="font-semibold text-slate-600">Invoice: {order.invoiceNumber}</span>
              <span>·</span>
              <StatusBadge status={order.paymentStatus} />
              <StatusBadge status={order.status} />
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded border border-slate-100 bg-slate-50 p-4 text-xs">
              <h3 className="font-black text-slate-800 uppercase tracking-wide mb-2">Delivery Details</h3>
              <p className="font-bold text-slate-900">{order.customer}</p>
              <p className="text-slate-600 mt-1 whitespace-pre-line">{order.address}</p>
              <p className="text-slate-500 mt-2">Shipping Carrier: <strong className="text-slate-700">{order.shippingMethod?.carrier || 'Shippo Express'}</strong></p>
              <p className="text-slate-500">Service: <strong className="text-slate-700">{order.shippingMethod?.service || 'Standard Delivery'}</strong></p>
            </div>

            <div className="rounded border border-slate-100 bg-slate-50 p-4 text-xs">
              <h3 className="font-black text-slate-800 uppercase tracking-wide mb-2">Payment Summary</h3>
              <div className="flex justify-between py-1"><span>Payment Method:</span><span className="font-bold text-slate-900">{order.paymentMethod}</span></div>
              <div className="flex justify-between py-1"><span>Payment Status:</span><span className="font-bold text-emerald-700">{order.paymentStatus}</span></div>
              <div className="flex justify-between py-1"><span>Transaction ID:</span><span className="font-mono text-slate-600">{order.paymentId || 'N/A'}</span></div>
              <div className="flex justify-between py-1 border-t border-slate-200 mt-1 pt-1 font-black text-sm text-slate-900">
                <span>Total Amount:</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-black text-sm text-slate-900 mb-3">Ordered Products Snapshot</h3>
            <div className="border border-slate-200 rounded-md overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b font-bold text-slate-600">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Price</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-semibold text-slate-800">{item.name}</td>
                      <td className="p-2.5 text-slate-500 font-mono">{item.sku || 'VC-PROD'}</td>
                      <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                      <td className="p-2.5 text-right">{formatCurrency(item.price)}</td>
                      <td className="p-2.5 text-right font-black">{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link className="btn-primary py-2 px-5 text-sm" to={`/invoice/${order.id}`}>
              View / Download Tax Invoice
            </Link>
            <Link className="btn-secondary py-2 px-5 text-sm" to="/orders">
              View My Orders
            </Link>
            <Link className="btn-secondary py-2 px-5 text-sm" to="/shop">
              Continue Shopping
            </Link>
          </div>
        </div>
      </section>
    </Shell>
  );
}

// ─── DOCUMENT 1: INVOICE VIEWER (Customer & Admin) ─────────────────────────────

function InvoiceView({ state }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const order = state.store.orders.find((o) => String(o.id) === String(id));

  // Security check: Must belong to user or user is admin
  if (!state.user) return <Navigate to="/login" replace />;
  if (!order || (order.userId !== state.user.id && state.user.role !== 'admin')) {
    return (
      <Shell state={state}>
        <section className="section text-center py-12">
          <p className="font-bold text-red-600">Access denied or invoice not found.</p>
          <Link to="/orders" className="btn-primary mt-4 inline-block">Back to Orders</Link>
        </section>
      </Shell>
    );
  }

  const print = () => window.print();

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:p-0 print:bg-white text-slate-900">
      {/* Control bar */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <button onClick={() => navigate(-1)} className="text-sm font-bold text-slate-600 hover:text-slate-900">
          ← Back
        </button>
        <div className="flex gap-2">
          <button onClick={print} className="btn-primary py-1.5 px-4 text-xs inline-flex items-center gap-1.5">
            <PrinterIcon className="h-4 w-4" /> Print / Download PDF
          </button>
        </div>
      </div>

      {/* Invoice Sheet (A4 format) */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-lg p-8 shadow-sm print:border-0 print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between border-b border-slate-200 pb-6 gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">VoltCart</h1>
            <p className="text-xs font-bold text-cyan-700 tracking-wider">EVERYTHING TECH, ONE CART</p>
            <p className="text-xs text-slate-500 mt-1">VoltCart Technologies Pvt Ltd</p>
            <p className="text-xs text-slate-500">108 Tech Park Boulevard, Electronic City, Bengaluru 560100</p>
            <p className="text-xs text-slate-500">GSTIN: 29ABCDE1234F1Z5 | support@voltcart.com</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-slate-900">TAX INVOICE</h2>
            <div className="mt-2 text-xs">
              <p><span className="text-slate-500">Invoice No:</span> <strong className="font-mono text-slate-900">{order.invoiceNumber}</strong></p>
              <p><span className="text-slate-500">Invoice Date:</span> <strong>{new Date(order.invoiceGeneratedAt || order.createdAt).toLocaleDateString('en-IN')}</strong></p>
              <p><span className="text-slate-500">Order ID:</span> <strong className="font-mono text-slate-900">{order.orderNumber}</strong></p>
              <p><span className="text-slate-500">Order Date:</span> <strong>{new Date(order.createdAt).toLocaleDateString('en-IN')}</strong></p>
            </div>
          </div>
        </div>

        {/* Bill To & Ship To */}
        <div className="grid grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
          <div className="rounded border border-slate-100 bg-slate-50 p-4">
            <h3 className="font-black text-cyan-800 uppercase tracking-wide mb-1.5">BILL TO</h3>
            <p className="font-bold text-slate-900 text-sm">{order.customer}</p>
            <p className="text-slate-600 mt-0.5">{order.email}</p>
            <p className="text-slate-600">Phone: {order.phone || 'N/A'}</p>
            <p className="text-slate-600 mt-1 whitespace-pre-line">{order.address}</p>
          </div>
          <div className="rounded border border-slate-100 bg-slate-50 p-4">
            <h3 className="font-black text-cyan-800 uppercase tracking-wide mb-1.5">SHIP TO</h3>
            <p className="font-bold text-slate-900 text-sm">{order.customer}</p>
            <p className="text-slate-600 mt-0.5 whitespace-pre-line">{order.address}</p>
            <p className="text-slate-500 mt-2">Shipping Carrier: <strong>{order.shippingMethod?.carrier || 'BlueDart Express'}</strong></p>
            <p className="text-slate-500">Tracking No: <strong>{order.trackingNumber || 'Assigned upon dispatch'}</strong></p>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-6 border-b border-slate-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-900 text-white font-bold">
                <th className="p-2.5">Item & Specifications</th>
                <th className="p-2.5">SKU</th>
                <th className="p-2.5 text-center">Qty</th>
                <th className="p-2.5 text-right">Unit Price</th>
                <th className="p-2.5 text-right">GST (18%)</th>
                <th className="p-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-2.5">
                    <p className="font-bold text-slate-900">{item.name}</p>
                    {item.variant && Object.values(item.variant).filter(Boolean).length > 0 && (
                      <p className="text-[10px] text-slate-500">Variant: {Object.values(item.variant).filter(Boolean).join(' / ')}</p>
                    )}
                  </td>
                  <td className="p-2.5 font-mono text-slate-500">{item.sku || `VC-${idx + 1}`}</td>
                  <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                  <td className="p-2.5 text-right">{formatCurrency(item.price)}</td>
                  <td className="p-2.5 text-right text-slate-600">{formatCurrency((item.price * item.quantity) * 0.18)}</td>
                  <td className="p-2.5 text-right font-black">{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Payment */}
        <div className="grid grid-cols-2 gap-6 pt-6 text-xs">
          <div className="rounded border border-slate-100 bg-slate-50 p-4">
            <h3 className="font-black text-slate-800 uppercase tracking-wide mb-2">Payment Information</h3>
            <p><span className="text-slate-500">Method:</span> <strong className="text-slate-900">{order.paymentMethod}</strong></p>
            <p><span className="text-slate-500">Status:</span> <strong className="text-emerald-700 font-bold">{order.paymentStatus}</strong></p>
            <p><span className="text-slate-500">Payment Ref / ID:</span> <span className="font-mono text-slate-700">{order.paymentId || 'N/A'}</span></p>
          </div>
          <div className="space-y-2 text-right">
            <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span className="font-semibold">{formatCurrency(order.subtotal)}</span></div>
            {order.couponDiscount > 0 && <div className="flex justify-between text-emerald-700"><span>Coupon Discount:</span><span>-{formatCurrency(order.couponDiscount)}</span></div>}
            <div className="flex justify-between text-slate-600"><span>Shipping & Handling:</span><span className="font-semibold">{order.shippingCharge ? formatCurrency(order.shippingCharge) : 'FREE'}</span></div>
            <div className="flex justify-between text-slate-600"><span>Estimated GST:</span><span className="font-semibold">{formatCurrency(order.tax)}</span></div>
            <div className="flex justify-between border-t border-slate-300 pt-2 font-black text-base text-slate-900">
              <span>Grand Total:</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-slate-200 pt-4 text-center text-[10px] text-slate-500">
          <p className="font-bold text-slate-700">Thank you for choosing VoltCart.</p>
          <p className="mt-0.5">This is an authentic computer-generated tax invoice. For queries or warranty claims, contact support@voltcart.com.</p>
        </div>
      </div>
    </div>
  );
}

// ─── DOCUMENT 2: PACKING SLIP (Admin Only) ────────────────────────────────────

function AdminPackingSlip({ state }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const order = state.store.orders.find((o) => String(o.id) === String(id));

  // Admin Only Security Guard
  if (!state.user || state.user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (!order) return <div className="p-8 text-center font-bold">Order not found.</div>;

  const hasFragile = order.items?.some((i) => i.isFragile || ['smartphones', 'laptops', 'gaming', 'cameras'].includes(i.product?.category));
  const totalUnits = order.items?.reduce((s, i) => s + Number(i.quantity || 1), 0);
  const print = () => window.print();

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:p-0 print:bg-white text-slate-900">
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <button onClick={() => navigate(-1)} className="text-sm font-bold text-slate-600 hover:text-slate-900">
          ← Back to Order
        </button>
        <button onClick={print} className="btn-primary py-1.5 px-4 text-xs inline-flex items-center gap-1.5">
          <PrinterIcon className="h-4 w-4" /> Print Packing Slip
        </button>
      </div>

      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-lg p-8 shadow-sm print:border-0 print:shadow-none print:p-0">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-black tracking-tight">VoltCart</h1>
            <p className="text-xs font-bold text-slate-500">WAREHOUSE FULFILLMENT & PACKING SLIP</p>
          </div>
          <div className="rounded bg-slate-900 text-white px-3 py-1 text-xs font-bold uppercase">
            ADMIN / WAREHOUSE COPY ONLY
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 rounded border border-slate-200 bg-slate-50 p-4 text-xs">
          <div>
            <p><span className="text-slate-500 font-semibold">Order ID:</span> <strong className="font-mono text-slate-900">{order.orderNumber}</strong></p>
            <p className="mt-1"><span className="text-slate-500 font-semibold">Order Date:</span> <strong>{new Date(order.createdAt).toLocaleDateString('en-IN')}</strong></p>
            <p className="mt-1"><span className="text-slate-500 font-semibold">Customer:</span> <strong>{order.customer}</strong></p>
          </div>
          <div>
            <p><span className="text-slate-500 font-semibold">Shipping Carrier:</span> <strong>{order.shippingMethod?.carrier || 'BlueDart Express'}</strong></p>
            <p className="mt-1"><span className="text-slate-500 font-semibold">Service Level:</span> <strong>{order.shippingMethod?.service || 'Standard Delivery'}</strong></p>
            <p className="mt-1"><span className="text-slate-500 font-semibold">Destination:</span> <strong>{order.address}</strong></p>
          </div>
        </div>

        {hasFragile && (
          <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-red-800 text-xs font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>WARNING: FRAGILE — HANDLE WITH CARE. Package contains sensitive electronics (antistatic & bubblewrap required).</span>
          </div>
        )}

        <div className="mt-6">
          <h3 className="font-black text-xs uppercase tracking-wide text-slate-700 mb-2">Item Verification Checklist</h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 font-bold border-b">
              <tr>
                <th className="p-2 text-center w-12">Packed</th>
                <th className="p-2">Product Name</th>
                <th className="p-2">SKU</th>
                <th className="p-2">Variant</th>
                <th className="p-2 text-center w-16">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="p-2 text-center">
                    <input type="checkbox" className="h-4 w-4 rounded accent-cyan-600" />
                  </td>
                  <td className="p-2 font-bold text-slate-900">{item.name}</td>
                  <td className="p-2 font-mono text-slate-500">{item.sku || 'VC-SKU'}</td>
                  <td className="p-2 text-slate-600">{item.variant ? Object.values(item.variant).filter(Boolean).join(' / ') : 'Standard'}</td>
                  <td className="p-2 text-center font-black text-sm">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between text-xs font-bold rounded bg-slate-50 p-3 border border-slate-200">
          <span>Total Distinct Items: {order.items.length}</span>
          <span>Total Package Quantity: {totalUnits} Units</span>
          <span>Estimated Weight: {order.shipment?.packageWeight || 1.2} kg</span>
        </div>

        <div className="mt-8 border border-slate-300 rounded p-4 text-xs">
          <p className="font-black text-slate-800 uppercase tracking-wide mb-3">Warehouse Sign-Off & Seal</p>
          <div className="grid grid-cols-3 gap-6 pt-2">
            <div className="border-t border-slate-400 pt-1 text-slate-600">Packed By (Signature)</div>
            <div className="border-t border-slate-400 pt-1 text-slate-600">Verified By (Quality Check)</div>
            <div className="border-t border-slate-400 pt-1 text-slate-600">Carton Seal No. & Date</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DOCUMENT 3: SHIPPING LABEL (Admin Only) ──────────────────────────────────

function AdminShippingLabel({ state }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const order = state.store.orders.find((o) => String(o.id) === String(id));

  // Admin Only Security Guard
  if (!state.user || state.user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (!order) return <div className="p-8 text-center font-bold">Order not found.</div>;

  const origin = state.store.settings.shippingOrigin || {
    warehouseName: 'VoltCart Central Fulfillment',
    contactName: 'Warehouse Dispatch Lead',
    phone: '+91 80 4567 8900',
    address: '108 Tech Park Boulevard, Electronic City, Phase 1',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560100',
    country: 'India',
  };

  const trackingNum = order.trackingNumber || `VC${String(order.id).slice(-8)}IN`;
  const print = () => window.print();

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:p-0 print:bg-white text-slate-900">
      <div className="max-w-[400px] mx-auto mb-4 flex items-center justify-between print:hidden">
        <button onClick={() => navigate(-1)} className="text-sm font-bold text-slate-600 hover:text-slate-900">
          ← Back
        </button>
        <button onClick={print} className="btn-primary py-1.5 px-4 text-xs inline-flex items-center gap-1.5">
          <PrinterIcon className="h-4 w-4" /> Print Thermal 4x6 Label
        </button>
      </div>

      {/* 4x6 inch thermal layout */}
      <div className="max-w-[384px] mx-auto bg-white border-2 border-slate-900 rounded p-5 shadow-sm print:border-0 print:shadow-none print:p-0">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
          <div>
            <h1 className="text-lg font-black tracking-tight">VoltCart</h1>
            <p className="text-[10px] font-bold text-slate-600">EXPRESS DISPATCH</p>
          </div>
          <div className="text-right">
            <span className="font-black text-sm">{order.shippingMethod?.carrier || 'BLUEDART AIR'}</span>
            <p className="text-[9px] font-bold text-slate-500">{order.shippingMethod?.service || 'PRIORITY'}</p>
          </div>
        </div>

        {/* FROM Section */}
        <div className="mt-2 text-[10px] border-b border-slate-300 pb-2">
          <p className="font-bold uppercase text-slate-400">FROM (ORIGIN):</p>
          <p className="font-bold text-slate-900">{origin.warehouseName}</p>
          <p className="text-slate-600">{origin.address}, {origin.city}, {origin.state} - {origin.postalCode}</p>
          <p className="text-slate-500">Phone: {origin.phone}</p>
        </div>

        {/* SHIP TO Section */}
        <div className="mt-3 rounded border border-slate-900 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase text-slate-500">SHIP TO (DESTINATION):</p>
          <p className="text-sm font-black text-slate-900 mt-1">{order.customer}</p>
          <p className="text-xs text-slate-700 mt-0.5 whitespace-pre-line">{order.address}</p>
          <p className="text-xs text-slate-600 mt-1">Contact: {order.phone || 'N/A'}</p>

          <div className="mt-2 text-center rounded bg-slate-900 text-white p-1.5 font-black text-base tracking-widest">
            PIN: {order.address.match(/\d{6}/)?.[0] || '560001'}
          </div>
        </div>

        {/* Simulated Barcode */}
        <div className="mt-3 border border-slate-900 p-2 text-center">
          <p className="text-[9px] font-bold text-slate-400">TRACKING AWB NUMBER</p>
          <p className="font-mono font-black text-sm tracking-wider">{trackingNum}</p>
          <div className="my-1.5 flex justify-center items-center h-10 gap-0.5 overflow-hidden">
            {[...Array(40)].map((_, i) => (
              <div
                key={i}
                className="bg-slate-950 h-full"
                style={{ width: i % 4 === 0 ? '3px' : i % 3 === 0 ? '2px' : '1px' }}
              />
            ))}
          </div>
        </div>

        {/* Specs & Fragile Warning */}
        <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-700 border-t border-slate-300 pt-2">
          <span>Weight: {order.shipment?.packageWeight || 1.2} kg</span>
          <span>Units: {order.items.reduce((s, i) => s + i.quantity, 0)}</span>
          <span>Order: {order.orderNumber}</span>
        </div>

        <div className="mt-2 text-center border-t-2 border-slate-900 pt-1 text-[10px] font-black text-red-700">
          FRAGILE ELECTRONICS — HANDLE WITH CARE
        </div>
      </div>
    </div>
  );
}

// ─── Shared Utilities ─────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    Pending: 'bg-amber-100 text-amber-800',
    Confirmed: 'bg-blue-100 text-blue-800',
    Processing: 'bg-indigo-100 text-indigo-800',
    'Ready for Shipment': 'bg-purple-100 text-purple-800',
    Shipped: 'bg-cyan-100 text-cyan-800',
    'In Transit': 'bg-sky-100 text-sky-800',
    'Out for Delivery': 'bg-teal-100 text-teal-800',
    Delivered: 'bg-emerald-100 text-emerald-800',
    Cancelled: 'bg-red-100 text-red-800',
    Returned: 'bg-slate-100 text-slate-600',
    Paid: 'bg-emerald-100 text-emerald-800 font-black',
    Failed: 'bg-red-100 text-red-800',
    Refunded: 'bg-rose-100 text-rose-800',
    'Not Created': 'bg-slate-100 text-slate-600',
    'Shipment Created': 'bg-blue-100 text-blue-800',
    'Label Generated': 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${checked ? 'bg-cyan-500' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

// ─── Account: Layout ──────────────────────────────────────────────────────────

function AccountLayout({ state, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!state.user) return <Navigate to="/login" replace />;

  const logout = () => {
    setSession(null);
    state.setUser(null);
    setMobileOpen(false);
    navigate('/');
    toast.success('Signed out successfully.');
  };

  const navItems = [
    { label: 'Overview', path: '/account' },
    { label: 'My Orders', path: '/orders' },
    { label: 'Wishlist', path: '/wishlist' },
    { label: 'Addresses', path: '/account/addresses' },
    { label: 'Notifications', path: '/account/notifications' },
    { label: 'Settings', path: '/account/settings' },
  ];

  const isActive = (path) => {
    if (path === '/account') return location.pathname === '/account';
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <>
      <nav className="p-2">
        {navItems.map(({ label, path }) => (
          <Link
            key={label}
            to={path}
            onClick={() => setMobileOpen(false)}
            className={`acct-nav-link ${isActive(path) ? 'active' : ''}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-2">
        <button
          onClick={logout}
          className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          Logout
        </button>
      </div>
    </>
  );

  return (
    <AccountLayoutWrapper state={state}>
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8 pb-24 md:pb-10">
        <div className="mb-4 flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-2.5 shadow-sm lg:hidden">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">My Account</p>
            <p className="text-sm font-black text-slate-900">{state.user.name}</p>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-cyan-400"
          >
            Menu
          </button>
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              className="absolute inset-0 bg-slate-950/40"
              aria-label="Close account menu"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">My Account</p>
                  <p className="mt-0.5 font-black text-slate-900">{state.user.name}</p>
                  <p className="text-xs text-slate-500">{state.user.email || state.user.phone}</p>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-bold"
                >
                  Close
                </button>
              </div>
              <SidebarContent />
            </aside>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="hidden h-fit rounded-md border border-slate-200 bg-white shadow-sm lg:block">
            <div className="border-b border-slate-100 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">My Account</p>
              <p className="mt-0.5 font-black text-slate-900">{state.user.name}</p>
              <p className="text-xs text-slate-500">{state.user.email || state.user.phone}</p>
            </div>
            <SidebarContent />
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </AccountLayoutWrapper>
  );
}

function AccountLayoutWrapper({ state, children }) {
  return <Shell state={state}>{children}</Shell>;
}

// ─── Account: Overview ────────────────────────────────────────────────────────

function Account({ state }) {
  if (!state.user) return <Navigate to="/login" replace />;

  const userOrders = state.store.orders.filter((o) => o.userId === state.user.id);
  const recentOrders = userOrders.slice(0, 3);
  const wishlistItems = state.store.products.filter((p) => state.wishlist.includes(p.id)).slice(0, 4);
  const userAddresses = (state.store.addresses || []).filter((a) => a.userId === state.user.id);
  const defaultAddr = userAddresses.find((a) => a.isDefault) || userAddresses[0];
  const rawPrefs = (state.store.notificationPrefs || {})[state.user.id];
  const notifPrefs = rawPrefs || { orderUpdates: true, deliveryUpdates: true, priceDropAlerts: false, backInStockAlerts: false, promotionalOffers: false };
  const activeNotifsCount = Object.values(notifPrefs).filter(Boolean).length;

  const memberSince = (() => {
    const ts = Number(state.user.id);
    if (ts > 1000000000000) return new Date(ts).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    return 'August 2026';
  })();

  const notifItems = [
    { key: 'orderUpdates', label: 'Order Updates' },
    { key: 'deliveryUpdates', label: 'Delivery Updates' },
    { key: 'priceDropAlerts', label: 'Price Drop Alerts' },
    { key: 'promotionalOffers', label: 'Promotional Offers' },
  ];

  return (
    <AccountLayout state={state}>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900">My Account</h1>
          <p className="mt-1 text-slate-500">
            Welcome back, <strong className="text-slate-800">{state.user.name}</strong>
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Profile */}
          <div className="acct-card">
            <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Profile</h2>
            <p className="text-base font-black text-slate-900">{state.user.name}</p>
            <div className="mt-3 grid gap-2.5 text-sm">
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="font-semibold text-slate-800">{state.user.email || <span className="italic text-slate-400">Not set</span>}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Phone</p>
                <p className="font-semibold text-slate-800">{state.user.phone || <span className="italic text-slate-400">Not set</span>}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Member Since</p>
                <p className="font-semibold text-slate-800">{memberSince}</p>
              </div>
            </div>
            <div className="mt-4">
              <Link to="/account/profile" className="btn-secondary py-2 text-sm">Edit Profile</Link>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="acct-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wide text-slate-400">My Orders</h2>
              <span className="text-xs font-bold text-slate-500">Total Orders: {userOrders.length}</span>
            </div>
            {recentOrders.length > 0 ? (
              <div className="grid gap-2">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-3 py-2 transition hover:border-cyan-300"
                  >
                    <div>
                      <p className="text-xs font-black text-slate-800">{order.orderNumber}</p>
                      <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={order.status} />
                      <span className="text-xs font-black text-slate-700">{formatCurrency(order.total)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-2">
                <p className="text-sm font-semibold text-slate-700">No orders yet</p>
                <p className="mt-1 text-xs text-slate-500">Explore our catalog and place your first order.</p>
              </div>
            )}
            <div className="mt-4">
              {userOrders.length > 0 ? (
                <Link to="/orders" className="btn-secondary py-2 text-sm">View All Orders</Link>
              ) : (
                <Link to="/shop" className="btn-primary py-2 text-sm">Start Shopping</Link>
              )}
            </div>
          </div>

          {/* Wishlist */}
          <div className="acct-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wide text-slate-400">Wishlist</h2>
              <span className="text-xs font-bold text-slate-500">{state.wishlist.length} Saved Products</span>
            </div>
            {wishlistItems.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {wishlistItems.map((p) => (
                  <Link key={p.id} to={`/products/${p.slug}`} className="group overflow-hidden rounded border border-slate-200 bg-slate-50 hover:border-cyan-300">
                    <div className="aspect-square overflow-hidden p-1">
                      <img src={p.images[0]} alt={p.name} className="h-full w-full object-contain" />
                    </div>
                    <p className="truncate px-1 pb-1 text-[10px] font-bold text-slate-600 group-hover:text-cyan-700">{p.name}</p>
                    <p className="px-1 pb-1 text-[10px] font-black text-slate-900">{formatCurrency(p.price)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-2">
                <p className="text-sm font-semibold text-slate-700">No saved products yet</p>
                <p className="mt-1 text-xs text-slate-500">Save products you like and find them easily later.</p>
              </div>
            )}
            <div className="mt-4">
              {state.wishlist.length > 0 ? (
                <Link to="/wishlist" className="btn-secondary py-2 text-sm">View Wishlist</Link>
              ) : (
                <Link to="/shop" className="btn-primary py-2 text-sm">Explore Products</Link>
              )}
            </div>
          </div>

          {/* Default Address */}
          <div className="acct-card">
            <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Default Address</h2>
            {defaultAddr ? (
              <div className="text-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">
                    {defaultAddr.label} — DEFAULT
                  </span>
                </div>
                <p className="font-bold text-slate-900">{defaultAddr.fullName}</p>
                <p className="text-slate-500">{defaultAddr.phone}</p>
                <p className="mt-1 text-slate-600">{defaultAddr.addressLine}</p>
                <p className="text-slate-600">{defaultAddr.city}, {defaultAddr.state} - {defaultAddr.postalCode}</p>
                <p className="text-slate-600">{defaultAddr.country}</p>
              </div>
            ) : (
              <div className="py-2">
                <p className="text-sm font-semibold text-slate-700">No addresses saved yet</p>
                <p className="mt-1 text-xs text-slate-500">Add an address to make checkout faster.</p>
              </div>
            )}
            <div className="mt-4">
              <Link to="/account/addresses" className="btn-secondary py-2 text-sm">Manage Addresses</Link>
            </div>
          </div>

          {/* Notifications */}
          <div className="acct-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wide text-slate-400">Notifications</h2>
              <span className="text-xs font-bold text-slate-500">{activeNotifsCount} active</span>
            </div>
            <div className="grid gap-2">
              {notifItems.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2.5 text-sm">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${notifPrefs[key] ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className={notifPrefs[key] ? 'font-semibold text-slate-800' : 'text-slate-400'}>{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link to="/account/notifications" className="btn-secondary py-2 text-sm">Manage Notifications</Link>
            </div>
          </div>

          {/* Settings */}
          <div className="acct-card">
            <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Settings</h2>
            <div className="grid gap-2">
              {[
                ['Security', 'Change your password'],
                ['Appearance', `${getThemePreference().charAt(0).toUpperCase() + getThemePreference().slice(1)} theme`],
                ['Communication', 'Email & notification preferences'],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <span className="text-sm font-semibold text-slate-700">{title}</span>
                  <span className="text-xs text-slate-400">{desc}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link to="/account/settings" className="btn-secondary py-2 text-sm">Manage Settings</Link>
            </div>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}

// ─── Account: Edit Profile ────────────────────────────────────────────────────

function AccountProfile({ state }) {
  const [form, setForm] = useState({
    name: state.user?.name || '',
    email: state.user?.email || '',
    phone: state.user?.phone || '',
  });
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Full name is required.');
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) return toast.error('Enter a valid email address.');
    if (!form.email && !form.phone) return toast.error('Email or phone number is required.');
    setSaving(true);
    try {
      updateUserProfile(state.user.id, form);
      state.setUser({ ...state.user, name: form.name, email: form.email, phone: form.phone });
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountLayout state={state}>
      <div>
        <div className="mb-5 flex items-center gap-2 text-sm">
          <Link to="/account" className="font-semibold text-cyan-700 hover:underline">My Account</Link>
          <span className="text-slate-400">/</span>
          <span className="font-semibold text-slate-600">Edit Profile</span>
        </div>
        <div className="acct-card">
          <h1 className="mb-5 text-xl font-black text-slate-900">Edit Profile</h1>
          <form onSubmit={submit} className="grid max-w-md gap-4">
            <label className="block text-sm font-bold">
              Full Name *
              <input
                className="input-field mt-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name"
                required
              />
            </label>
            <label className="block text-sm font-bold">
              Email Address
              <input
                type="email"
                className="input-field mt-2"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </label>
            <label className="block text-sm font-bold">
              Phone Number
              <input
                type="tel"
                className="input-field mt-2"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 XXXXX XXXXX"
              />
            </label>
            <p className="text-xs text-slate-400">* At least one of email or phone is required.</p>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary py-2 text-sm disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <Link to="/account" className="btn-secondary py-2 text-sm">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </AccountLayout>
  );
}

// ─── Account: Orders List ─────────────────────────────────────────────────────

function AccountOrders({ state }) {
  const [filter, setFilter] = useState('all');

  const allOrders = state.store.orders.filter((o) => o.userId === state.user?.id);
  const filtered =
    filter === 'active' ? allOrders.filter((o) => !['Delivered', 'Cancelled', 'Returned'].includes(o.status))
    : filter === 'completed' ? allOrders.filter((o) => o.status === 'Delivered')
    : filter === 'cancelled' ? allOrders.filter((o) => ['Cancelled', 'Returned'].includes(o.status))
    : allOrders;

  const filterTabs = [
    { value: 'all', label: `All (${allOrders.length})` },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <AccountLayout state={state}>
      <div>
        <h1 className="mb-5 text-2xl font-black text-slate-900">My Orders</h1>

        <div className="mb-4 flex flex-wrap gap-2">
          {filterTabs.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-bold transition ${
                filter === value
                  ? 'bg-cyan-500 text-slate-950'
                  : 'border border-slate-300 bg-white text-slate-700 hover:border-cyan-400 hover:text-cyan-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-black text-slate-800">No orders yet</p>
            <p className="mt-2 text-sm text-slate-500">
              {filter === 'all'
                ? "You haven't placed any orders yet."
                : `No ${filter} orders found.`}
            </p>
            {filter === 'all' && <Link to="/shop" className="mt-5 inline-block btn-primary">Start Shopping</Link>}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((order) => (
              <div key={order.id} className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900">{order.orderNumber}</p>
                      {order.invoiceNumber && <span className="font-mono text-[11px] text-slate-500">({order.invoiceNumber})</span>}
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}{order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.paymentStatus} />
                    <StatusBadge status={order.status} />
                    <span className="font-black text-slate-900">{formatCurrency(order.total)}</span>
                    <Link
                      to={`/orders/${order.id}`}
                      className="rounded border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between text-xs text-slate-500">
                  <p className="truncate max-w-md">
                    {order.items.slice(0, 2).map((i) => i.name).join(', ')}
                    {order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}
                  </p>
                  <Link to={`/invoice/${order.id}`} className="text-cyan-700 font-bold hover:underline">
                    Tax Invoice
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}

// ─── Account: Order Detail & 7-Step Tracking ─────────────────────────────────

function AccountOrderDetail({ state }) {
  const { id } = useParams();
  const order = state.store.orders.find((o) => String(o.id) === String(id));

  if (!order || (state.user && order.userId !== state.user.id && state.user.role !== 'admin')) {
    return (
      <AccountLayout state={state}>
        <div className="rounded-md border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-black text-slate-800">Order not found</p>
          <p className="mt-2 text-sm text-slate-500">The requested order does not exist or was placed by another customer.</p>
          <Link to="/orders" className="mt-5 inline-block btn-primary">View All Orders</Link>
        </div>
      </AccountLayout>
    );
  }

  // 7-step tracking progression
  const trackingSteps = [
    'Order Confirmed',
    'Processing',
    'Ready for Shipment',
    'Shipped',
    'In Transit',
    'Out for Delivery',
    'Delivered',
  ];

  // Determine active step index
  const getStepIndex = () => {
    if (order.status === 'Cancelled' || order.status === 'Returned') return -1;
    if (order.status === 'Delivered' || order.shipmentStatus === 'Delivered') return 6;
    if (order.shipmentStatus === 'Out for Delivery') return 5;
    if (order.shipmentStatus === 'In Transit' || order.shipmentStatus === 'Picked Up') return 4;
    if (order.status === 'Shipped') return 3;
    if (order.status === 'Ready for Shipment' || order.shipmentStatus === 'Label Generated') return 2;
    if (order.status === 'Processing' || order.shipmentStatus === 'Shipment Created') return 1;
    return 0; // Confirmed
  };

  const currentStepIdx = getStepIndex();
  const isCancelledOrReturned = order.status === 'Cancelled' || order.status === 'Returned';

  const handleCancel = () => {
    if (!window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) return;
    const store = getStore();
    store.orders = store.orders.map((o) => (o.id === order.id ? { ...o, status: 'Cancelled', paymentStatus: o.paymentStatus === 'Paid' ? 'Refunded' : 'Failed' } : o));
    saveStore(store);
    toast.success('Order cancelled.');
  };

  return (
    <AccountLayout state={state}>
      <div>
        {/* Breadcrumb */}
        <div className="mb-5 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Link to="/orders" className="font-semibold text-cyan-700 hover:underline">My Orders</Link>
            <span className="text-slate-400">/</span>
            <span className="font-semibold text-slate-600">{order.orderNumber}</span>
          </div>
          <Link to={`/invoice/${order.id}`} className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1.5">
            <DocumentTextIcon className="h-4 w-4 text-cyan-700" /> View Tax Invoice
          </Link>
        </div>

        {/* Header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900">{order.orderNumber}</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Invoice: <strong className="font-mono text-slate-700">{order.invoiceNumber}</strong> · Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={order.paymentStatus} />
            <StatusBadge status={order.status} />
            {['Pending', 'Confirmed'].includes(order.status) && (
              <button
                onClick={handleCancel}
                className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* 7-Step Visual Timeline */}
        {!isCancelledOrReturned && (
          <div className="acct-card mb-5">
            <h2 className="mb-5 text-xs font-black uppercase tracking-wide text-slate-400">Order & Shipment Timeline</h2>
            <div className="relative">
              <div className="absolute left-[7%] right-[7%] top-4 h-0.5 bg-slate-200" />
              <div
                className="absolute left-[7%] top-4 h-0.5 bg-cyan-500 transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(86, (currentStepIdx / (trackingSteps.length - 1)) * 86))}%` }}
              />
              <div className="relative grid grid-cols-7 gap-1">
                {trackingSteps.map((s, i) => {
                  const done = i <= currentStepIdx;
                  return (
                    <div key={s} className="flex flex-col items-center gap-1.5">
                      <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-black transition ${done ? 'border-cyan-500 bg-cyan-500 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-400'}`}>
                        {i < currentStepIdx ? '✓' : i + 1}
                      </div>
                      <p className={`text-center text-[10px] font-bold leading-tight ${done ? 'text-cyan-800 font-black' : 'text-slate-400'}`}>{s}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {isCancelledOrReturned && (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            This order has been {order.status.toLowerCase()}.
          </div>
        )}

        {/* Shippo Live Tracking Card */}
        <div className="mb-5 rounded-md border border-cyan-200 bg-cyan-50/50 p-4 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-black uppercase tracking-wide text-cyan-900 flex items-center gap-1.5">
              <TruckIcon className="h-4 w-4 text-cyan-600" /> Shippo Carrier Tracking
            </span>
            <span className="font-semibold text-slate-600">
              Status: <strong className="text-cyan-800">{order.shipmentStatus || 'Not Created'}</strong>
            </span>
          </div>

          {order.trackingNumber ? (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded border border-cyan-100">
              <div>
                <p className="text-slate-500">Carrier: <strong className="text-slate-800">{order.shippingMethod?.carrier || 'BlueDart Express (via Shippo)'}</strong></p>
                <p className="text-slate-500 mt-0.5">Tracking Number (AWB): <strong className="font-mono text-slate-900">{order.trackingNumber}</strong></p>
                <p className="text-slate-500 mt-0.5">Service: {order.shippingMethod?.service || 'Standard Air'}</p>
              </div>
              <a
                href={order.shipment?.trackingUrl || `https://track.voltcart.com/?awb=${order.trackingNumber}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary py-1.5 px-4 text-xs"
              >
                Track Shipment ↗
              </a>
            </div>
          ) : (
            <p className="text-slate-600">Your order is being prepared for shipment. Once dispatched through our Shippo warehouse integration, your live tracking number will appear here.</p>
          )}
        </div>

        {/* Content grid */}
        <div className="grid gap-5 lg:grid-cols-[1fr_290px]">
          <div className="grid gap-5">
            {/* Items */}
            <div className="acct-card">
              <h2 className="mb-4 text-xs font-black uppercase tracking-wide text-slate-400">Ordered Products Snapshot</h2>
              <div className="grid gap-3">
                {order.items.map((item, i) => {
                  const product = state.store.products.find((p) => p.id === item.productId);
                  return (
                    <div key={i} className="flex items-center gap-3 rounded border border-slate-100 bg-slate-50 p-3">
                      {product && (
                        <div className="h-14 w-16 shrink-0 overflow-hidden rounded border border-slate-200 bg-white p-1">
                          <img src={product.images[0]} alt={item.name} className="h-full w-full object-contain" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500 font-mono">SKU: {item.sku || 'VC-PROD'}</p>
                        {item.variant && Object.values(item.variant).filter(Boolean).length > 0 && (
                          <p className="text-[11px] text-slate-500">{Object.values(item.variant).filter(Boolean).join(' / ')}</p>
                        )}
                        <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-slate-900">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="acct-card">
              <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Delivery Address</h2>
              <p className="text-sm leading-6 text-slate-700 whitespace-pre-line">{order.address}</p>
            </div>
          </div>

          {/* Right column */}
          <div className="grid gap-5 h-fit">
            {/* Payment */}
            <div className="acct-card">
              <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Payment Details</h2>
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Method</span><span className="font-semibold">{order.paymentMethod}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Payment Status</span><StatusBadge status={order.paymentStatus} /></div>
                <div className="flex justify-between"><span className="text-slate-500">Transaction ID</span><span className="font-mono text-slate-700">{order.paymentId || 'N/A'}</span></div>
              </div>
            </div>

            {/* Documents Section (Customer view: Only Invoice) */}
            <div className="acct-card">
              <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Official Documents</h2>
              <div className="rounded border border-slate-100 bg-slate-50 p-3 text-xs flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">Tax Invoice</p>
                  <p className="text-[10px] text-slate-500">{order.invoiceNumber}</p>
                </div>
                <Link to={`/invoice/${order.id}`} className="rounded bg-cyan-500 text-slate-950 font-bold px-3 py-1.5 hover:bg-cyan-400 transition">
                  View / Print
                </Link>
              </div>
            </div>

            {/* Order Totals */}
            <div className="acct-card">
              <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Order Summary</h2>
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-semibold">{formatCurrency(order.subtotal)}</span></div>
                {order.couponDiscount > 0 && <div className="flex justify-between text-emerald-700"><span>Coupon Discount</span><span>-{formatCurrency(order.couponDiscount)}</span></div>}
                <div className="flex justify-between text-slate-600"><span>Shipping</span><span className="font-semibold">{order.shippingCharge ? formatCurrency(order.shippingCharge) : 'FREE'}</span></div>
                <div className="flex justify-between text-slate-600"><span>Estimated GST (18%)</span><span className="font-semibold">{formatCurrency(order.tax)}</span></div>
                <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-sm text-slate-900">
                  <span>Grand Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}

// ─── Account: Wishlist ────────────────────────────────────────────────────────

function AccountWishlist({ state }) {
  const items = state.store.products.filter((p) => state.wishlist.includes(p.id));

  return (
    <AccountLayout state={state}>
      <div>
        <h1 className="mb-5 text-2xl font-black text-slate-900">Wishlist</h1>

        {items.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-black text-slate-800">No saved products yet</p>
            <p className="mt-2 text-sm text-slate-500">Save products you like and find them easily later.</p>
            <Link to="/shop" className="mt-5 inline-block btn-primary">Explore Products</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <Link to={`/products/${p.slug}`} className="block aspect-[4/3] overflow-hidden bg-slate-50 p-3">
                  <img src={p.images[0]} alt={p.name} className="h-full w-full object-contain transition hover:scale-105" />
                </Link>
                <div className="p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{p.brand}</p>
                  <Link to={`/products/${p.slug}`} className="mt-1 line-clamp-2 text-sm font-black text-slate-800 hover:text-cyan-700">{p.name}</Link>
                  <p className="mt-1 text-xs text-slate-500">
                    {p.stock > 10 ? 'In stock' : p.stock > 0 ? `Only ${p.stock} left` : 'Out of stock'}
                  </p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="font-black text-slate-900">{formatCurrency(p.price)}</span>
                    <span className="text-xs text-slate-400 line-through">{formatCurrency(p.originalPrice)}</span>
                    <span className="rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-bold text-emerald-700">{p.discount}% off</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      disabled={p.stock <= 0}
                      onClick={() => state.addToCart(p)}
                      className="btn-primary py-2 text-xs disabled:opacity-50"
                    >
                      Add to Cart
                    </button>
                    <button
                      onClick={() => state.toggleWishlist(p.id)}
                      className="rounded-md border border-red-200 py-2 text-xs font-black text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}

// ─── Account: Addresses ───────────────────────────────────────────────────────

function AccountAddresses({ state }) {
  const blankForm = { label: 'home', fullName: '', phone: '', addressLine: '', city: '', state: '', postalCode: '', country: 'India', isDefault: false };
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);

  const userAddresses = (state.store.addresses || []).filter((a) => a.userId === state.user?.id);
  const labelMap = { home: 'Home', work: 'Work', other: 'Other' };

  const openAdd = () => { setForm(blankForm); setEditingId(null); setShowForm(true); };
  const openEdit = (addr) => {
    setForm({ label: addr.label, fullName: addr.fullName, phone: addr.phone, addressLine: addr.addressLine, city: addr.city, state: addr.state, postalCode: addr.postalCode, country: addr.country, isDefault: addr.isDefault });
    setEditingId(addr.id);
    setShowForm(true);
  };

  const submitForm = (e) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim() || !form.addressLine.trim() || !form.city.trim() || !form.state.trim() || !form.postalCode.trim()) {
      return toast.error('Please fill all required fields.');
    }
    if (editingId) {
      updateAddress(editingId, { ...form, userId: state.user.id });
      toast.success('Address updated.');
    } else {
      saveAddress({ ...form, userId: state.user.id });
      toast.success('Address added.');
    }
    setShowForm(false);
    setEditingId(null);
    setForm(blankForm);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    deleteAddress(id);
    toast.success('Address deleted.');
  };

  const handleSetDefault = (id) => {
    setDefaultAddress(state.user.id, id);
    toast.success('Default address updated.');
  };

  return (
    <AccountLayout state={state}>
      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-slate-900">Address Management</h1>
          {!showForm && (
            <button onClick={openAdd} className="btn-primary py-2 text-sm">
              + Add New Address
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-5 rounded-md border border-cyan-200 bg-cyan-50 p-5">
            <h2 className="mb-4 font-black text-slate-900">{editingId ? 'Edit Address' : 'Add New Address'}</h2>
            <form onSubmit={submitForm} className="grid gap-4">
              <div>
                <p className="mb-2 text-sm font-bold text-slate-700">Address Type</p>
                <div className="flex gap-2">
                  {['home', 'work', 'other'].map((l) => (
                    <label
                      key={l}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition ${form.label === l ? 'border-cyan-500 bg-white text-cyan-700' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`}
                    >
                      <input type="radio" name="label" value={l} checked={form.label === l} onChange={() => setForm({ ...form, label: l })} className="sr-only" />
                      {labelMap[l]}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-bold">
                  Full Name *
                  <input className="input-field mt-1.5" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Full name as on ID" required />
                </label>
                <label className="block text-sm font-bold">
                  Phone Number *
                  <input className="input-field mt-1.5" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" required />
                </label>
              </div>
              <label className="block text-sm font-bold">
                Address Line *
                <input className="input-field mt-1.5" value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} placeholder="House no., Street name, Area" required />
              </label>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block text-sm font-bold">
                  City *
                  <input className="input-field mt-1.5" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" required />
                </label>
                <label className="block text-sm font-bold">
                  State *
                  <input className="input-field mt-1.5" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" required />
                </label>
                <label className="block text-sm font-bold">
                  Postal Code *
                  <input className="input-field mt-1.5" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} placeholder="Postal code" required />
                </label>
              </div>
              <label className="block text-sm font-bold max-w-sm">
                Country
                <input className="input-field mt-1.5" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="h-4 w-4 accent-cyan-500"
                />
                Set as default delivery address
              </label>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="btn-primary py-2 text-sm">
                  {editingId ? 'Update Address' : 'Save Address'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); setForm(blankForm); }}
                  className="btn-secondary py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {userAddresses.length === 0 && !showForm ? (
          <div className="rounded-md border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-black text-slate-800">No addresses saved</p>
            <p className="mt-2 text-sm text-slate-500">Add an address to make checkout faster.</p>
            <button onClick={openAdd} className="mt-5 btn-primary">Add Address</button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {userAddresses.map((addr) => (
              <div
                key={addr.id}
                className={`rounded-md border bg-white p-5 shadow-sm transition ${addr.isDefault ? 'border-cyan-300' : 'border-slate-200'}`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-black uppercase tracking-wide text-slate-600">
                    {labelMap[addr.label] || addr.label} {addr.isDefault ? '— DEFAULT' : ''}
                  </span>
                  {addr.isDefault && (
                    <span className="rounded bg-cyan-100 px-2 py-0.5 text-xs font-black uppercase tracking-wide text-cyan-700">Default</span>
                  )}
                </div>
                <div className="grid gap-0.5 text-sm">
                  <p className="font-bold text-slate-900">{addr.fullName}</p>
                  <p className="text-slate-500">{addr.phone}</p>
                  <p className="mt-1 text-slate-700">{addr.addressLine}</p>
                  <p className="text-slate-700">{addr.city}, {addr.state} - {addr.postalCode}</p>
                  <p className="text-slate-700">{addr.country}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => openEdit(addr)}
                    className="rounded border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="rounded border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                  {!addr.isDefault && (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="rounded border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700"
                    >
                      Set as Default
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}

// ─── Account: Notifications ───────────────────────────────────────────────────

function AccountNotifications({ state }) {
  const [prefs, setPrefs] = useState(() => getNotificationPrefs(state.user?.id));

  const toggle = (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    saveNotificationPrefs(state.user.id, next);
    toast.success('Preference updated.');
  };

  const notifItems = [
    { key: 'orderUpdates', label: 'Order Updates', desc: 'Receive updates about your orders.' },
    { key: 'deliveryUpdates', label: 'Delivery Updates', desc: 'Real-time Shippo delivery status and tracking updates.' },
    { key: 'priceDropAlerts', label: 'Price Drop Alerts', desc: 'Get notified when saved products drop in price.' },
    { key: 'backInStockAlerts', label: 'Back-in-Stock Alerts', desc: 'Know when out-of-stock products become available again.' },
    { key: 'promotionalOffers', label: 'Promotional Offers', desc: 'Exclusive deals, flash sales, and seasonal offers.' },
  ];

  return (
    <AccountLayout state={state}>
      <div>
        <h1 className="mb-5 text-2xl font-black text-slate-900">Notifications</h1>
        <div className="acct-card">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-400">Communication Preferences</h2>
            <p className="mt-1 text-xs text-slate-400">Control notifications and alerts. Preferences persist automatically.</p>
          </div>
          {notifItems.map(({ key, label, desc }) => (
            <ToggleSwitch
              key={key}
              checked={!!prefs[key]}
              onChange={() => toggle(key)}
              label={label}
              description={desc}
            />
          ))}
        </div>
      </div>
    </AccountLayout>
  );
}

// ─── Account: Settings ────────────────────────────────────────────────────────

function AccountSettings({ state }) {
  const [profileForm, setProfileForm] = useState({
    name: state.user?.name || '',
    email: state.user?.email || '',
    phone: state.user?.phone || '',
  });
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [theme, setTheme] = useState(() => getThemePreference());
  const [commPrefs, setCommPrefs] = useState(() => getNotificationPrefs(state.user?.id));
  const [profileSaving, setProfileSaving] = useState(false);

  const saveProfile = (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) return toast.error('Full name is required.');
    if (profileForm.email && !/\S+@\S+\.\S+/.test(profileForm.email)) return toast.error('Enter a valid email address.');
    if (!profileForm.email && !profileForm.phone) return toast.error('Email or phone number is required.');
    setProfileSaving(true);
    try {
      updateUserProfile(state.user.id, profileForm);
      state.setUser({ ...state.user, name: profileForm.name, email: profileForm.email, phone: profileForm.phone });
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const savePasswordFn = (e) => {
    e.preventDefault();
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) return toast.error('All password fields are required.');
    if (passwordForm.next.length < 6) return toast.error('New password must be at least 6 characters.');
    if (passwordForm.next !== passwordForm.confirm) return toast.error('New passwords do not match.');
    if (passwordForm.current === passwordForm.next) return toast.error('New password must be different from current password.');
    try {
      changePassword(state.user.id, passwordForm.current, passwordForm.next);
      setPasswordForm({ current: '', next: '', confirm: '' });
      toast.success('Password changed successfully.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleTheme = (val) => {
    setTheme(val);
    saveThemePreference(val);
    toast.success(`Theme updated to ${val === 'system' ? 'System Default' : val}.`);
  };

  const toggleComm = (key) => {
    const next = { ...commPrefs, [key]: !commPrefs[key] };
    setCommPrefs(next);
    saveNotificationPrefs(state.user.id, next);
  };

  const commItems = [
    { key: 'orderUpdates', label: 'Order-related emails', desc: 'Order confirmations and critical status updates.' },
    { key: 'deliveryUpdates', label: 'Delivery notifications', desc: 'Shippo tracking and shipment delivery updates.' },
    { key: 'promotionalOffers', label: 'Promotional emails', desc: 'Sales, offers, and special product promotions.' },
    { key: 'backInStockAlerts', label: 'Newsletter subscription', desc: 'Weekly newsletter with curated tech articles and drops.' },
  ];

  const Section = ({ title, subtitle, children }) => (
    <div className="acct-card">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-400">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <AccountLayout state={state}>
      <div>
        <h1 className="mb-5 text-2xl font-black text-slate-900">Settings</h1>
        <div className="grid gap-5">
          <Section title="Account Settings" subtitle="Update your basic account details.">
            <form onSubmit={saveProfile} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-bold">
                  Full Name *
                  <input className="input-field mt-1.5" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required />
                </label>
                <label className="block text-sm font-bold">
                  Email Address
                  <input type="email" className="input-field mt-1.5" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="you@example.com" />
                </label>
              </div>
              <label className="block max-w-sm text-sm font-bold">
                Phone Number
                <input type="tel" className="input-field mt-1.5" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
              </label>
              <div>
                <button type="submit" disabled={profileSaving} className="btn-primary py-2 text-sm disabled:opacity-60">
                  {profileSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </Section>

          <Section title="Security" subtitle="Change your account password securely.">
            <form onSubmit={savePasswordFn} className="grid max-w-md gap-4">
              <PasswordInput label="Current Password" value={passwordForm.current} onChange={(v) => setPasswordForm({ ...passwordForm, current: v })} />
              <PasswordInput label="New Password" value={passwordForm.next} onChange={(v) => setPasswordForm({ ...passwordForm, next: v })} />
              <PasswordInput label="Confirm New Password" value={passwordForm.confirm} onChange={(v) => setPasswordForm({ ...passwordForm, confirm: v })} />
              <div>
                <button type="submit" className="btn-primary py-2 text-sm">Change Password</button>
              </div>
            </form>
          </Section>

          <Section title="Appearance" subtitle="Customize the theme across the entire VoltCart website.">
            <div className="grid gap-2 max-w-sm">
              {[
                ['light', 'Light', 'Crisp, high-contrast light theme'],
                ['dark', 'Dark', 'Modern dark theme for night viewing'],
                ['system', 'System Default', 'Matches your device operating system theme'],
              ].map(([val, label, desc]) => (
                <label
                  key={val}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 transition ${theme === val ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={val}
                    checked={theme === val}
                    onChange={() => handleTheme(val)}
                    className="mt-0.5 h-4 w-4 accent-cyan-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </Section>

          <Section title="Communication Preferences" subtitle="Manage which emails and notifications you receive.">
            {commItems.map(({ key, label, desc }) => (
              <ToggleSwitch
                key={key}
                checked={!!commPrefs[key]}
                onChange={() => toggleComm(key)}
                label={label}
                description={desc}
              />
            ))}
          </Section>
        </div>
      </div>
    </AccountLayout>
  );
}

// ─── Login / Register ─────────────────────────────────────────────────────────

function Login({ state }) {
  const navigate = useNavigate();
  const [method, setMethod] = useState('email');
  const [form, setForm] = useState({ email: '', phone: '', password: '' });
  const submit = (event) => {
    event.preventDefault();
    try {
      const identifier = method === 'email' ? form.email : form.phone;
      const user = loginUser(identifier, form.password, method);
      state.setUser(user);
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/');
    } catch (error) {
      toast.error(error.message);
    }
  };
  return (
    <Shell state={state}>
      <section className="section grid place-items-center">
        <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-black">Login to VoltCart</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in with your registered email or phone number.</p>
          <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200">
            {['email', 'phone'].map((m) => <button type="button" key={m} className={`py-2 text-sm font-bold capitalize transition ${method === m ? 'bg-cyan-500 text-slate-950' : 'text-slate-600 hover:bg-slate-50'}`} onClick={() => setMethod(m)}>{m}</button>)}
          </div>
          <div className="mt-5 grid gap-4">
            {method === 'email' ? <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} /> : <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />}
            <PasswordInput value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
          </div>
          <button className="mt-5 w-full btn-primary">Login</button>
          <p className="mt-4 text-center text-sm text-slate-500">New to VoltCart? <Link className="font-bold text-cyan-700" to="/register">Create account</Link></p>
          <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <p><strong>Demo Admin:</strong> admin@voltcart.com / Admin@123</p>
          </div>
        </form>
      </section>
    </Shell>
  );
}

function Register({ state }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const submit = (event) => {
    event.preventDefault();
    try {
      const user = registerUser(form);
      state.setUser(user);
      navigate('/');
    } catch (error) {
      toast.error(error.message);
    }
  };
  return (
    <Shell state={state}>
      <section className="section grid place-items-center">
        <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-black">Create Account</h1>
          <p className="mt-2 text-sm text-slate-500">Join VoltCart for exclusive deals, order tracking, and saved wishlist.</p>
          <div className="mt-5 grid gap-4">
            <Input label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Input label="Email Address" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Input label="Phone Number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <PasswordInput value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
          </div>
          <button className="mt-5 w-full btn-primary">Create Account</button>
          <p className="mt-4 text-center text-sm text-slate-500">Already have an account? <Link className="font-bold text-cyan-700" to="/login">Login</Link></p>
        </form>
      </section>
    </Shell>
  );
}

// ─── Admin Layout & Console ───────────────────────────────────────────────────

function AdminGuard({ state, children }) {
  if (!state.user) return <Navigate to="/login" replace />;
  if (state.user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function AdminLayout({ state, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const items = ['Dashboard', 'Products', 'Categories', 'Brands', 'Orders', 'Customers', 'Inventory', 'Coupons', 'Reviews', 'Analytics', 'Settings'];
  const logout = () => { setSession(null); state.setUser(null); navigate('/login'); };
  return (
    <AdminGuard state={state}>
      <div className="flex min-h-screen bg-slate-100">
        <aside className={`${open ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 text-white transition lg:static lg:translate-x-0`}>
          <div className="border-b border-slate-800 p-5"><Link to="/" className="text-xl font-black">VoltCart</Link><p className="text-xs text-cyan-300">Admin Console & Fulfillment</p></div>
          <nav className="grid gap-1 p-3">{items.map((item) => { const path = `/admin/${item.toLowerCase()}`; return <Link className={`rounded-lg px-4 py-2 text-sm font-bold ${location.pathname === path ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`} to={path} onClick={() => setOpen(false)} key={item}>{item}</Link>; })}</nav>
          <div className="mt-auto p-3"><button className="w-full rounded-lg px-4 py-2 text-left text-sm font-bold text-red-300 hover:bg-red-950" onClick={logout}>Logout</button></div>
        </aside>
        {open && <button aria-label="Close sidebar" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
        <main className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white p-4"><button className="rounded-lg border px-3 py-2 lg:hidden" onClick={() => setOpen(true)}>Menu</button><h1 className="font-black capitalize">{location.pathname.split('/').filter(Boolean).pop()}</h1><Link className="font-bold text-cyan-700" to="/shop">View Store</Link></header>
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </AdminGuard>
  );
}

function AdminDashboard({ state }) {
  const revenue = state.store.orders.reduce((sum, o) => sum + o.total, 0);
  const low = state.store.products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold);
  const out = state.store.products.filter((p) => p.stock === 0);
  const cards = [['Total Revenue', formatCurrency(revenue)], ['Total Orders', state.store.orders.length], ['Total Customers', state.store.users.filter((u) => u.role === 'customer').length], ['Total Products', state.store.products.length], ['Pending Orders', state.store.orders.filter((o) => o.status === 'Pending').length], ['Shipped Orders', state.store.orders.filter((o) => o.status === 'Shipped').length], ['Low Stock', low.length], ['Out of Stock', out.length]];
  return <AdminLayout state={state}><div className="grid gap-4 md:grid-cols-4">{cards.map(([k, v]) => <div className="rounded-lg border bg-white p-5 shadow-sm" key={k}><p className="text-sm text-slate-500">{k}</p><p className="mt-2 text-2xl font-black">{v}</p></div>)}</div><AdminCharts state={state} /><AdminTable title="Recent Orders" rows={state.store.orders.slice(0, 5).map((o) => [o.orderNumber, o.customer, <StatusBadge key={o.id} status={o.status} />, formatCurrency(o.total)])} /><AdminTable title="Low Stock Alerts" rows={low.map((p) => [p.sku, p.name, p.stock, p.category])} /></AdminLayout>;
}

function AdminCharts({ state }) {
  const byCategory = state.store.categories.map((c) => ({ name: c.name, value: state.store.products.filter((p) => p.category === c.slug).reduce((sum, p) => sum + p.sold, 0) }));
  const max = Math.max(...byCategory.map((c) => c.value), 1);
  return <div className="my-6 grid gap-4 lg:grid-cols-2"><div className="rounded-lg border bg-white p-5 shadow-sm"><h2 className="font-black">Orders by Category</h2>{byCategory.map((c) => <div className="mt-3" key={c.name}><div className="mb-1 flex justify-between text-sm"><span>{c.name}</span><span>{c.value}</span></div><div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-cyan-500" style={{ width: `${(c.value / max) * 100}%` }} /></div></div>)}</div><div className="rounded-lg border bg-white p-5 shadow-sm"><h2 className="font-black">Revenue Overview</h2>{[35, 48, 42, 64, 70, 82, 78].map((v, i) => <div className="mt-3 flex items-center gap-3" key={i}><span className="w-16 text-sm">M{i + 1}</span><div className="h-3 flex-1 rounded bg-slate-100"><div className="h-3 rounded bg-slate-900" style={{ width: `${v}%` }} /></div></div>)}</div></div>;
}

function AdminTable({ title, rows }) {
  return <section className="mt-6 overflow-hidden rounded-lg border bg-white shadow-sm"><h2 className="border-b p-4 font-black">{title}</h2><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><tbody>{rows.length ? rows.map((row, i) => <tr className="border-b last:border-0" key={i}>{row.map((cell, j) => <td className="p-3" key={j}>{cell}</td>)}</tr>) : <tr><td className="p-6 text-slate-500">No data yet</td></tr>}</tbody></table></div></section>;
}

// ─── Admin Products with Shipping Specs ───────────────────────────────────────

function AdminProducts({ state }) {
  const blankForm = {
    name: '',
    brand: 'Apple',
    category: 'Smartphones & Mobile',
    originalPrice: '',
    price: '',
    stock: 10,
    sku: '',
    lowStockThreshold: 5,
    status: 'active',
    description: '',
    featured: false,
    active: true,
    weight: 0.5,
    weightUnit: 'kg',
    length: 20,
    width: 15,
    height: 10,
    dimensionUnit: 'cm',
    isFragile: true,
    images: [],
  };

  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  // DummyJSON Import State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreviewList, setImportPreviewList] = useState([]);
  const [selectedImportIds, setSelectedImportIds] = useState(new Set());
  const [importCategoryTab, setImportCategoryTab] = useState('all');
  const [importSearch, setImportSearch] = useState('');

  // Table filters
  const [tableSearch, setTableSearch] = useState('');
  const [tableCategory, setTableCategory] = useState('');

  // ── Open Import Modal & Fetch ──────────────────────────────
  const openImportModal = async () => {
    setImportModalOpen(true);
    setImportLoading(true);
    setSelectedImportIds(new Set());
    try {
      const preview = await fetchDummyJsonElectronicsPreview();
      setImportPreviewList(preview);
    } catch (err) {
      toast.error('Failed to load DummyJSON preview: ' + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const toggleSelectImport = (id) => {
    const next = new Set(selectedImportIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedImportIds(next);
  };

  const selectAllVisible = () => {
    const visible = filteredImportList.filter((p) => !p.isAlreadyImported);
    const next = new Set(selectedImportIds);
    visible.forEach((p) => next.add(p.externalProductId));
    setSelectedImportIds(next);
  };

  const deselectAll = () => {
    setSelectedImportIds(new Set());
  };

  const handleImportSubmit = () => {
    const toImport = importPreviewList.filter((p) => selectedImportIds.has(p.externalProductId));
    if (!toImport.length) {
      return toast.error('Please select at least one electronics product to import.');
    }

    const res = importDummyJsonProducts(toImport);
    toast.success(res.message);
    setImportModalOpen(false);
  };

  // Filtered import candidates
  const filteredImportList = useMemo(() => {
    let list = importPreviewList;
    if (importCategoryTab !== 'all') {
      list = list.filter((p) => p.category === importCategoryTab);
    }
    if (importSearch.trim()) {
      const q = importSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }
    return list;
  }, [importPreviewList, importCategoryTab, importSearch]);

  // ── Manual Add / Edit Form Handlers ────────────────────────
  const openAddForm = () => {
    setForm(blankForm);
    setEditingId(null);
    setShowFormModal(true);
  };

  const openEditForm = (p) => {
    const imgs = Array.isArray(p.images) && p.images.length > 0
      ? p.images.map((im, idx) => typeof im === 'string' ? { url: im, alt: p.name, isPrimary: idx === 0 } : im)
      : [{ url: p.primaryImage || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80', alt: p.name, isPrimary: true }];

    setForm({
      ...p,
      originalPrice: p.originalPrice || p.price,
      price: p.price,
      images: imgs,
    });
    setEditingId(p.id);
    setShowFormModal(true);
  };

  // Image Management Handlers
  const handleAddImageUrl = (e) => {
    e.preventDefault();
    if (!newImageUrl.trim()) return;
    const isFirst = form.images.length === 0;
    const nextImages = [...form.images, { url: newImageUrl.trim(), alt: form.name, isPrimary: isFirst }];
    setForm({ ...form, images: nextImages });
    setNewImageUrl('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const isFirst = form.images.length === 0;
      setForm({
        ...form,
        images: [...form.images, { url: dataUrl, alt: file.name, isPrimary: isFirst }],
      });
      toast.success('Image uploaded');
    };
    reader.readAsDataURL(file);
  };

  const setPrimaryImage = (index) => {
    const updated = form.images.map((img, idx) => ({
      ...img,
      isPrimary: idx === index,
    }));
    setForm({ ...form, images: updated });
  };

  const removeImage = (index) => {
    const filtered = form.images.filter((_, idx) => idx !== index);
    if (filtered.length > 0 && !filtered.some((i) => i.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    setForm({ ...form, images: filtered });
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Product name is required.');
    if (!form.price || Number(form.price) <= 0) return toast.error('A valid selling price is required.');

    const primaryImg = form.images.find((i) => i.isPrimary)?.url || form.images[0]?.url || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80';

    const payload = {
      ...form,
      price: Number(form.price),
      originalPrice: Number(form.originalPrice || form.price),
      stock: Number(form.stock),
      lowStockThreshold: Number(form.lowStockThreshold || 5),
      weight: Number(form.weight || 0.5),
      length: Number(form.length || 20),
      width: Number(form.width || 15),
      height: Number(form.height || 10),
      primaryImage: primaryImg,
      thumbnail: primaryImg,
    };

    if (editingId) {
      updateProduct(payload);
      toast.success('Product updated successfully');
    } else {
      addProduct(payload);
      toast.success('New electronics product added');
    }

    setShowFormModal(false);
  };

  // Products Table Filter
  const tableProducts = useMemo(() => {
    let list = state.store.products;
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)) || p.brand.toLowerCase().includes(q));
    }
    if (tableCategory) {
      list = list.filter((p) => p.category === tableCategory);
    }
    return list;
  }, [state.store.products, tableSearch, tableCategory]);

  return (
    <AdminLayout state={state}>
      <div className="space-y-6">
        {/* Top Actions Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Electronics Product Management</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage certified electronics catalog, stock levels, physical shipping dimensions, and multi-image galleries.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={openAddForm}
              className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center gap-1.5 shadow"
            >
              <span>+ Add Product</span>
            </button>
            <button
              type="button"
              onClick={openImportModal}
              className="rounded-lg border border-cyan-400 bg-cyan-50 px-4 py-2.5 text-xs font-bold text-cyan-900 hover:bg-cyan-100 transition flex items-center gap-1.5 shadow-sm"
            >
              <span>⚡ Import Electronics</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <input
              type="text"
              placeholder="Search by name, brand, or SKU..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="input-field max-w-xs text-xs"
            />
            <select
              value={tableCategory}
              onChange={(e) => setTableCategory(e.target.value)}
              className="input-field max-w-xs text-xs"
            >
              <option value="">All Electronics Categories ({ELECTRONICS_CATEGORIES.length})</option>
              {ELECTRONICS_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <span className="font-bold text-slate-500">
            Showing {tableProducts.length} of {state.store.products.length} Products
          </span>
        </div>

        {/* Products Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock & Status</th>
                  <th className="p-3">Dimensions & Weight</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={getProductImage(p, 0)}
                          alt={p.name}
                          onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80'; }}
                          className="h-12 w-12 rounded object-contain border bg-white p-1 flex-shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900 line-clamp-1">{p.name}</p>
                          <span className="text-[11px] text-cyan-700 font-semibold">{p.brand}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-600">{p.sku || 'VC-PROD'}</td>
                    <td className="p-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-3">
                      <strong className="text-slate-900 font-black">{formatCurrency(p.price)}</strong>
                      {p.originalPrice > p.price && (
                        <span className="block text-[10px] text-slate-400 line-through">
                          {formatCurrency(p.originalPrice)}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-0.5">
                        <span className={`font-bold ${p.stock <= 0 ? 'text-rose-600' : p.stock <= 5 ? 'text-amber-600' : 'text-slate-700'}`}>
                          {p.stock} units
                        </span>
                        <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase w-fit ${p.stock <= 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {p.stock <= 0 ? 'Out of Stock' : 'Active'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-[11px] text-slate-500">
                      <div>{p.weight || 0.5} kg</div>
                      <div className="text-[10px] text-slate-400">
                        {p.length || 20}×{p.width || 15}×{p.height || 10} cm {p.isFragile && '· ⚠ Fragile'}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEditForm(p)}
                        className="font-bold text-cyan-700 hover:underline mr-3 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete "${p.name}"?`)) {
                            deleteProduct(p.id);
                            toast.success('Product removed');
                          }
                        }}
                        className="font-bold text-rose-600 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Add / Edit Product Modal with Multi-Image Manager ────── */}
        {showFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto">
            <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-8">
              <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base">{editingId ? 'Edit Electronics Product' : 'Add New Electronics Product'}</h3>
                  <p className="text-xs text-slate-400">VoltCart Catalog & Logistics Management</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="rounded-md border border-slate-700 p-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  ✕ Close
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
                {/* Section 1: Basic Information */}
                <div>
                  <h4 className="font-black text-sm text-slate-900 border-b pb-1.5 mb-3">1. Basic Product Information</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input label="Product Title *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                    <Input label="Brand *" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 mt-3">
                    <label className="block text-xs font-bold text-slate-700">
                      Electronics Category *
                      <select
                        className="input-field mt-1 text-xs"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                      >
                        {ELECTRONICS_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </label>
                    <Input label="SKU (Stock Keeping Unit)" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} />
                  </div>
                  <label className="block text-xs font-bold text-slate-700 mt-3">
                    Product Description
                    <textarea
                      rows={3}
                      className="input-field mt-1 text-xs"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </label>
                </div>

                {/* Section 2: Pricing & Inventory */}
                <div>
                  <h4 className="font-black text-sm text-slate-900 border-b pb-1.5 mb-3">2. Pricing & Inventory Control</h4>
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                    <Input label="Selling Price (₹) *" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
                    <Input label="Original Price / MRP (₹)" type="number" value={form.originalPrice} onChange={(v) => setForm({ ...form, originalPrice: v })} />
                    <Input label="Stock Quantity *" type="number" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} />
                    <Input label="Low Stock Threshold" type="number" value={form.lowStockThreshold} onChange={(v) => setForm({ ...form, lowStockThreshold: v })} />
                  </div>
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-3 mt-3">
                    <label className="block text-xs font-bold text-slate-700">
                      Status
                      <select
                        className="input-field mt-1 text-xs"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option value="active">Active (Available for purchase)</option>
                        <option value="draft">Draft (Hidden)</option>
                        <option value="out_of_stock">Out of Stock</option>
                        <option value="discontinued">Discontinued</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 mt-5 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.featured}
                        onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                        className="h-4 w-4 accent-cyan-600 rounded"
                      />
                      Featured on Homepage
                    </label>
                  </div>
                </div>

                {/* Section 3: COMPLETE PRODUCT IMAGE MANAGEMENT */}
                <div className="rounded-xl border border-cyan-200 bg-cyan-50/30 p-4">
                  <div className="flex items-center justify-between border-b border-cyan-200 pb-2 mb-3">
                    <div>
                      <h4 className="font-black text-sm text-slate-900">3. Product Images Gallery & Primary Selector</h4>
                      <p className="text-[11px] text-slate-500">
                        The <strong>Primary Image</strong> is used on product cards, category pages, cart, and invoice. Additional images appear in the details gallery.
                      </p>
                    </div>
                  </div>

                  {/* Add image tools */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="flex-1 flex gap-1.5 min-w-[240px]">
                      <input
                        type="url"
                        placeholder="Paste image URL (https://...)"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        className="input-field text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        className="btn-secondary py-1.5 px-3 text-xs"
                      >
                        + Add URL
                      </button>
                    </div>
                    <label className="btn-secondary py-1.5 px-3 text-xs cursor-pointer flex items-center gap-1">
                      <span>📁 Upload File</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>

                  {/* Image Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {form.images.map((img, idx) => {
                      const url = typeof img === 'string' ? img : img.url;
                      const isPrimary = typeof img === 'object' ? img.isPrimary : idx === 0;
                      return (
                        <div
                          key={idx}
                          className={`rounded-lg border bg-white p-2 relative flex flex-col justify-between ${isPrimary ? 'border-cyan-500 ring-2 ring-cyan-300' : 'border-slate-200'}`}
                        >
                          <div className="aspect-[4/3] rounded overflow-hidden bg-slate-50 mb-2 relative">
                            <img
                              src={url}
                              alt=""
                              onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80'; }}
                              className="h-full w-full object-contain"
                            />
                            {isPrimary && (
                              <span className="absolute top-1 left-1 rounded bg-cyan-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow">
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t">
                            {!isPrimary ? (
                              <button
                                type="button"
                                onClick={() => setPrimaryImage(idx)}
                                className="font-bold text-cyan-700 hover:underline text-[10px]"
                              >
                                Set as Primary
                              </button>
                            ) : (
                              <span className="font-bold text-cyan-800 text-[10px]">★ Main</span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="font-bold text-rose-600 hover:underline text-[10px]"
                            >
                              ✕ Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 4: Shipping Information */}
                <div>
                  <h4 className="font-black text-sm text-slate-900 border-b pb-1.5 mb-3">4. Shipping & Physical Logistics (Shippo Specs)</h4>
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                    <Input label="Weight (kg) *" type="number" value={form.weight} onChange={(v) => setForm({ ...form, weight: v })} />
                    <Input label="Length (cm)" type="number" value={form.length} onChange={(v) => setForm({ ...form, length: v })} />
                    <Input label="Width (cm)" type="number" value={form.width} onChange={(v) => setForm({ ...form, width: v })} />
                    <Input label="Height (cm)" type="number" value={form.height} onChange={(v) => setForm({ ...form, height: v })} />
                  </div>
                  <label className="flex items-center gap-2 mt-3 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isFragile}
                      onChange={(e) => setForm({ ...form, isFragile: e.target.checked })}
                      className="h-4 w-4 accent-cyan-600 rounded"
                    />
                    Fragile Electronics (Triggers "⚠ FRAGILE — HANDLE WITH CARE" on Packing Slips)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="btn-secondary py-2.5 px-5 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary py-2.5 px-8 text-xs font-bold"
                  >
                    {editingId ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── DummyJSON Electronics Import Modal ───────────────────── */}
        {importModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
            <div className="w-full max-w-5xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="bg-slate-900 p-5 text-white flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <span>⚡ Import Electronics from DummyJSON</span>
                    <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-bold text-cyan-300 border border-cyan-500/30">
                      Electronics Only
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Strictly filters verified electronics. Unrelated categories (clothing, beauty, food) are rejected.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="rounded-md border border-slate-700 p-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  ✕ Close
                </button>
              </div>

              {/* Toolbar: Category Tabs & Search */}
              <div className="border-b bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    ['all', 'All Electronics'],
                    ['Smartphones & Mobile', 'Smartphones & Mobile'],
                    ['Laptops & Computers', 'Laptops & Computers'],
                    ['Tablets', 'Tablets'],
                    ['Audio', 'Audio'],
                    ['Mobile Accessories', 'Mobile Accessories'],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setImportCategoryTab(val)}
                      className={`rounded-md px-3 py-1.5 font-bold transition ${importCategoryTab === val ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Filter preview by name or brand..."
                  value={importSearch}
                  onChange={(e) => setImportSearch(e.target.value)}
                  className="input-field max-w-xs text-xs"
                />
              </div>

              {/* Controls bar: Select All / Deselect All */}
              <div className="border-b px-4 py-2 bg-white flex items-center justify-between text-xs flex-shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    className="font-bold text-cyan-700 hover:underline"
                  >
                    Select All Visible
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="font-bold text-slate-600 hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
                <span className="font-bold text-slate-800">
                  Selected: <strong className="text-cyan-700">{selectedImportIds.size}</strong> product(s)
                </span>
              </div>

              {/* Preview Content */}
              <div className="p-4 overflow-y-auto flex-1 text-xs">
                {importLoading ? (
                  <div className="py-20 text-center text-slate-500">
                    <p className="text-sm font-bold animate-pulse">Connecting to DummyJSON Electronics Source…</p>
                    <p className="text-xs mt-1">Filtering products and verifying duplicate records…</p>
                  </div>
                ) : filteredImportList.length === 0 ? (
                  <div className="py-16 text-center text-slate-500">
                    <p className="font-bold text-base">No electronics matched current filter.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredImportList.map((item) => {
                      const isSelected = selectedImportIds.has(item.externalProductId);
                      return (
                        <div
                          key={item.externalProductId}
                          onClick={() => {
                            if (!item.isAlreadyImported) toggleSelectImport(item.externalProductId);
                          }}
                          className={`rounded-lg border p-3 flex gap-3 transition cursor-pointer relative ${item.isAlreadyImported ? 'bg-slate-50 border-slate-200 opacity-80 cursor-default' : isSelected ? 'border-cyan-500 bg-cyan-50/50 ring-2 ring-cyan-300' : 'bg-white border-slate-200 hover:border-cyan-300'}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={item.isAlreadyImported}
                            onChange={() => toggleSelectImport(item.externalProductId)}
                            className="mt-1 h-4 w-4 accent-cyan-600 rounded flex-shrink-0"
                          />
                          <img
                            src={item.primaryImage}
                            alt=""
                            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80'; }}
                            className="h-16 w-16 rounded object-contain border bg-white p-1 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-black text-slate-900 line-clamp-1 text-xs">{item.name}</span>
                              {item.isAlreadyImported && (
                                <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[9px] font-bold flex-shrink-0">
                                  Already Imported
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">Brand: <strong className="text-slate-700">{item.brand}</strong></p>
                            <p className="text-[11px] text-cyan-800 font-semibold">{item.category}</p>
                            <div className="mt-1.5 flex items-center justify-between text-xs">
                              <strong className="text-slate-900 font-black">{formatCurrency(item.price)}</strong>
                              <span className="text-[10px] text-slate-500">Stock: {item.stock} · ★ {item.rating}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t p-4 bg-slate-50 flex items-center justify-between text-xs flex-shrink-0">
                <span className="text-slate-500">
                  Imported products become permanent records in VoltCart's database.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(false)}
                    className="btn-secondary py-2 px-4 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImportSubmit}
                    disabled={selectedImportIds.size === 0}
                    className="btn-primary py-2 px-6 text-xs font-bold disabled:opacity-50"
                  >
                    Import Selected Products ({selectedImportIds.size})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function SimpleManager({ state, type }) {
  const store = state.store;
  const collection = type === 'Categories' ? 'categories' : type === 'Brands' ? 'brands' : 'coupons';
  const [name, setName] = useState('');
  const add = () => {
    if (!name) return toast.error('Enter a value first.');
    const next = getStore();
    const item = collection === 'coupons' ? { id: Date.now(), code: name.toUpperCase(), type: 'percentage', value: 10, minAmount: 1000, maxDiscount: 1000, active: true, expiresAt: '2027-12-31', usageLimit: 100 } : { id: Date.now(), name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), active: true, logo: name.slice(0, 2).toUpperCase(), image: 'https://source.unsplash.com/900x700/?electronics' };
    next[collection].push(item);
    saveStore(next);
    setName('');
    toast.success(`${type.slice(0, -1)} added`);
  };
  const toggle = (id) => {
    const next = getStore();
    next[collection] = next[collection].map((item) => item.id === id ? { ...item, active: !item.active } : item);
    saveStore(next);
  };
  return <AdminLayout state={state}><div className="rounded-lg border bg-white p-5 shadow-sm"><h2 className="text-xl font-black">{type} Management</h2><div className="mt-4 flex gap-2"><input className="input-field max-w-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${type.slice(0, -1)}`} /><button className="btn-primary" onClick={add}>Add</button></div></div><AdminTable title={type} rows={store[collection].map((item) => [item.code || item.name, item.slug || item.type, item.active ? 'Active' : 'Inactive', <button className="font-bold text-cyan-700" onClick={() => toggle(item.id)}>Toggle</button>])} /></AdminLayout>;
}

// ─── Admin Orders List ────────────────────────────────────────────────────────

function AdminOrders({ state }) {
  const updateStatus = (id, status) => {
    updateOrderFulfillment(id, { status });
    toast.success('Order status updated');
  };

  const updatePaymentStatus = (id, paymentStatus) => {
    updateOrderFulfillment(id, { paymentStatus });
    toast.success('Payment status updated');
  };

  return (
    <AdminLayout state={state}>
      <AdminTable
        title="Customer Orders & Fulfillment"
        rows={state.store.orders.map((o) => [
          <Link to={`/admin/orders/${o.id}`} key={o.id} className="font-mono font-bold text-cyan-700 hover:underline">{o.orderNumber}</Link>,
          o.customer,
          <select key={`pay-${o.id}`} className="input-field text-xs py-1" value={o.paymentStatus} onChange={(e) => updatePaymentStatus(o.id, e.target.value)}>
            {paymentStatuses.map((s) => <option key={s}>{s}</option>)}
          </select>,
          <select key={`status-${o.id}`} className="input-field text-xs py-1 font-bold" value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}>
            {orderStatuses.map((s) => <option key={s}>{s}</option>)}
          </select>,
          <StatusBadge key={`ship-${o.id}`} status={o.shipmentStatus || 'Not Created'} />,
          formatCurrency(o.total),
          <Link key={`detail-${o.id}`} to={`/admin/orders/${o.id}`} className="rounded border px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-cyan-500">Manage</Link>
        ])}
      />
    </AdminLayout>
  );
}

// ─── Admin Order Fulfillment Detail ───────────────────────────────────────────

function AdminOrderDetail({ state }) {
  const { id } = useParams();
  const order = state.store.orders.find((o) => String(o.id) === String(id));

  if (!order) {
    return (
      <AdminLayout state={state}>
        <div className="p-8 text-center font-bold">Order not found.</div>
      </AdminLayout>
    );
  }

  const handleCreateShipment = () => {
    createOrderShipment(order.id, 'BlueDart Express (via Shippo)', 'Standard Surface');
    toast.success('Shippo shipment created. Order moved to Processing.');
  };

  const handleGenerateLabel = () => {
    generateOrderShippingLabel(order.id);
    toast.success('Official Shippo shipping label generated & tracking number assigned!');
  };

  const markShipped = () => {
    updateOrderFulfillment(order.id, { status: 'Shipped', shipmentStatus: 'In Transit' });
    toast.success('Order marked as Shipped.');
  };

  const markDelivered = () => {
    updateOrderFulfillment(order.id, { status: 'Delivered', shipmentStatus: 'Delivered', paymentStatus: 'Paid' });
    toast.success('Order marked as Delivered & Payment verified.');
  };

  const hasFragile = order.items?.some((i) => i.isFragile);

  return (
    <AdminLayout state={state}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">{order.orderNumber}</h1>
              <StatusBadge status={order.paymentStatus} />
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Invoice No: <strong className="font-mono text-slate-700">{order.invoiceNumber}</strong> · Placed: {new Date(order.createdAt).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {order.status !== 'Processing' && order.status !== 'Shipped' && order.status !== 'Delivered' && (
              <button onClick={() => { updateOrderFulfillment(order.id, { status: 'Processing' }); toast.success('Order marked as Processing'); }} className="btn-secondary py-1.5 px-3 text-xs font-bold">
                Mark Processing
              </button>
            )}
            {order.status !== 'Shipped' && order.status !== 'Delivered' && (
              <button onClick={markShipped} className="btn-primary py-1.5 px-3 text-xs">
                Mark as Shipped
              </button>
            )}
            {order.status !== 'Delivered' && (
              <button onClick={markDelivered} className="rounded bg-emerald-600 text-white font-bold py-1.5 px-3 text-xs hover:bg-emerald-700">
                Mark Delivered
              </button>
            )}
          </div>
        </div>

        {/* 3-Way Document Actions */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-wide text-slate-400 mb-3">Order Documents & Printouts</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Invoice */}
            <div className="rounded border border-slate-200 p-3.5 text-xs flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-900 block">1. TAX INVOICE</span>
                <span className="text-slate-500 text-[10px]">Official record for Customer & Admin</span>
                <p className="font-mono text-slate-700 mt-1">{order.invoiceNumber}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <Link to={`/invoice/${order.id}`} className="btn-secondary py-1 px-2.5 text-[11px]">View</Link>
                <Link to={`/invoice/${order.id}`} className="btn-primary py-1 px-2.5 text-[11px]">Print A4</Link>
              </div>
            </div>

            {/* Packing Slip */}
            <div className="rounded border border-slate-200 p-3.5 text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 block">2. PACKING SLIP</span>
                  <span className="rounded bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5">ADMIN ONLY</span>
                </div>
                <span className="text-slate-500 text-[10px]">Warehouse item verification checklist</span>
                <p className="text-slate-600 mt-1">{order.items.length} items to pack</p>
              </div>
              <div className="mt-3 flex gap-2">
                <Link to={`/admin/packing-slip/${order.id}`} className="btn-secondary py-1 px-2.5 text-[11px]">View</Link>
                <Link to={`/admin/packing-slip/${order.id}`} className="btn-primary py-1 px-2.5 text-[11px]">Print Slip</Link>
              </div>
            </div>

            {/* Shipping Label */}
            <div className="rounded border border-slate-200 p-3.5 text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 block">3. SHIPPING LABEL</span>
                  <span className="rounded bg-purple-100 text-purple-800 text-[9px] font-black px-1.5 py-0.5">ADMIN ONLY</span>
                </div>
                <span className="text-slate-500 text-[10px]">Attach to physical shipment parcel</span>
                <p className="font-mono text-slate-700 mt-1">{order.trackingNumber || 'Not generated yet'}</p>
              </div>
              <div className="mt-3 flex gap-2">
                {order.trackingNumber ? (
                  <>
                    <Link to={`/admin/shipping-label/${order.id}`} className="btn-secondary py-1 px-2.5 text-[11px]">View</Link>
                    <Link to={`/admin/shipping-label/${order.id}`} className="btn-primary py-1 px-2.5 text-[11px]">Print 4x6</Link>
                  </>
                ) : (
                  <button onClick={handleGenerateLabel} className="btn-primary py-1 px-3 text-[11px] w-full">
                    Generate Label
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Shippo Shipping & Fulfillment Section */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-800 flex items-center gap-2">
              <TruckIcon className="h-5 w-5 text-cyan-600" /> Shippo Shipping & Fulfillment Management
            </h2>
            <StatusBadge status={order.shipmentStatus || 'Not Created'} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 text-xs">
            <div className="rounded bg-slate-50 p-3.5 border border-slate-100 space-y-1.5">
              <p className="font-bold text-slate-800 uppercase tracking-wide text-[10px]">Package Specifications</p>
              <p>Calculated Weight: <strong className="text-slate-900">{order.shipment?.packageWeight || 1.2} kg</strong></p>
              <p>Dimensions: <strong className="text-slate-900">{order.shipment?.packageDimensions || '30 x 20 x 15 cm'}</strong></p>
              <p>Fragile Handling: <strong className={hasFragile ? 'text-red-600' : 'text-slate-700'}>{hasFragile ? 'YES (Sensitive electronics)' : 'Standard'}</strong></p>
              <p>Total Items: <strong className="text-slate-900">{order.items.reduce((s, i) => s + i.quantity, 0)} Units</strong></p>
            </div>

            <div className="rounded bg-slate-50 p-3.5 border border-slate-100 space-y-1.5">
              <p className="font-bold text-slate-800 uppercase tracking-wide text-[10px]">Carrier Dispatch Info</p>
              <p>Carrier: <strong className="text-slate-900">{order.shippingMethod?.carrier || 'BlueDart Express'}</strong></p>
              <p>Service: <strong className="text-slate-900">{order.shippingMethod?.service || 'Standard Delivery'}</strong></p>
              <p>Tracking Number (AWB): <strong className="font-mono text-cyan-800">{order.trackingNumber || 'Not generated yet'}</strong></p>
              <p>Shipment ID: <strong className="font-mono text-slate-700">{order.shipment?.shipmentId || 'None'}</strong></p>
            </div>
          </div>

          {/* Action buttons for fulfillment workflow */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
            {!order.shipment?.shipmentId && (
              <button onClick={handleCreateShipment} className="btn-secondary py-1.5 px-3 text-xs">
                Create Shippo Shipment
              </button>
            )}
            {!order.trackingNumber && (
              <button onClick={handleGenerateLabel} className="btn-primary py-1.5 px-3 text-xs">
                Generate / Purchase Shipping Label
              </button>
            )}
            {order.trackingNumber && (
              <a
                href={order.shipment?.trackingUrl || `https://track.voltcart.com/?awb=${order.trackingNumber}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1"
              >
                View Live Carrier Tracking ↗
              </a>
            )}
          </div>
        </div>

        {/* Ordered items snapshot */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm text-xs">
          <h2 className="text-xs font-black uppercase tracking-wide text-slate-400 mb-3">Order Items Snapshot</h2>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b font-bold text-slate-600">
              <tr>
                <th className="p-2.5">Item</th>
                <th className="p-2.5">SKU</th>
                <th className="p-2.5 text-center">Weight</th>
                <th className="p-2.5 text-center">Qty</th>
                <th className="p-2.5 text-right">Unit Price</th>
                <th className="p-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="p-2.5 font-bold text-slate-900">
                    {item.name}
                    {item.isFragile && <span className="ml-2 rounded bg-red-100 px-1 py-0.5 text-[9px] text-red-700">Fragile</span>}
                  </td>
                  <td className="p-2.5 font-mono text-slate-500">{item.sku || 'VC-SKU'}</td>
                  <td className="p-2.5 text-center text-slate-600">{item.weight || 0.5} kg</td>
                  <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                  <td className="p-2.5 text-right">{formatCurrency(item.price)}</td>
                  <td className="p-2.5 text-right font-black">{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

function AdminCustomers({ state }) {
  const customers = state.store.users.filter((u) => u.role === 'customer');
  return <AdminLayout state={state}><AdminTable title="Customers" rows={customers.map((u) => [u.name, u.email, u.phone, state.store.orders.filter((o) => o.userId === u.id).length, formatCurrency(state.store.orders.filter((o) => o.userId === u.id).reduce((s, o) => s + o.total, 0)), u.active ? 'Active' : 'Inactive'])} /></AdminLayout>;
}

function AdminInventory({ state }) {
  const updateStock = (id, stock) => {
    const next = getStore();
    next.products = next.products.map((p) => p.id === id ? { ...p, stock: Number(stock) } : p);
    saveStore(next);
  };
  return <AdminLayout state={state}><AdminTable title="Inventory" rows={state.store.products.map((p) => [p.sku, p.name, p.stock <= 0 ? 'Out of Stock' : p.stock <= p.lowStockThreshold ? 'Low Stock' : 'In Stock', <input className="input-field w-24" type="number" value={p.stock} onChange={(e) => updateStock(p.id, e.target.value)} />])} /></AdminLayout>;
}

function AdminReviews({ state }) {
  const remove = (id) => { const next = getStore(); next.reviews = next.reviews.filter((r) => r.id !== id); saveStore(next); };
  return <AdminLayout state={state}><AdminTable title="Reviews" rows={state.store.reviews.map((r) => [r.customer, state.store.products.find((p) => p.id === r.productId)?.name, `${r.rating} / 5`, r.content, r.status, <button className="font-bold text-red-600" onClick={() => remove(r.id)}>Delete</button>])} /></AdminLayout>;
}

// ─── Admin Settings with Shipping Origin ──────────────────────────────────────

function AdminSettings({ state }) {
  const [settings, setSettings] = useState(state.store.settings);
  const [origin, setOrigin] = useState(state.store.settings.shippingOrigin || {
    warehouseName: 'VoltCart Central Fulfillment',
    contactName: 'Warehouse Operations Manager',
    phone: '+91 80 4567 8900',
    address: '108 Tech Park Boulevard, Electronic City, Phase 1',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560100',
    country: 'India',
  });

  const save = () => {
    const next = getStore();
    next.settings = { ...settings, shippingOrigin: origin };
    saveStore(next);
    toast.success('Store & Shipping Origin Settings Saved');
  };

  return (
    <AdminLayout state={state}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="rounded-lg border bg-white p-5 shadow-sm text-xs">
          <h2 className="text-lg font-black text-slate-900 mb-4">Store Settings</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Store Name" value={settings.storeName} onChange={(v) => setSettings({ ...settings, storeName: v })} />
            <Input label="Store Email" value={settings.email} onChange={(v) => setSettings({ ...settings, email: v })} />
            <Input label="Store Phone" value={settings.phone} onChange={(v) => setSettings({ ...settings, phone: v })} />
            <Input label="Standard Shipping Charge (INR)" type="number" value={settings.deliveryCharge} onChange={(v) => setSettings({ ...settings, deliveryCharge: Number(v) })} />
            <Input label="Free Shipping Threshold (INR)" type="number" value={settings.freeShippingThreshold} onChange={(v) => setSettings({ ...settings, freeShippingThreshold: Number(v) })} />
            <Input label="Tax / GST Rate (%)" type="number" value={settings.taxRate} onChange={(v) => setSettings({ ...settings, taxRate: Number(v) })} />
          </div>
        </div>

        {/* Shipping Origin Warehouse (Used for Shippo & Shipping Labels) */}
        <div className="rounded-lg border border-cyan-200 bg-white p-5 shadow-sm text-xs">
          <h2 className="text-lg font-black text-slate-900 mb-1">Shipping Origin & Warehouse (Shippo Origin)</h2>
          <p className="text-slate-500 mb-4">Configure the physical origin address used on Shipping Labels and for Shippo shipping rate calculations.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Warehouse / Facility Name *" value={origin.warehouseName} onChange={(v) => setOrigin({ ...origin, warehouseName: v })} />
            <Input label="Contact Person / Manager *" value={origin.contactName} onChange={(v) => setOrigin({ ...origin, contactName: v })} />
            <Input label="Contact Phone *" value={origin.phone} onChange={(v) => setOrigin({ ...origin, phone: v })} />
            <Input label="Warehouse Address Line *" value={origin.address} onChange={(v) => setOrigin({ ...origin, address: v })} />
            <Input label="City *" value={origin.city} onChange={(v) => setOrigin({ ...origin, city: v })} />
            <Input label="State *" value={origin.state} onChange={(v) => setOrigin({ ...origin, state: v })} />
            <Input label="Postal Code / PIN *" value={origin.postalCode} onChange={(v) => setOrigin({ ...origin, postalCode: v })} />
            <Input label="Country *" value={origin.country} onChange={(v) => setOrigin({ ...origin, country: v })} />
          </div>
          <button className="mt-5 btn-primary py-2.5 px-6" onClick={save}>Save Store & Origin Settings</button>
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Shared: Empty state ──────────────────────────────────────────────────────

function Empty({ title, text, action }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm"><h2 className="text-2xl font-black">{title}</h2><p className="mt-2 text-slate-500">{text}</p>{action && <Link className="mt-5 inline-block btn-primary" to={action}>Shop Electronics</Link>}</div>;
}

function StaticPage({ state, title }) {
  return <Shell state={state}><section className="section"><h1 className="text-3xl font-black">{title}</h1><p className="mt-3 max-w-3xl text-slate-600">VoltCart brings smartphones, laptops, audio gear, gaming devices, and accessories into one reliable shopping destination with verified inventory, Shippo logistics tracking, and Razorpay payments.</p></section></Shell>;
}

// ─── App & Router ─────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { borderRadius: '8px', background: '#0f172a', color: '#fff' } }} />
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const state = useVoltCart();

  useEffect(() => {
    applyTheme(getThemePreference());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (getThemePreference() === 'system') applyTheme('system'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Home state={state} />} />
      <Route path="/shop" element={<Shop state={state} />} />
      <Route path="/products" element={<Shop state={state} />} />
      <Route path="/products/:slug" element={<ProductDetail state={state} />} />
      <Route path="/deals" element={<Deals state={state} />} />
      <Route path="/about" element={<StaticPage state={state} title="About VoltCart" />} />
      <Route path="/contact" element={<StaticPage state={state} title="Contact VoltCart" />} />
      <Route path="/cart" element={<Cart state={state} />} />
      <Route path="/wishlist" element={<AccountWishlist state={state} />} />
      <Route path="/checkout" element={<Checkout state={state} />} />
      <Route path="/order-success/:id" element={<OrderSuccess state={state} />} />
      <Route path="/orders" element={<AccountOrders state={state} />} />
      <Route path="/orders/:id" element={<AccountOrderDetail state={state} />} />
      <Route path="/invoice/:id" element={<InvoiceView state={state} />} />
      <Route path="/account" element={<Account state={state} />} />
      <Route path="/account/profile" element={<AccountProfile state={state} />} />
      <Route path="/account/addresses" element={<AccountAddresses state={state} />} />
      <Route path="/account/notifications" element={<AccountNotifications state={state} />} />
      <Route path="/account/settings" element={<AccountSettings state={state} />} />
      <Route path="/profile" element={<Navigate to="/account" replace />} />
      <Route path="/login" element={<Login state={state} />} />
      <Route path="/register" element={<Register state={state} />} />
      
      {/* Admin Fulfillment, Documents & Console */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard" element={<AdminDashboard state={state} />} />
      <Route path="/admin/products" element={<AdminProducts state={state} />} />
      <Route path="/admin/categories" element={<SimpleManager state={state} type="Categories" />} />
      <Route path="/admin/brands" element={<SimpleManager state={state} type="Brands" />} />
      <Route path="/admin/orders" element={<AdminOrders state={state} />} />
      <Route path="/admin/orders/:id" element={<AdminOrderDetail state={state} />} />
      <Route path="/admin/packing-slip/:id" element={<AdminPackingSlip state={state} />} />
      <Route path="/admin/shipping-label/:id" element={<AdminShippingLabel state={state} />} />
      <Route path="/admin/customers" element={<AdminCustomers state={state} />} />
      <Route path="/admin/inventory" element={<AdminInventory state={state} />} />
      <Route path="/admin/coupons" element={<SimpleManager state={state} type="Coupons" />} />
      <Route path="/admin/reviews" element={<AdminReviews state={state} />} />
      <Route path="/admin/analytics" element={<AdminLayout state={state}><AdminCharts state={state} /><AdminDashboardSummary /></AdminLayout>} />
      <Route path="/admin/settings" element={<AdminSettings state={state} />} />
      <Route path="*" element={<StaticPage state={state} title="Page Not Found" />} />
    </Routes>
  );
}

function AdminDashboardSummary() {
  return <div className="rounded-lg border bg-white p-5 shadow-sm"><h2 className="font-black">Analytics Date Ranges</h2><p className="mt-2 text-slate-500">Analytics filtered by Today, Last 7 Days, Last 30 Days, and This Year.</p></div>;
}
