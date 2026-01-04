'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon,
  WalletIcon,
  UsersIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { AR } from '@/lib/constants';

const navigation = [
  { name: AR.nav.dashboard, href: '/', icon: HomeIcon },
  { name: AR.nav.wallets, href: '/wallets', icon: WalletIcon },
  { name: AR.nav.clients, href: '/clients', icon: UsersIcon },
  { name: AR.nav.transactions, href: '/transactions', icon: ArrowsRightLeftIcon },
  { name: AR.nav.payments, href: '/payments', icon: BanknotesIcon },
  { name: AR.nav.reports, href: '/reports', icon: ChartBarIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside className="fixed top-0 right-0 z-30 h-screen w-64 bg-white border-l border-gray-200 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
          <WalletIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900">{AR.appName}</h1>
          <p className="text-xs text-gray-500">{AR.appTagline}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`nav-link ${isActive(item.href) ? 'active' : ''}`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* Footer with Logout */}
      <div className="absolute bottom-0 right-0 left-0 p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span>{loggingOut ? 'جاري الخروج...' : 'تسجيل الخروج'}</span>
        </button>
        <div className="text-xs text-gray-400 text-center mt-2">
          نظام فودافون كاش v1.0
        </div>
      </div>
    </aside>
  );
}
