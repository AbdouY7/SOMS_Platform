// src/components/ui/Select.jsx
import { clsx } from 'clsx';
import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(function Select(
  { label, error, hint, options = [], placeholder, className, id, required, ...props },
  ref
) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ms-1" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          ref={ref}
          required={required}
          aria-invalid={!!error}
          className={clsx(
            'w-full appearance-none rounded-lg border px-3 py-2 pe-9 text-sm text-gray-900 bg-white',
            'outline-none transition-colors duration-150',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-300',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(({ value, label: optLabel }) => (
            <option key={value} value={value}>{optLabel}</option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
});
