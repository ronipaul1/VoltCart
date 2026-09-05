import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { productAPI, categoryAPI, formatCurrency, getImageUrl } from '../../utils/api';
import toast from 'react-hot-toast';

const emptyProduct = { category_id: '', name: '', short_description: '', description: '', sku: '', price: '', compare_price: '', cost_price: '', shipping_amount: '0', free_shipping: true, gst_percent: '5', stock: '', unit: 'piece', is_featured: false };

export default function AdminProducts() {
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(emptyProduct);
  const [editing, setEditing]     = useState(null);
  const [currentImages, setCurrentImages] = useState([]);
  const [deletingImage, setDeletingImage] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    fetchProducts();
    categoryAPI.getAll().then(({ data }) => setCategories(data.data));
  }, []);

  const fetchProducts = async () => {
    const { data } = await productAPI.getAll({ limit: 50 });
    setProducts(data.data.products || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'images' || v === '' || v === null) return;
        formData.append(k, v);
      });
      if (form.images?.length) {
        Array.from(form.images).forEach((file) => formData.append('images', file));
      }
      if (editing) { await productAPI.update(editing, formData); toast.success('Product updated!'); }
      else { await productAPI.create(formData); toast.success('Product created!'); }
      await fetchProducts();
      setShowForm(false); setEditing(null); setCurrentImages([]); setForm(emptyProduct);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save product'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (p) => {
    setEditing(p.id);
    setCurrentImages([]);
    setForm({ category_id: p.category_id, name: p.name, short_description: p.short_description || '', description: p.description || '', sku: p.sku || '', price: p.price, compare_price: p.compare_price || '', cost_price: p.cost_price || '', shipping_amount: p.shipping_amount || '0', free_shipping: p.free_shipping === 1 || p.free_shipping === true, gst_percent: p.gst_percent, stock: p.stock, unit: p.unit || 'piece', is_featured: p.is_featured === 1 });
    setShowForm(true);

    try {
      const { data } = await productAPI.getBySlug(p.slug);
      setCurrentImages(data.data.images || []);
    } catch (_) {
      toast.error('Failed to load product images');
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!editing || !window.confirm('Delete this product photo?')) return;

    setDeletingImage(imageId);
    try {
      await productAPI.deleteImage(editing, imageId);
      setCurrentImages((images) => images.filter((image) => image.id !== imageId));
      await fetchProducts();
      toast.success('Photo deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete photo');
    } finally {
      setDeletingImage(null);
    }
  };
  const handleDelete = async (id) => { if (window.confirm('Deactivate this product?')) { await productAPI.delete(id); fetchProducts(); toast.success('Product deactivated'); } };

  const filtered = products.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Product Management</h1>
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setCurrentImages([]); setForm(emptyProduct); }} className="btn-primary text-sm py-2">+ Add Product</button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-5">{editing ? 'Edit Product' : 'Add New Product'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select required value={form.category_id} onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))} className="input-field text-sm">
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input type="text" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <input type="text" value={form.sku} onChange={(e) => setForm(f => ({ ...f, sku: e.target.value }))} className="input-field text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input type="text" value={form.unit} onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="piece, ml, g, kg" className="input-field text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                <input type="number" required step="0.01" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} className="input-field text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Compare Price (₹)</label>
                <input type="number" step="0.01" value={form.compare_price} onChange={(e) => setForm(f => ({ ...f, compare_price: e.target.value }))} className="input-field text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (₹)</label>
                <input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm(f => ({ ...f, cost_price: e.target.value }))} className="input-field text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Shipping Cost (₹)</label>
                <input type="number" step="0.01" min="0" disabled={form.free_shipping} value={form.free_shipping ? '0' : form.shipping_amount} onChange={(e) => setForm(f => ({ ...f, shipping_amount: e.target.value }))} className="input-field text-sm disabled:bg-gray-100 disabled:text-gray-400" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">GST % (auto-calculated)</label>
                <select value={form.gst_percent} onChange={(e) => setForm(f => ({ ...f, gst_percent: e.target.value }))} className="input-field text-sm">
                  {[0,5,12,18,28].map(g => <option key={g} value={g}>{g}%</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
                <input type="number" required value={form.stock} onChange={(e) => setForm(f => ({ ...f, stock: e.target.value }))} className="input-field text-sm" /></div>
              <div className="flex items-center gap-2 mt-5">
                <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm(f => ({ ...f, is_featured: e.target.checked }))} id="featured" className="accent-green-700" />
                <label htmlFor="featured" className="text-sm text-gray-700">Featured Product</label>
              </div>
              <div className="flex items-center gap-2 mt-5">
                <input type="checkbox" checked={form.free_shipping} onChange={(e) => setForm(f => ({ ...f, free_shipping: e.target.checked, shipping_amount: e.target.checked ? '0' : f.shipping_amount }))} id="free_shipping" className="accent-green-700" />
                <label htmlFor="free_shipping" className="text-sm text-gray-700">Free Shipping</label>
              </div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
                <input type="text" value={form.short_description} onChange={(e) => setForm(f => ({ ...f, short_description: e.target.value }))} className="input-field text-sm" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Full Description</label>
                <textarea rows={4} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="input-field text-sm" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Product Images</label>
                <input type="file" multiple accept="image/*" onChange={(e) => setForm(f => ({ ...f, images: e.target.files }))} className="input-field text-sm" />
                {editing && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Current Photos</p>
                    {currentImages.length ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {currentImages.map((image) => (
                          <div key={image.id} className="relative border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                            <img src={getImageUrl(image.image_url)} alt={form.name || 'Product'} className="w-full aspect-square object-cover" />
                            {image.is_primary === 1 || image.is_primary === true ? (
                              <span className="absolute top-2 left-2 bg-green-700 text-white text-[10px] px-2 py-0.5 rounded">Primary</span>
                            ) : null}
                            <button
                              type="button"
                              disabled={deletingImage === image.id}
                              onClick={() => handleDeleteImage(image.id)}
                              className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700 disabled:opacity-60"
                            >
                              {deletingImage === image.id ? '...' : 'Delete'}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No photos uploaded yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            {form.price && form.gst_percent && (
              <p className="text-sm text-green-700 mt-3 bg-green-50 px-3 py-2 rounded-lg">
                Price with GST ({form.gst_percent}%): ₹{(parseFloat(form.price || 0) * (1 + parseFloat(form.gst_percent || 0)/100)).toFixed(2)}
              </p>
            )}
            <div className="flex gap-3 mt-5">
              <button type="submit" disabled={saving} className="btn-primary text-sm py-2">{saving ? 'Saving...' : editing ? 'Update Product' : 'Create Product'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); setCurrentImages([]); setForm(emptyProduct); }} className="btn-secondary text-sm py-2">Cancel</button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b"><input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-600" /></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                <tr>{['Product', 'SKU', 'Category', 'Price', 'GST', 'Price+GST', 'Shipping', 'Stock', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.unit}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.sku || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{p.category_name}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{p.gst_percent}%</td>
                    <td className="px-4 py-3 font-medium text-green-700">{formatCurrency(p.price_with_gst)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{p.free_shipping ? 'Free' : formatCurrency(p.shipping_amount || 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium text-xs ${p.stock === 0 ? 'text-red-600' : p.stock <= 10 ? 'text-orange-600' : 'text-green-700'}`}>{p.stock}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(p)} className="text-xs text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(p.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                      </div>
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
