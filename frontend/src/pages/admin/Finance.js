import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI, formatCurrency } from '../../utils/api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function AdminFinance() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState({ from: '', to: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await adminAPI.getFinance(dates);
      setData(res.data);
    } finally { setLoading(false); }
  };

  if (loading || !data) return <AdminLayout><div className="text-center py-20 text-gray-400">Loading finance data...</div></AdminLayout>;

  const { revenue, grossProfit, netProfit, profitMargin, monthlyBreakdown = [], expenseByCategory = [] } = data;

  const chartData = {
    labels: monthlyBreakdown.map(m => m.month),
    datasets: [
      { label: 'Revenue', data: monthlyBreakdown.map(m => parseFloat(m.revenue)), backgroundColor: '#2d6a4f', borderRadius: 4 },
      { label: 'GST Collected', data: monthlyBreakdown.map(m => parseFloat(m.gst)), backgroundColor: '#52b788', borderRadius: 4 },
    ],
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900">Finance Report</h1>
          <div className="flex items-center gap-2">
            <input type="date" value={dates.from} onChange={(e) => setDates(d => ({ ...d, from: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none" />
            <span className="text-gray-500 text-sm">to</span>
            <input type="date" value={dates.to} onChange={(e) => setDates(d => ({ ...d, to: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none" />
            <button onClick={fetchData} className="bg-green-700 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-green-800">Apply</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[['💰','Gross Revenue', formatCurrency(revenue?.gross_revenue || 0),'green'], ['📊','Gross Profit', formatCurrency(grossProfit),'blue'], ['✅','Net Profit', formatCurrency(netProfit), parseFloat(netProfit) >= 0 ? 'green' : 'red'], ['%','Profit Margin', `${profitMargin}%`,'purple']].map(([icon,label,val,color]) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-xl font-bold text-gray-900">{val}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[['Total Orders', revenue?.total_orders || 0], ['GST Collected', formatCurrency(revenue?.total_gst_collected || 0)], ['Total Discounts', formatCurrency(revenue?.total_discounts || 0)]].map(([label, val]) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-lg font-bold text-gray-900">{val}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4">Monthly Revenue (Last 12 Months)</h3>
          <div style={{ height: '280px' }}>
            <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#f3f4f6' } } } }} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
