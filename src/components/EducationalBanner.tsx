import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export const EducationalBanner: React.FC = () => {
  return (
    <div className="bg-amber-950/40 border-b border-amber-600/30 px-4 py-2 text-xs text-amber-200/90 flex flex-wrap items-center justify-between gap-2 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
        <span>
          <strong className="font-semibold text-amber-300">Educational BCA College Project:</strong> Prototype demonstration for road hazard detection & driver assistance.
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-amber-300/80">
        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
        <span>Do not rely upon this system as a certified automotive safety device. Always exercise standard road caution.</span>
      </div>
    </div>
  );
};
