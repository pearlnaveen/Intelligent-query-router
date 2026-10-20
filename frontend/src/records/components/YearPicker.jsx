import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const YearPicker = ({
  label = 'Published Year',
  name = 'published_year',
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = 'Select Published Year',
  error = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentYearNum = value ? parseInt(value, 10) : new Date().getFullYear();
  // Start decade base (e.g. for 2026, base is 2020)
  const [decadeStart, setDecadeStart] = useState(() => Math.floor(currentYearNum / 10) * 10 - 1);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (value) {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        setDecadeStart(Math.floor(parsed / 10) * 10 - 1);
      }
    }
  }, [value]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const years = Array.from({ length: 12 }, (_, i) => decadeStart + i);

  const handleYearSelect = (year) => {
    if (disabled) return;
    onChange({
      target: {
        name,
        value: year.toString(),
        type: 'text'
      }
    });
    setIsOpen(false);
  };

  const handlePrevDecade = (e) => {
    e.stopPropagation();
    setDecadeStart((prev) => prev - 10);
  };

  const handleNextDecade = (e) => {
    e.stopPropagation();
    setDecadeStart((prev) => prev + 10);
  };

  return (
    <div className="mb-5 relative" ref={popoverRef}>
      {label && (
        <label htmlFor={name} className="block text-sm font-semibold text-gray-700 mb-2">
          {label} {required && <span className="text-red-500 text-base">*</span>}
        </label>
      )}

      {/* Input Field trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full p-3 border-2 border-gray-200 rounded-lg text-sm flex items-center justify-between transition-all duration-300 ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : 'bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500 hover:border-indigo-300 cursor-pointer text-gray-800 font-medium'
        }`}
      >
        <span className={value ? 'text-gray-900 font-semibold' : 'text-gray-400'}>
          {value || placeholder}
        </span>
        <Calendar size={18} className="text-indigo-600 flex-shrink-0" />
      </div>

      {error && <p className="mt-2 text-xs text-red-500 font-medium">{error}</p>}

      {/* Calendar Year Picker Popover */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Header with Decade Range & Prev/Next Navigation */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <button
              type="button"
              onClick={handlePrevDecade}
              className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
              title="Previous Decade"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="text-sm font-bold text-gray-800 tracking-wide">
              {years[0]} – {years[years.length - 1]}
            </span>

            <button
              type="button"
              onClick={handleNextDecade}
              className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
              title="Next Decade"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 3x4 Grid of Years (Calendar Year Mode) */}
          <div className="grid grid-cols-3 gap-2">
            {years.map((year) => {
              const isSelected = value && parseInt(value, 10) === year;
              const isCurrentThisYear = new Date().getFullYear() === year;

              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleYearSelect(year)}
                  className={`py-2 px-1 text-sm font-semibold rounded-lg text-center transition-all duration-150 ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md scale-105'
                      : isCurrentThisYear
                      ? 'border border-indigo-500 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-indigo-600'
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default YearPicker;
