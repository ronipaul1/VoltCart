import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI, orderAPI, formatCurrency, formatDate } from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  placed: 'bg-blue-100 text-blue-800',
  accepted: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  out_for_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const NEXT_STATUS = {
  placed: 'accepted',
  accepted: 'processing',
  processing: 'shipped',
  shipped: 'out_for_delivery',
  out_for_delivery: 'delivered',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [busyId, setBusyId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getOrders({ ...filters });
      setOrders(data.data.orders || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const updateStatus = async (orderId, status) => {
    setBusyId(orderId);
    try {
      await orderAPI.updateStatus(orderId, { status });
      toast.success(`Order updated to ${status}`);
      await fetchOrders();
    } catch (_) {
      toast.error('Failed to update order status');
    } finally {
      setBusyId(null);
    }
  };

  const createShippoLabel = async (orderId) => {
    setBusyId(orderId);
    try {
      await orderAPI.createShippoLabel(orderId);
      toast.success('Shippo label created');
      await fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create Shippo label');
    } finally {
      setBusyId(null);
    }
  };

  const openBlobInNewTab = (blob, fallbackName) => {
    const fileUrl = window.URL.createObjectURL(blob);
    const newWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer');

    if (!newWindow) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fallbackName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60_000);
  };

  const openInvoice = async (order) => {
    setBusyId(order.id);
    try {
      const { data } = await adminAPI.downloadOrderInvoice(order.id);
      openBlobInNewTab(new Blob([data], { type: 'application/pdf' }), `invoice-${order.order_number}.pdf`);
    } catch (_) {
      toast.error('Failed to open invoice');
    } finally {
      setBusyId(null);
    }
  };

  const openShippingLabel = async (order) => {
    setBusyId(order.id);
    try {
      const { data } = await adminAPI.downloadShippingLabel(order.id);
      openBlobInNewTab(new Blob([data], { type: 'application/pdf' }), `label-${order.order_number}.pdf`);
    } catch (_) {
      toast.error('Failed to open shipping label');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Order Management</h1>
          <span className="text-sm text-gray-500">{orders.length} orders</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search order number or customer..."
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-600"
          />
          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none bg-white"
          >
            <option value="">All Status</option>
            {Object.keys(STATUS_COLORS).map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  {['Order #', 'Customer', 'Items', 'Amount', 'Shipping', 'Status', 'Date', 'Actions'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">No orders found</td></tr>
                ) : orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 font-medium text-gray-800">#{order.order_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{order.customer_name}</p>
                      <p className="text-xs text-gray-400">{order.customer_email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{order.item_count}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(order.total_amount)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <p>{order.shippo_rate_provider || 'Store shipping'}</p>
                      <p className="text-gray-400">{order.shippo_service_level || 'Standard'}</p>
                      {order.tracking_number && <p className="text-green-700 mt-1">{order.tracking_number}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <span className={`badge ${STATUS_COLORS[order.order_status] || 'bg-gray-100 text-gray-700'}`}>{order.order_status?.replace(/_/g, ' ')}</span>
                        {order.shippo_tracking_status && <p className="text-xs text-gray-500 capitalize">{order.shippo_tracking_status}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2 min-w-[140px]">
                        {order.shippo_rate_provider && !order.shippo_transaction_id && (
                          <button
                            onClick={() => createShippoLabel(order.id)}
                            disabled={busyId === order.id}
                            className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-60"
                          >
                            {busyId === order.id ? 'Working...' : 'Create Label'}
                          </button>
                        )}
                        <button
                          onClick={() => openShippingLabel(order)}
                          disabled={busyId === order.id}
                          className="text-xs bg-amber-100 text-amber-900 px-3 py-1.5 rounded-lg hover:bg-amber-200 disabled:opacity-60"
                        >
                          {busyId === order.id ? 'Working...' : 'Open Label PDF'}
                        </button>
                        <button
                          onClick={() => openInvoice(order)}
                          disabled={busyId === order.id}
                          className="text-xs bg-blue-100 text-blue-900 px-3 py-1.5 rounded-lg hover:bg-blue-200 disabled:opacity-60"
                        >
                          {busyId === order.id ? 'Working...' : 'Open Invoice'}
                        </button>
                        {NEXT_STATUS[order.order_status] && (
                          <button
                            onClick={() => updateStatus(order.id, NEXT_STATUS[order.order_status])}
                            disabled={busyId === order.id}
                            className="text-xs bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-800 whitespace-nowrap disabled:opacity-60"
                          >
                            {busyId === order.id ? 'Working...' : `→ ${NEXT_STATUS[order.order_status]?.replace(/_/g, ' ')}`}
                          </button>
                        )}
                        {order.shippo_label_url && (
                          <a href={order.shippo_label_url} target="_blank" rel="noreferrer" className="text-xs text-green-700 hover:underline">
                            Open Label
                          </a>
                        )}
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
