// // src/App.jsx
// import React, { useState } from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
// import Dashboard from './Components/Dashboard';
// import FullVoterDetails from './Components/FullVoterDetails';
// import Upload from './Components/Upload';

// function App() {
//   const [currentView, setCurrentView] = useState('upload');
//   const [uploadComplete, setUploadComplete] = useState(false);

//   const handleUploadComplete = (totalVoters) => {
//     setUploadComplete(true);
//     setCurrentView('dashboard');
//   };

//   return (
//     <Router>
//       <div className="App">
//         {/* Navigation */}
//         <nav className="bg-orange-600 text-white shadow-lg">
//           <div className="max-w-7xl mx-auto px-4">
//             <div className="flex justify-between items-center h-16">
//               <div className="flex items-center">
//                 <h1 className="text-xl font-bold">VoterData Pro</h1>
//               </div>
//               <div className="flex space-x-4">
//                 <button
//                   onClick={() => setCurrentView('upload')}
//                   className={`px-4 py-2 rounded-lg transition-colors ${
//                     currentView === 'upload' ? 'bg-orange-700' : 'hover:bg-orange-700'
//                   }`}
//                 >
//                  <Link to="/upload">Upload</Link>
//                 </button>
//                 <button
//                   onClick={() => setCurrentView('dashboard')}
//                   className={`px-4 py-2 rounded-lg transition-colors ${
//                     currentView === 'dashboard' ? 'bg-orange-700' : 'hover:bg-orange-700'
//                   }`}
//                 >
//                   <Link to="/dashboard">Dashboard</Link>
//                 </button>
//               </div>
//             </div>
//           </div>
//         </nav>

//         <Routes>
//           <Route 
//             path="/upload" 
//             element={<Upload onUploadComplete={handleUploadComplete} />} 
//           />
//           <Route path="/dashboard" element={<Dashboard />} />
//           <Route path="/voter/:voterId" element={<FullVoterDetails />} />
//           <Route 
//             path="/" 
//             element={<Navigate to={uploadComplete ? "/dashboard" : "/upload"} replace />} 
//           />
//         </Routes>
//       </div>
//     </Router>
//   );
// }

// export default App;


import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import useAutoTranslate from './hooks/useAutoTranslate';
import Dashboard from './Components/Dashboard';
import FullVoterDetails from './Components/FullVoterDetails';
import Upload from './Components/Upload';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('upload');
  const [uploadComplete, setUploadComplete] = useState(false);
  const { currentLanguage, languages, changeLanguage, translating } = useAutoTranslate();

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
        {/* Navigation */}
        <nav className="bg-orange-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold">
                  {translating ? 'Translating...' : t('VoterData Pro')}
                </h1>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Language Selector */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                    <span>🌐</span>
                    <span>{t('Language')}</span>
                    <span>▼</span>
                    {translating && <span className="animate-spin">⟳</span>}
                  </button>
                  
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors ${
                          currentLanguage === lang.code 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'text-gray-800'
                        } first:rounded-t-lg last:rounded-b-lg`}
                        disabled={translating}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{lang.flag}</span>
                          <span className="font-medium">{lang.name}</span>
                          {currentLanguage === lang.code && (
                            <span className="ml-auto text-orange-600">✓</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navigation Links */}
                <button
                  onClick={() => setCurrentView('upload')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    currentView === 'upload' ? 'bg-orange-700' : 'hover:bg-orange-700'
                  }`}
                >
                  <Link to="/upload">{t('Upload')}</Link>
                </button>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    currentView === 'dashboard' ? 'bg-orange-700' : 'hover:bg-orange-700'
                  }`}
                >
                  <Link to="/dashboard">{t('Dashboard')}</Link>
                </button>
              </div>
            </div>
          </div>
        </nav>

        <Routes>
          <Route 
            path="/upload" 
            element={<Upload onUploadComplete={handleUploadComplete} />} 
          />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/voter/:voterId" element={<FullVoterDetails />} />
          <Route 
            path="/" 
            element={<Navigate to={uploadComplete ? "/dashboard" : "/upload"} replace />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;