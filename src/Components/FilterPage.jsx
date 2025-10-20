import React, { useState, useEffect, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';
import { db, ref, get, onValue, off } from '../Firebase/config';
import { 
  FiFilter, 
  FiX, 
  FiUsers, 
  FiSearch,
  FiLoader,
  FiDownload,
  FiRefreshCw,
  FiSliders,
  FiHome,
  FiMapPin,
  FiHash
} from 'react-icons/fi';
import TranslatedText from './TranslatedText';

const FilterPage = () => {
  const [voters, setVoters] = useState([]);
  const [filteredVoters, setFilteredVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cachedVoters, setCachedVoters] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  const [filters, setFilters] = useState({
    boothNumber: '',
    village: '',
    pollingStationAddress: '',
    sortBy: 'serial',
    searchTerm: ''
  });

  const [selectedFilter, setSelectedFilter] = useState(null);

  // Filter options cards data
  const filterOptions = [
    {
      id: 'booth',
      title: 'Filter by Booth',
      description: 'Select a booth number to view voters',
      icon: FiHash,
      key: 'boothNumber'
    },
    {
      id: 'village',
      title: 'Filter by Village',
      description: 'Select a village to view voters',
      icon: FiHome,
      key: 'village'
    },
    {
      id: 'pollingStation',
      title: 'Filter by Polling Station',
      description: 'Select a polling station address',
      icon: FiMapPin,
      key: 'pollingStationAddress'
    }
  ];

  // Optimized voter data processing
  const processVoterData = useCallback((rawData) => {
    if (!rawData) return [];
    
    return Object.entries(rawData).map(([key, value]) => ({
      id: key,
      serial: value.serial || key,
      name: value.name || value.Name || value.fullName || value.FullName || 'Unknown Voter',
      voterId: value.voterId || value.VoterId || value.voterID || '',
      boothNumber: value.boothNumber || value.booth || '',
      pollingStationAddress: value.pollingStationAddress || value.pollingStation || value.address || '',
      village: value.village || value.Village || value.area || '',
      fatherName: value.fatherName || value.FatherName || '',
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

  // Load voters with caching
  const loadVoters = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      if (forceRefresh) {
        setRefreshing(true);
      }

      // Check cache first
      const cachedData = forceRefresh ? null : getCachedData();
      
      if (cachedData) {
        setVoters(cachedData);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const votersRef = ref(db, 'voters');
      
      onValue(votersRef, (snapshot) => {
        if (snapshot.exists()) {
          const rawData = snapshot.val();
          const processedVoters = processVoterData(rawData);
          
          // Cache the data
          setCachedVoters(processedVoters);
          setLastFetchTime(Date.now());
          setVoters(processedVoters);
        } else {
          setVoters([]);
        }
        setLoading(false);
        setRefreshing(false);
      });

    } catch (error) {
      console.error('Error loading voters:', error);
      setLoading(false);
      setRefreshing(false);
    }
  }, [getCachedData, processVoterData]);

  // Initial load
  useEffect(() => {
    loadVoters();

    // Cleanup function
    return () => {
      const votersRef = ref(db, 'voters');
      off(votersRef);
    };
  }, [loadVoters]);

  // Apply filters with debouncing
  const applyFilters = useCallback(() => {
    if (!voters.length) {
      setFilteredVoters([]);
      return;
    }

    let filtered = [...voters];

    // Apply search filter
    if (filters.searchTerm.trim()) {
      const terms = filters.searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
      filtered = filtered.filter(voter => {
        const searchText = `${voter.name} ${voter.voterId} ${voter.fatherName} ${voter.village}`.toLowerCase();
        return terms.every(term => searchText.includes(term));
      });
    }

    // Apply booth filter
    if (filters.boothNumber) {
      filtered = filtered.filter(voter => 
        voter.boothNumber && voter.boothNumber.toString().includes(filters.boothNumber)
      );
    }

    // Apply village filter
    if (filters.village) {
      filtered = filtered.filter(voter => 
        voter.village && voter.village.toLowerCase().includes(filters.village.toLowerCase())
      );
    }

    // Apply polling station address filter
    if (filters.pollingStationAddress) {
      filtered = filtered.filter(voter =>
        voter.pollingStationAddress && 
        voter.pollingStationAddress.toLowerCase().includes(filters.pollingStationAddress.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'booth':
          return (a.boothNumber || '').localeCompare(b.boothNumber || '');
        case 'serial':
        default:
          return (a.serial || '').localeCompare(b.serial || '');
      }
    });

    // Add sequential serial numbers
    const filteredWithSequentialSerial = filtered.map((voter, index) => ({
      ...voter,
      sequentialSerial: index + 1
    }));

    setFilteredVoters(filteredWithSequentialSerial);
  }, [voters, filters]);

  // Debounced filter application
  const debouncedApplyFilters = useMemo(
    () => debounce(applyFilters, 300),
    [applyFilters]
  );

  useEffect(() => {
    debouncedApplyFilters();
    return () => debouncedApplyFilters.cancel();
  }, [debouncedApplyFilters]);

  // Get unique values for dropdowns
  const uniqueValues = useMemo(() => {
    const booths = [...new Set(voters.map(v => v.boothNumber).filter(Boolean))].sort();
    const villages = [...new Set(voters.map(v => v.village).filter(Boolean))].sort();
    const addresses = [...new Set(voters.map(v => v.pollingStationAddress).filter(Boolean))].sort();
    
    return { booths, villages, addresses };
  }, [voters]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Set selected filter for card display
    if (value) {
      const filterOption = filterOptions.find(option => option.key === key);
      if (filterOption) {
        setSelectedFilter({
          type: filterOption.id,
          value: value,
          label: key === 'boothNumber' ? `Booth ${value}` : 
                 key === 'village' ? value : 
                 value.length > 20 ? value.substring(0, 20) + '...' : value
        });
      }
    } else {
      // If value is empty, check if we should clear the selected filter
      const filterOption = filterOptions.find(option => option.key === key);
      if (filterOption && selectedFilter?.type === filterOption.id) {
        setSelectedFilter(null);
      }
    }
  }, [selectedFilter, filterOptions]);

  const clearFilters = useCallback(() => {
    setFilters({
      boothNumber: '',
      village: '',
      pollingStationAddress: '',
      sortBy: 'serial',
      searchTerm: ''
    });
    setSelectedFilter(null);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadVoters(true);
  }, [loadVoters]);

  const handleFilterCardClick = useCallback((filterType) => {
    // This will highlight the selected card
    const filterOption = filterOptions.find(option => option.id === filterType);
    if (filterOption && filters[filterOption.key]) {
      setSelectedFilter({
        type: filterType,
        value: filters[filterOption.key],
        label: filterOption.key === 'boothNumber' ? `Booth ${filters[filterOption.key]}` : 
               filterOption.key === 'village' ? filters[filterOption.key] : 
               filters[filterOption.key].length > 20 ? filters[filterOption.key].substring(0, 20) + '...' : filters[filterOption.key]
      });
    }
  }, [filters, filterOptions]);

  // Enhanced loading state matching Dashboard
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
            <TranslatedText>Please wait while we prepare your filters...</TranslatedText>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50">
      {/* Enhanced Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-orange-100/60 p-4 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-orange-800">
                <TranslatedText>Advanced Voter Filters</TranslatedText>
              </h1>
              <p className="text-orange-600">
                <TranslatedText>Filter and search through voter database</TranslatedText>
              </p>
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

          {/* Enhanced Search Bar */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg" />
              <input
                type="text"
                placeholder="Search by name, voter ID, father's name, or village..."
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="w-full pl-12 pr-12 py-3 rounded-2xl border border-gray-300/80 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 transition-all duration-300 bg-white/90 backdrop-blur-sm text-base placeholder-gray-500 shadow-inner"
                aria-label="Search voters"
              />
              {filters.searchTerm && (
                <button
                  onClick={() => handleFilterChange('searchTerm', '')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="text-lg" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="font-medium">
              {filteredVoters.length.toLocaleString()} <TranslatedText>voters found</TranslatedText>
              {voters.length > 0 && (
                <span className="text-gray-500 ml-2">
                  (from {voters.length.toLocaleString()} total)
                </span>
              )}
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
        {/* Filter Cards Section */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FiFilter className="text-orange-600" />
            <TranslatedText>Filter Options</TranslatedText>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {filterOptions.map((option) => {
              const IconComponent = option.icon;
              const isSelected = selectedFilter?.type === option.id;
              
              return (
                <div
                  key={option.id}
                  onClick={() => handleFilterCardClick(option.id)}
                  className={`bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg border-2 cursor-pointer transition-all duration-300 hover:shadow-xl ${
                    isSelected 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-white/50 hover:border-orange-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <IconComponent className="text-orange-600 text-xl" />
                    </div>
                    {isSelected && (
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    <TranslatedText>{option.title}</TranslatedText>
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    <TranslatedText>{option.description}</TranslatedText>
                  </p>
                  
                  <select
                    value={filters[option.key]}
                    onChange={(e) => handleFilterChange(option.key, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 ${
                      isSelected
                        ? 'border-orange-300 focus:ring-orange-200 focus:border-orange-500'
                        : 'border-gray-300 focus:ring-orange-100 focus:border-orange-400'
                    }`}
                  >
                    <option value="">
                      <TranslatedText>All {option.title.replace('Filter by ', '')}s</TranslatedText>
                    </option>
                    {uniqueValues[option.key === 'boothNumber' ? 'booths' : 
                                 option.key === 'village' ? 'villages' : 'addresses'].map((value) => (
                      <option key={value} value={value}>
                        {option.key === 'pollingStationAddress' && value.length > 30 
                          ? value.substring(0, 30) + '...' 
                          : value}
                      </option>
                    ))}
                  </select>
                  
                  {isSelected && (
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-orange-600 font-medium">
                        <TranslatedText>Selected:</TranslatedText> {selectedFilter.label}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFilterChange(option.key, '');
                        }}
                        className="text-orange-500 hover:text-orange-700 transition-colors"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sort Option */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/50 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FiSliders className="text-orange-600" />
                <TranslatedText>Sort Results</TranslatedText>
              </h3>
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <FiX className="text-sm" />
                <TranslatedText>Clear All</TranslatedText>
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">
                <TranslatedText>Sort By:</TranslatedText>
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all duration-300"
              >
                <option value="serial"><TranslatedText>Serial Number</TranslatedText></option>
                <option value="name"><TranslatedText>Alphabetically (Name)</TranslatedText></option>
                <option value="booth"><TranslatedText>Booth Number</TranslatedText></option>
              </select>
            </div>
          </div>

          {/* Active Filter Display */}
          {selectedFilter && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-orange-800 mb-1">
                    <TranslatedText>Currently Filtering By:</TranslatedText>
                  </h3>
                  <p className="text-orange-700 font-semibold">
                    {selectedFilter.type === 'booth' && <TranslatedText>Booth Number</TranslatedText>}
                    {selectedFilter.type === 'village' && <TranslatedText>Village</TranslatedText>}
                    {selectedFilter.type === 'pollingStation' && <TranslatedText>Polling Station</TranslatedText>}
                    : {selectedFilter.label}
                  </p>
                </div>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-100 border border-orange-300 rounded-xl hover:bg-orange-200 transition-colors flex items-center gap-2"
                >
                  <FiX className="text-sm" />
                  <TranslatedText>Clear Filter</TranslatedText>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Results Section */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-800">
                <TranslatedText>Filtered Voter List</TranslatedText> 
                <span className="text-orange-600 ml-2">({filteredVoters.length} <TranslatedText>voters</TranslatedText>)</span>
              </h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500 bg-white px-3 py-1 rounded-full border">
                  <TranslatedText>Sorted by:</TranslatedText> {filters.sortBy === 'name' ? 'Alphabetical' : 
                              filters.sortBy === 'booth' ? 'Booth Number' : 'Serial Number'}
                </span>
                {refreshing && (
                  <div className="flex items-center gap-2 text-orange-600">
                    <FiLoader className="animate-spin" />
                    <span><TranslatedText>Refreshing...</TranslatedText></span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {filteredVoters.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiUsers className="text-3xl text-orange-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                <TranslatedText>No voters found</TranslatedText>
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                <TranslatedText>Try adjusting your search or filter criteria to see more results</TranslatedText>
              </p>
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 transition-colors font-medium"
              >
                <TranslatedText>Clear All Filters</TranslatedText>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TranslatedText>#</TranslatedText>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TranslatedText>Voter ID</TranslatedText>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TranslatedText>Name</TranslatedText>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TranslatedText>Father's Name</TranslatedText>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TranslatedText>Age</TranslatedText>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TranslatedText>Gender</TranslatedText>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TranslatedText>Booth No.</TranslatedText>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TranslatedText>Village</TranslatedText>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TranslatedText>Polling Station</TranslatedText>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVoters.map((voter) => (
                    <tr key={voter.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {voter.sequentialSerial}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                        {voter.voterId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {voter.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {voter.fatherName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {voter.age}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {voter.gender}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                        {voter.boothNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {voter.village}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="max-w-xs truncate" title={voter.pollingStationAddress}>
                          {voter.pollingStationAddress}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterPage;