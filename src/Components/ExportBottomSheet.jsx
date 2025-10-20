import React, { useState, useEffect } from 'react';
import { FiX, FiDownload, FiEye, FiEyeOff } from 'react-icons/fi';
import TranslatedText from './TranslatedText';

const ExportBottomSheet = ({ isOpen, onClose, onExport, loading }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await onExport(password);
      // Success handled in parent
    } catch (err) {
      setError(err.message || 'Export failed. Please try again.');
    }
  };

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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 transform transition-transform duration-300 ease-out animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 id="export-title" className="text-xl font-bold text-gray-900">
            <TranslatedText>Export Data</TranslatedText>
          </h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-xl flex items-center justify-center"
            aria-label="Close export"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <p className="text-gray-600">
              <TranslatedText>Enter password to export voter data as Excel file</TranslatedText>
            </p>
            
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter password..."
                className="w-full px-4 py-3 pr-12 rounded-2xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-white text-base placeholder-gray-400 min-h-[44px]"
                required
                aria-describedby={error ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
              </button>
            </div>

            {error && (
              <p id="password-error" className="text-red-500 text-sm">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 min-h-[44px] px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 transition-colors font-medium rounded-2xl"
            >
              <TranslatedText>Cancel</TranslatedText>
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="flex-1 min-h-[44px] px-6 py-3 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-95 font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <TranslatedText>Exporting...</TranslatedText>
                </>
              ) : (
                <>
                  <FiDownload className="text-lg" />
                  <TranslatedText>Export</TranslatedText>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ExportBottomSheet;