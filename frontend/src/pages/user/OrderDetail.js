import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { orderAPI, formatCurrency, formatDate, ORDER_STATUS_STEPS } from '../../utils/api';
import toast from 'react-hot-toast';

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncingTracking, setSyncingTracking] = useState(false);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const { data } = await orderAPI.getById(id);
      setOrder(data.data);
    } catch (_) {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const downloadInvoice = async () => {
    try {
      const { data } = await orderAPI.downloadInvoice(id);
      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${order.order_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (_) {
      toast.error('Failed to download invoice');
    }
  };

  const syncTracking = async () => {
    setSyncingTracking(true);
    try {
      await orderAPI.syncShippoTracking(id);
      await loadOrder();
      toast.success('Tracking updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to refresh tracking');
    } finally {
      setSyncingTracking(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full" /></div>;
  }

  if (!order) {
    return <div className="text-center py-20">Order not found</div>;
  }

  const currentStepIndex = ORDER_STATUS_STEPS.findIndex((step) => step.key === order.order_status);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link to="/orders" className="text-sm text-green-700 hover:underline">← Back to Orders</Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Order #{order.order_number}</h1>
            <p className="text-gray-500 text-sm">{formatDate(order.created_at)}</p>
          </div>
          <div className="flex gap-2">
            {order.tracking_number && (
              <button onClick={syncTracking} disabled={syncingTracking} className="btn-secondary text-sm py-2">
                {syncingTracking ? 'Refreshing...' : 'Refresh Tracking'}
              </button>
            )}
            {order.order_status === 'delivered' && (
              <button onClick={downloadInvoice} className="btn-primary text-sm py-2">Download Invoice</button>
            )}
          </div>
        </div>

        {!['cancelled'].includes(order.order_status) && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-5">
            <h3 className="font-bold text-gray-800 mb-5">Order Tracking</h3>
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              {ORDER_STATUS_STEPS.map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center text-center min-w-[70px]">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mb-1 transition-all ${index <= currentStepIndex ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100 border-2 border-gray-200'}`}>
                      {step.icon}
                    </div>
                    <span className={`text-xs font-medium ${index <= currentStepIndex ? 'text-green-700' : 'text-gray-400'}`}>{step.label}</span>
                  </div>
                  {index < ORDER_STATUS_STEPS.length - 1 && <div className={`h-0.5 w-8 mx-1 ${index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3">Delivery Address</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-medium text-gray-800">{order.full_name}</p>
              <p>{order.address_line1}</p>
              {order.address_line2 && <p>{order.address_line2}</p>}
              <p>{order.city}, {order.state} - {order.pincode}</p>
              <p>{order.addr_phone}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3">Payment Info</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Method</span><span className="font-medium capitalize">{order.payment_method}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={`font-medium ${order.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>{order.payment_status}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">GST</span><span>{formatCurrency(order.gst_amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{parseFloat(order.shipping_amount) === 0 ? 'FREE' : formatCurrency(order.shipping_amount)}</span></div>
              {parseFloat(order.discount_amount) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(order.discount_amount)}</span></div>}
              <div className="flex justify-between font-bold border-t pt-2 text-base"><span>Total</span><span className="text-green-700">{formatCurrency(order.total_amount)}</span></div>
            </div>
          </div>
        </div>

        {(order.shippo_rate_provider || order.tracking_number) && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
            <h3 className="font-bold text-gray-800 mb-4">Shipping Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-gray-500">Carrier</span><span className="font-medium">{order.shippo_rate_provider || 'Pending'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500">Service</span><span className="font-medium">{order.shippo_service_level || 'Pending'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500">Tracking Number</span><span className="font-medium">{order.tracking_number || 'Not generated yet'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500">Tracking Status</span><span className="font-medium capitalize">{order.shippo_tracking_status || 'pending'}</span></div>
              {order.estimated_delivery && <div className="flex justify-between gap-4"><span className="text-gray-500">Estimated Delivery</span><span className="font-medium">{formatDate(order.estimated_delivery)}</span></div>}
              {order.shippo_label_url && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Shipping Label</span>
                  <a href={order.shippo_label_url} target="_blank" rel="noreferrer" className="text-green-700 hover:underline">Open label</a>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
          <h3 className="font-bold text-gray-800 mb-4">Order Items</h3>
          <div className="space-y-4">
            {order.items?.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="w-16 h-16 bg-green-50 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🌿</div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{item.product_name}</p>
                  {order.order_status === 'delivered' && item.product_slug && (
                    item.review_id ? (
                      <span className="inline-block mt-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">Reviewed</span>
                    ) : (
                      <Link to={`/products/${item.product_slug}`} className="inline-block mt-2 text-xs text-green-700 font-medium hover:underline">
                        Write review
                      </Link>
                    )
                  )}
                  <p className="text-sm text-gray-500">Qty: {item.quantity} × {formatCurrency(item.unit_price)}</p>
                  {parseFloat(item.gst_percent) > 0 && <p className="text-xs text-gray-400">GST {item.gst_percent}%: {formatCurrency(item.gst_amount)}</p>}
                </div>
                <p className="font-bold text-gray-900">{formatCurrency(item.total_price)}</p>
              </div>
            ))}
          </div>
        </div>

        {order.tracking?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-4">Tracking History</h3>
            <div className="relative pl-5 border-l-2 border-green-200 space-y-4">
              {order.tracking.map((trackingItem) => (
                <div key={trackingItem.id} className="relative">
                  <div className="absolute -left-6 top-0 w-3 h-3 bg-green-600 rounded-full border-2 border-white" />
                  <p className="font-semibold text-sm text-gray-800">{trackingItem.status}</p>
                  <p className="text-xs text-gray-500">{trackingItem.description}</p>
                  {trackingItem.location && <p className="text-xs text-gray-400">{trackingItem.location}</p>}
                  <p className="text-xs text-gray-400">{formatDate(trackingItem.tracked_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
