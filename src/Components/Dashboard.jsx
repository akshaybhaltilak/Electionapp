import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import debounce from 'lodash.debounce';
import { db, ref, get } from '../Firebase/config';
import { useVirtualizer } from '@tanstack/react-virtual';

// Icons
import { 
  FiFilter, 
  FiDownload, 
  FiX, 
  FiUsers, 
  FiEye,
  FiSearch,
  FiHome,
  FiLoader,
  FiChevronLeft,
  FiChevronRight,
  FiSliders,
  FiCopy,
  FiMapPin,
  FiPhone,
  FiShare2,
  FiUser
} from 'react-icons/fi';
import TranslatedText from './TranslatedText';

// Components
import VoterList from './VoterList';
import FiltersBottomSheet from './FiltersBottomSheet';
import ExportBottomSheet from './ExportBottomSheet';
import { exportToExcel } from '../utils/excelExport';
import { useInfiniteLoader } from '../hooks/useInfiniteLoader';

const Dashboard = () => {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    boothNumber: '',
    pollingStationAddress: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    return parseInt(localStorage.getItem('dashboardItemsPerPage') || '50');
  });
  const [totalCount, setTotalCount] = useState(0);

  // Save itemsPerPage to localStorage
  useEffect(() => {
    localStorage.setItem('dashboardItemsPerPage', itemsPerPage.toString());
  }, [itemsPerPage]);

  // Load voters with pagination
  const loadVoters = useCallback(async (page = 1, search = '', filter = {}) => {
    try {
      setLoading(true);
      const votersRef = ref(db, 'voters');
      const snapshot = await get(votersRef);
      
      if (snapshot.exists()) {
        const allVoters = [];
        snapshot.forEach((childSnapshot) => {
          const raw = childSnapshot.val();
          allVoters.push({
            id: childSnapshot.key,
            name: raw.name || raw.Name || '',
            voterId: raw.voterId || raw.VoterId || '',
            boothNumber: raw.boothNumber,
            pollingStationAddress: raw.pollingStationAddress,
            age: raw.age,
            gender: raw.gender,
            phone: raw.phone || '',
            address: raw.address || ''
          });
        });

        // Apply search filter
        let filteredVoters = allVoters;
        if (search.trim()) {
          const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
          filteredVoters = allVoters.filter(voter => {
            const searchText = `${voter.name} ${voter.voterId}`.toLowerCase();
            return terms.every(term => searchText.includes(term));
          });
        }

        // Apply booth filter
        if (filter.boothNumber) {
          filteredVoters = filteredVoters.filter(voter => 
            voter.boothNumber && voter.boothNumber.toString().includes(filter.boothNumber)
          );
        }

        // Apply polling station filter
        if (filter.pollingStationAddress) {
          filteredVoters = filteredVoters.filter(voter =>
            voter.pollingStationAddress && 
            voter.pollingStationAddress.toLowerCase().includes(filter.pollingStationAddress.toLowerCase())
          );
        }

        setTotalCount(filteredVoters.length);
        
        // Pagination
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedVoters = filteredVoters.slice(startIndex, endIndex);
        
        setVoters(paginatedVoters);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error loading voters:', error);
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage]);

  // Debounced search
  useEffect(() => {
    const handler = debounce(() => {
      loadVoters(1, searchTerm, filters);
    }, 500);
    
    handler();
    return () => handler.cancel();
  }, [searchTerm, filters, loadVoters]);

  // Handle search with suggestions
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    if (value.trim()) {
      // Generate search suggestions (in a real app, these would come from recent searches)
      const suggestions = [
        `${value} - recent`,
        `${value} booth`,
        `${value} station`
      ];
      setSearchSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      boothNumber: '',
      pollingStationAddress: ''
    });
    setSearchTerm('');
    setShowSuggestions(false);
  }, []);

  // Export handler
  const handleExport = useCallback(async (password) => {
    setExportLoading(true);
    try {
      await exportToExcel(searchTerm, filters, password);
      setShowExportModal(false);
    } catch (error) {
      throw error;
    } finally {
      setExportLoading(false);
    }
  }, [searchTerm, filters]);

  // Pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadVoters(newPage, searchTerm, filters);
    }
  }, [totalPages, searchTerm, filters, loadVoters]);

  // Infinite scroll for mobile
  const infiniteLoader = useInfiniteLoader({
    hasMore: currentPage < totalPages,
    onLoadMore: () => handlePageChange(currentPage + 1)
  });

  if (loading && voters.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-orange-200 rounded-full animate-spin"></div>
            <div className="w-20 h-20 border-4 border-transparent border-t-orange-600 rounded-full absolute top-0 left-0 animate-spin"></div>
            <FiLoader className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-orange-600 text-xl animate-pulse" />
          </div>
          <div className="text-orange-600 text-lg font-semibold mt-4">
            <TranslatedText>Loading voter data...</TranslatedText>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50">
      {/* Sticky Search Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-orange-100/50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text"
              placeholder="Search by name or voter ID..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchTerm && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200/80 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-white/80 backdrop-blur-sm text-base placeholder-gray-400"
              aria-label="Search voters"
            />
            
            {/* Search Suggestions */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden z-50">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchTerm(suggestion);
                      setShowSuggestions(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-orange-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <FiSearch className="text-gray-400" />
                      <span className="text-gray-700">{suggestion}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto">
        {/* Controls Bar */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/40 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile Filter Button */}
              <button
                onClick={() => setShowFilters(true)}
                className="lg:hidden min-h-[44px] px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 active:scale-95"
              >
                <FiSliders className="text-lg" />
                <span><TranslatedText>Filters</TranslatedText></span>
              </button>

              {/* Desktop Filter Button */}
              <button
                onClick={() => setShowFilters(true)}
                className="hidden lg:flex min-h-[44px] px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 active:scale-95"
              >
                <FiSliders className="text-lg" />
                <span><TranslatedText>Filters</TranslatedText></span>
              </button>

              {/* Export Button */}
              <button
                onClick={() => setShowExportModal(true)}
                className="min-h-[44px] px-6 py-2 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 font-medium"
              >
                <FiDownload className="text-lg" />
                <span><TranslatedText>Export</TranslatedText></span>
              </button>
            </div>

            {/* Desktop Pagination Controls */}
            <div className="hidden sm:flex items-center gap-4">
              <span className="text-sm text-gray-600">
                <TranslatedText>Page</TranslatedText> {currentPage} <TranslatedText>of</TranslatedText> {totalPages}
              </span>
              <select 
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="text-sm border rounded-xl px-3 py-2 bg-white min-h-[44px]"
                aria-label="Items per page"
              >
                <option value={50}><TranslatedText>50 per page</TranslatedText></option>
                <option value={100}><TranslatedText>100 per page</TranslatedText></option>
                <option value={200}><TranslatedText>200 per page</TranslatedText></option>
              </select>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="min-h-[44px] p-3 rounded-2xl bg-white border border-gray-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95"
                  aria-label="Previous page"
                >
                  <FiChevronLeft className="text-lg" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="min-h-[44px] p-3 rounded-2xl bg-white border border-gray-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95"
                  aria-label="Next page"
                >
                  <FiChevronRight className="text-lg" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Filters */}
        <div className="hidden lg:block">
          {showFilters && (
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/40 mb-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  <TranslatedText>Filters</TranslatedText>
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={clearFilters}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <TranslatedText>Clear All</TranslatedText>
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close filters"
                  >
                    <FiX className="text-xl" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText>Booth Number</TranslatedText>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter booth number..."
                    value={filters.boothNumber}
                    onChange={(e) => handleFilterChange('boothNumber', e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200/80 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-white/80 backdrop-blur-sm text-base placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText>Polling Station Address</TranslatedText>
                  </label>
                  <input
                    type="text"
                    placeholder="Search polling station..."
                    value={filters.pollingStationAddress}
                    onChange={(e) => handleFilterChange('pollingStationAddress', e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200/80 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-white/80 backdrop-blur-sm text-base placeholder-gray-400"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Voter List */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 overflow-hidden">
          <VoterList 
            voters={voters} 
            loading={loading}
            onLoadMore={infiniteLoader.loadMore}
            hasMore={infiniteLoader.hasMore}
          />
        </div>

        {/* Mobile Load More Button */}
        {infiniteLoader.hasMore && (
          <div className="sm:hidden mt-4 flex justify-center">
            <button
              onClick={infiniteLoader.loadMore}
              disabled={infiniteLoader.loading}
              className="min-h-[44px] px-8 py-3 bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {infiniteLoader.loading ? (
                <div className="flex items-center gap-2">
                  <FiLoader className="animate-spin" />
                  <TranslatedText>Loading...</TranslatedText>
                </div>
              ) : (
                <TranslatedText>Load More</TranslatedText>
              )}
            </button>
          </div>
        )}

        {/* Bottom Sheets */}
        <FiltersBottomSheet
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
        />

        <ExportBottomSheet
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          loading={exportLoading}
        />
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-4 left-4 right-4 sm:hidden z-30">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-2xl border border-white/40">
          <div className="flex justify-around">
            <button
              onClick={() => setShowFilters(true)}
              className={`min-h-[44px] min-w-[44px] p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
                showFilters 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'text-gray-600 hover:text-blue-500'
              }`}
              aria-label="Filters"
            >
              <FiSliders className="text-xl" />
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="min-h-[44px] min-w-[44px] p-3 rounded-xl text-gray-600 hover:text-green-500 transition-colors flex items-center justify-center"
              aria-label="Export"
            >
              <FiDownload className="text-xl" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;