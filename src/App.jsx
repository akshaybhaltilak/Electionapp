

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import useAutoTranslate from './hooks/useAutoTranslate';
import Dashboard from './Components/Dashboard';
import FullVoterDetails from './Components/FullVoterDetails';
import Upload from './Components/Upload';
import './App.css';
import Home from './Pages/Home';
import ListModePage from './Components/ListModePage';
import StyledFilterPage from './Components/styledFilterPage';

function App() {
  const [currentView, setCurrentView] = useState('upload');
  const [uploadComplete, setUploadComplete] = useState(false);
  const { currentLanguage, languages, changeLanguage, translating } = useAutoTranslate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleUploadComplete = (totalVoters) => {
    setUploadComplete(true);
    setCurrentView('dashboard');
  };

  // Simple translation function for static text
  const t = (text) => {
    if (currentLanguage === 'en') return text;
    // In a real app, you'd cache translations, but for simplicity we'll translate on demand
    return text; // The HOC will handle actual translation
  };

  return (
    <Router>
      <div className="App">
        {/* Navigation - responsive */}
        <nav className="bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Link to="/home" onClick={() => { setCurrentView('home'); setMobileMenuOpen(false); }} className="flex items-center gap-2">
                  <img src="/logo192.png" alt="logo" className="w-9 h-9 rounded-full bg-white/10 p-1" />
                  <div className="hidden sm:block">
                    <div className="text-lg font-bold">{translating ? 'Translating...' : t('VoterData Pro')}</div>
                    <div className="text-xs opacity-90">{t('Election Management')}</div>
                  </div>
                </Link>
              </div>

              {/* Desktop links */}
              <div className="hidden md:flex items-center space-x-3">
                <div className="relative group">
                  <button className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                    <span>🌐</span>
                    <span className="text-sm">{t('Language')}</span>
                    {translating && <span className="animate-spin ml-2">⟳</span>}
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors ${
                          currentLanguage === lang.code ? 'bg-orange-100 text-orange-700' : 'text-gray-800'
                        }`}
                        disabled={translating}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{lang.flag}</span>
                          <span className="font-medium">{lang.name}</span>
                          {currentLanguage === lang.code && <span className="ml-auto text-orange-600">✓</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <Link to="/home" onClick={() => setCurrentView('home')} className={`px-4 py-2 rounded-lg text-sm ${currentView === 'home' ? 'bg-orange-700' : 'hover:bg-orange-700'}`}>{t('Home')}</Link>
                <Link to="/upload" onClick={() => setCurrentView('upload')} className={`px-4 py-2 rounded-lg text-sm ${currentView === 'upload' ? 'bg-orange-700' : 'hover:bg-orange-700'}`}>{t('Upload')}</Link>
                <Link to="/dashboard" onClick={() => setCurrentView('dashboard')} className={`px-4 py-2 rounded-lg text-sm ${currentView === 'dashboard' ? 'bg-orange-700' : 'hover:bg-orange-700'}`}>{t('Dashboard')}</Link>
              </div>

              {/* Mobile hamburger */}
              <div className="md:hidden flex items-center">
                <button onClick={() => setMobileMenuOpen((s) => !s)} className="p-2 rounded-md hover:bg-white/10">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu panel */}
          {mobileMenuOpen && (
            <div className="md:hidden px-4 pb-4">
              <div className="flex flex-col gap-2">
                <Link to="/home" onClick={() => { setCurrentView('home'); setMobileMenuOpen(false); }} className={`block px-3 py-2 rounded-lg ${currentView === 'home' ? 'bg-orange-700' : 'hover:bg-orange-700'}`}>{t('Home')}</Link>
                <Link to="/upload" onClick={() => { setCurrentView('upload'); setMobileMenuOpen(false); }} className={`block px-3 py-2 rounded-lg ${currentView === 'upload' ? 'bg-orange-700' : 'hover:bg-orange-700'}`}>{t('Upload')}</Link>
                <Link to="/dashboard" onClick={() => { setCurrentView('dashboard'); setMobileMenuOpen(false); }} className={`block px-3 py-2 rounded-lg ${currentView === 'dashboard' ? 'bg-orange-700' : 'hover:bg-orange-700'}`}>{t('Dashboard')}</Link>
                <div className="pt-2 border-t border-white/10 mt-2">
                  <div className="text-sm font-medium mb-2">{t('Language')}</div>
                  {languages.map((lang) => (
                    <button key={lang.code} onClick={() => { changeLanguage(lang.code); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 ${currentLanguage === lang.code ? 'bg-white/10' : ''}`}>{lang.flag} <span className="ml-2">{lang.name}</span></button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </nav>

        <Routes>
          <Route 
            path="/upload" 
            element={<Upload onUploadComplete={handleUploadComplete} />} 
          />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/home" element={<Home />} />
          
          <Route path="/voter/:voterId" element={<FullVoterDetails />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/lists" element={<StyledFilterPage />} />
<Route path="/lists/:mode" element={<ListModePage />} />

        </Routes>
      </div>
    </Router>
  );
}

export default App;