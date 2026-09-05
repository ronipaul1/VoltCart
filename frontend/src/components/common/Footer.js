import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-green-900 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🌿</span>
              <span className="text-xl font-bold">VoltCart</span>
            </div>
            <p className="text-green-300 text-sm leading-relaxed">Everything Tech, One Cart. Shop verified electronics, accessories, and deals with dependable support.</p>
            <div className="flex gap-3 mt-4">
              {['facebook', 'twitter', 'instagram', 'youtube'].map(social => (
                <a key={social} href={`#${social}`} className="w-8 h-8 bg-green-800 hover:bg-green-700 rounded-full flex items-center justify-center text-xs transition-colors capitalize">
                  {social[0].toUpperCase()}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-green-300 mb-3 uppercase tracking-wide text-xs">Shop</h4>
            <ul className="space-y-2 text-sm text-green-200">
              {[
                ['Oils & Ghee', '/products?category=oils-ghee'],
                ['Smartphones', '/products?category=smartphones'],
                ['Laptops', '/products?category=laptops'],
                ['Headphones', '/products?category=headphones'],
                ['Gaming', '/products?category=gaming'],
              ].map(([label, href]) => (
                <li key={label}><Link to={href} className="hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h4 className="font-semibold text-green-300 mb-3 uppercase tracking-wide text-xs">Account</h4>
            <ul className="space-y-2 text-sm text-green-200">
              {[
                ['My Profile', '/profile'],
                ['My Orders', '/orders'],
                ['Wishlist', '/wishlist'],
                ['Cart', '/cart'],
                ['Addresses', '/addresses'],
              ].map(([label, href]) => (
                <li key={label}><Link to={href} className="hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-green-300 mb-3 uppercase tracking-wide text-xs">Contact</h4>
            <ul className="space-y-2 text-sm text-green-200">
              <li>📧 support@voltcart.com</li>
              <li>📞 +91 98765 43210</li>
              <li>🕐 Mon–Sat: 9am – 6pm</li>
              <li className="pt-2">
                <span className="font-medium text-green-300">Payment Methods:</span><br />
                <span className="text-xs">Razorpay · Cashfree · UPI · COD</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 py-6 border-t border-green-800 mt-8">
          {[
            ['🌿', '100% Natural'],
            ['✅', 'Certified'],
            ['🚚', 'Free Delivery'],
            ['🔒', 'Secure Payment'],
            ['↩️', 'Easy Returns'],
            ['⭐', '4.8 Rating'],
          ].map(([icon, label]) => (
            <div key={label} className="text-center">
              <div className="text-xl mb-1">{icon}</div>
              <div className="text-xs text-green-300 font-medium">{label}</div>
            </div>
          ))}
        </div>

        <div className="border-t border-green-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-green-400">
          <p>© {new Date().getFullYear()} VoltCart. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#privacy" className="hover:text-white">Privacy Policy</a>
            <a href="#terms" className="hover:text-white">Terms of Service</a>
            <a href="#refund" className="hover:text-white">Refund Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
