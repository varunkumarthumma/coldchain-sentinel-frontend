import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ThermometerSnowflake,
  Building2,
  Cpu,
  BellRing,
  ShieldAlert,
  Activity,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Overview', icon: Activity },
    { to: '/facilities', label: 'Facilities', icon: Building2 },
    { to: '/commodity-profiles', label: 'Commodities', icon: ThermometerSnowflake },
    { to: '/sensors', label: 'IoT Sensors', icon: Cpu },
    { to: '/alerts', label: 'Alerts', icon: BellRing },
    { to: '/risk-assessment', label: 'Risk Assessment', icon: ShieldAlert },
  ];


  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <ThermometerSnowflake className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              ColdChain <span className="text-cyan-400">Sentinel</span>
            </span>
            <p className="text-xs text-slate-400">IoT Surveillance & Post-Harvest Protection</p>
          </div>
        </NavLink>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Telemetry Online
          </span>
        </div>
      </div>
    </header>
  );
};
