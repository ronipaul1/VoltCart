import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI, formatCurrency, formatDate } from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

const STATUS_COLORS = { placed: 'bg-blue-100 text-blue-800', accepted: 'bg-yellow-100 text-yellow-800', shipped: 'bg-purple-100 text-purple-800', out_for_delivery: 'bg-orange-100 text-orange-800', delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800' };

const StatCard = ({ icon, title, value, sub, color = 'green', link }) => (
  <Link to={link || '#'} className={`bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-12 h-12 bg-${color}-100 rounded-xl flex items-center justify-center text-2xl`}>{icon}</div>
    </div>
  </Link>
);

export default function AdminDashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getDashboard()
      .then(res => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><div className="flex justify-center py-20"><LoadingSpinner size="xl" /></div></AdminLayout>;

  const { totals, monthlyRevenue = [], topProducts = [], recentOrders = [], orderStatusDist = [], categoryRevenue = [], weeklyOrders = [] } = data || {};

  const revenueChartData = {
    labels: monthlyRevenue.map(m => m.label),
    datasets: [
      { label: 'Revenue (₹)', data: monthlyRevenue.map(m => parseFloat(m.revenue)), backgroundColor: 'rgba(45,106,79,0.15)', borderColor: '#2d6a4f', borderWidth: 2, tension: 0.4, fill: true, pointBackgroundColor: '#2d6a4f' },
      { label: 'Orders', data: monthlyRevenue.map(m => m.orders), backgroundColor: 'rgba(244,162,97,0.15)', borderColor: '#f4a261', borderWidth: 2, tension: 0.4, fill: false, yAxisID: 'y1', pointBackgroundColor: '#f4a261' },
    ],
  };

  const categoryChartData = {
    labels: categoryRevenue.map(c => c.category),
    datasets: [{ data: categoryRevenue.map(c => parseFloat(c.revenue)), backgroundColor: ['#2d6a4f','#52b788','#f4a261','#e76f51','#264653','#2a9d8f'], borderWidth: 0 }],
  };

  const weeklyChartData = {
    labels: weeklyOrders.map(d => new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })),
    datasets: [{ label: 'Orders', data: weeklyOrders.map(d => d.orders), backgroundColor: '#2d6a4f', borderRadius: 6 }],
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-500 text-sm mt-0.5">Welcome back! Here's what's happening today.</p>
          </div>
          <div className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard icon="💰" title="Total Revenue" value={formatCurrency(totals?.total_revenue || 0)} color="green" link="/admin/finance" />
          <StatCard icon="📦" title="Total Orders" value={totals?.total_orders || 0} color="blue" link="/admin/orders" />
          <StatCard icon="👥" title="Customers" value={totals?.total_customers || 0} color="purple" link="/admin/customers" />
          <StatCard icon="🌿" title="Products" value={totals?.total_products || 0} color="amber" link="/admin/products" />
          <StatCard icon="⏳" title="Pending Orders" value={totals?.pending_orders || 0} sub="Needs attention" color="orange" link="/admin/orders?status=placed" />
          <StatCard icon="⚠️" title="Low Stock" value={totals?.low_stock_count || 0} sub="Items to reorder" color="red" link="/admin/inventory" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-4">Revenue & Orders (12 Months)</h3>
            <div style={{ height: '280px' }}>
              <Line data={revenueChartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' } }, y1: { type: 'linear', display: true, position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } } }, plugins: { legend: { position: 'top' } } }} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-4">Revenue by Category</h3>
            <div style={{ height: '240px' }}>
              <Doughnut data={categoryChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }, cutout: '65%' }} />
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-4">This Week's Orders</h3>
            <div style={{ height: '220px' }}>
              <Bar data={weeklyChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#f3f4f6' } } } }} />
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-4">Top Products</h3>
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.units_sold} units sold</p>
                  </div>
                  <span className="text-sm font-bold text-green-700">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
              {!topProducts.length && <p className="text-sm text-gray-400 text-center py-4">No sales data yet</p>}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Recent Orders</h3>
              <Link to="/admin/orders" className="text-xs text-green-700 hover:underline">View all →</Link>
            </div>
            <div className="space-y-3">
              {recentOrders.slice(0, 6).map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">#{o.order_number}</p>
                    <p className="text-xs text-gray-500 truncate">{o.customer_name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[o.order_status] || 'bg-gray-100 text-gray-600'}`}>{o.order_status}</span>
                    <span className="text-xs font-bold text-gray-900">{formatCurrency(o.total_amount)}</span>
                  </div>
                </div>
              ))}
              {!recentOrders.length && <p className="text-sm text-gray-400 text-center py-4">No orders yet</p>}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
