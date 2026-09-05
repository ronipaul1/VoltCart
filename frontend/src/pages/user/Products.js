import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import ProductCard from '../../components/user/ProductCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { productAPI, categoryAPI } from '../../utils/api';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading]       = useState(true);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    search:   searchParams.get('search') || '',
    minPrice: '',
    maxPrice: '',
    sort:     'created_at',
    order:    'desc',
    featured: searchParams.get('featured') || '',
    page:     1,
  });

  useEffect(() => { categoryAPI.getAll().then(({ data }) => setCategories(data.data)); }, []);

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      category: searchParams.get('category') || '',
      search:   searchParams.get('search') || '',
      featured: searchParams.get('featured') || '',
      page: 1,
    }));
  }, [searchParams.toString()]);

  useEffect(() => { fetchProducts(); }, [filters]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const { data } = await productAPI.getAll(params);
      setProducts(data.data.products);
      setPagination(data.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  const clearFilters = () => setFilters({ category: '', search: '', minPrice: '', maxPrice: '', sort: 'created_at', order: 'desc', featured: '', page: 1 });

  const SORT_OPTIONS = [
    { value: 'created_at-desc', label: 'Newest First' },
    { value: 'created_at-asc',  label: 'Oldest First' },
    { value: 'price-asc',       label: 'Price: Low to High' },
    { value: 'price-desc',      label: 'Price: High to Low' },
    { value: 'name-asc',        label: 'Name: A-Z' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Sidebar Filters ── */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Filters</h3>
                <button onClick={clearFilters} className="text-xs text-green-700 hover:underline">Clear All</button>
              </div>

              {/* Categories */}
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Category</h4>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="category" checked={filters.category === ''} onChange={() => updateFilter('category', '')} className="accent-green-700" />
                    <span className="text-sm text-gray-600">All Categories</span>
                  </label>
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="category" checked={filters.category === cat.slug} onChange={() => updateFilter('category', cat.slug)} className="accent-green-700" />
                      <span className="text-sm text-gray-600">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Price Range (₹)</h4>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" value={filters.minPrice} onChange={(e) => updateFilter('minPrice', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-600" />
                  <input type="number" placeholder="Max" value={filters.maxPrice} onChange={(e) => updateFilter('maxPrice', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-600" />
                </div>
              </div>

              {/* Quick Price Filters */}
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Quick Price</h4>
                {[['Under ₹200', '', '200'], ['₹200–₹500', '200', '500'], ['₹500–₹1000', '500', '1000'], ['Above ₹1000', '1000', '']].map(([label, min, max]) => (
                  <button key={label} onClick={() => setFilters(p => ({ ...p, minPrice: min, maxPrice: max, page: 1 }))}
                    className={`w-full text-left text-sm py-1.5 px-2 rounded hover:bg-green-50 hover:text-green-800 transition-colors ${filters.minPrice === min && filters.maxPrice === max ? 'bg-green-50 text-green-800 font-medium' : 'text-gray-600'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Featured toggle */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filters.featured === 'true'} onChange={(e) => updateFilter('featured', e.target.checked ? 'true' : '')} className="accent-green-700 w-4 h-4" />
                  <span className="text-sm text-gray-600 font-medium">⭐ Featured Only</span>
                </label>
              </div>
            </div>
          </aside>

          {/* ── Products Grid ── */}
          <main className="flex-1">
            {/* Top bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {filters.search ? `Results for "${filters.search}"` : filters.category ? categories.find(c => c.slug === filters.category)?.name || 'Products' : 'All Products'}
                </h2>
                {!loading && <p className="text-sm text-gray-500">{pagination.totalItems || 0} products found</p>}
              </div>
              <select
                value={`${filters.sort}-${filters.order}`}
                onChange={(e) => {
                  const [sort, order] = e.target.value.split('-');
                  setFilters(p => ({ ...p, sort, order, page: 1 }));
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-600 bg-white"
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Active filter chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {filters.search && <span className="badge bg-green-100 text-green-800">Search: {filters.search} <button onClick={() => updateFilter('search', '')} className="ml-1">×</button></span>}
              {filters.category && <span className="badge bg-blue-100 text-blue-800">{categories.find(c => c.slug === filters.category)?.name} <button onClick={() => updateFilter('category', '')} className="ml-1">×</button></span>}
              {(filters.minPrice || filters.maxPrice) && <span className="badge bg-amber-100 text-amber-800">₹{filters.minPrice || '0'} – ₹{filters.maxPrice || '∞'} <button onClick={() => setFilters(p => ({ ...p, minPrice: '', maxPrice: '' }))} className="ml-1">×</button></span>}
            </div>

            {loading ? (
              <div className="flex justify-center py-24"><LoadingSpinner size="xl" /></div>
            ) : products.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">🌿</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No products found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your filters or search term</p>
                <button onClick={clearFilters} className="btn-primary">Clear Filters</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <button disabled={filters.page <= 1} onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                    {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                      const pg = i + 1;
                      return (
                        <button key={pg} onClick={() => setFilters(p => ({ ...p, page: pg }))}
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${filters.page === pg ? 'bg-green-700 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}>
                          {pg}
                        </button>
                      );
                    })}
                    <button disabled={filters.page >= pagination.totalPages} onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
