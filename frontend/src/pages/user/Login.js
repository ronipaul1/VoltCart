import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [method, setMethod] = useState('email');
  const [form, setForm] = useState({ email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) {
    const from = location.state?.from?.pathname || '/';
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const identifier = method === 'email' ? form.email : form.phone;
      const loggedUser = await login(identifier, form.password, method);
      toast.success(`Welcome back, ${loggedUser.name}!`);
      const from = location.state?.from?.pathname || (loggedUser.role === 'admin' ? '/admin' : '/');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-green-800">
            <span className="text-4xl">VC</span>
            <span className="text-2xl font-bold">VoltCart</span>
          </Link>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
              {['email', 'phone'].map((tab) => (
                <button key={tab} type="button" onClick={() => setMethod(tab)}
                  className={`rounded-md px-3 py-2 text-sm font-semibold capitalize ${method === tab ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                  {tab}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{method === 'email' ? 'Email Address' : 'Phone Number'}</label>
              <input type={method === 'email' ? 'email' : 'tel'} required value={method === 'email' ? form.email : form.phone}
                onChange={(e) => setForm(f => ({ ...f, [method]: e.target.value }))}
                placeholder={method === 'email' ? 'you@example.com' : '+91 98765 43210'} className="input-field" autoComplete={method === 'email' ? 'email' : 'tel'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Password" className="input-field pr-12" autoComplete="current-password" />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-center py-3 text-base">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-600 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-green-700 font-semibold hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
