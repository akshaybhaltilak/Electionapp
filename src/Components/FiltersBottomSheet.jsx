import React, { useEffect } from 'react';
import { FiX, FiSliders } from 'react-icons/fi';
import TranslatedText from './TranslatedText';

const FiltersBottomSheet = ({ isOpen, onClose, filters, onFilterChange, onClearFilters }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden animate-fade-in"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 lg:hidden transform transition-transform duration-300 ease-out animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-title"
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 id="filters-title" className="text-xl font-bold text-gray-900">
            <TranslatedText>Filters</TranslatedText>
          </h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-xl flex items-center justify-center"
            aria-label="Close filters"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Booth Number Filter */}
            <div>
              <label htmlFor="booth-filter" className="block text-sm font-medium text-gray-700 mb-3">
                <TranslatedText>Booth Number</TranslatedText>
              </label>
              <input
                id="booth-filter"
                type="text"
                placeholder="Enter booth number..."
                value={filters.boothNumber}
                onChange={(e) => onFilterChange('boothNumber', e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-white text-base placeholder-gray-400 min-h-[44px]"
              />
            </div>

            {/* Polling Station Filter */}
            <div>
              <label htmlFor="station-filter" className="block text-sm font-medium text-gray-700 mb-3">
                <TranslatedText>Polling Station Address</TranslatedText>
              </label>
              <input
                id="station-filter"
                type="text"
                placeholder="Search polling station..."
                value={filters.pollingStationAddress}
                onChange={(e) => onFilterChange('pollingStationAddress', e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-white text-base placeholder-gray-400 min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
          <div className="flex gap-3">
            <button
              onClick={onClearFilters}
              className="flex-1 min-h-[44px] px-6 py-3 bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 transition-all duration-300 active:scale-95 font-medium"
            >
              <TranslatedText>Clear All</TranslatedText>
            </button>
            <button
              onClick={onClose}
              className="flex-1 min-h-[44px] px-6 py-3 bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 font-medium"
            >
              <TranslatedText>Apply Filters</TranslatedText>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FiltersBottomSheet;