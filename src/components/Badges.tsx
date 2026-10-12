import React from 'react';
import { RiskTier, AlertSeverity, AlertStatus } from '../api/types';

export const RiskTierBadge: React.FC<{ tier: RiskTier | null | undefined }> = ({ tier }) => {
  if (!tier) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
        NO SCORE
      </span>
    );
  }

  const styles: Record<RiskTier, string> = {
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MODERATE: 'bg-amber-50 text-amber-700 border-amber-200',
    ELEVATED: 'bg-orange-50 text-orange-700 border-orange-200',
    CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${styles[tier]}`}>
      {tier}
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: AlertSeverity }> = ({ severity }) => {
  const styles: Record<AlertSeverity, string> = {
    LOW: 'bg-blue-50 text-blue-700 border-blue-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
    CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styles[severity]}`}>
      {severity}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: AlertStatus }> = ({ status }) => {
  const styles: Record<AlertStatus, string> = {
    OPEN: 'bg-rose-50 text-rose-700 border-rose-200 font-medium',
    ACKNOWLEDGED: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
    RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${styles[status]}`}>
      {status}
    </span>
  );
};

