import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('profile');

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await axios.put('/auth/profile', form);
      updateUser(data.data);
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await axios.put('/auth/change-password', { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      toast.success('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password'); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Account</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-green-700 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">{user?.name?.charAt(0)}</div>
                <p className="font-semibold text-sm text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <nav className="space-y-1">
                {[['profile','👤 Profile'], ['password','🔒 Password'], ['orders','📦 Orders'], ['addresses','📍 Addresses']].map(([key, label]) => (
                  <button key={key} onClick={() => setTab(key)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${tab === key ? 'bg-green-50 text-green-800 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>{label}</button>
                ))}
              </nav>
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              {tab === 'profile' && (
                <form onSubmit={handleProfileUpdate}>
                  <h3 className="font-bold text-gray-800 mb-5">Profile Information</h3>
                  <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                      <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Email (read-only)</label>
                      <input type="email" value={user?.email} disabled className="input-field bg-gray-50 text-gray-500 cursor-not-allowed" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                      <input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" /></div>
                  </div>
                  <button type="submit" disabled={saving} className="btn-primary mt-5">{saving ? 'Saving...' : 'Save Changes'}</button>
                </form>
              )}
              {tab === 'password' && (
                <form onSubmit={handlePasswordChange}>
                  <h3 className="font-bold text-gray-800 mb-5">Change Password</h3>
                  <div className="space-y-4">
                    {[['currentPassword','Current Password'], ['newPassword','New Password'], ['confirmPassword','Confirm New Password']].map(([key, label]) => (
                      <div key={key}><label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                        <input type="password" value={passwordForm[key]} onChange={(e) => setPasswordForm(f => ({ ...f, [key]: e.target.value }))} className="input-field" /></div>
                    ))}
                  </div>
                  <button type="submit" disabled={saving} className="btn-primary mt-5">{saving ? 'Updating...' : 'Change Password'}</button>
                </form>
              )}
              {tab === 'orders' && (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">View all your orders and their status</p>
                  <Link to="/orders" className="btn-primary">View My Orders</Link>
                </div>
              )}
              {tab === 'addresses' && (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Manage your delivery addresses</p>
                  <Link to="/addresses" className="btn-primary">Manage Addresses</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
