import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI, formatCurrency } from '../../utils/api';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function AdminInventory() {
  const [data, setData]         = useState({ products: [], stats: {} });
  const [loading, setLoading]   = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  useEffect(() => { fetchInventory(); }, [lowStockOnly]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data: res } = await adminAPI.getInventory({ lowStock: lowStockOnly ? 'true' : 'false' });
      setData(res.data);
    } finally { setLoading(false); }
  };

  const updateStock = async (id, delta) => {
    try {
      await axios.put(`/products/${id}`, { stock: Math.max(0, delta) });
      toast.success('Stock updated!');
      fetchInventory();
    } catch { toast.error('Failed to update stock'); }
  };

  const { products = [], stats = {} } = data;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-gray-900">Inventory Management</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[['📦', 'Total Products', stats.total_products || 0, 'gray'], ['✅', 'In Stock', (stats.total_products || 0) - (stats.low_stock || 0) - (stats.out_of_stock || 0), 'green'], ['⚠️', 'Low Stock', stats.low_stock || 0, 'amber'], ['❌', 'Out of Stock', stats.out_of_stock || 0, 'red']].map(([icon, label, val, color]) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-xl font-bold text-gray-900">{val}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} className="accent-green-700" />
            <span className="text-sm font-medium text-gray-700">⚠️ Show Low Stock / Out of Stock Only</span>
          </label>
          <span className="text-sm text-gray-500">Inventory value: {formatCurrency(stats.inventory_value || 0)}</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                <tr>{['Product', 'SKU', 'Category', 'Stock', 'Alert At', 'Price', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
                  : products.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 ${p.stock_status === 'out_of_stock' ? 'bg-red-50' : p.stock_status === 'low_stock' ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.sku || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{p.category}</td>
                    <td className="px-4 py-3"><span className={`font-bold ${p.stock === 0 ? 'text-red-600' : p.stock <= p.low_stock_alert ? 'text-orange-600' : 'text-green-700'}`}>{p.stock}</span></td>
                    <td className="px-4 py-3 text-gray-500">{p.low_stock_alert}</td>
                    <td className="px-4 py-3">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${p.stock_status === 'in_stock' ? 'bg-green-100 text-green-700' : p.stock_status === 'low_stock' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {p.stock_status?.replace(/_/g,' ')}
                      </span>
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
