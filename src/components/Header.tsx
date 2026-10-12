import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const location = useLocation();

  const getPageMeta = (pathname: string) => {
    switch (pathname) {
      case '/':
        return {
          title: 'Command Center',
          subtitle: 'Real-time thermal surveillance, post-harvest risk scoring, and facility triage',
        };
      case '/facilities':
        return {
          title: 'Storage Facilities',
          subtitle: 'Manage cold storage facilities, capacity, and commodity profiles',
        };
      case '/commodity-profiles':
        return {
          title: 'Commodity Profiles',
          subtitle: 'Define target preservation temperature and humidity envelopes',
        };
      case '/sensors':
        return {
          title: 'IoT Sensor Management',
          subtitle: 'Deployed hardware telemetry sensors, test simulators, and data feeds',
        };
      case '/alerts':
        return {
          title: 'Alert Management Center',
          subtitle: 'Threshold breach monitoring, operator triage, and acknowledgement workflows',
        };
      case '/risk-assessment':
        return {
          title: 'Risk Assessment',
          subtitle: 'Numerical degree-hour exposure integration and hotspot triage',
        };
      default:
        return {
          title: 'ColdChain Sentinel',
          subtitle: 'Enterprise Cold Storage Surveillance',
        };
    }
  };

  const meta = getPageMeta(location.pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 lg:px-8 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight">
            {meta.title}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500">
            {meta.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Telemetry Status Indicator */}
        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="hidden sm:inline">Telemetry Online</span>
          <span className="sm:hidden">Live</span>
        </div>

        {/* Protection Engine Tag */}
        <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
          <span>Loss Prevention Active</span>
        </div>
      </div>
    </header>
  );
};
