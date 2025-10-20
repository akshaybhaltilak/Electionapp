import React, { useState, useEffect, useCallback } from 'react';
import {
  FiChevronLeft,
  FiList,
  FiHome,
  FiGrid,
  FiMapPin,
  FiUsers,
  FiCreditCard,
  FiDroplet,
  FiPhone,
  FiSlash,
  FiHash
} from 'react-icons/fi';
import { db, ref, onValue, off } from '../Firebase/config';
import { useNavigate } from 'react-router-dom';

// Responsive Styled Filter Page
// - Clicking an option navigates to a dedicated route: /lists/:mode (new SPA page)
// - Mobile-first responsive styling and accessible tap targets
// - Lightweight: keeps data processing local and sends mode via route params

const StyledFilterPage = () => {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState(null);
  const [filteredVoters, setFilteredVoters] = useState([]);
  const navigate = useNavigate();

  const processVoterData = useCallback((rawData) => {
    if (!rawData) return [];
    return Object.entries(rawData).map(([key, value]) => ({
      id: key,
      serial: value.serial || value.Serial || value.s || key,
      name: value.name || value.Name || value.fullName || 'Unknown',
      voterId: value.voterId || value.VoterId || '',
      boothNumber: (value.boothNumber || value.booth || value.booth_no || '') + '',
      pollingStationAddress: value.pollingStationAddress || value.pollingStation || value.address || '',
      village: value.village || value.Village || value.area || '',
      age: value.age || value.Age || '',
      phone: value.phone || value.mobile || value.Phone || ''
    }));
  }, []);

  useEffect(() => {
    setLoading(true);
    const votersRef = ref(db, 'voters');
    onValue(votersRef, (snap) => {
      if (snap.exists()) {
        const data = processVoterData(snap.val());
        setVoters(data);
        setFilteredVoters(data);
      } else {
        setVoters([]);
        setFilteredVoters([]);
      }
      setLoading(false);
    });

    return () => off(votersRef);
  }, [processVoterData]);

  // options shown in the vertical list (left icon, label)
  const options = [
    { id: 'alphabetical', label: 'Alphabetical List', icon: FiHash, mode: 'name' },
    { id: 'byVillage', label: 'By Village', icon: FiHome, mode: 'village' },
    { id: 'byPart', label: 'By Part No', icon: FiGrid, mode: 'serial' },
    { id: 'byVotingCenter', label: 'By voting center', icon: FiMapPin, mode: 'pollingStationAddress' },
    { id: 'byPersonnel', label: 'By Personnel', icon: FiUsers, mode: 'personnel' },
    { id: 'bySurname', label: 'By Surname', icon: FiCreditCard, mode: 'surname' },
    { id: 'byColour', label: 'By Colour Code', icon: FiDroplet, mode: 'colour' },
    { id: 'mobileList', label: 'Mobile No List', icon: FiPhone, mode: 'mobile' },
    { id: 'withoutMobile', label: 'Voter Without Mobile', icon: FiSlash, mode: 'withoutMobile' }
  ];

  // When user taps an option, navigate to a new SPA page '/lists/:mode'
  // The new page should read the :mode param and apply sorting/filtering itself.
  // This keeps this page lightweight and mimics "open in new page" behaviour.
  const openOptionPage = (mode) => {
    setSelectedMode(mode);
    // navigate to a new route inside the app (replace or push)
    navigate(`/lists/${mode}`);
  };

  // Small preview generator used here only (not necessary for the new page)
  const previewFor = (mode) => {
    if (!voters || voters.length === 0) return [];
    let result = [...voters];
    switch (mode) {
      case 'name':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'serial':
        result.sort((a, b) => (a.serial || '').toString().localeCompare((b.serial || '').toString(), undefined, { numeric: true }));
        break;
      case 'village':
        result.sort((a, b) => (a.village || '').localeCompare(b.village || ''));
        break;
      case 'pollingStationAddress':
        result.sort((a, b) => (a.pollingStationAddress || '').localeCompare(b.pollingStationAddress || ''));
        break;
      case 'age':
        result.sort((a, b) => (parseInt(a.age) || 0) - (parseInt(b.age) || 0));
        break;
      case 'mobile':
        result = result.filter(v => v.phone && v.phone.toString().trim());
        break;
      case 'withoutMobile':
        result = result.filter(v => !v.phone || v.phone.toString().trim() === '');
        break;
      default:
        break;
    }
    return result.slice(0, 6).map((v, i) => ({ ...v, idx: i + 1 }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Top header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-400 text-white p-4 rounded-b-3xl shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Back" className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <FiChevronLeft className="text-white" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Lists</h1>
            <p className="text-sm opacity-90">Tap an option to open it on a new page</p>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-4">
        {/* Vertical list styled like provided image */}
        <section className="bg-white rounded-2xl shadow divide-y border">
          {options.map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => openOptionPage(opt.mode)}
                className="w-full text-left flex items-center gap-4 px-4 py-5 hover:bg-orange-50 transition-colors"
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-md bg-orange-100 text-orange-600">
                  <Icon className="text-xl" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-800 font-medium text-sm sm:text-base">{opt.label}</div>
                </div>
                <div className="text-orange-400 hidden sm:block">
                  <FiList />
                </div>
              </button>
            );
          })}
        </section>

        {/* Mobile friendly quick actions and previews */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            <QuickChip label="Alphabetical" onClick={() => openOptionPage('name')} />
            <QuickChip label="Serial" onClick={() => openOptionPage('serial')} />
            <QuickChip label="Booth" onClick={() => openOptionPage('boothNumber')} />
            <QuickChip label="Polling" onClick={() => openOptionPage('pollingStationAddress')} />
            <QuickChip label="Age" onClick={() => openOptionPage('age')} />
          </div>

          {/* Previews for the currently selected mode (small list) */}
          {selectedMode && (
            <div className="mt-4 bg-white rounded-lg p-3 shadow-sm">
              <h3 className="text-sm font-medium text-gray-800 mb-2">Preview</h3>
              <ul className="divide-y max-h-44 overflow-y-auto">
                {previewFor(selectedMode).length === 0 ? (
                  <li className="text-xs text-gray-500 py-3">No preview available</li>
                ) : (
                  previewFor(selectedMode).map(v => (
                    <li key={v.id} className="flex items-center justify-between py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{v.name}</div>
                        <div className="text-xs text-gray-500 truncate">{v.village || v.pollingStationAddress}</div>
                      </div>
                      <div className="text-xs text-gray-700 ml-3">{v.boothNumber}</div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};

// Small reusable chip used for quick mobile actions
const QuickChip = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="flex-shrink-0 px-4 py-2 rounded-full border bg-white text-sm font-medium shadow-sm hover:bg-orange-50"
  >
    {label}
  </button>
);

export default StyledFilterPage;
