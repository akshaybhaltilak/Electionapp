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
  FiChevronLeft,
  FiChevronRight
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

const loadBalancer = new FirebaseLoadBalancer(3);

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

  const createSafeId = useCallback((text) => {
    return text.replace(/[.#$/[\]]/g, '_');
  }, []);

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
  }, [createSafeId]);

  useEffect(() => {
    setLoading(true);
    const votersRef = ref(db, 'voters');
    const karyakartasRef = ref(db, 'karyakartas');
    const boothsRef = ref(db, 'booths');
    
    const unsubscribeVoters = onValue(votersRef, (snapshot) => {
      loadBalancer.execute(async () => {
        if (snapshot.exists()) {
          const votersData = processVoterData(snapshot.val());
          setVoters(votersData);
          
          const boothsData = createBoothsFromVoters(votersData);
          
          const unsubscribeBooths = onValue(boothsRef, (boothSnapshot) => {
            loadBalancer.execute(() => {
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
            });
          });

          return () => off(boothsRef, 'value', unsubscribeBooths);
        } else {
          setVoters([]);
          setBooths([]);
          setLoading(false);
        }
      });
    });

    const unsubscribeKaryakartas = onValue(karyakartasRef, (snapshot) => {
      loadBalancer.execute(() => {
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
    });

    return () => {
      off(votersRef, 'value', unsubscribeVoters);
      off(karyakartasRef, 'value', unsubscribeKaryakartas);
    };
  }, [processVoterData, createBoothsFromVoters]);

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
      const karyakarta = karyakartas.find(k => k.id === selectedKaryakarta);
      
      if (!karyakarta) {
        setMessage('Selected karyakarta not found');
        return;
      }

      await loadBalancer.execute(async () => {
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
      });
      
    } catch (error) {
      console.error('Error assigning karyakarta:', error);
      setMessage('❌ Error assigning karyakarta. Please try again.');
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-orange-600 font-medium">Loading polling stations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-b-3xl shadow-lg">
        <div className="px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <FiHome className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Polling Stations</h1>
              <p className="text-orange-100 text-sm">Manage booth assignments</p>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-4">
            <FiSearch className="absolute left-3 top-3 text-orange-300" />
            <input
              type="text"
              placeholder="Search booths..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/20 rounded-xl border border-white/30 text-white placeholder-orange-200 focus:outline-none focus:ring-2 focus:ring-white/50 text-base"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-white/20 rounded-xl p-3">
              <div className="font-bold text-lg">{booths.length}</div>
              <div className="text-orange-100 text-xs">Total Booths</div>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <div className="font-bold text-lg">
                {booths.filter(b => b.assignedKaryakarta).length}
              </div>
              <div className="text-orange-100 text-xs">Assigned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mx-4 mt-4 p-3 rounded-xl text-center font-medium ${
          message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* Booths List */}
      <div className="p-4 space-y-3">
        {filteredBooths.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow border border-orange-200">
            <FiHome className="inline text-orange-300 text-4xl mb-3" />
            <p className="text-orange-600">No polling stations found</p>
          </div>
        ) : (
          filteredBooths.map((booth) => (
            <div
              key={booth.id}
              className="bg-white rounded-2xl shadow-lg border border-orange-200 p-4 hover:shadow-xl transition-all active:scale-[0.98]"
            >
              {/* Booth Header */}
              <div className="flex justify-between items-start mb-3">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => onBoothSelect(booth)}
                >
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-base">
                    {booth.pollingStationAddress}
                  </h3>
                  <div className="flex items-center gap-1 text-orange-600 text-sm">
                    <FiMapPin className="flex-shrink-0" />
                    <span className="truncate">{booth.village}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openKaryakartaModal(booth);
                  }}
                  className="bg-orange-100 text-orange-600 p-2 rounded-lg hover:bg-orange-200 transition-colors active:scale-95"
                >
                  <FiUserPlus size={18} />
                </button>
              </div>

              {/* Karyakarta Info */}
              {booth.assignedKaryakarta ? (
                <div className="bg-green-50 rounded-lg p-3 mb-3 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FiUser className="text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-green-800 text-sm truncate">
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
                      className="text-orange-600 text-sm font-medium hover:text-orange-700 flex-shrink-0 ml-2"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-orange-50 rounded-lg p-3 mb-3 border border-orange-200 text-center">
                  <p className="text-orange-700 text-sm font-medium">No karyakarta assigned</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openKaryakartaModal(booth);
                    }}
                    className="mt-1 bg-orange-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-orange-600 active:scale-95"
                  >
                    Assign Now
                  </button>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-4 gap-1 text-center mb-3">
                <div className="bg-blue-50 rounded p-2">
                  <div className="font-bold text-blue-700 text-sm">{booth.voterCount}</div>
                  <div className="text-blue-600 text-xs">Total</div>
                </div>
                <div className="bg-green-50 rounded p-2">
                  <div className="font-bold text-green-700 text-sm">{booth.votedCount}</div>
                  <div className="text-green-600 text-xs">Voted</div>
                </div>
                <div className="bg-purple-50 rounded p-2">
                  <div className="font-bold text-purple-700 text-sm">{booth.withPhoneCount}</div>
                  <div className="text-purple-600 text-xs">Phones</div>
                </div>
                <div className="bg-amber-50 rounded p-2">
                  <div className="font-bold text-amber-700 text-sm">{booth.supportersCount}</div>
                  <div className="text-amber-600 text-xs">Supporters</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Voting Progress</span>
                  <span className="font-semibold">
                    {Math.round((booth.votedCount / Math.max(booth.voterCount, 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-400 to-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${(booth.votedCount / Math.max(booth.voterCount, 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <button
                onClick={() => onBoothSelect(booth)}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors active:scale-95 flex items-center justify-center gap-2"
              >
                <FiUsers size={16} />
                View Voters
              </button>
            </div>
          ))
        )}
      </div>

      {/* Karyakarta Assignment Modal */}
      {showKaryakartaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-4 border-b border-orange-200">
              <h3 className="font-bold text-gray-900">
                Assign Karyakarta
              </h3>
              <p className="text-gray-500 text-sm mt-1 line-clamp-2">{currentBooth?.pollingStationAddress}</p>
            </div>
            
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Karyakarta
              </label>
              <select
                value={selectedKaryakarta}
                onChange={(e) => setSelectedKaryakarta(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
              >
                <option value="">Choose a karyakarta</option>
                {karyakartas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} - {k.phone || 'No Phone'}
                  </option>
                ))}
              </select>
              
              {karyakartas.length === 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                  <p className="text-red-700 text-sm">No karyakartas available</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 p-4 border-t border-orange-200">
              <button
                onClick={() => {
                  setShowKaryakartaModal(false);
                  setSelectedKaryakarta('');
                  setCurrentBooth(null);
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignKaryakarta}
                disabled={!selectedKaryakarta}
                className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 disabled:bg-gray-300 transition-colors active:scale-95"
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

// Swipeable Voter Card Component
const SwipeableVoterCard = ({ voter, onSwipe, onEdit, onContact, isSelected, onToggleSelect }) => {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    setCurrentX(currentX);
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    
    const diff = currentX - startX;
    const swipeThreshold = 60; // Minimum swipe distance
    
    if (diff > swipeThreshold) {
      // Swipe right - mark as voted
      onSwipe(voter.id, !voter.voted);
    } else if (diff < -swipeThreshold) {
      // Swipe left - mark as not voted
      onSwipe(voter.id, !voter.voted);
    }
    
    setIsSwiping(false);
    setCurrentX(0);
  };

  const swipeOffset = isSwiping ? currentX - startX : 0;
  const isSwipingRight = swipeOffset > 0;
  const isSwipingLeft = swipeOffset < 0;

  const getSupportLevelColor = (level) => {
    switch (level) {
      case 'supporter': return 'bg-green-500';
      case 'opposed': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const getSupportLevelIcon = (level) => {
    switch (level) {
      case 'supporter': return '👍';
      case 'opposed': return '👎';
      default: return '😐';
    }
  };

  return (
    <div 
      className={`relative bg-white rounded-xl border p-3 transition-all duration-200 ${
        isSelected 
          ? 'border-orange-500 bg-orange-50 shadow-md' 
          : 'border-orange-200 hover:border-orange-300'
      } ${isSwiping ? 'active:scale-95' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe Background Indicators */}
      <div className={`absolute inset-0 rounded-xl transition-opacity duration-200 ${
        isSwipingRight ? 'bg-green-100 opacity-100' : 
        isSwipingLeft ? 'bg-red-100 opacity-100' : 'opacity-0'
      }`}>
        <div className="flex items-center justify-center h-full">
          <span className={`text-lg font-bold ${
            isSwipingRight ? 'text-green-600' : 'text-red-600'
          }`}>
            {isSwipingRight ? 'Mark Voted →' : '← Mark Not Voted'}
          </span>
        </div>
      </div>

      {/* Voter Content */}
      <div 
        className={`relative transition-transform duration-200 ${
          isSwiping ? 'scale-95' : 'scale-100'
        }`}
        style={{ transform: `translateX(${swipeOffset * 0.3}px)` }}
      >
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(voter.id)}
            className="mt-1 text-orange-600 focus:ring-orange-500 scale-110 flex-shrink-0"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-sm truncate flex-1 min-w-[120px]">
                {voter.name}
              </h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Voting Status Badge */}
                <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                  voter.voted 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}>
                  {voter.voted ? <FiEye size={12} /> : <FiEyeOff size={12} />}
                  {voter.voted ? 'Voted' : 'Not Voted'}
                </span>
                
                {/* Support Level Badge */}
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getSupportLevelColor(voter.supportLevel)} text-white`}>
                  {getSupportLevelIcon(voter.supportLevel)}
                </span>
              </div>
            </div>
            
            <div className="space-y-1 text-gray-600 text-xs">
              <div className="flex items-center gap-2 justify-between">
                <span className="font-medium">ID: {voter.voterId}</span>
                {voter.age && <span>Age: {voter.age}</span>}
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
                {voter.phone ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <FiPhone size={12} />
                    <span>{voter.phone}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-gray-400">
                    <FiPhoneOff size={12} />
                    <span>No Phone</span>
                  </div>
                )}
                
                {voter.houseNumber && (
                  <div className="flex items-center gap-1">
                    <FiHome size={12} />
                    <span>House: {voter.houseNumber}</span>
                  </div>
                )}
              </div>

              {voter.lastContacted && (
                <div className="flex items-center gap-1 text-gray-500">
                  <FiCalendar size={12} />
                  <span>Contacted: {new Date(voter.lastContacted).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 flex-shrink-0">
            {voter.phone && (
              <button
                onClick={() => onContact(voter)}
                className="text-orange-600 hover:text-orange-700 p-1.5 bg-orange-100 rounded-lg transition-all active:scale-95"
                title="Send Message"
              >
                <FiMessageCircle size={14} />
              </button>
            )}
            <button
              onClick={() => onEdit(voter)}
              className="text-blue-600 hover:text-blue-700 p-1.5 bg-blue-100 rounded-lg transition-all active:scale-95"
              title="Edit Voter"
            >
              <FiEdit2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BoothDetailView = ({ booth, onBack }) => {
  const [voters, setVoters] = useState(booth.voters || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedVoters, setSelectedVoters] = useState([]);
  const [campaignMessage, setCampaignMessage] = useState('');
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingVoter, setEditingVoter] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [bulkAction, setBulkAction] = useState('');

  // Categorized voters
  const categorizedVoters = useMemo(() => {
    const filtered = voters.filter(voter => {
      if (searchTerm && !voter.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !voter.voterId.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !voter.phone.includes(searchTerm)) {
        return false;
      }
      
      switch (activeCategory) {
        case 'voted': return voter.voted;
        case 'notVoted': return !voter.voted;
        case 'withPhone': return voter.phone;
        case 'withoutPhone': return !voter.phone;
        case 'supporters': return voter.supportLevel === 'supporter';
        case 'neutral': return voter.supportLevel === 'neutral';
        case 'opposed': return voter.supportLevel === 'opposed';
        default: return true;
      }
    });
    
    return filtered;
  }, [voters, searchTerm, activeCategory]);

  const categories = [
    { key: 'all', label: 'All', count: voters.length },
    { key: 'voted', label: 'Voted', count: voters.filter(v => v.voted).length },
    { key: 'notVoted', label: 'Not Voted', count: voters.filter(v => !v.voted).length },
    { key: 'withPhone', label: 'With Phone', count: voters.filter(v => v.phone).length },
    { key: 'supporters', label: 'Supporters', count: voters.filter(v => v.supportLevel === 'supporter').length },
  ];

  const toggleVoterSelection = (voterId) => {
    setSelectedVoters(prev => 
      prev.includes(voterId) 
        ? prev.filter(id => id !== voterId)
        : [...prev, voterId]
    );
  };

  const selectAllVoters = () => {
    setSelectedVoters(selectedVoters.length === categorizedVoters.length ? [] : categorizedVoters.map(v => v.id));
  };

  const handleSwipeVoter = async (voterId, newVotedStatus) => {
    try {
      await loadBalancer.execute(async () => {
        await update(ref(db, `voters/${voterId}/voted`), newVotedStatus);
        setVoters(prev => prev.map(voter => 
          voter.id === voterId ? { ...voter, voted: newVotedStatus } : voter
        ));
      });
    } catch (error) {
      console.error('Error updating voted status:', error);
    }
  };

  const bulkUpdateVotedStatus = async (status) => {
    try {
      await loadBalancer.execute(async () => {
        const updates = {};
        selectedVoters.forEach(id => {
          updates[`voters/${id}/voted`] = status;
        });
        await update(ref(db), updates);
        
        setVoters(prev => prev.map(voter => 
          selectedVoters.includes(voter.id) ? { ...voter, voted: status } : voter
        ));
        setSelectedVoters([]);
        setBulkAction('');
      });
    } catch (error) {
      console.error('Error bulk updating voted status:', error);
    }
  };

  const updateSupportLevel = async (voterId, level) => {
    try {
      await loadBalancer.execute(async () => {
        await update(ref(db, `voters/${voterId}/supportLevel`), level);
        setVoters(prev => prev.map(voter => 
          voter.id === voterId ? { ...voter, supportLevel: level } : voter
        ));
      });
    } catch (error) {
      console.error('Error updating support level:', error);
    }
  };

  const handleEditVoter = (voter) => {
    setEditingVoter(voter);
    setEditForm({
      name: voter.name || '',
      voterId: voter.voterId || '',
      phone: voter.phone || '',
      houseNumber: voter.houseNumber || '',
      age: voter.age || '',
      gender: voter.gender || ''
    });
  };

  const saveVoterEdit = async () => {
    if (!editingVoter) return;
    
    try {
      await loadBalancer.execute(async () => {
        const updates = {};
        Object.keys(editForm).forEach(key => {
          updates[`voters/${editingVoter.id}/${key}`] = editForm[key];
        });
        await update(ref(db), updates);
        
        setVoters(prev => prev.map(voter => 
          voter.id === editingVoter.id ? { ...voter, ...editForm } : voter
        ));
        setEditingVoter(null);
        setEditForm({});
      });
    } catch (error) {
      console.error('Error updating voter:', error);
    }
  };

  const sendCampaignMessage = async () => {
    if (!campaignMessage.trim()) return;
    
    try {
      await loadBalancer.execute(async () => {
        const updates = {};
        const timestamp = new Date().toISOString();
        selectedVoters.forEach(voterId => {
          updates[`voters/${voterId}/lastContacted`] = timestamp;
          updates[`voters/${voterId}/lastCampaign`] = campaignMessage;
        });
        await update(ref(db), updates);
        
        setVoters(prev => prev.map(voter => 
          selectedVoters.includes(voter.id) 
            ? { ...voter, lastContacted: timestamp }
            : voter
        ));
        
        setCampaignMessage('');
        setShowCampaignModal(false);
        setSelectedVoters([]);
      });
    } catch (error) {
      console.error('Error sending campaign:', error);
    }
  };

  const stats = {
    total: voters.length,
    voted: voters.filter(v => v.voted).length,
    withPhone: voters.filter(v => v.phone).length,
    supporters: voters.filter(v => v.supportLevel === 'supporter').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-b-3xl shadow-lg">
        <div className="px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={onBack} 
              className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 active:scale-95"
            >
              <FiArrowLeft className="text-white" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold line-clamp-2 text-base">{booth.pollingStationAddress}</h1>
              <p className="text-orange-100 text-sm flex items-center gap-1">
                <FiMapPin />
                <span className="truncate">{booth.village}</span>
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center hover:bg-red-500/30 active:scale-95"
              title="हटवा"
            >
              <FiTrash2 className="text-white" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 text-center mb-4">
            <div className="bg-white/20 rounded-xl p-2">
              <div className="font-bold text-sm">{stats.total}</div>
              <div className="text-orange-100 text-xs">Total</div>
            </div>
            <div className="bg-white/20 rounded-xl p-2">
              <div className="font-bold text-sm">{stats.voted}</div>
              <div className="text-orange-100 text-xs">Voted</div>
            </div>
            <div className="bg-white/20 rounded-xl p-2">
              <div className="font-bold text-sm">{stats.withPhone}</div>
              <div className="text-orange-100 text-xs">Phones</div>
            </div>
            <div className="bg-white/20 rounded-xl p-2">
              <div className="font-bold text-sm">{stats.supporters}</div>
              <div className="text-orange-100 text-xs">Supporters</div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-3 text-orange-300" />
              <input
                type="text"
                placeholder="Search voters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/20 rounded-xl border border-white/30 text-white placeholder-orange-200 focus:outline-none focus:ring-2 focus:ring-white/50 text-base"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 -mt-2 mb-3">
        <div className="bg-white rounded-2xl shadow-lg border border-orange-200 p-1">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                className={`flex-1 min-w-0 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  activeCategory === category.key
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-orange-50'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>{category.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeCategory === category.key
                      ? 'bg-white text-orange-500'
                      : 'bg-orange-100 text-orange-600'
                  }`}>
                    {category.count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedVoters.length > 0 && (
        <div className="px-4 mb-3">
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-800 font-medium text-sm">
                {selectedVoters.length} voters selected
              </span>
              <button
                onClick={selectAllVoters}
                className="text-blue-600 text-xs font-medium hover:text-blue-700"
              >
                {selectedVoters.length === categorizedVoters.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex gap-2">
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
                className="flex-1 bg-white border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Bulk Actions</option>
                <option value="markVoted">Mark as Voted</option>
                <option value="markNotVoted">Mark as Not Voted</option>
              </select>
              <button
                onClick={() => setShowCampaignModal(true)}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 active:scale-95 flex items-center gap-1"
              >
                <FiMessageCircle size={14} />
                Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voters List */}
      <div className="px-3 space-y-2">
        {categorizedVoters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow border border-orange-200 mx-1">
            <FiUsers className="inline text-orange-300 text-4xl mb-3" />
            <p className="text-orange-600">No voters found</p>
            <p className="text-orange-400 text-sm mt-1">Swipe right on voter cards to mark as voted</p>
          </div>
        ) : (
          categorizedVoters.map((voter) => (
            <SwipeableVoterCard
              key={voter.id}
              voter={voter}
              onSwipe={handleSwipeVoter}
              onEdit={handleEditVoter}
              onContact={(voter) => {
                setSelectedVoters([voter.id]);
                setShowCampaignModal(true);
              }}
              isSelected={selectedVoters.includes(voter.id)}
              onToggleSelect={toggleVoterSelection}
            />
          ))
        )}
      </div>

      {/* Edit Voter Modal */}
      {editingVoter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-4 border-b border-orange-200">
              <h3 className="font-bold text-gray-900">Edit Voter Details</h3>
              <p className="text-gray-500 text-sm mt-1">Update voter information</p>
            </div>
            
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Voter ID</label>
                <input
                  type="text"
                  value={editForm.voterId}
                  onChange={(e) => setEditForm({...editForm, voterId: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">House No.</label>
                  <input
                    type="text"
                    value={editForm.houseNumber}
                    onChange={(e) => setEditForm({...editForm, houseNumber: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={editForm.age}
                    onChange={(e) => setEditForm({...editForm, age: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 p-4 border-t border-orange-200">
              <button
                onClick={() => {
                  setEditingVoter(null);
                  setEditForm({});
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={saveVoterEdit}
                className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 active:scale-95 flex items-center justify-center gap-2"
              >
                <FiSave size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-4 border-b border-orange-200">
              <h3 className="font-bold text-gray-900">Contact Voters</h3>
              <p className="text-gray-500 text-sm mt-1">
                {selectedVoters.length} voter{selectedVoters.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            
            <div className="p-4">
              <textarea
                value={campaignMessage}
                onChange={(e) => setCampaignMessage(e.target.value)}
                placeholder="Enter your message or note..."
                rows="3"
                className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none text-base"
              />
              
              <div className="mt-2 text-xs text-gray-500">
                {selectedVoters.filter(vId => voters.find(v => v.id === vId)?.phone).length} voters have phone numbers
              </div>
            </div>
            
            <div className="flex gap-3 p-4 border-t border-orange-200">
              <button
                onClick={() => setShowCampaignModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={sendCampaignMessage}
                className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 active:scale-95"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiTrash2 className="text-red-600 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                बूथ हटवायचे आहे का?
              </h3>
              <p className="text-gray-600 mb-6">
                हे बूथ आणि त्यातील सर्व {booth.voters.length} मतदार कायमचे हटवले जातील. ही क्रिया पूर्ववत करता येणार नाही.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                >
                  रद्द करा
                </button>
                <button
                  onClick={deleteBoothAndVoters}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                >
                  <FiTrash2 />
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

export default BoothManagement;