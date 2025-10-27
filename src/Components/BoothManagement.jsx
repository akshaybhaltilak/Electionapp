import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db, ref, onValue, off, update } from '../Firebase/config';
import { 
  FiArrowLeft, 
  FiHome, 
  FiMapPin, 
  FiPhone, 
  FiEdit, 
  FiSearch, 
  FiUserPlus,
  FiUser,
  FiCheck,
  FiX,
  FiFilter,
  FiPhoneOff,
  FiTrash2,
  FiSave,
  FiEdit2,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiUsers
} from 'react-icons/fi';

// Load Balancer for Firebase operations
class FirebaseLoadBalancer {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.queue = [];
    this.active = 0;
  }

  async execute(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
      this.process();
    });
  }

  process() {
    if (this.active >= this.maxConcurrent || this.queue.length === 0) return;

    this.active++;
    const { operation, resolve, reject } = this.queue.shift();

    operation()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        this.active--;
        this.process();
      });
  }
}

const firebaseLoadBalancer = new FirebaseLoadBalancer(3);

// Optimized Voter Item
const VoterItem = React.memo(({ 
  voter, 
  onToggleVoted, 
  onEdit
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localVoted, setLocalVoted] = useState(voter.voted);

  const handleVoteToggle = useCallback(async (e) => {
    e.stopPropagation();
    setIsUpdating(true);
    
    // Update local state immediately for instant feedback
    const newVotedStatus = !localVoted;
    setLocalVoted(newVotedStatus);
    
    try {
      // Update Firebase
      await onToggleVoted(voter.id, voter.voted);
    } catch (error) {
      // Revert local state if Firebase update fails
      setLocalVoted(!newVotedStatus);
      console.error('Error updating vote status:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [voter.id, voter.voted, localVoted, onToggleVoted]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-bold text-gray-900 text-base truncate">
              {voter.name}
            </h3>
            {voter.age && (
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-medium">
                Age: {voter.age}
              </span>
            )}
            {voter.gender && (
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-xs font-medium">
                {voter.gender}
              </span>
            )}
          </div>
          
          <div className="space-y-2 text-gray-600 text-sm">
            <div className="font-medium">ID: {voter.voterId}</div>
            
            <div className="flex items-center gap-4 flex-wrap">
              {voter.phone ? (
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <FiPhone size={14} />
                  <span>{voter.phone}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <FiPhoneOff size={14} />
                  <span>No Phone</span>
                </div>
              )}
              
              {voter.houseNumber && (
                <div className="flex items-center gap-2 text-purple-600">
                  <FiHome size={14} />
                  <span>House: {voter.houseNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Voting Toggle Button */}
          <button
            onClick={handleVoteToggle}
            disabled={isUpdating}
            className={`px-4 py-3 rounded-xl font-bold flex items-center gap-2 border-2 transition-all min-w-[120px] justify-center ${
              localVoted 
                ? 'bg-green-500 text-white border-green-600 hover:bg-green-600 transform hover:scale-105' 
                : 'bg-red-500 text-white border-red-600 hover:bg-red-600 transform hover:scale-105'
            } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
          >
            {isUpdating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : localVoted ? (
              <>
                <FiCheckCircle size={16} />
                <span>Voted</span>
              </>
            ) : (
              <>
                <FiClock size={16} />
                <span>Not Voted</span>
              </>
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(voter);
            }}
            className="text-blue-600 hover:text-blue-700 p-3 bg-blue-100 rounded-xl transition-all active:scale-95"
            title="Edit Voter"
          >
            <FiEdit2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});

const BoothManagement = () => {
  const [activeView, setActiveView] = useState('boothList');
  const [selectedBooth, setSelectedBooth] = useState(null);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {activeView === 'boothList' && (
        <BoothListView 
          onBoothSelect={(booth) => {
            setSelectedBooth(booth);
            setActiveView('boothDetail');
          }}
        />
      )}
      
      {activeView === 'boothDetail' && selectedBooth && (
        <BoothDetailView 
          booth={selectedBooth}
          onBack={() => {
            setSelectedBooth(null);
            setActiveView('boothList');
          }}
        />
      )}
    </div>
  );
};

const BoothListView = ({ onBoothSelect }) => {
  const [booths, setBooths] = useState([]);
  const [voters, setVoters] = useState([]);
  const [karyakartas, setKaryakartas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showKaryakartaModal, setShowKaryakartaModal] = useState(false);
  const [selectedKaryakarta, setSelectedKaryakarta] = useState('');
  const [currentBooth, setCurrentBooth] = useState(null);
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const createSafeId = (text) => {
    return text.replace(/[.#$/[\]]/g, '_');
  };

  const processVoterData = useCallback((rawData) => {
    if (!rawData) return [];
    
    return Object.entries(rawData).map(([key, value]) => ({
      id: key,
      name: value.name || 'Unknown Voter',
      voterId: value.voterId || 'N/A',
      pollingStationAddress: value.pollingStationAddress || value.address || 'Unknown Address',
      village: value.village || 'Unknown Area',
      phone: value.phone || '',
      voted: value.voted || false,
      houseNumber: value.houseNumber || '',
      assignedKaryakarta: value.assignedKaryakarta || '',
      age: value.age || '',
      gender: value.gender || ''
    }));
  }, []);

  const createBoothsFromVoters = useCallback((votersData) => {
    const boothsMap = {};
    
    votersData.forEach(voter => {
      const pollingAddress = voter.pollingStationAddress;
      if (!pollingAddress) return;
      
      const safeBoothId = createSafeId(pollingAddress);
      
      if (!boothsMap[safeBoothId]) {
        boothsMap[safeBoothId] = {
          id: safeBoothId,
          originalId: pollingAddress,
          pollingStationAddress: pollingAddress,
          voters: [],
          voterCount: 0,
          votedCount: 0,
          withPhoneCount: 0,
          assignedKaryakarta: '',
          karyakartaName: '',
          karyakartaPhone: '',
          village: voter.village || '',
        };
      }
      
      boothsMap[safeBoothId].voters.push(voter);
      boothsMap[safeBoothId].voterCount++;
      
      if (voter.voted) boothsMap[safeBoothId].votedCount++;
      if (voter.phone) boothsMap[safeBoothId].withPhoneCount++;
    });
    
    return Object.values(boothsMap);
  }, []);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    
    try {
      await firebaseLoadBalancer.execute(async () => {
        const votersRef = ref(db, 'voters');
        const karyakartasRef = ref(db, 'karyakartas');
        const boothsRef = ref(db, 'booths');
        
        const unsubscribeVoters = onValue(votersRef, (snapshot) => {
          if (snapshot.exists()) {
            const votersData = processVoterData(snapshot.val());
            setVoters(votersData);
            
            const boothsData = createBoothsFromVoters(votersData);
            
            const unsubscribeBooths = onValue(boothsRef, (boothSnapshot) => {
              if (boothSnapshot.exists()) {
                const boothAssignments = boothSnapshot.val();
                
                const updatedBooths = boothsData.map(booth => {
                  const assignment = boothAssignments[booth.id];
                  if (assignment) {
                    return {
                      ...booth,
                      assignedKaryakarta: assignment.assignedKaryakarta || '',
                      karyakartaName: assignment.karyakartaName || '',
                      karyakartaPhone: assignment.karyakartaPhone || '',
                    };
                  }
                  return booth;
                });
                
                setBooths(updatedBooths);
              } else {
                setBooths(boothsData);
              }
              setLoading(false);
              setRefreshing(false);
            });

            return () => off(boothsRef, 'value', unsubscribeBooths);
          } else {
            setVoters([]);
            setBooths([]);
            setLoading(false);
            setRefreshing(false);
          }
        });

        const unsubscribeKaryakartas = onValue(karyakartasRef, (snapshot) => {
          if (snapshot.exists()) {
            const karyakartasData = Object.entries(snapshot.val()).map(([key, value]) => ({
              id: key,
              name: value.name || 'Unknown Karyakarta',
              phone: value.phone || '',
            }));
            setKaryakartas(karyakartasData);
          } else {
            setKaryakartas([]);
          }
        });

        return () => {
          off(votersRef, 'value', unsubscribeVoters);
          off(karyakartasRef, 'value', unsubscribeKaryakartas);
        };
      });
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
      setRefreshing(false);
    }
  }, [processVoterData, createBoothsFromVoters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredBooths = useMemo(() => 
    booths.filter(booth => 
      !searchTerm.trim() ||
      booth.pollingStationAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booth.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booth.karyakartaName && booth.karyakartaName.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    [booths, searchTerm]
  );

  const handleAssignKaryakarta = async () => {
    if (!selectedKaryakarta) {
      setMessage('Please select a karyakarta');
      return;
    }
    
    try {
      await firebaseLoadBalancer.execute(async () => {
        const karyakarta = karyakartas.find(k => k.id === selectedKaryakarta);
        
        if (!karyakarta) {
          setMessage('Selected karyakarta not found');
          return;
        }

        const updates = {};
        const boothId = currentBooth.id;

        updates[`booths/${boothId}`] = {
          assignedKaryakarta: selectedKaryakarta,
          karyakartaName: karyakarta.name,
          karyakartaPhone: karyakarta.phone,
          pollingStationAddress: currentBooth.pollingStationAddress,
          village: currentBooth.village,
          lastUpdated: new Date().toISOString()
        };

        const boothVoters = voters.filter(voter => 
          createSafeId(voter.pollingStationAddress) === boothId
        );
        
        boothVoters.forEach(voter => {
          updates[`voters/${voter.id}/assignedKaryakarta`] = selectedKaryakarta;
        });

        await update(ref(db), updates);
        
        setBooths(prev => prev.map(booth => 
          booth.id === boothId 
            ? {
                ...booth,
                assignedKaryakarta: selectedKaryakarta,
                karyakartaName: karyakarta.name,
                karyakartaPhone: karyakarta.phone
              }
            : booth
        ));

        setShowKaryakartaModal(false);
        setSelectedKaryakarta('');
        setCurrentBooth(null);
        setMessage(`✅ ${karyakarta.name} assigned successfully!`);
        
        setTimeout(() => setMessage(''), 3000);
      });
    } catch (error) {
      console.error('Error assigning karyakarta:', error);
      setMessage('❌ Error assigning karyakarta. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const openKaryakartaModal = (booth) => {
    setCurrentBooth(booth);
    setSelectedKaryakarta(booth.assignedKaryakarta || '');
    setShowKaryakartaModal(true);
    setMessage('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-600 mx-auto mb-4"></div>
          <p className="text-orange-600 font-medium text-lg">Loading polling stations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-b-3xl shadow-lg">
        <div className="px-6 py-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <FiHome className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Polling Stations</h1>
              <p className="text-orange-100">Manage booth assignments</p>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-6">
            <FiSearch className="absolute left-4 top-4 text-orange-300 text-lg" />
            <input
              type="text"
              placeholder="Search booths by address or area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/20 rounded-2xl border border-white/30 text-white placeholder-orange-200 focus:outline-none focus:ring-2 focus:ring-white/50 text-base"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-4 text-orange-200 hover:text-white"
              >
                <FiX size={20} />
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/30">
              <div className="font-bold text-2xl">{booths.length}</div>
              <div className="text-orange-100">Total Booths</div>
            </div>
            <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/30">
              <div className="font-bold text-2xl">
                {booths.filter(b => b.assignedKaryakarta).length}
              </div>
              <div className="text-orange-100">Assigned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mx-6 mt-6 p-4 rounded-2xl text-center font-medium ${
          message.includes('✅') 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Refresh Button */}
      <div className="px-6 mt-6">
        <button
          onClick={loadData}
          disabled={refreshing}
          className="w-full bg-white border border-orange-200 text-orange-600 py-4 rounded-2xl font-bold hover:bg-orange-50 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg"
        >
          {refreshing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-600 border-t-transparent"></div>
              <span>Refreshing Data...</span>
            </>
          ) : (
            <>
              <FiRefreshCw size={18} />
              <span>Refresh Data</span>
            </>
          )}
        </button>
      </div>

      {/* Booths List */}
      <div className="p-6 space-y-4">
        {filteredBooths.length === 0 ? (
          <div className="text-center py-16 bg-white/80 rounded-3xl shadow-lg border border-orange-200">
            <FiHome className="inline text-orange-300 text-5xl mb-4" />
            <p className="text-orange-600 text-lg font-medium">No polling stations found</p>
            <p className="text-orange-400 mt-2">Try adjusting your search terms</p>
          </div>
        ) : (
          filteredBooths.map((booth) => (
            <div
              key={booth.id}
              className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-orange-200 p-6 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => onBoothSelect(booth)}
                >
                  <h3 className="font-bold text-gray-900 text-lg mb-2">
                    {booth.pollingStationAddress}
                  </h3>
                  <div className="flex items-center gap-2 text-orange-600 font-medium">
                    <FiMapPin />
                    <span>{booth.village}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openKaryakartaModal(booth);
                  }}
                  className="bg-orange-100 text-orange-600 p-3 rounded-xl hover:bg-orange-200 transition-all active:scale-95"
                >
                  <FiUserPlus size={20} />
                </button>
              </div>

              {/* Karyakarta Info */}
              {booth.assignedKaryakarta ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <FiUser className="text-green-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-green-800">
                          {booth.karyakartaName}
                        </div>
                        <div className="text-green-600 text-sm">
                          {booth.karyakartaPhone || 'No phone'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openKaryakartaModal(booth);
                      }}
                      className="text-orange-600 font-semibold hover:text-orange-700 bg-orange-100 px-4 py-2 rounded-lg"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 mb-4 border border-orange-200 text-center">
                  <p className="text-orange-700 font-semibold">No karyakarta assigned</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openKaryakartaModal(booth);
                    }}
                    className="mt-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-2 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 active:scale-95 transition-all"
                  >
                    Assign Now
                  </button>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 text-center mb-4">
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <div className="font-bold text-blue-700 text-lg">{booth.voterCount}</div>
                  <div className="text-blue-600 text-sm">Total</div>
                </div>
                <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                  <div className="font-bold text-green-700 text-lg">{booth.votedCount}</div>
                  <div className="text-green-600 text-sm">Voted</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                  <div className="font-bold text-purple-700 text-lg">{booth.withPhoneCount}</div>
                  <div className="text-purple-600 text-sm">Phones</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                  <div className="font-bold text-amber-700 text-lg">
                    {Math.round((booth.votedCount / Math.max(booth.voterCount, 1)) * 100)}%
                  </div>
                  <div className="text-amber-600 text-sm">Progress</div>
                </div>
              </div>

              <button
                onClick={() => onBoothSelect(booth)}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 rounded-2xl font-bold hover:from-orange-600 hover:to-amber-600 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg"
              >
                <FiUsers size={18} />
                View Voters
              </button>
            </div>
          ))
        )}
      </div>

      {/* Karyakarta Assignment Modal */}
      {showKaryakartaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-orange-200">
              <h3 className="font-bold text-gray-900 text-xl">
                Assign Karyakarta
              </h3>
              <p className="text-gray-500 mt-2">{currentBooth?.pollingStationAddress}</p>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Karyakarta
              </label>
              <select
                value={selectedKaryakarta}
                onChange={(e) => setSelectedKaryakarta(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
              >
                <option value="">Choose a karyakarta</option>
                {karyakartas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} - {k.phone || 'No Phone'}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3 p-6 border-t border-orange-200">
              <button
                onClick={() => {
                  setShowKaryakartaModal(false);
                  setSelectedKaryakarta('');
                  setCurrentBooth(null);
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignKaryakarta}
                disabled={!selectedKaryakarta}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 disabled:from-gray-300 disabled:to-gray-400 transition-all"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BoothDetailView = ({ booth, onBack }) => {
  const [voters, setVoters] = useState(booth.voters || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingVoter, setEditingVoter] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Toggle voted status - FIXED VERSION
  const toggleVotedStatus = useCallback(async (voterId, currentStatus) => {
    try {
      const newVotedStatus = !currentStatus;
      
      await firebaseLoadBalancer.execute(async () => {
        await update(ref(db, `voters/${voterId}`), {
          voted: newVotedStatus
        });
      });
      
      // Update local state after successful Firebase update
      setVoters(prev => prev.map(voter => 
        voter.id === voterId ? { ...voter, voted: newVotedStatus } : voter
      ));
    } catch (error) {
      console.error('Error updating voted status:', error);
      // Show error message to user
      alert('Failed to update vote status. Please try again.');
    }
  }, []);

  // Memoized filtered voters for performance
  const filteredVoters = useMemo(() => 
    voters.filter(voter => {
      if (searchTerm && !voter.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !voter.voterId.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !voter.phone.includes(searchTerm)) {
        return false;
      }
      
      switch (filter) {
        case 'voted': return voter.voted;
        case 'notVoted': return !voter.voted;
        case 'withPhone': return voter.phone;
        case 'withoutPhone': return !voter.phone;
        default: return true;
      }
    }),
    [voters, searchTerm, filter]
  );

  const handleEditVoter = useCallback((voter) => {
    setEditingVoter(voter);
    setEditForm({
      name: voter.name || '',
      voterId: voter.voterId || '',
      phone: voter.phone || '',
      houseNumber: voter.houseNumber || '',
      age: voter.age || '',
      gender: voter.gender || ''
    });
  }, []);

  const saveVoterEdit = useCallback(async () => {
    if (!editingVoter) return;
    
    try {
      await firebaseLoadBalancer.execute(async () => {
        const updates = {};
        Object.keys(editForm).forEach(key => {
          updates[`voters/${editingVoter.id}/${key}`] = editForm[key];
        });
        await update(ref(db), updates);
      });
      
      setVoters(prev => prev.map(voter => 
        voter.id === editingVoter.id ? { ...voter, ...editForm } : voter
      ));
      setEditingVoter(null);
      setEditForm({});
    } catch (error) {
      console.error('Error updating voter:', error);
    }
  }, [editingVoter, editForm]);

  const deleteBoothAndVoters = useCallback(async () => {
    try {
      await firebaseLoadBalancer.execute(async () => {
        const updates = {};
        
        updates[`booths/${booth.id}`] = null;
        
        booth.voters.forEach(voter => {
          updates[`voters/${voter.id}`] = null;
        });
        
        await update(ref(db), updates);
      });
      
      alert('Booth and all voters deleted successfully!');
      onBack();
    } catch (error) {
      console.error('Error deleting booth:', error);
      alert('Error deleting booth. Please try again.');
    }
  }, [booth, onBack]);

  const stats = useMemo(() => ({
    total: voters.length,
    voted: voters.filter(v => v.voted).length,
    withPhone: voters.filter(v => v.phone).length,
    votedPercentage: Math.round((voters.filter(v => v.voted).length / Math.max(voters.length, 1)) * 100)
  }), [voters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-b-3xl shadow-lg">
        <div className="px-6 py-8">
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={onBack} 
              className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center hover:bg-white/30 active:scale-95 transition-all"
            >
              <FiArrowLeft className="text-white text-xl" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-xl">{booth.pollingStationAddress}</h1>
              <p className="text-orange-100 flex items-center gap-2 mt-1">
                <FiMapPin />
                <span>{booth.village}</span>
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center hover:bg-red-500/30 active:scale-95 transition-all"
              title="Delete Booth"
            >
              <FiTrash2 className="text-white text-xl" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/30">
              <div className="font-bold text-2xl">{stats.total}</div>
              <div className="text-orange-100">Total</div>
            </div>
            <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/30">
              <div className="font-bold text-2xl">{stats.voted}</div>
              <div className="text-orange-100">Voted</div>
            </div>
            <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/30">
              <div className="font-bold text-2xl">{stats.withPhone}</div>
              <div className="text-orange-100">Phones</div>
            </div>
            <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/30">
              <div className="font-bold text-2xl">{stats.votedPercentage}%</div>
              <div className="text-orange-100">Progress</div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-6 pb-6">
          <div className="flex gap-3 mb-3">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-4 top-4 text-orange-300 text-lg" />
              <input
                type="text"
                placeholder="Search voters by name, ID, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/20 rounded-2xl border border-white/30 text-white placeholder-orange-200 focus:outline-none focus:ring-2 focus:ring-white/50 text-base"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-4 text-orange-200 hover:text-white"
                >
                  <FiX size={20} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white/20 text-white p-4 rounded-2xl hover:bg-white/30 active:scale-95 transition-all"
            >
              <FiFilter size={20} />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mb-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-white/20 border border-white/30 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-white/50 text-base"
              >
                <option value="all">All Voters</option>
                <option value="voted">Voted</option>
                <option value="notVoted">Not Voted</option>
                <option value="withPhone">With Phone</option>
                <option value="withoutPhone">Without Phone</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Voters List */}
      <div className="p-6 space-y-4">
        {filteredVoters.length === 0 ? (
          <div className="text-center py-16 bg-white/80 rounded-3xl shadow border border-orange-200">
            <FiUsers className="inline text-orange-300 text-5xl mb-4" />
            <p className="text-orange-600 text-lg font-medium">No voters found</p>
            <p className="text-orange-400 mt-2">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredVoters.map((voter) => (
            <VoterItem
              key={voter.id}
              voter={voter}
              onToggleVoted={toggleVotedStatus}
              onEdit={handleEditVoter}
            />
          ))
        )}
      </div>

      {/* Edit Voter Modal */}
      {editingVoter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-orange-200">
              <h3 className="font-bold text-gray-900 text-xl">Edit Voter Details</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                  placeholder="Enter voter name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Voter ID</label>
                <input
                  type="text"
                  value={editForm.voterId}
                  onChange={(e) => setEditForm({...editForm, voterId: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                  placeholder="Enter voter ID"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">House Number</label>
                <input
                  type="text"
                  value={editForm.houseNumber}
                  onChange={(e) => setEditForm({...editForm, houseNumber: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                  placeholder="Enter house number"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                  <input
                    type="number"
                    value={editForm.age}
                    onChange={(e) => setEditForm({...editForm, age: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                    placeholder="Enter age"
                    min="1"
                    max="120"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 p-6 border-t border-orange-200">
              <button
                onClick={() => {
                  setEditingVoter(null);
                  setEditForm({});
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveVoterEdit}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 transition-all flex items-center justify-center gap-3"
              >
                <FiSave size={18} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiTrash2 className="text-red-600 text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Delete Booth?
              </h3>
              <p className="text-gray-600 text-lg mb-8">
                This booth and all <span className="font-bold text-red-600">{booth.voters.length}</span> voters will be permanently deleted. This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteBoothAndVoters}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl font-semibold hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center gap-3"
                >
                  <FiTrash2 size={20} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoothManagement;