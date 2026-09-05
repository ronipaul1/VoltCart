import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { useCart } from '../../context/CartContext';
import { addressAPI, couponAPI, orderAPI, paymentAPI, formatCurrency } from '../../utils/api';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: 'COD', desc: 'Pay when your order arrives' },
  { id: 'cashfree', label: 'Cashfree', icon: 'CF', desc: 'Cards, UPI, Net Banking, Wallets' },
  { id: 'razorpay', label: 'Razorpay', icon: 'RP', desc: 'Cards, UPI, Net Banking, Wallets' },
  { id: 'upi', label: 'UPI Direct', icon: 'UPI', desc: 'GPay, PhonePe, Paytm, BHIM' },
];

const emptyAddress = {
  full_name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  address_type: 'home',
  is_default: false,
};

const loadCashfreeSdk = () => {
  if (window.Cashfree) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]');
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

export default function Checkout() {
  const { cart, fetchCart } = useCart();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [step, setStep] = useState(1);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState(emptyAddress);
  const [upiId, setUpiId] = useState('');
  const [shippingRates, setShippingRates] = useState([]);
  const [selectedRateId, setSelectedRateId] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingMessage, setShippingMessage] = useState('');

  useEffect(() => {
    fetchAddresses();
    if (!cart.items?.length) navigate('/cart');
  }, []);

  useEffect(() => {
    if (!selectedAddress) {
      setShippingRates([]);
      setSelectedRateId('');
      setShippingMessage('');
      return;
    }

    fetchShippingRates(selectedAddress);
  }, [selectedAddress, cart.items?.length]);

  const fetchAddresses = async () => {
    try {
      const { data } = await addressAPI.getAll();
      const allAddresses = data.data || [];
      setAddresses(allAddresses);
      const defaultAddress = allAddresses.find((address) => address.is_default) || allAddresses[0];
      if (defaultAddress) setSelectedAddress(defaultAddress.id);
    } catch (_) {}
  };

  const fetchShippingRates = async (addressId) => {
    setShippingLoading(true);
    try {
      const { data } = await orderAPI.getShippingRates(addressId);
      const rates = data.data || [];
      setShippingRates(rates);
      setSelectedRateId(rates[0]?.rateId || '');
      setShippingMessage(data.message || '');
    } catch (err) {
      setShippingRates([]);
      setSelectedRateId('');
      setShippingMessage('');
      toast.error(err.response?.data?.message || 'Failed to load shipping options');
    } finally {
      setShippingLoading(false);
    }
  };

  const handleAddAddress = async (event) => {
    event.preventDefault();
    try {
      const { data } = await addressAPI.create(newAddress);
      await fetchAddresses();
      setSelectedAddress(data.data.id);
      setShowAddressForm(false);
      setNewAddress(emptyAddress);
      toast.success('Address added!');
    } catch (_) {
      toast.error('Failed to add address');
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data } = await couponAPI.validate(couponCode, cart.summary?.subtotal || 0);
      setCouponData(data.data);
      toast.success(`Coupon applied! Saved ${formatCurrency(data.data.discount_amount)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon');
      setCouponData(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const selectedRate = shippingRates.find((rate) => rate.rateId === selectedRateId) || null;
  const subtotal = parseFloat(cart.summary?.subtotal || 0);
  const gst = parseFloat(cart.summary?.gst || 0);
  const shipping = selectedRate ? parseFloat(selectedRate.amount || 0) : 0;
  const discount = couponData ? parseFloat(couponData.discount_amount) : 0;
  const total = subtotal + gst + shipping - discount;

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }
    if (!selectedRateId) {
      toast.error('Please select a shipping option');
      return;
    }

    setPlacing(true);
    try {
      const payload = {
        address_id: selectedAddress,
        payment_method: paymentMethod,
        coupon_code: couponCode || undefined,
        notes: upiId ? `UPI ID: ${upiId}` : undefined,
        shippo_rate_id: selectedRate?.rateId !== 'legacy-flat-shipping' ? selectedRate?.rateId : undefined,
        shippo_shipment_id: selectedRate?.rateId !== 'legacy-flat-shipping' ? selectedRate?.shipmentId : undefined,
      };

      const { data } = await orderAPI.place(payload);
      const { orderId, orderNumber } = data.data;

      if (paymentMethod === 'cod') {
        await paymentAPI.processCOD(orderId);
      } else if (paymentMethod === 'razorpay') {
        const { data: rpData } = await paymentAPI.createRazorpay(orderId);
        if (rpData.data.simulated) {
          await paymentAPI.verifyRazorpay({
            razorpay_order_id: rpData.data.id,
            razorpay_payment_id: `sim_${Date.now()}`,
            razorpay_signature: 'simulated',
            order_id: orderId,
          });
        } else if (window.Razorpay) {
          new window.Razorpay({
            key: rpData.key,
            amount: rpData.data.amount,
            currency: 'INR',
            name: 'VoltCart',
            description: `Order #${orderNumber}`,
            order_id: rpData.data.id,
            handler: async (response) => {
              await paymentAPI.verifyRazorpay({ ...response, order_id: orderId });
              navigate(`/order-success/${orderId}`);
            },
            theme: { color: '#2d6a4f' },
          }).open();
          return;
        }
      } else if (paymentMethod === 'cashfree') {
        const { data: cfData } = await paymentAPI.createCashfree(orderId);
        if (cfData.data.simulated) {
          await paymentAPI.verifyCashfree({ order_id: orderId, cashfree_order_id: cfData.data.order_id });
        } else {
          await loadCashfreeSdk();
          const cashfree = window.Cashfree({ mode: cfData.mode || 'sandbox' });
          await cashfree.checkout({
            paymentSessionId: cfData.data.payment_session_id,
            redirectTarget: '_self',
          });
          return;
        }
      }

      await fetchCart();
      navigate(`/order-success/${orderId}`);
    } catch (err) {
      if (Array.isArray(err.response?.data?.data)) {
        setShippingRates(err.response.data.data);
        setSelectedRateId(err.response.data.data[0]?.rateId || '');
      }
      toast.error(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        <div className="flex items-center gap-2 mb-8">
          {['Delivery Address', 'Payment Method', 'Review Order'].map((label, index) => (
            <React.Fragment key={label}>
              <button
                onClick={() => setStep(index + 1)}
                className={`flex items-center gap-2 text-sm font-medium ${step >= index + 1 ? 'text-green-700' : 'text-gray-400'}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= index + 1 ? 'bg-green-700 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {index + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {index < 2 && <div className={`flex-1 h-0.5 ${step > index + 1 ? 'bg-green-700' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 flex items-center justify-between cursor-pointer" onClick={() => setStep(1)}>
                <h3 className="font-bold text-gray-800">1. Delivery Address</h3>
                {selectedAddress && step !== 1 && <span className="text-green-600 text-sm">Selected</span>}
              </div>
              {step === 1 && (
                <div className="p-5">
                  <div className="space-y-3 mb-4">
                    {addresses.map((address) => (
                      <label
                        key={address.id}
                        className={`flex gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedAddress === address.id ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddress === address.id}
                          onChange={() => setSelectedAddress(address.id)}
                          className="accent-green-700 mt-1"
                        />
                        <div className="text-sm">
                          <div className="font-semibold text-gray-800">{address.full_name} · {address.phone}</div>
                          <div className="text-gray-600">{address.address_line1}{address.address_line2 ? `, ${address.address_line2}` : ''}</div>
                          <div className="text-gray-600">{address.city}, {address.state} - {address.pincode}</div>
                          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${address.address_type === 'home' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {address.address_type}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>

                  {showAddressForm ? (
                    <form onSubmit={handleAddAddress} className="border-2 border-dashed border-gray-300 rounded-xl p-4 space-y-3">
                      <h4 className="font-semibold text-gray-700 text-sm">Add New Address</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          ['full_name', 'Full Name', 'text', true, 'col-span-1'],
                          ['phone', 'Phone', 'tel', true, 'col-span-1'],
                          ['address_line1', 'Address Line 1', 'text', true, 'col-span-2'],
                          ['address_line2', 'Address Line 2 (Optional)', 'text', false, 'col-span-2'],
                          ['city', 'City', 'text', true, 'col-span-1'],
                          ['state', 'State', 'text', true, 'col-span-1'],
                          ['pincode', 'Pincode', 'text', true, 'col-span-1'],
                        ].map(([key, label, type, required, span]) => (
                          <div key={key} className={span}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                            <input
                              type={type}
                              required={required}
                              value={newAddress[key]}
                              onChange={(event) => setNewAddress((current) => ({ ...current, [key]: event.target.value }))}
                              className="input-field text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="submit" className="btn-primary text-sm py-2">Save Address</button>
                        <button type="button" onClick={() => setShowAddressForm(false)} className="btn-secondary text-sm py-2">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-600 hover:border-green-400 hover:text-green-700 transition-colors"
                    >
                      + Add New Address
                    </button>
                  )}

                  <button disabled={!selectedAddress} onClick={() => setStep(2)} className="btn-primary mt-4 w-full py-2.5">
                    Continue to Payment →
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 cursor-pointer" onClick={() => setStep(2)}>
                <h3 className="font-bold text-gray-800">2. Payment Method</h3>
              </div>
              {step === 2 && (
                <div className="p-5">
                  <div className="space-y-3 mb-4">
                    {PAYMENT_METHODS.map((method) => (
                      <label
                        key={method.id}
                        className={`flex gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === method.id ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          checked={paymentMethod === method.id}
                          onChange={() => setPaymentMethod(method.id)}
                          className="accent-green-700 mt-0.5"
                        />
                        <div>
                          <div className="font-semibold text-gray-800 text-sm">{method.icon} {method.label}</div>
                          <div className="text-xs text-gray-500">{method.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {paymentMethod === 'upi' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                      <input
                        type="text"
                        placeholder="yourname@upi"
                        value={upiId}
                        onChange={(event) => setUpiId(event.target.value)}
                        className="input-field text-sm"
                      />
                    </div>
                  )}
                  <button onClick={() => setStep(3)} className="btn-primary w-full py-2.5">Continue to Review →</button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 cursor-pointer" onClick={() => setStep(3)}>
                <h3 className="font-bold text-gray-800">3. Review Order</h3>
              </div>
              {step === 3 && (
                <div className="p-5 space-y-5">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Shipping Option</h4>
                    {shippingLoading ? (
                      <p className="text-sm text-gray-500">Loading live shipping rates...</p>
                    ) : shippingRates.length === 0 ? (
                      <p className="text-sm text-red-500">No shipping options available yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {shippingRates.map((rate) => (
                          <label
                            key={rate.rateId}
                            className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedRateId === rate.rateId ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                          >
                            <input
                              type="radio"
                              name="shipping_rate"
                              checked={selectedRateId === rate.rateId}
                              onChange={() => setSelectedRateId(rate.rateId)}
                              className="accent-green-700 mt-1"
                            />
                            <div className="flex-1 text-sm">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="font-semibold text-gray-800">{rate.provider} · {rate.serviceLevel}</p>
                                  <p className="text-xs text-gray-500">
                                    {rate.estimatedDays ? `${rate.estimatedDays} day estimate` : 'Delivery estimate pending'}
                                  </p>
                                </div>
                                <p className="font-bold text-green-700">{formatCurrency(rate.amount)}</p>
                              </div>
                              {rate.durationTerms && <p className="text-xs text-gray-500 mt-1">{rate.durationTerms}</p>}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                    {shippingMessage && <p className="text-xs text-amber-600 mt-2">{shippingMessage}</p>}
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Order Items</h4>
                    <div className="space-y-3">
                      {cart.items?.map((item) => (
                        <div key={item.cart_id} className="flex gap-3 text-sm">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">🌿</div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 line-clamp-1">{item.name}</p>
                            <p className="text-gray-500">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button onClick={handlePlaceOrder} disabled={placing || !selectedRateId} className="btn-primary w-full py-3 text-base">
                    {placing ? 'Placing Order...' : `Place Order · ${formatCurrency(total)}`}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 h-fit sticky top-24">
            <h3 className="font-bold text-gray-800 mb-4">Order Summary</h3>

            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-600 uppercase"
                />
                <button onClick={applyCoupon} disabled={couponLoading} className="bg-green-700 text-white text-sm px-3 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50">
                  {couponLoading ? '...' : 'Apply'}
                </button>
              </div>
              {couponData && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex justify-between items-center text-sm">
                  <span className="text-green-700 font-medium">{couponData.code} applied</span>
                  <button onClick={() => { setCouponData(null); setCouponCode(''); }} className="text-red-500 text-xs">Remove</button>
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm border-t pt-4">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal ({cart.items?.length} items)</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">GST</span><span>{formatCurrency(gst)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span></div>
              {selectedRate && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{selectedRate.provider}</span>
                  <span>{selectedRate.serviceLevel}</span>
                </div>
              )}
              {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(discount)}</span></div>}
              <div className="border-t pt-2 flex justify-between font-bold text-base"><span>Total</span><span className="text-green-700">{formatCurrency(total)}</span></div>
            </div>

            {step === 3 && (
              <button onClick={handlePlaceOrder} disabled={placing || !selectedRateId} className="btn-primary w-full mt-5 py-3 text-base">
                {placing ? 'Placing...' : 'Place Order'}
              </button>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
