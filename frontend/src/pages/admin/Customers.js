import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI, formatCurrency, formatDate } from '../../utils/api';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  useEffect(() => { fetchCustomers(); }, []);
  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getAllCustomers({ search });
      setCustomers(data.data || []);
    } finally { setLoading(false); }
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Customer Management</h1>
          <span className="text-sm text-gray-500">{customers.length} customers</span>
        </div>
        <input type="text" placeholder="Search by name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-green-600" />
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                <tr>{['Customer', 'Phone', 'Orders', 'Total Spent', 'Joined', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
                  : customers.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-800 font-bold text-sm">{c.name?.charAt(0)}</div>
                        <div><p className="font-medium text-gray-800">{c.name}</p><p className="text-xs text-gray-400">{c.email}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{c.total_orders}</td>
                    <td className="px-4 py-3 font-bold text-green-700">{formatCurrency(c.total_spent)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3"><span className={`badge ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.is_active ? 'Active' : 'Blocked'}</span></td>
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
