import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <div className="text-8xl mb-4">🌿</div>
        <h1 className="text-6xl font-bold text-green-800 mb-3">404</h1>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Page Not Found</h2>
        <p className="text-gray-500 mb-8 max-w-md">The page you're looking for seems to have wandered off into the forest.</p>
        <div className="flex gap-4">
          <Link to="/" className="btn-primary">Go Home</Link>
          <Link to="/products" className="btn-secondary">Browse Products</Link>
        </div>
      </div>
    </div>
  );
}
