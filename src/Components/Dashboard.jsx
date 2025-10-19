import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import debounce from 'lodash.debounce';
import { db, ref, get, query, orderByChild } from '../Firebase/config'; // Removed startAt, endAt
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
  FiUser,
  FiRefreshCw
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
  const [refreshing, setRefreshing] = useState(false);
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
  
  // Optimized state for better performance
  const [cachedVoters, setCachedVoters] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    return parseInt(localStorage.getItem('dashboardItemsPerPage') || '50');
  });
  const [totalCount, setTotalCount] = useState(0);

  const searchInputRef = useRef(null);
  const pullToRefreshRef = useRef(null);
  const [pullToRefreshState, setPullToRefreshState] = useState(0);

  // Save itemsPerPage to localStorage
  useEffect(() => {
    localStorage.setItem('dashboardItemsPerPage', itemsPerPage.toString());
  }, [itemsPerPage]);

  // Optimized voter data processing
  const processVoterData = useCallback((rawData) => {
    if (!rawData) return [];
    
    return Object.entries(rawData).map(([key, value]) => ({
      id: key,
      name: value.name || value.Name || value.fullName || value.FullName || 'Unknown Voter',
      voterId: value.voterId || value.VoterId || value.voterID || '',
      boothNumber: value.boothNumber || value.booth || '',
      pollingStationAddress: value.pollingStationAddress || value.pollingStation || value.address || '',
      age: value.age || value.Age || '',
      gender: value.gender || value.Gender || '',
      phone: value.phone || value.Phone || value.mobile || '',
      address: value.address || value.Address || value.residence || ''
    }));
  }, []);

  // Cache management
  const getCachedData = useCallback(() => {
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    if (cachedVoters && (now - lastFetchTime) < CACHE_DURATION) {
      return cachedVoters;
    }
    return null;
  }, [cachedVoters, lastFetchTime]);

  // Optimized load voters with caching - SIMPLIFIED VERSION
  const loadVoters = useCallback(async (page = 1, search = '', filter = {}, forceRefresh = false) => {
    try {
      setLoading(page === 1);
      if (page === 1) {
        setRefreshing(true);
      }

      // Check cache first
      const cachedData = forceRefresh ? null : getCachedData();
      
      if (cachedData && !search.trim() && !filter.boothNumber && !filter.pollingStationAddress) {
        applyFiltersAndPagination(cachedData, page, search, filter);
        setRefreshing(false);
        return;
      }

      const votersRef = ref(db, 'voters');
      const snapshot = await get(votersRef);
      
      if (snapshot.exists()) {
        const rawData = snapshot.val();
        const allVoters = processVoterData(rawData);
        
        // Cache the data
        if (!search.trim() && !filter.boothNumber && !filter.pollingStationAddress) {
          setCachedVoters(allVoters);
          setLastFetchTime(Date.now());
        }
        
        applyFiltersAndPagination(allVoters, page, search, filter);
      } else {
        setVoters([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Error loading voters:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPullToRefreshState(0);
    }
  }, [getCachedData, processVoterData, itemsPerPage]);

  // Separate filter and pagination logic
  const applyFiltersAndPagination = useCallback((allVoters, page, search, filter) => {
    let filteredVoters = allVoters;

    // Apply search filter with better performance
    if (search.trim()) {
      const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
      filteredVoters = allVoters.filter(voter => {
        const searchText = `${voter.name} ${voter.voterId} ${voter.boothNumber}`.toLowerCase();
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
    
    // Optimized pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedVoters = filteredVoters.slice(startIndex, endIndex);
    
    if (page === 1) {
      setVoters(paginatedVoters);
    } else {
      setVoters(prev => [...prev, ...paginatedVoters]);
    }
    setCurrentPage(page);
  }, [itemsPerPage]);

  // Debounced search with better performance
  const debouncedSearch = useMemo(
    () => debounce((search, filters) => {
      loadVoters(1, search, filters);
    }, 300),
    [loadVoters]
  );

  useEffect(() => {
    debouncedSearch(searchTerm, filters);
    return () => debouncedSearch.cancel();
  }, [searchTerm, filters, debouncedSearch]);

  // Initial load
  useEffect(() => {
    loadVoters(1, '', {});
  }, []);

  // Enhanced search with suggestions
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    if (value.trim()) {
      const suggestions = [
        `${value} - name`,
        `${value} - voter ID`,
        `${value} - booth`
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
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Enhanced refresh with smooth animation
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadVoters(1, searchTerm, filters, true);
  }, [searchTerm, filters, loadVoters]);

  // Pull to refresh functionality
  useEffect(() => {
    const element = pullToRefreshRef.current;
    if (!element) return;

    let startY = 0;
    let currentY = 0;

    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
      currentY = startY;
    };

    const handleTouchMove = (e) => {
      if (window.scrollY > 0) return;
      
      currentY = e.touches[0].clientY;
      const pullDistance = currentY - startY;

      if (pullDistance > 0) {
        e.preventDefault();
        const pullProgress = Math.min(pullDistance / 100, 1);
        setPullToRefreshState(pullProgress > 0.3 ? 1 : 0);
      }
    };

    const handleTouchEnd = (e) => {
      const pullDistance = currentY - startY;
      if (pullDistance > 100 && window.scrollY === 0) {
        setPullToRefreshState(2);
        handleRefresh();
      } else {
        setPullToRefreshState(0);
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleRefresh]);

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

  // Loading state with enhanced UI
  if (loading && voters.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="w-24 h-24 border-4 border-orange-200 rounded-full animate-spin"></div>
            <div className="w-24 h-24 border-4 border-transparent border-t-orange-600 rounded-full absolute top-0 left-0 animate-spin"></div>
            <FiUsers className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-orange-600 text-2xl animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-orange-800 mb-2">
            <TranslatedText>Loading Voter Data</TranslatedText>
          </h2>
          <p className="text-orange-600 text-lg">
            <TranslatedText>Please wait while we prepare your dashboard...</TranslatedText>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={pullToRefreshRef}
      className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 relative"
    >
      {/* Pull to Refresh Indicator */}
      <div 
        className={`absolute top-0 left-0 right-0 bg-orange-500 transition-all duration-300 ease-out ${
          pullToRefreshState === 2 ? 'h-1 animate-pulse' : 'h-1'
        }`}
        style={{
          transform: `scaleX(${pullToRefreshState === 1 ? 0.7 : pullToRefreshState === 2 ? 1 : 0})`,
          opacity: pullToRefreshState > 0 ? 1 : 0
        }}
      />

      {/* Enhanced Sticky Search Bar */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-orange-100/60 p-4 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name, voter ID, or booth..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchTerm && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full pl-12 pr-12 py-3 rounded-2xl border border-gray-300/80 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 transition-all duration-300 bg-white/90 backdrop-blur-sm text-base placeholder-gray-500 shadow-inner"
                aria-label="Search voters"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="text-lg" />
                </button>
              )}
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="min-h-[52px] min-w-[52px] p-3 bg-white border border-gray-300/80 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
              aria-label="Refresh data"
            >
              <FiRefreshCw className={`text-lg text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="font-medium">
              {totalCount.toLocaleString()} <TranslatedText>voters found</TranslatedText>
            </span>
            {refreshing && (
              <div className="flex items-center gap-2 text-orange-600">
                <FiLoader className="animate-spin" />
                <span><TranslatedText>Updating...</TranslatedText></span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto">
        {/* Enhanced Controls Bar */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/50 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Compact Export Button */}
              <button
                onClick={() => setShowExportModal(true)}
                className="min-h-[44px] px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 font-medium"
              >
                <FiDownload className="text-lg" />
                <span className="text-sm"><TranslatedText>Export</TranslatedText></span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="min-h-[44px] p-3 bg-white border border-gray-300/80 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                aria-label="Refresh data"
              >
                <FiRefreshCw className={`text-lg text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              <div className="hidden sm:block text-sm text-gray-600">
                {totalCount.toLocaleString()} <TranslatedText>voters found</TranslatedText>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Voter List Container */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
          <VoterList 
            voters={voters} 
            loading={loading}
            refreshing={refreshing}
            onLoadMore={infiniteLoader.loadMore}
            hasMore={infiniteLoader.hasMore}
          />
        </div>

        {/* Enhanced Mobile Load More */}
        {infiniteLoader.hasMore && (
          <div className="sm:hidden mt-6 flex justify-center">
            <button
              onClick={infiniteLoader.loadMore}
              disabled={infiniteLoader.loading}
              className="min-h-[52px] px-8 py-4 bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium w-full max-w-sm"
            >
              {infiniteLoader.loading ? (
                <div className="flex items-center justify-center gap-3">
                  <FiLoader className="animate-spin text-xl" />
                  <span className="text-lg"><TranslatedText>Loading More Voters...</TranslatedText></span>
                </div>
              ) : (
                <span className="text-lg"><TranslatedText>Load More Voters</TranslatedText></span>
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

      {/* Enhanced Mobile Bottom Navigation */}
      <div className="fixed bottom-6 left-4 right-4 sm:hidden z-30">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/50">
          <div className="flex justify-around items-center">
            <button
              onClick={() => setShowFilters(true)}
              className={`min-h-[52px] min-w-[52px] p-3 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-1 ${
                showFilters 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'text-gray-600 hover:text-blue-500 bg-gray-50'
              }`}
              aria-label="Filters"
            >
              <FiSliders className="text-xl" />
              <span className="text-xs font-medium"><TranslatedText>Filters</TranslatedText></span>
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="min-h-[52px] min-w-[52px] p-3 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-1 bg-orange-500 text-white shadow-lg hover:shadow-xl disabled:opacity-50"
              aria-label="Refresh"
            >
              <FiRefreshCw className={`text-xl ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-xs font-medium"><TranslatedText>Refresh</TranslatedText></span>
            </button>
            
            <button
              onClick={() => setShowExportModal(true)}
              className="min-h-[52px] min-w-[52px] p-3 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-green-500 bg-gray-50"
              aria-label="Export"
            >
              <FiDownload className="text-xl" />
              <span className="text-xs font-medium"><TranslatedText>Export</TranslatedText></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;