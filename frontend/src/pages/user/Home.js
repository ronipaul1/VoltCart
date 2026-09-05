import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import ProductCard from '../../components/user/ProductCard';
import { productAPI, categoryAPI } from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const HERO_SLIDES = [
  {
    title: 'Pure Nature, Pure Wellness',
    subtitle: 'Discover smartphones, laptops, audio, gaming gear, and accessories',
    cta: 'Shop Now',
    link: '/products',
    bg: 'from-green-900 to-green-700',
    badge: '🌿 100% Organic',
    image: '🫙',
  },
  {
    title: 'Premium A2 Cow Ghee',
    subtitle: 'Traditional bilona method. Rich in nutrients. Pure goodness.',
    cta: 'Explore Ghee',
    link: '/products?category=oils-ghee',
    bg: 'from-amber-900 to-amber-700',
    badge: '⭐ Best Seller',
    image: '🍯',
  },
  {
    title: 'Boost Your Immunity',
    subtitle: 'Chyawanprash, Ashwagandha & more. Strengthen from within.',
    cta: 'Shop Immunity',
    link: '/products?category=immunity-boosters',
    bg: 'from-teal-900 to-teal-700',
    badge: '💚 Ayurvedic',
    image: '🌱',
  },
];

const CATEGORIES_DISPLAY = [
  { name: 'Oils & Ghee', slug: 'oils-ghee', emoji: '🫙', color: 'bg-amber-50 border-amber-200 hover:bg-amber-100' },
  { name: 'Smartphones', slug: 'smartphones', emoji: 'PH', color: 'bg-green-50 border-green-200 hover:bg-green-100' },
  { name: 'Laptops', slug: 'laptops', emoji: 'LT', color: 'bg-teal-50 border-teal-200 hover:bg-teal-100' },
  { name: 'Audio', slug: 'headphones', emoji: 'AU', color: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
  { name: 'Skincare', slug: 'skincare', emoji: '✨', color: 'bg-pink-50 border-pink-200 hover:bg-pink-100' },
  { name: 'Immunity Boosters', slug: 'immunity-boosters', emoji: '🛡️', color: 'bg-purple-50 border-purple-200 hover:bg-purple-100' },
];

export default function Home() {
  const navigate = useNavigate();
  const [featured, setFeatured]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [heroIndex, setHeroIndex]     = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchFeatured();
    const timer = setInterval(() => setHeroIndex(i => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchFeatured = async () => {
    try {
      const { data } = await productAPI.getAll({ featured: 'true', limit: 8 });
      setFeatured(data.data.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const hero = HERO_SLIDES[heroIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Hero Section ────────────────────────────── */}
      <section className={`relative bg-gradient-to-r ${hero.bg} text-white transition-all duration-700`}>
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <span className="inline-block bg-white/20 backdrop-blur text-white text-sm font-medium px-3 py-1 rounded-full mb-4">
              {hero.badge}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold font-serif leading-tight mb-4">{hero.title}</h1>
            <p className="text-lg text-white/90 mb-6 max-w-xl">{hero.subtitle}</p>

            {/* Search in hero */}
            <div className="flex gap-2 max-w-md mb-6">
              <input
                type="text"
                placeholder="Search for remedies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/products?search=${searchQuery}`)}
                className="flex-1 rounded-lg px-4 py-2.5 text-gray-900 text-sm outline-none"
              />
              <button
                onClick={() => navigate(`/products?search=${searchQuery}`)}
                className="bg-amber-500 hover:bg-amber-400 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors text-sm"
              >
                Search
              </button>
            </div>

            <Link to={hero.link} className="inline-block bg-white text-green-800 font-bold px-8 py-3 rounded-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              {hero.cta} →
            </Link>
          </div>
          <div className="text-9xl md:text-[160px] select-none opacity-80 hidden md:block">{hero.image}</div>
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button key={i} onClick={() => setHeroIndex(i)} className={`rounded-full transition-all ${i === heroIndex ? 'bg-white w-6 h-2' : 'bg-white/50 w-2 h-2'}`} />
          ))}
        </div>
      </section>

      {/* ── Trust Bar ────────────────────────────────── */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
          {[['🌿', '100% Natural', 'No preservatives'], ['SH', 'Product Shipping', 'Free or calculated per item'], ['🔒', 'Secure Payments', 'Razorpay & Cashfree'], ['↩️', '7-day Returns', 'Hassle-free']].map(([icon, title, sub]) => (
            <div key={title} className="flex items-center gap-3 justify-center md:justify-start">
              <span className="text-2xl">{icon}</span>
              <div className="text-left">
                <p className="font-semibold text-gray-800">{title}</p>
                <p className="text-xs text-gray-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Categories ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Shop by Category</h2>
            <p className="text-gray-500 text-sm mt-1">Find remedies that suit your needs</p>
          </div>
          <Link to="/products" className="text-green-700 hover:text-green-800 font-medium text-sm">View all →</Link>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {CATEGORIES_DISPLAY.map((cat) => (
            <Link
              key={cat.slug}
              to={`/products?category=${cat.slug}`}
              className={`${cat.color} border-2 rounded-xl p-4 text-center transition-all hover:shadow-md hover:-translate-y-1 duration-200`}
            >
              <div className="text-3xl mb-2">{cat.emoji}</div>
              <p className="text-xs font-semibold text-gray-700 leading-tight">{cat.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Promo Banner ─────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-white text-center md:text-left">
            <p className="text-sm font-medium opacity-90 mb-1">Limited Time Offer</p>
            <h3 className="text-2xl font-bold font-serif">Get 10% off your first order!</h3>
            <p className="text-sm opacity-80 mt-1">Use code <strong>WELCOME10</strong> at checkout</p>
          </div>
          <Link to="/products" className="bg-white text-amber-600 font-bold px-8 py-3 rounded-lg hover:bg-amber-50 transition-colors shadow-lg whitespace-nowrap">
            Claim Offer →
          </Link>
        </div>
      </section>

      {/* ── Featured Products ────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
            <p className="text-gray-500 text-sm mt-1">Our best-selling natural remedies</p>
          </div>
          <Link to="/products?featured=true" className="text-green-700 hover:text-green-800 font-medium text-sm">View all →</Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="xl" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* ── Why Choose Us ─────────────────────────────── */}
      <section className="bg-green-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold font-serif mb-2">Why VoltCart?</h2>
          <p className="text-green-300 mb-10">Trusted by thousands of families across India</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              ['🌿', 'Certified Organic', 'All products are 100% natural, free from artificial additives, preservatives, and chemicals.'],
              ['🔬', 'Quality Tested', 'Every batch is lab-tested for purity and potency. We never compromise on quality.'],
              ['🏺', 'Ancient Wisdom', 'Formulations based on traditional Ayurvedic recipes passed down through generations.'],
            ].map(([icon, title, desc]) => (
              <div key={title} className="bg-green-800 rounded-xl p-6 hover:bg-green-700 transition-colors">
                <div className="text-4xl mb-3">{icon}</div>
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-green-300 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
