import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LOCAL_STORAGE_KEY = 'janetaa_home_branding_v1';

const defaultBranding = {
  // Compact card
  
  // Top hero banner shown during initial load
  bannerUrl: '/bannerstarting.jpg',
  // Enhanced card
  leaderImageUrl: '/banner2.png',
  leaderName: 'Vinod Murlidhar Mapari',
  leaderTagline:
    'Akola Mahanagarpalika 2025 Sarvatrik Nivadanuak Prabhag Kr. 20 che Adhikrut Umedvaar',
  slogan: "Your Vote, Your Voice - Let's Build Together!",
  cta1: 'Vote Now',
  cta2: 'Share',
  // new fields
  serialNumber: 'S-001',
  signImageUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
  // quick stats (top compact card)
  // quickStats: [
  //   { value: '10K+', label: 'Voters' },
  //   { value: '50+', label: 'Booths' },
  //   { value: '99%', label: 'Accuracy' }
  // ],
  // bottom stats for enhanced section
  
};

const Home = () => {
  const navigate = useNavigate();
  // splash/banner removed
  const [editMode, setEditMode] = useState(false);
  const [branding, setBranding] = useState(defaultBranding);
  const [workingCopy, setWorkingCopy] = useState(null);
  const [lastSavedBranding, setLastSavedBranding] = useState(null);

  // splash/banner removed: no initial timed splash

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setBranding(parsed);
        setLastSavedBranding(parsed);
      }
    } catch (e) {
      console.warn('Failed to load branding from localStorage', e);
    }
  }, []);

  // Autosave whenever workingCopy changes (so page refresh preserves in-progress edits)
  useEffect(() => {
    if (!workingCopy) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(workingCopy));
      // update live branding and lastSavedBranding as autosave
      setBranding(workingCopy);
      setLastSavedBranding(workingCopy);
    } catch (e) {
      console.warn('Failed to autosave branding to localStorage', e);
    }
  }, [workingCopy]);

  const features = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      action: () => navigate('/dashboard')
    },
    {
      id: 'filters',
      title: 'Filters',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
        </svg>
      ),
      action: () => navigate('/filters')
    },
    {
      id: 'new-voter',
      title: 'Add Voter',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      action: () => navigate('/new-voter')
    },
    {
      id: 'booth-management',
      title: 'Booths',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      action: () => navigate('/booth-management')
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      action: () => navigate('/settings')
    },
    {
      id: 'upload',
      title: 'Upload',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      action: () => navigate('/upload')
    }
  ];

  // no transient splash - render full page immediately
  const startEditing = () => {
    setWorkingCopy(JSON.parse(JSON.stringify(branding)));
    setEditMode(true);
  };

  const cancelEditing = () => {
    // restore the last saved branding (not the working copy)
    if (lastSavedBranding) {
      setBranding(lastSavedBranding);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lastSavedBranding));
      } catch (e) {
        console.warn('Failed to restore branding to localStorage', e);
      }
    }
    setWorkingCopy(null);
    setEditMode(false);
  };

  const resetBranding = () => {
    if (!confirm('Reset branding to defaults?')) return;
    setBranding(defaultBranding);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to remove branding from localStorage', e);
    }
    setWorkingCopy(null);
    setEditMode(false);
  };

  const saveBranding = () => {
    const toSave = workingCopy || branding;
    setBranding(toSave);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(toSave));
      setLastSavedBranding(toSave);
    } catch (e) {
      console.warn('Failed to save branding to localStorage', e);
    }
    setWorkingCopy(null);
    setEditMode(false);
  };

  const onFieldChange = (path, value) => {
    setWorkingCopy((prev) => {
      const next = prev ? { ...prev } : { ...branding };
      // support simple dot paths for now
      const parts = path.split('.');
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!(p in cur)) cur[p] = {};
        cur = cur[p];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const readFileAsDataUrl = (file) =>
    new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });

  const handleImageUpload = async (e, path) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onFieldChange(path, dataUrl);
    } catch (err) {
      console.warn('Failed to read file', err);
    }
  };

  const active = editMode ? workingCopy || branding : branding;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white pb-56">
      {/* Enhanced Header with App Info */}
      <div className="mb-6 px-4 pt-4">
        <div className="max-w-md mx-auto backdrop-blur-sm rounded-3xl shadow-lg border border-white/30 bg-white/80 flex items-center gap-4 p-4 sm:p-5">
          {/* App Logo with gradient effect */}
          <div className="w-14 h-14 flex items-center justify-center flex-shrink-0 transform transition-all hover:scale-105 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-2 shadow-md">
            <img 
              src="https://cdn-icons-png.flaticon.com/128/17873/17873030.png" 
              alt="JanNetaa" 
              className="w-8 h-8 filter brightness-0 invert"
            />
          </div>

          {/* App Title and Developer Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-extrabold leading-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-700">Jan</span>
                  <span className="ml-1 bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-red-600">Netaa</span>
                </h1>
                <p className="text-xs text-gray-600 font-medium mt-1">By WebBeth Solutions</p>
              </div>

              <div className="flex items-center gap-2">
                {!editMode ? (
                  <>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all duration-200"
                    >
                      Get Started
                    </button>
                    <button
                      onClick={startEditing}
                      className="inline-flex items-center gap-2 bg-white text-orange-600 px-3 py-2 rounded-full text-sm font-semibold shadow-sm hover:scale-105 focus:outline-none border border-orange-200 transition-all duration-200"
                    >
                      Edit Branding
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={saveBranding} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-full text-sm font-semibold shadow-sm hover:bg-emerald-700 transition-colors">Save</button>
                    <button onClick={cancelEditing} className="inline-flex items-center gap-2 bg-white text-gray-800 px-3 py-2 rounded-full text-sm font-semibold shadow-sm border border-gray-300 hover:bg-gray-50 transition-colors">Cancel</button>
                    <button onClick={resetBranding} className="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-full text-sm font-semibold shadow-sm hover:bg-red-700 transition-colors">Reset</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Features Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto px-4">
        {features.map((feature) => (
          <div
            key={feature.id}
            onClick={feature.action}
            className="group cursor-pointer"
          >
            <div className="bg-white rounded-xl shadow-md border border-orange-100 p-4 text-center hover:shadow-lg transition-all duration-200 hover:border-orange-300 hover:-translate-y-1">
              <div className="flex justify-center mb-2">
                <div className="text-orange-500 group-hover:text-orange-600 transition-colors">
                  {feature.icon}
                </div>
              </div>
              <div className="text-xs font-semibold text-gray-700 group-hover:text-gray-900">
                {feature.title}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* (political branding card moved to sticky footer) */}

    
    

      {/* Edit Panel: show when editMode=true */}
      {editMode && (
        <div className="mt-8 max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-6 border border-orange-100">
          <h4 className="font-bold text-lg mb-4 text-gray-800">Edit Branding</h4>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Leader Name</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" value={workingCopy?.leaderName || ''} onChange={(e) => onFieldChange('leaderName', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Leader Tagline</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" value={workingCopy?.leaderTagline || ''} onChange={(e) => onFieldChange('leaderTagline', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Slogan</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" value={workingCopy?.slogan || ''} onChange={(e) => onFieldChange('slogan', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">CTA Primary</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" value={workingCopy?.cta1 || ''} onChange={(e) => onFieldChange('cta1', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">CTA Secondary</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" value={workingCopy?.cta2 || ''} onChange={(e) => onFieldChange('cta2', e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Leader Image</label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden border border-gray-300">
                  <img src={workingCopy?.leaderImageUrl || branding.leaderImageUrl} alt="preview" className="w-full h-full object-cover" />
                </div>
                <div>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'leaderImageUrl')} className="text-sm" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Serial Number</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" value={workingCopy?.serialNumber || ''} onChange={(e) => onFieldChange('serialNumber', e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Sign Image</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center">
                  <img src={workingCopy?.signImageUrl || branding.signImageUrl} alt="sign preview" className="w-16 h-10 object-contain" />
                </div>
                <div>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'signImageUrl')} className="text-sm" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button onClick={saveBranding} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors">Save Changes</button>
              <button onClick={cancelEditing} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors">Cancel</button>
              <button onClick={resetBranding} className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors">Reset All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;