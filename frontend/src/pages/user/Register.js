import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() && !form.phone.trim()) {
      toast.error('Enter an email address or phone number.');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.phone);
      toast.success('Welcome to VoltCart!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
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
          <p className="text-gray-500 mt-2">Create your account</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Your full name', required: true },
              { key: 'email', label: 'Email Address', type: 'email', placeholder: 'you@example.com', required: false },
              { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+91 98765 43210', required: false },
              { key: 'password', label: 'Password', type: showPassword ? 'text' : 'password', placeholder: 'Min 6 characters', required: true },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                <div className={field.key === 'password' ? 'relative' : undefined}>
                  <input type={field.type} required={field.required} value={form[field.key]}
                    onChange={(e) => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder} className={`input-field ${field.key === 'password' ? 'pr-12' : ''}`} autoComplete={field.key} />
                  {field.key === 'password' && (
                    <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                      {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-start gap-2 mt-2">
              <input type="checkbox" required id="terms" className="mt-0.5 accent-green-700" />
              <label htmlFor="terms" className="text-xs text-gray-600">I agree to the <a href="#" className="text-green-700 underline">Terms of Service</a> and <a href="#" className="text-green-700 underline">Privacy Policy</a></label>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-center py-3 text-base mt-2">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account? <Link to="/login" className="text-green-700 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
