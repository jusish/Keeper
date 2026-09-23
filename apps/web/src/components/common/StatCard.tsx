import React from 'react';
import { LucideIcon } from 'lucide-react';

export type StatCardColor = 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'slate';

export interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: StatCardColor;
  valueColor?: string;
  progress?: number;
  progressColor?: string;
  onClick?: () => void;
  className?: string;
}

const colorMap: Record<StatCardColor, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-700' },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  color = 'emerald',
  valueColor,
  progress,
  progressColor = 'bg-emerald-500',
  onClick,
  className = '',
}) => {
  const iconTheme = colorMap[color] || colorMap.emerald;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs transition ${
        onClick ? 'cursor-pointer hover:border-emerald-300 hover:shadow-xs' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div className={`rounded-xl ${iconTheme.bg} p-2 ${iconTheme.text}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`text-2xl font-black ${valueColor || 'text-slate-900'}`}>
          {value}
        </span>
        {unit && (
          <span className="text-xs font-semibold text-slate-500">
            {unit}
          </span>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${progressColor} transition-all duration-500`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {subtitle && (
        <p className="mt-1 text-[11px] font-medium text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
};
