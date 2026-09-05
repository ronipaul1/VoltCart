import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import { orderAPI, paymentAPI, formatCurrency } from '../../utils/api';

export default function OrderSuccess() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const loadOrder = async () => {
      const gateway = searchParams.get('gateway');
      const cashfreeOrderId = searchParams.get('cf_order_id') || searchParams.get('order_id');

      if (gateway === 'cashfree' && cashfreeOrderId) {
        await paymentAPI.verifyCashfree({ order_id: id, cashfree_order_id: cashfreeOrderId }).catch(() => {});
      }

      orderAPI.getById(id).then(({ data }) => setOrder(data.data)).catch(() => {});
    };

    loadOrder();
  }, [id, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl shadow-lg p-10">
          <div className="text-7xl mb-5">🎉</div>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 font-serif">Order Placed!</h1>
          {order && (
            <>
              <p className="text-gray-500 mb-2">Order <strong>#{order.order_number}</strong></p>
              <p className="text-2xl font-bold text-green-700 mb-4">{formatCurrency(order.total_amount)}</p>
              <p className="text-gray-600 text-sm mb-6">We've received your order and will process it shortly. You'll receive a confirmation email.</p>
              <div className="bg-gray-50 rounded-xl p-4 text-left text-sm mb-6 space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">Payment Method</span><span className="font-medium capitalize">{order.payment_method}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Payment Status</span><span className={`font-medium ${order.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>{order.payment_status}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Order Status</span><span className="font-medium capitalize">{order.order_status}</span></div>
              </div>
            </>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={`/orders/${id}`} className="btn-primary">Track Order</Link>
            <Link to="/products" className="btn-secondary">Continue Shopping</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
