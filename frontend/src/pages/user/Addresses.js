import React, { useState, useEffect } from 'react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { addressAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const emptyAddr = { full_name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '', address_type: 'home', is_default: false };

export default function Addresses() {
  const [addresses, setAddresses]   = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(emptyAddr);

  useEffect(() => { fetchAddresses(); }, []);

  const fetchAddresses = async () => {
    const { data } = await addressAPI.getAll();
    setAddresses(data.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await addressAPI.update(editing, form); toast.success('Address updated!'); }
      else { await addressAPI.create(form); toast.success('Address added!'); }
      await fetchAddresses();
      setShowForm(false); setEditing(null); setForm(emptyAddr);
    } catch { toast.error('Failed to save address'); }
  };

  const handleEdit = (addr) => { setEditing(addr.id); setForm({ ...addr }); setShowForm(true); };
  const handleDelete = async (id) => { if (window.confirm('Delete this address?')) { await addressAPI.delete(id); fetchAddresses(); toast.success('Deleted!'); } };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Addresses</h1>
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyAddr); }} className="btn-primary text-sm py-2">+ Add Address</button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 mb-5">
            <h3 className="font-bold text-gray-800 mb-4">{editing ? 'Edit Address' : 'Add New Address'}</h3>
            <div className="grid grid-cols-2 gap-4">
              {[['full_name','Full Name','text',true,'col-span-1'], ['phone','Phone','tel',true,'col-span-1'], ['address_line1','Address Line 1','text',true,'col-span-2'], ['address_line2','Address Line 2 (Optional)','text',false,'col-span-2'], ['city','City','text',true,'col-span-1'], ['state','State','text',true,'col-span-1'], ['pincode','Pincode','text',true,'col-span-1']].map(([key,label,type,req,span]) => (
                <div key={key} className={span}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} required={req} value={form[key] || ''} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))} className="input-field text-sm" />
                </div>
              ))}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.address_type} onChange={(e) => setForm(f => ({ ...f, address_type: e.target.value }))} className="input-field text-sm">
                  <option value="home">Home</option><option value="work">Work</option><option value="other">Other</option>
                </select>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="is_default" checked={form.is_default} onChange={(e) => setForm(f => ({ ...f, is_default: e.target.checked }))} className="accent-green-700" />
                <label htmlFor="is_default" className="text-sm text-gray-700">Set as default address</label>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" className="btn-primary text-sm py-2">{editing ? 'Update Address' : 'Save Address'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyAddr); }} className="btn-secondary text-sm py-2">Cancel</button>
            </div>
          </form>
        )}

        {addresses.length === 0 && !showForm ? (
          <div className="text-center py-16 bg-white rounded-2xl">
            <div className="text-5xl mb-3">📍</div>
            <p className="text-gray-500">No addresses saved yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((addr) => (
              <div key={addr.id} className={`bg-white rounded-xl border-2 p-5 ${addr.is_default ? 'border-green-400' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between">
                  <div className="text-sm text-gray-700 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{addr.full_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${addr.address_type === 'home' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{addr.address_type}</span>
                      {addr.is_default && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Default</span>}
                    </div>
                    <p>{addr.phone}</p>
                    <p>{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}</p>
                    <p>{addr.city}, {addr.state} – {addr.pincode}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(addr)} className="text-sm text-green-700 border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50">Edit</button>
                    <button onClick={() => handleDelete(addr.id)} className="text-sm text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">Delete</button>
                  </div>
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
