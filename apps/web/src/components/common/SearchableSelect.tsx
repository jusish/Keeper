import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(term)) ||
        (opt.badge && opt.badge.toLowerCase().includes(term))
    );
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl border transition text-left ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white text-slate-800'
            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
        }`}
      >
        <span className="truncate flex-1">
          {selectedOption ? (
            <span className="flex items-center gap-2">
              <span className="font-medium text-slate-800">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-slate-400 text-[11px]">({selectedOption.sublabel})</span>
              )}
              {selectedOption.badge && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  {selectedOption.badge}
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedOption && !disabled && (
            <div
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 hover:text-slate-600 rounded transition"
            >
              <X className="h-3.5 w-3.5" />
            </div>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-50">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-slate-400 text-xs">
                No matching results found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left transition hover:bg-emerald-50/60 ${
                      isSelected ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate font-medium">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="truncate text-[11px] text-slate-400 font-normal">{opt.sublabel}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {opt.badge && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 font-medium">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
