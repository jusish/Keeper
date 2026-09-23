import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 32, showText = true }) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-md shadow-emerald-950/20"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3/5 h-3/5"
        >
          {/* Harmony soundwaves + Protective shield/ring */}
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" opacity="0.3" />
          <path d="M7 12h2m2-4h2m2 8h2m-6-8v8m4-6v4" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="font-extrabold tracking-tight text-slate-900 text-lg leading-tight flex items-center gap-1.5">
            Keeper
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700/80">
            Community Platform
          </span>
        </div>
      )}
    </div>
  );
};
