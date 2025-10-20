import React, { useEffect, useState, useRef } from 'react';
import { db, ref, set as dbSet, onValue, off } from '../Firebase/config';
import { useNavigate } from 'react-router-dom';

const LOCAL_STORAGE_KEY = 'janetaa_home_branding_v1';

const defaultBranding = {
  // start empty - nothing shown until user configures branding
  bannerUrl: '',
  leaderImageUrl: '',
  leaderName: '',
  leaderTagline: '',
  slogan: '',
  cta1: '',
  cta2: '',
  serialNumber: '',
  signImageUrl: '',
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
  // removed transient splash/banner - showBranding and timer not needed
  // removed transient splash/banner - no showBranding state needed
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
      // ignore invalid stored value
      console.warn('Failed to load branding from localStorage', e);
    }
    // realtime sync: subscribe to remote branding changes
  const remoteRef = ref(db, 'branding/current');
  try {
    const callback = (snapshot) => {
      const remote = snapshot.val();
      if (remote) {
        try {
          setBranding(remote);
          setLastSavedBranding(remote);
          // if user is editing, update working copy too for realtime preview
          setWorkingCopy((prev) => (prev ? { ...prev, ...remote } : null));
          // also sync to localStorage so other tabs pick it up
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remote));
        } catch (e) {
          console.warn('Failed to apply remote branding', e);
        }
      }
    };

    onValue(remoteRef, callback);
    // cleanup
    return () => off(remoteRef, 'value', callback);
  } catch (e) {
    console.warn('Realtime DB not available or subscription failed', e);
  }
  }, []);

  // Debounced remote write: keep a ref for latest timer
  const writeTimer = useRef(null);
  const writeRemoteBranding = (data) => {
    // debounce 800ms
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      try {
        const remoteRef2 = ref(db, 'branding/current');
        dbSet(remoteRef2, data);
      } catch (e) {
        console.warn('Failed to write branding to remote DB', e);
      }
    }, 800);
  };

  // Autosave whenever workingCopy changes (so page refresh preserves in-progress edits)
  useEffect(() => {
    if (!workingCopy) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(workingCopy));
      // update live branding and lastSavedBranding as autosave
      setBranding(workingCopy);
      setLastSavedBranding(workingCopy);
      // push to remote DB for realtime sync
      try { writeRemoteBranding(workingCopy); } catch (e) { /* ignore */ }
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
  id: 'Lists',
  title: 'Lists',
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1  1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
    </svg>
  ),
  action: () => navigate('/lists')
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
      try { writeRemoteBranding(defaultBranding); } catch (e) { console.warn('Remote reset failed', e); }
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
      try { writeRemoteBranding(toSave); } catch (e) { console.warn('Remote write failed', e); }
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
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
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

  {/* Enhanced Political Branding Section - Single Attractive Card */}
  { (active.leaderName || active.bannerUrl || active.slogan || active.serialNumber) ? (
  <div className="mt-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl shadow-2xl overflow-hidden max-w-md mx-auto border-4 border-white/30 transform hover:scale-[1.01] transition-all duration-300">
        <div className="flex h-auto">
          {/* Left Side - Politician Image (40%) */}
          <div className="w-4/10 flex-shrink-0 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/30 to-transparent z-10"></div>
            <img
              src={active.leaderImageUrl}
              alt="Political Leader"
              className="w-full h-full object-cover"
              onError={(_evt) => {
                /* fallback placeholder image */
                _evt.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='192' viewBox='0 0 120 192'%3E%3Crect width='120' height='192' fill='%23fed7aa'/%3E%3Ccircle cx='60' cy='70' r='30' fill='%23fdba74'/%3E%3Crect x='45' y='110' width='30' height='60' fill='%23fdba74'/%3E%3C/svg%3E";
              }}
            />
            {editMode && (
              <div className="absolute top-3 right-3 z-20 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md">
                <label className="text-xs text-gray-700 cursor-pointer font-medium">
                  Change Image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'leaderImageUrl')} />
                </label>
              </div>
            )}
          </div>

          {/* Right Side - Content (60%) */}
          <div className="w-6/10 p-4 flex flex-col justify-between bg-white/95">

            {/* Top Section - Party Logos and Heading */}
            <div>
              {/* Party Alliance Logos */}
              <div className="flex justify-center items-center mb-3">
                <div className="flex space-x-2">
                  {/* Main Party Logo */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white p-1 shadow-sm">
                    <img src="https://crystalpng.com/wp-content/uploads/2023/05/bjp-logo-png-1024x1024.png" alt="BJP" className="w-full h-full object-contain" />
                  </div>
                  {/* Alliance Partner 1 */}
                  <div className="w-9 h-9 rounded flex items-center justify-center bg-white p-1 shadow-sm">
                    <img src="https://images.seeklogo.com/logo-png/39/2/shiv-sena-logo-png_seeklogo-393250.png" alt="Partner" className="w-full h-full object-contain" />
                  </div>
                  {/* Alliance Partner 2 */}
                  <div className="w-8 h-8 rounded flex items-center justify-center bg-white p-1 shadow-sm">
                    <img src="https://www.clipartmax.com/png/middle/429-4291464_rashtrawadi-punha-clipart-nationalist-congress-party-rashtrawadi-congress-party-logo-png.png" alt="Partner" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>

              {/* Main Heading */}
              <h3 className="text-orange-600 font-bold text-lg mb-1 leading-tight text-center">
                {active.leaderName}
              </h3>

              {/* Tagline */}
              <p className="text-gray-700 text-xs mb-3 font-medium leading-tight text-center">
                {active.leaderTagline}
              </p>
            </div>

            {/* Middle Section - Campaign Slogan */}
            <div className="mb-3">
              <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-xl p-3 border border-orange-200 shadow-sm">
                <p className="text-gray-800 text-sm font-bold text-center leading-tight">
                  {active.slogan}
                </p>
                {editMode && (
                  <div className="mt-2 text-xs text-gray-600 text-center">Slogan can be edited below</div>
                )}
              </div>
            </div>

            {/* Bottom Section - Call to Action */}
            <div className="flex space-x-2">
              <button className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white py-2 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 text-center border border-white/30">
                {active.cta1}
              </button>
              <button className="flex-1 bg-white text-orange-600 py-2 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 text-center border border-orange-300">
                {active.cta2}
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Bottom Stats Bar */}
        <div className="bg-white/20 backdrop-blur-sm border-t border-white/30">
          <div className="grid grid-cols-3 items-center text-center gap-2 p-3">
            <div className="py-2">
              <div className="text-white font-bold text-sm">{active.leaderName.split(' ')[0]}</div>
              <div className="text-orange-200 text-xs font-medium">Candidate</div>
            </div>
            <div className="py-2 border-x border-white/20">
              <div className="text-white font-bold text-sm">{active.serialNumber}</div>
              <div className="text-orange-200 text-xs font-medium">Serial No.</div>
            </div>
            <div className="py-2">
              <div className="mx-auto w-10 h-10 rounded-full overflow-hidden bg-white/20 flex items-center justify-center border-2 border-white/30">
                <img src={active.signImageUrl} alt="sign" className="w-8 h-8 object-contain" />
              </div>
              <div className="text-orange-200 text-xs font-medium mt-1">Signature</div>
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="mt-4 max-w-md mx-auto p-6 bg-white rounded-2xl border border-gray-200 text-center">
          <div className="text-gray-500 mb-3">No branding configured yet.</div>
          <button onClick={startEditing} className="bg-orange-600 text-white px-4 py-2 rounded-lg">Edit Branding</button>
        </div>
      )}

      {/* Call to Action */}
      
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