import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Cpu,
  BellRing,
  ShieldAlert,
  Apple,
  X,
  ThermometerSnowflake,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, badge: null },
    { to: '/facilities', label: 'Facilities', icon: Building2, badge: null },
    { to: '/commodity-profiles', label: 'Commodities', icon: Apple, badge: null },
    { to: '/sensors', label: 'IoT Sensors', icon: Cpu, badge: null },
    { to: '/alerts', label: 'Alerts', icon: BellRing, badge: null },
    { to: '/risk-assessment', label: 'Risk Assessment', icon: ShieldAlert, badge: null },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-0 -translate-x-full'
          }`}
      >
        {/* Logo and Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          <NavLink to="/" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25 group-hover:bg-blue-700 transition-colors">
              <ThermometerSnowflake className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-slate-900 text-base">ColdChain</span>
                <span className="font-bold tracking-tight text-blue-600 text-base">Sentinel</span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">Enterprise Cold Storage</p>
            </div>
          </NavLink>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors group-[.text-blue-700]:text-blue-600"
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Sentinel Engine Live
            </span>
            <span className="text-[11px] text-slate-400 font-mono">API /api</span>
          </div>
        </div>
      </aside>
    </>
  );
};
