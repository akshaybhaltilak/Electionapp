import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  FiPhoneCall,
  FiList,
  FiUsers,
  FiX,
  FiMessageCircle,
  FiFilter,
  FiStar,
  FiMail,
  FiPhoneOff,
  FiCalendar,
  FiTrash2,
  FiSave,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
  FiClock,
  FiRefreshCw
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

// Performance Optimized Swipe Handler
const useSwipe = (onSwipeLeft, onSwipeRight, sensitivity = 50) => {
  const touchStart = useRef(null);
  const touchEnd = useRef(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDistance, setSwipeDistance] = useState(0);

  const minSwipeDistance = sensitivity;

  const onTouchStart = (e) => {
    touchEnd.current = null;
    touchStart.current = e.targetTouches[0].clientX;
    setIsSwiping(true);
  };

  const onTouchMove = (e) => {
    if (!touchStart.current) return;
    touchEnd.current = e.targetTouches[0].clientX;
    const distance = touchStart.current - touchEnd.current;
    setSwipeDistance(distance);
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    
    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      onSwipeLeft();
    } else if (isRightSwipe) {
      onSwipeRight();
    }

    touchStart.current = null;
    touchEnd.current = null;
    setIsSwiping(false);
    setSwipeDistance(0);
  };

  return {
    isSwiping,
    swipeDistance,
    swipeHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    }
  };
};

// Optimized Voter Item with Memoization
const VoterItem = React.memo(({ 
  voter, 
  isSelected, 
  onToggleSelect, 
  onToggleVoted, 
  onUpdateSupport, 
  onEdit, 
  onMessage,
  onDoubleTap 
}) => {
  const [isTapped, setIsTapped] = useState(false);
  const tapTimerRef = useRef(null);

  const handleSwipeLeft = useCallback(() => {
    if (!voter.voted) {
      onToggleVoted(voter.id, voter.voted);
    }
  }, [voter.id, voter.voted, onToggleVoted]);

  const handleSwipeRight = useCallback(() => {
    if (voter.voted) {
      onToggleVoted(voter.id, voter.voted);
    }
  }, [voter.id, voter.voted, onToggleVoted]);

  const { isSwiping, swipeDistance, swipeHandlers } = useSwipe(
    handleSwipeLeft,
    handleSwipeRight,
    40 // Higher sensitivity for easier swiping
  );

  const handleClick = useCallback(() => {
    setIsTapped(true);
    
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      onDoubleTap(voter);
      setIsTapped(false);
    } else {
      tapTimerRef.current = setTimeout(() => {
        setIsTapped(false);
        tapTimerRef.current = null;
      }, 300);
    }
  }, [voter, onDoubleTap]);

  const getSupportLevelColor = (level) => {
    switch (level) {
      case 'supporter': return 'text-green-600 bg-green-100 border-green-200';
      case 'opposed': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    }
  };

  const getSupportLevelIcon = (level) => {
    switch (level) {
      case 'supporter': return '👍';
      case 'opposed': return '👎';
      default: return '😐';
    }
  };

  const swipeTransform = isSwiping 
    ? `translateX(${swipeDistance * 0.5}px)` 
    : 'translateX(0)';

  const swipeOpacity = isSwiping 
    ? Math.max(0.7, 1 - Math.abs(swipeDistance) / 200) 
    : 1;

  return (
    <div
      className={`bg-white/90 backdrop-blur-sm rounded-2xl border p-4 transition-all duration-200 ${
        isSelected 
          ? 'border-orange-500 bg-orange-50 shadow-lg transform scale-[1.02]' 
          : 'border-orange-200 hover:border-orange-300 hover:shadow-md'
      } ${isTapped ? 'scale-95' : ''}`}
      style={{
        transform: swipeTransform,
        opacity: swipeOpacity,
      }}
      onClick={handleClick}
      {...swipeHandlers}
    >
      {/* Swipe Visual Feedback */}
      {isSwiping && (
        <div className={`absolute inset-0 rounded-2xl flex items-center justify-center font-bold text-white text-sm ${
          swipeDistance > 0 ? 'bg-red-500' : swipeDistance < 0 ? 'bg-green-500' : 'bg-transparent'
        } transition-all duration-200 z-10`}>
          <div className="text-center">
            <div className="text-lg mb-1">
              {swipeDistance > 0 ? '👈' : '👉'}
            </div>
            <div>
              {swipeDistance > 0 ? 'Mark Not Voted' : 'Mark Voted'}
            </div>
          </div>
        </div>
      )}

      <div className="relative" style={{ opacity: isSwiping ? 0.3 : 1 }}>
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(voter.id);
            }}
            className="mt-1 text-orange-600 focus:ring-orange-500 scale-125 flex-shrink-0"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="font-bold text-gray-900 text-base truncate flex-1 min-w-[140px]">
                {voter.name}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Voted Status */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVoted(voter.id, voter.voted);
                  }}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 border-2 transition-all duration-300 ${
                    voter.voted 
                      ? 'bg-green-100 text-green-800 border-green-300 shadow-sm' 
                      : 'bg-gray-100 text-gray-600 border-gray-300'
                  } active:scale-95`}
                >
                  {voter.voted ? <FiCheckCircle size={16} /> : <FiClock size={16} />}
                  {voter.voted ? 'Voted' : 'Not Voted'}
                </button>
                
                {/* Support Level */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateSupport(voter.id, 
                      voter.supportLevel === 'supporter' ? 'neutral' : 
                      voter.supportLevel === 'neutral' ? 'opposed' : 'supporter'
                    );
                  }}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-300 ${getSupportLevelColor(voter.supportLevel)} active:scale-95`}
                >
                  {getSupportLevelIcon(voter.supportLevel)}
                </button>
              </div>
            </div>
            
            <div className="space-y-2 text-gray-600 text-sm">
              <div className="flex items-center gap-4 justify-between flex-wrap">
                <span className="font-medium">ID: {voter.voterId}</span>
                {voter.age && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-medium">
                    Age: {voter.age}
                  </span>
                )}
              </div>
              
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

              {voter.lastContacted && (
                <div className="flex items-center gap-2 text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
                  <FiCalendar size={14} />
                  <span className="text-xs font-medium">
                    Contacted: {new Date(voter.lastContacted).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 flex-shrink-0">
            {voter.phone && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMessage(voter.id);
                }}
                className="text-orange-600 hover:text-orange-700 p-2.5 bg-orange-100 rounded-xl transition-all active:scale-95 shadow-sm"
                title="Send Message"
              >
                <FiMessageCircle size={16} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(voter);
              }}
              className="text-blue-600 hover:text-blue-700 p-2.5 bg-blue-100 rounded-xl transition-all active:scale-95 shadow-sm"
              title="Edit Voter"
            >
              <FiEdit2 size={16} />
            </button>
          </div>
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
      supportLevel: value.supportLevel || 'neutral',
      lastContacted: value.lastContacted || '',
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
          supportersCount: 0,
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
      if (voter.supportLevel === 'supporter') boothsMap[safeBoothId].supportersCount++;
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
          <p className="text-orange-400 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <FiHome className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Polling Stations</h1>
              <p className="text-orange-100 text-sm">Manage booth assignments</p>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-4">
            <FiSearch className="absolute left-4 top-4 text-orange-300 text-lg" />
            <input
              type="text"
              placeholder="Search booths by address, area, or karyakarta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/20 rounded-2xl border border-white/30 text-white placeholder-orange-200 focus:outline-none focus:ring-2 focus:ring-white/50 text-base backdrop-blur-sm"
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
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/30">
              <div className="font-bold text-2xl">{booths.length}</div>
              <div className="text-orange-100 text-sm">Total Booths</div>
            </div>
            <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/30">
              <div className="font-bold text-2xl">
                {booths.filter(b => b.assignedKaryakarta).length}
              </div>
              <div className="text-orange-100 text-sm">Assigned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mx-4 mt-4 p-4 rounded-2xl text-center font-medium shadow-lg border transform transition-all duration-300 ${
          message.includes('✅') 
            ? 'bg-green-100 text-green-700 border-green-200 animate-bounce-in' 
            : 'bg-red-100 text-red-700 border-red-200 animate-shake'
        }`}>
          {message}
        </div>
      )}

      {/* Refresh Button */}
      <div className="px-4 mt-4">
        <button
          onClick={loadData}
          disabled={refreshing}
          className="w-full bg-white border border-orange-200 text-orange-600 py-3 rounded-2xl font-semibold hover:bg-orange-50 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          {refreshing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent"></div>
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <FiRefreshCw size={16} />
              <span>Refresh Data</span>
            </>
          )}
        </button>
      </div>

      {/* Booths List */}
      <div className="p-4 space-y-4">
        {filteredBooths.length === 0 ? (
          <div className="text-center py-16 bg-white/80 rounded-3xl shadow-lg border border-orange-200 backdrop-blur-sm">
            <FiHome className="inline text-orange-300 text-5xl mb-4" />
            <p className="text-orange-600 text-lg font-medium">No polling stations found</p>
            <p className="text-orange-400 text-sm mt-2">Try adjusting your search terms</p>
          </div>
        ) : (
          filteredBooths.map((booth) => (
            <div
              key={booth.id}
              className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-orange-200 p-5 hover:shadow-xl transition-all duration-300 active:scale-[0.98] hover:border-orange-300"
            >
              {/* Booth Header */}
              <div className="flex justify-between items-start mb-4">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => onBoothSelect(booth)}
                >
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 text-lg leading-tight">
                    {booth.pollingStationAddress}
                  </h3>
                  <div className="flex items-center gap-2 text-orange-600 text-sm font-medium">
                    <FiMapPin className="flex-shrink-0" />
                    <span className="truncate">{booth.village}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openKaryakartaModal(booth);
                  }}
                  className="bg-orange-100 text-orange-600 p-3 rounded-xl hover:bg-orange-200 transition-all active:scale-95 shadow-sm"
                >
                  <FiUserPlus size={20} />
                </button>
              </div>

              {/* Karyakarta Info */}
              {booth.assignedKaryakarta ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 mb-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FiUser className="text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-green-800 text-sm truncate">
                          {booth.karyakartaName}
                        </div>
                        <div className="text-green-600 text-xs truncate">
                          {booth.karyakartaPhone || 'No phone'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openKaryakartaModal(booth);
                      }}
                      className="text-orange-600 text-sm font-semibold hover:text-orange-700 flex-shrink-0 ml-2 bg-orange-100 px-3 py-1 rounded-lg"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 mb-4 border border-orange-200 text-center">
                  <p className="text-orange-700 font-semibold text-sm">No karyakarta assigned</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openKaryakartaModal(booth);
                    }}
                    className="mt-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-orange-600 hover:to-amber-600 active:scale-95 transition-all shadow-sm"
                  >
                    Assign Now
                  </button>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 text-center mb-4">
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <div className="font-bold text-blue-700 text-lg">{booth.voterCount}</div>
                  <div className="text-blue-600 text-xs font-medium">Total</div>
                </div>
                <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                  <div className="font-bold text-green-700 text-lg">{booth.votedCount}</div>
                  <div className="text-green-600 text-xs font-medium">Voted</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                  <div className="font-bold text-purple-700 text-lg">{booth.withPhoneCount}</div>
                  <div className="text-purple-600 text-xs font-medium">Phones</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                  <div className="font-bold text-amber-700 text-lg">{booth.supportersCount}</div>
                  <div className="text-amber-600 text-xs font-medium">Supporters</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2 font-medium">
                  <span>Voting Progress</span>
                  <span className="font-bold">
                    {Math.round((booth.votedCount / Math.max(booth.voterCount, 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-orange-400 to-amber-500 h-3 rounded-full transition-all duration-500 shadow-md"
                    style={{ width: `${(booth.votedCount / Math.max(booth.voterCount, 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <button
                onClick={() => onBoothSelect(booth)}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 rounded-2xl font-bold hover:from-orange-600 hover:to-amber-600 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl transform transition-all duration-300 animate-scale-in">
            <div className="p-6 border-b border-orange-200">
              <h3 className="font-bold text-gray-900 text-xl">
                Assign Karyakarta
              </h3>
              <p className="text-gray-500 text-sm mt-2 line-clamp-2">{currentBooth?.pollingStationAddress}</p>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Karyakarta
              </label>
              <select
                value={selectedKaryakarta}
                onChange={(e) => setSelectedKaryakarta(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-all"
              >
                <option value="">Choose a karyakarta</option>
                {karyakartas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} - {k.phone || 'No Phone'}
                  </option>
                ))}
              </select>
              
              {karyakartas.length === 0 && (
                <div className="mt-4 p-4 bg-red-50 rounded-xl border-2 border-red-200 text-center">
                  <p className="text-red-700 text-sm font-medium">No karyakartas available</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 p-6 border-t border-orange-200">
              <button
                onClick={() => {
                  setShowKaryakartaModal(false);
                  setSelectedKaryakarta('');
                  setCurrentBooth(null);
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-all active:scale-95 border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignKaryakarta}
                disabled={!selectedKaryakarta}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 disabled:from-gray-300 disabled:to-gray-400 transition-all active:scale-95 shadow-lg"
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
  const [selectedVoters, setSelectedVoters] = useState([]);
  const [campaignMessage, setCampaignMessage] = useState('');
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingVoter, setEditingVoter] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [bulkAction, setBulkAction] = useState('');
  const [lastTap, setLastTap] = useState(0);

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
        case 'supporters': return voter.supportLevel === 'supporter';
        case 'neutral': return voter.supportLevel === 'neutral';
        case 'opposed': return voter.supportLevel === 'opposed';
        default: return true;
      }
    }),
    [voters, searchTerm, filter]
  );

  const toggleVoterSelection = useCallback((voterId) => {
    setSelectedVoters(prev => 
      prev.includes(voterId) 
        ? prev.filter(id => id !== voterId)
        : [...prev, voterId]
    );
  }, []);

  const selectAllVoters = useCallback(() => {
    setSelectedVoters(selectedVoters.length === filteredVoters.length ? [] : filteredVoters.map(v => v.id));
  }, [filteredVoters, selectedVoters.length]);

  const toggleVotedStatus = useCallback(async (voterId, currentStatus) => {
    try {
      await firebaseLoadBalancer.execute(async () => {
        await update(ref(db, `voters/${voterId}/voted`), !currentStatus);
      });
      
      setVoters(prev => prev.map(voter => 
        voter.id === voterId ? { ...voter, voted: !currentStatus } : voter
      ));
    } catch (error) {
      console.error('Error updating voted status:', error);
    }
  }, []);

  const bulkUpdateVotedStatus = useCallback(async (status) => {
    try {
      await firebaseLoadBalancer.execute(async () => {
        const updates = {};
        selectedVoters.forEach(id => {
          updates[`voters/${id}/voted`] = status;
        });
        await update(ref(db), updates);
      });
      
      setVoters(prev => prev.map(voter => 
        selectedVoters.includes(voter.id) ? { ...voter, voted: status } : voter
      ));
      setSelectedVoters([]);
      setBulkAction('');
    } catch (error) {
      console.error('Error bulk updating voted status:', error);
    }
  }, [selectedVoters]);

  const updateSupportLevel = useCallback(async (voterId, level) => {
    try {
      await firebaseLoadBalancer.execute(async () => {
        await update(ref(db, `voters/${voterId}/supportLevel`), level);
      });
      
      setVoters(prev => prev.map(voter => 
        voter.id === voterId ? { ...voter, supportLevel: level } : voter
      ));
    } catch (error) {
      console.error('Error updating support level:', error);
    }
  }, []);

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

  const sendCampaignMessage = useCallback(async () => {
    if (!campaignMessage.trim()) return;
    
    try {
      await firebaseLoadBalancer.execute(async () => {
        const updates = {};
        const timestamp = new Date().toISOString();
        selectedVoters.forEach(voterId => {
          updates[`voters/${voterId}/lastContacted`] = timestamp;
          updates[`voters/${voterId}/lastCampaign`] = campaignMessage;
        });
        await update(ref(db), updates);
      });
      
      setVoters(prev => prev.map(voter => 
        selectedVoters.includes(voter.id) 
          ? { ...voter, lastContacted: new Date().toISOString() }
          : voter
      ));
      
      setCampaignMessage('');
      setShowCampaignModal(false);
      setSelectedVoters([]);
    } catch (error) {
      console.error('Error sending campaign:', error);
    }
  }, [campaignMessage, selectedVoters]);

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
      
      alert('बूथ आणि त्यातील सर्व मतदार यशस्वीरित्या हटवले गेले!');
      onBack();
    } catch (error) {
      console.error('Error deleting booth:', error);
      alert('बूथ हटवण्यात त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
    }
  }, [booth, onBack]);

  const handleDoubleTap = useCallback((voter) => {
    const now = Date.now();
    if (lastTap && (now - lastTap) < 300) {
      toggleVotedStatus(voter.id, voter.voted);
      setLastTap(0);
    } else {
      setLastTap(now);
    }
  }, [lastTap, toggleVotedStatus]);

  const handleMessageVoter = useCallback((voterId) => {
    setSelectedVoters([voterId]);
    setShowCampaignModal(true);
  }, []);

  const stats = useMemo(() => ({
    total: voters.length,
    voted: voters.filter(v => v.voted).length,
    withPhone: voters.filter(v => v.phone).length,
    supporters: voters.filter(v => v.supportLevel === 'supporter').length,
    neutral: voters.filter(v => v.supportLevel === 'neutral').length,
    opposed: voters.filter(v => v.supportLevel === 'opposed').length,
  }), [voters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={onBack} 
              className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center hover:bg-white/30 active:scale-95 backdrop-blur-sm transition-all"
            >
              <FiArrowLeft className="text-white text-xl" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold line-clamp-2 text-lg leading-tight">{booth.pollingStationAddress}</h1>
              <p className="text-orange-100 text-sm flex items-center gap-2 mt-1">
                <FiMapPin />
                <span className="truncate">{booth.village}</span>
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center hover:bg-red-500/30 active:scale-95 backdrop-blur-sm transition-all"
              title="हटवा"
            >
              <FiTrash2 className="text-white text-xl" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-white/20 rounded-2xl p-3 backdrop-blur-sm border border-white/30">
              <div className="font-bold text-lg">{stats.total}</div>
              <div className="text-orange-100 text-xs font-medium">Total</div>
            </div>
            <div className="bg-white/20 rounded-2xl p-3 backdrop-blur-sm border border-white/30">
              <div className="font-bold text-lg">{stats.voted}</div>
              <div className="text-orange-100 text-xs font-medium">Voted</div>
            </div>
            <div className="bg-white/20 rounded-2xl p-3 backdrop-blur-sm border border-white/30">
              <div className="font-bold text-lg">{stats.withPhone}</div>
              <div className="text-orange-100 text-xs font-medium">Phones</div>
            </div>
            <div className="bg-white/20 rounded-2xl p-3 backdrop-blur-sm border border-white/30">
              <div className="font-bold text-lg">{stats.supporters}</div>
              <div className="text-orange-100 text-xs font-medium">Supporters</div>
            </div>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="relative px-4 pb-4">
          <div className="flex gap-3 mb-3">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-4 top-4 text-orange-300 text-lg" />
              <input
                type="text"
                placeholder="Search voters by name, ID, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/20 rounded-2xl border border-white/30 text-white placeholder-orange-200 focus:outline-none focus:ring-2 focus:ring-white/50 text-base backdrop-blur-sm"
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
              className="bg-white/20 text-white p-4 rounded-2xl hover:bg-white/30 active:scale-95 backdrop-blur-sm transition-all"
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
                className="w-full bg-white/20 border border-white/30 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-white/50 text-base backdrop-blur-sm"
              >
                <option value="all">All Voters</option>
                <option value="voted">Voted</option>
                <option value="notVoted">Not Voted</option>
                <option value="withPhone">With Phone</option>
                <option value="withoutPhone">Without Phone</option>
                <option value="supporters">Supporters</option>
                <option value="neutral">Neutral</option>
                <option value="opposed">Opposed</option>
              </select>
            </div>
          )}

          {selectedVoters.length > 0 && (
            <div className="space-y-3 bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/30">
              <div className="flex gap-2">
                <button
                  onClick={selectAllVoters}
                  className="bg-white/30 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-white/40 active:scale-95 transition-all"
                >
                  {selectedVoters.length === filteredVoters.length ? 'Deselect All' : 'Select All'}
                </button>
                <select
                  value={bulkAction}
                  onChange={(e) => {
                    setBulkAction(e.target.value);
                    if (e.target.value === 'markVoted') {
                      bulkUpdateVotedStatus(true);
                    } else if (e.target.value === 'markNotVoted') {
                      bulkUpdateVotedStatus(false);
                    }
                  }}
                  className="flex-1 bg-white/30 text-white px-4 py-3 rounded-xl text-sm focus:outline-none border border-white/30"
                >
                  <option value="">Bulk Actions</option>
                  <option value="markVoted">Mark as Voted</option>
                  <option value="markNotVoted">Mark as Not Voted</option>
                </select>
              </div>
              <button
                onClick={() => setShowCampaignModal(true)}
                className="w-full bg-white text-orange-600 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-orange-50 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <FiMessageCircle size={16} />
                Contact ({selectedVoters.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Swipe Instructions */}
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
        <div className="flex items-center justify-center gap-4 text-blue-700 text-sm font-medium flex-wrap">
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 p-1 rounded">👉</span>
            <span>Swipe right to mark voted</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 p-1 rounded">👈</span>
            <span>Swipe left to mark not voted</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 p-1 rounded">👆👆</span>
            <span>Double tap to toggle</span>
          </div>
        </div>
      </div>

      {/* Voters List */}
      <div className="p-3 space-y-3">
        {filteredVoters.length === 0 ? (
          <div className="text-center py-16 bg-white/80 rounded-3xl shadow border border-orange-200 mx-1 backdrop-blur-sm">
            <FiUsers className="inline text-orange-300 text-5xl mb-4" />
            <p className="text-orange-600 text-lg font-medium">No voters found</p>
            <p className="text-orange-400 text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredVoters.map((voter) => (
            <VoterItem
              key={voter.id}
              voter={voter}
              isSelected={selectedVoters.includes(voter.id)}
              onToggleSelect={toggleVoterSelection}
              onToggleVoted={toggleVotedStatus}
              onUpdateSupport={updateSupportLevel}
              onEdit={handleEditVoter}
              onMessage={handleMessageVoter}
              onDoubleTap={handleDoubleTap}
            />
          ))
        )}
      </div>

      {/* Edit Voter Modal */}
      {editingVoter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl transform transition-all duration-300 animate-scale-in">
            <div className="p-6 border-b border-orange-200">
              <h3 className="font-bold text-gray-900 text-xl">Edit Voter Details</h3>
              <p className="text-gray-500 text-sm mt-2">Update voter information</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-all"
                  placeholder="Enter voter name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Voter ID</label>
                <input
                  type="text"
                  value={editForm.voterId}
                  onChange={(e) => setEditForm({...editForm, voterId: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-all"
                  placeholder="Enter voter ID"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-all"
                  placeholder="Enter phone number"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">House No.</label>
                  <input
                    type="text"
                    value={editForm.houseNumber}
                    onChange={(e) => setEditForm({...editForm, houseNumber: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-all"
                    placeholder="House number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                  <input
                    type="number"
                    value={editForm.age}
                    onChange={(e) => setEditForm({...editForm, age: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-all"
                    placeholder="Age"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-all"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 p-6 border-t border-orange-200">
              <button
                onClick={() => {
                  setEditingVoter(null);
                  setEditForm({});
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-200 active:scale-95 transition-all border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={saveVoterEdit}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg"
              >
                <FiSave size={18} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl transform transition-all duration-300 animate-scale-in">
            <div className="p-6 border-b border-orange-200">
              <h3 className="font-bold text-gray-900 text-xl">Contact Voters</h3>
              <p className="text-gray-500 text-sm mt-2">
                {selectedVoters.length} voter{selectedVoters.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            
            <div className="p-6">
              <textarea
                value={campaignMessage}
                onChange={(e) => setCampaignMessage(e.target.value)}
                placeholder="Enter your message or note for the selected voters..."
                rows="4"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none text-base transition-all"
              />
              
              <div className="mt-3 text-sm text-gray-500 font-medium">
                📱 {selectedVoters.filter(vId => voters.find(v => v.id === vId)?.phone).length} voters have phone numbers
              </div>
            </div>
            
            <div className="flex gap-3 p-6 border-t border-orange-200">
              <button
                onClick={() => setShowCampaignModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-200 active:scale-95 transition-all border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={sendCampaignMessage}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 active:scale-95 transition-all shadow-lg"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl transform transition-all duration-300 animate-scale-in">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiTrash2 className="text-red-600 text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                बूथ हटवायचे आहे का?
              </h3>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                हे बूथ आणि त्यातील सर्व <span className="font-bold text-red-600">{booth.voters.length}</span> मतदार कायमचे हटवले जातील. ही क्रिया पूर्ववत करता येणार नाही.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-all active:scale-95 border border-gray-300"
                >
                  रद्द करा
                </button>
                <button
                  onClick={deleteBoothAndVoters}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl font-semibold hover:from-red-700 hover:to-red-800 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg"
                >
                  <FiTrash2 size={20} />
                  हटवा
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add CSS animations
const styles = `
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scale-in {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes bounce-in {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

.animate-scale-in {
  animation: scale-in 0.3s ease-out;
}

.animate-bounce-in {
  animation: bounce-in 0.6s ease-out;
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.transform-gpu {
  transform: translateZ(0);
}

/* Smooth transitions for swipe */
.voter-item {
  transition: transform 0.2s ease-out, opacity 0.2s ease-out;
}

/* Prevent text selection during swipe */
.voter-item * {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
`;

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

export default BoothManagement;