import { useState, useEffect } from 'react';
import { boothAPI, db } from '../Firebase/config';
import { ref, onValue, off } from '../Firebase/config';

const BoothManagement = () => {
  const [booths, setBooths] = useState([]);
  const [selectedBooth, setSelectedBooth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [editingKaryakarta, setEditingKaryakarta] = useState(null);
  const [voterStats, setVoterStats] = useState({ total: 0, surveyed: 0, staffed: 0 });

  // Fetch booths data in real-time using direct Firebase reference
  useEffect(() => {
    const boothsRef = ref(db, 'booths');
    
    const unsubscribe = onValue(boothsRef, (snapshot) => {
      if (snapshot.exists()) {
        const boothsData = [];
        snapshot.forEach((childSnapshot) => {
          const boothData = childSnapshot.val();
          boothsData.push({
            id: childSnapshot.key,
            boothNumber: boothData.boothNumber || 'N/A',
            location: boothData.location || 'No location set',
            pollingStationAddress: boothData.pollingStationAddress || 'Not set',
            village: boothData.village || 'Not set',
            voterCount: boothData.voterCount || 0,
            surveyedCount: boothData.surveyedCount || 0,
            status: boothData.status || 'inactive',
            karyakartas: boothData.karyakartas || {},
            createdAt: boothData.createdAt || new Date().toISOString()
          });
        });
        
        // Sort booths by booth number
        boothsData.sort((a, b) => {
          const numA = parseInt(a.boothNumber) || 0;
          const numB = parseInt(b.boothNumber) || 0;
          return numA - numB;
        });
        
        setBooths(boothsData);
        
        // Calculate total voter stats
        const stats = boothsData.reduce((acc, booth) => {
          acc.total += booth.voterCount || 0;
          acc.surveyed += booth.surveyedCount || 0;
          acc.staffed += (booth.karyakartas && Object.keys(booth.karyakartas).length > 0) ? 1 : 0;
          return acc;
        }, { total: 0, surveyed: 0, staffed: 0 });
        
        setVoterStats(stats);
      } else {
        console.log('No booths data available');
        setBooths([]);
        setVoterStats({ total: 0, surveyed: 0, staffed: 0 });
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching booths:', error);
      setLoading(false);
      setBooths([]);
    });

    return () => {
      // Cleanup the real-time listener
      off(boothsRef, 'value', unsubscribe);
    };
  }, []);

  // Update booth details
  const updateBoothDetails = async (boothId, updates) => {
    try {
      const boothRef = ref(db, `booths/${boothId}`);
      await boothAPI.saveBooth(updates, boothId);
      console.log('Booth updated successfully');
    } catch (error) {
      console.error('Error updating booth:', error);
      alert('Error updating booth details');
    }
  };

  // Add new karyakarta
  const addKaryakarta = async (boothId, karyakartaData) => {
    try {
      await boothAPI.addKaryakarta(boothId, karyakartaData);
    } catch (error) {
      console.error('Error adding karyakarta:', error);
      alert('Error adding staff member');
    }
  };

  // Update existing karyakarta
  const updateKaryakarta = async (boothId, karyakartaId, updates) => {
    try {
      await boothAPI.updateKaryakarta(boothId, karyakartaId, updates);
    } catch (error) {
      console.error('Error updating karyakarta:', error);
      alert('Error updating staff member');
    }
  };

  // Initialize sample data if no booths exist
  const initializeSampleData = async () => {
    try {
      await boothAPI.initializeSampleBooths();
      alert('Sample booths initialized! Refresh the page to see them.');
    } catch (error) {
      console.error('Error initializing sample data:', error);
      alert('Error initializing sample data');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-orange-600 font-medium">Loading booths data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-orange-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-orange-800">Booth Management</h1>
              <p className="text-sm text-orange-600">Real-time booth overview</p>
            </div>
            {booths.length === 0 && (
              <button
                onClick={initializeSampleData}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                Initialize Sample Data
              </button>
            )}
          </div>
        </div>
        
        {/* View Toggle */}
        <div className="flex border-t border-orange-200 bg-orange-100">
          <button
            onClick={() => setView('list')}
            className={`flex-1 py-3 text-center font-medium transition-all duration-200 ${
              view === 'list' 
                ? 'text-orange-600 border-b-2 border-orange-600 bg-white' 
                : 'text-orange-500 hover:text-orange-700'
            }`}
          >
            📋 List View
          </button>
          <button
            onClick={() => setView('map')}
            className={`flex-1 py-3 text-center font-medium transition-all duration-200 ${
              view === 'map' 
                ? 'text-orange-600 border-b-2 border-orange-600 bg-white' 
                : 'text-orange-500 hover:text-orange-700'
            }`}
          >
            🗺️ Map View
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white text-black bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-2xl font-bold">{booths.length}</div>
            <div className="text-xs opacity-90">Total Booths</div>
          </div>
          <div className="bg-white  text-black bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-2xl font-bold">{voterStats.total.toLocaleString()}</div>
            <div className="text-xs opacity-90">Total Voters</div>
          </div>
          <div className="bg-white text-black bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-2xl font-bold">{voterStats.surveyed.toLocaleString()}</div>
            <div className="text-xs opacity-90">Surveys Done</div>
          </div>
          <div className="bg-white text-black bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-2xl font-bold">{voterStats.staffed}</div>
            <div className="text-xs opacity-90">Staffed Booths</div>
          </div>
        </div>
      </div>

      {/* Booth List */}
      {view === 'list' && (
        <div className="p-4 space-y-4">
          {booths.length === 0 ? (
            <div className="text-center py-12 text-orange-600 bg-white rounded-2xl shadow-sm border border-orange-200">
              <div className="text-4xl mb-4">🏛️</div>
              <p className="text-lg font-medium mb-2">No booths found</p>
              <p className="text-sm text-orange-500 mb-4">Get started by adding booths to your database</p>
              <button
                onClick={initializeSampleData}
                className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors"
              >
                Initialize Sample Booths
              </button>
            </div>
          ) : (
            booths.map((booth) => (
              <div
                key={booth.id}
                className="bg-white rounded-2xl shadow-lg border border-orange-200 p-4 active:scale-[0.98] transition-all duration-200 cursor-pointer hover:shadow-xl hover:border-orange-300"
                onClick={() => setSelectedBooth(booth)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-bold">#{booth.boothNumber}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">Booth {booth.boothNumber}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          booth.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {booth.status || 'inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 flex items-center gap-1">
                      📍 {booth.location}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-xs">👥</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{booth.voterCount.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">Voters</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 text-xs">📊</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">
                            {booth.karyakartas ? Object.keys(booth.karyakartas).length : 0}
                          </div>
                          <div className="text-xs text-gray-500">Staff</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`w-3 h-3 rounded-full mb-1 animate-pulse ${
                      booth.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <span className={`text-xs font-medium ${
                      booth.status === 'active' ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {booth.status === 'active' ? 'Live' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Map View */}
      {view === 'map' && (
        <div className="p-4">
          <div className="bg-gradient-to-br from-orange-100 to-white rounded-2xl h-80 flex items-center justify-center relative overflow-hidden border border-orange-200 shadow-lg">
            <div className="absolute inset-0 bg-grid-orange-200 opacity-20"></div>
            <div className="text-center text-orange-600 relative z-10">
              <div className="text-4xl mb-4">🗺️</div>
              <p className="font-medium">Interactive Map View</p>
              <p className="text-sm text-orange-500 mt-1">
                Showing {booths.length} booth{booths.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            {/* Simulated booth markers */}
            {booths.slice(0, 3).map((booth, index) => (
              <div 
                key={booth.id}
                className={`absolute w-4 h-4 bg-orange-500 rounded-full animate-bounce ${
                  index === 0 ? 'top-1/4 left-1/4' : 
                  index === 1 ? 'top-1/3 right-1/3' : 
                  'bottom-1/3 left-1/3'
                }`}
                style={{animationDelay: `${index * 0.2}s`}}
              ></div>
            ))}
          </div>
          
          {/* Booth list under map */}
          <div className="mt-6 space-y-3">
            <h3 className="font-bold text-orange-800 text-lg mb-3">
              All Booths ({booths.length})
            </h3>
            {booths.map((booth) => (
              <div
                key={booth.id}
                className="bg-white p-4 rounded-xl border border-orange-200 flex justify-between items-center cursor-pointer hover:shadow-lg hover:border-orange-300 transition-all duration-200"
                onClick={() => setSelectedBooth(booth)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-sm">#{booth.boothNumber}</span>
                  </div>
                  <div>
                    <div className="font-bold text-gray-800">Booth {booth.boothNumber}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      📍 {booth.location}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-800">{booth.voterCount.toLocaleString()} voters</div>
                  <div className="text-xs text-orange-600 font-medium">
                    {booth.karyakartas ? Object.keys(booth.karyakartas).length : 0} staff
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booth Detail Modal */}
      {selectedBooth && (
        <BoothDetailModal
          booth={selectedBooth}
          onClose={() => setSelectedBooth(null)}
          onUpdateBooth={updateBoothDetails}
          onEditKaryakarta={setEditingKaryakarta}
        />
      )}

      {/* Add/Edit Karyakarta Modal */}
      {editingKaryakarta && (
        <KaryakartaModal
          karyakarta={editingKaryakarta}
          boothId={selectedBooth?.id}
          onClose={() => setEditingKaryakarta(null)}
          onSave={editingKaryakarta === 'new' ? addKaryakarta : updateKaryakarta}
        />
      )}
    </div>
  );
};

// Booth Detail Modal Component
const BoothDetailModal = ({ booth, onClose, onUpdateBooth, onEditKaryakarta }) => {
  const [localBooth, setLocalBooth] = useState(booth);

  const handleStatusChange = (newStatus) => {
    const updates = { status: newStatus };
    setLocalBooth({ ...localBooth, ...updates });
    onUpdateBooth(booth.id, updates);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex items-end justify-center p-4">
      <div className="bg-white rounded-t-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-orange-200 p-6 rounded-t-2xl shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold">#{booth.boothNumber}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Booth {booth.boothNumber}</h2>
                <p className="text-orange-600 flex items-center gap-1">
                  📍 {booth.location}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-full bg-orange-100 hover:bg-orange-200 transition-colors text-orange-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-6">
          {/* Status Toggle */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">Booth Status</h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleStatusChange('active')}
                className={`flex-1 py-3 rounded-xl border-2 transition-all duration-200 ${
                  localBooth.status === 'active'
                    ? 'bg-green-500 text-white border-green-500 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                }`}
              >
                ✅ Active
              </button>
              <button
                onClick={() => handleStatusChange('inactive')}
                className={`flex-1 py-3 rounded-xl border-2 transition-all duration-200 ${
                  localBooth.status !== 'active'
                    ? 'bg-gray-500 text-white border-gray-500 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                ⏸️ Inactive
              </button>
            </div>
          </div>

          {/* Voter Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {booth.voterCount.toLocaleString()}
              </div>
              <div className="text-sm text-blue-800 font-medium">Total Voters</div>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {booth.surveyedCount.toLocaleString()}
              </div>
              <div className="text-sm text-green-800 font-medium">Surveys Completed</div>
            </div>
          </div>

          {/* Karyakartas Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">Assigned Staff</h3>
              <button
                onClick={() => onEditKaryakarta('new')}
                className="bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors shadow-lg flex items-center gap-2"
              >
                <span>+</span> Add Staff
              </button>
            </div>

            {booth.karyakartas && Object.keys(booth.karyakartas).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(booth.karyakartas).map(([key, karyakarta]) => (
                  <div key={key} className="flex justify-between items-center p-4 bg-orange-50 rounded-xl border border-orange-200 hover:bg-orange-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-orange-300">
                        <span className="text-orange-600 text-sm">👤</span>
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{karyakarta.name}</div>
                        <div className="text-sm text-orange-600">
                          {karyakarta.role} • {karyakarta.phone}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onEditKaryakarta({ id: key, ...karyakarta })}
                      className="text-orange-600 text-sm font-medium hover:text-orange-800 transition-colors bg-white px-3 py-1 rounded-lg border border-orange-300"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-orange-500 bg-orange-50 rounded-xl border border-orange-200">
                <div className="text-3xl mb-3">👥</div>
                <p className="font-medium">No staff assigned yet</p>
                <p className="text-sm mt-1">Add staff members to manage this booth</p>
              </div>
            )}
          </div>

          {/* Booth Information */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">Booth Information</h3>
            <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600 font-medium">Address:</span>
                <span className="text-right text-gray-800">{booth.pollingStationAddress}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600 font-medium">Village:</span>
                <span className="text-gray-800">{booth.village}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 font-medium">Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  booth.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {booth.status || 'inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-orange-200">
            <button className="flex-1 bg-orange-100 text-orange-800 py-3 rounded-xl font-bold hover:bg-orange-200 transition-colors border border-orange-300 flex items-center justify-center gap-2">
              <span>👥</span> View Voters
            </button>
            <button className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors shadow-lg flex items-center justify-center gap-2">
              <span>📊</span> Start Survey
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Karyakarta Modal Component (same as before)
const KaryakartaModal = ({ karyakarta, boothId, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: karyakarta.name || '',
    phone: karyakarta.phone || '',
    role: karyakarta.role || 'volunteer'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (boothId) {
      if (karyakarta === 'new') {
        onSave(boothId, formData);
      } else {
        onSave(boothId, karyakarta.id, formData);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-orange-200">
        <div className="p-6 border-b border-orange-200 bg-orange-50 rounded-t-2xl">
          <h3 className="text-xl font-bold text-orange-800">
            {karyakarta === 'new' ? '➕ Add Staff Member' : '✏️ Edit Staff Member'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-4 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
              placeholder="Enter staff member's name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-4 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
              placeholder="Enter phone number"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full p-4 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white"
            >
              <option value="volunteer">🎯 Volunteer</option>
              <option value="supervisor">👨‍💼 Supervisor</option>
              <option value="manager">👔 Manager</option>
            </select>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-800 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors border border-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-700 transition-colors shadow-lg"
            >
              {karyakarta === 'new' ? 'Add Staff' : 'Update Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BoothManagement;