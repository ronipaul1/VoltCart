import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { orderAPI, formatCurrency, formatDate } from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const STATUS_COLORS = { placed:'bg-blue-100 text-blue-800', accepted:'bg-yellow-100 text-yellow-800', shipped:'bg-purple-100 text-purple-800', out_for_delivery:'bg-orange-100 text-orange-800', delivered:'bg-green-100 text-green-800', cancelled:'bg-red-100 text-red-800' };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]  = useState('');

  useEffect(() => { fetchOrders(); }, [filter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await orderAPI.getAll({ status: filter || undefined });
      setOrders(data.data);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-600 bg-white">
            <option value="">All Orders</option>
            {['placed','accepted','shipped','out_for_delivery','delivered','cancelled'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        {loading ? <LoadingSpinner size="lg" /> : orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl">
            <div className="text-6xl mb-3">📦</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No orders yet</h3>
            <Link to="/products" className="btn-primary mt-4 inline-block">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-gray-900">#{order.order_number}</span>
                      <span className={`badge ${STATUS_COLORS[order.order_status] || 'bg-gray-100 text-gray-700'}`}>{order.order_status.replace(/_/g,' ')}</span>
                    </div>
                    <p className="text-sm text-gray-500">{formatDate(order.created_at)} · {order.item_count} item(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(order.total_amount)}</p>
                    <p className="text-xs text-gray-500 capitalize">{order.payment_method}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Link to={`/orders/${order.id}`} className="text-sm text-green-700 font-medium hover:underline">View Details →</Link>
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
