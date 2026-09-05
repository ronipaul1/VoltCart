import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { couponAPI, formatCurrency, formatDate } from '../../utils/api';
import toast from 'react-hot-toast';

const emptyForm = { code: '', description: '', discount_type: 'percentage', discount_value: '', min_order_amount: '', max_discount_amount: '', usage_limit: '', expires_at: '' };

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    const { data } = await couponAPI.getAll();
    setCoupons(data.data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await couponAPI.create(form);
      toast.success('Coupon created!');
      await fetchCoupons();
      setShowForm(false); setForm(emptyForm);
    } catch { toast.error('Failed to create coupon'); }
    finally { setSaving(false); }
  };

  const toggleCoupon = async (id, is_active) => {
    await couponAPI.update(id, { is_active: !is_active });
    fetchCoupons();
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Coupon Management</h1>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm py-2">+ Create Coupon</button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-4">Create New Coupon</h3>
            <div className="grid grid-cols-2 gap-4">
              {[['code','Code','text',true],['description','Description','text',false],['discount_value','Discount Value','number',true],['min_order_amount','Min Order Amount (₹)','number',false],['max_discount_amount','Max Discount (₹)','number',false],['usage_limit','Usage Limit','number',false]].map(([key,label,type,req]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} required={req} value={form[key]} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))} className="input-field text-sm" />
                </div>
              ))}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <select value={form.discount_type} onChange={(e) => setForm(f => ({ ...f, discount_type: e.target.value }))} className="input-field text-sm">
                  <option value="percentage">Percentage (%)</option><option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input type="date" value={form.expires_at} onChange={(e) => setForm(f => ({ ...f, expires_at: e.target.value }))} className="input-field text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" disabled={saving} className="btn-primary text-sm py-2">{saving ? 'Creating...' : 'Create Coupon'}</button>
              <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }} className="btn-secondary text-sm py-2">Cancel</button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                <tr>{['Code', 'Description', 'Type', 'Value', 'Min Order', 'Used/Limit', 'Expires', 'Status', 'Action'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900 font-mono">{c.code}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-32 truncate">{c.description || '—'}</td>
                    <td className="px-4 py-3 capitalize text-xs">{c.discount_type}</td>
                    <td className="px-4 py-3 font-semibold">{c.discount_type === 'percentage' ? `${c.discount_value}%` : formatCurrency(c.discount_value)}</td>
                    <td className="px-4 py-3">{formatCurrency(c.min_order_amount)}</td>
                    <td className="px-4 py-3">{c.used_count}/{c.usage_limit || '∞'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{c.expires_at ? formatDate(c.expires_at) : 'Never'}</td>
                    <td className="px-4 py-3"><span className={`badge ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3"><button onClick={() => toggleCoupon(c.id, c.is_active)} className={`text-xs px-2 py-1 rounded ${c.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>{c.is_active ? 'Disable' : 'Enable'}</button></td>
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
