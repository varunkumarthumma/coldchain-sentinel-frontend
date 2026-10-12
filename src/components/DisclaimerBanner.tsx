import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="leading-relaxed">
        <span className="font-semibold text-amber-950">Experimental Heuristic Disclaimer: </span>
        <span className="text-amber-800">
          Risk assessment scores are experimental heuristic engineering estimates based on physical cold-chain exposure
          (degree-hours, humidity deviations, duration, and incident clusters). They do not represent validated machine
          learning models or empirical post-harvest loss percentages.
        </span>
      </div>
    </div>
  );
};

