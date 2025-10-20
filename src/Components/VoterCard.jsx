import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Icons
import {
  FiPhone,
  FiCopy,
  FiCheck,
  FiMapPin,
  FiUser,
  FiChevronRight
} from 'react-icons/fi';

const VoterCard = ({ voter, index }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Calculate serial number from index
  const serialNumber = voter.serialNumber || index + 1;

  const handleViewDetails = () => {
    navigate(`/voter/${voter.id}`);
  };

  const handleCopyVoterId = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(voter.voterId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCall = (e) => {
    e.stopPropagation();
    if (voter.phone) {
      window.open(`tel:${voter.phone}`);
    }
  };

  return (
    <div 
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.998] mx-2 my-2"
      onClick={handleViewDetails}
    >
      <div className="flex items-center justify-between">
        {/* Left Section - Serial, Name, and Basic Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Serial Number with gradient */}
          <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white px-3 py-2 rounded-xl text-sm font-bold min-w-[40px] text-center flex-shrink-0 shadow-sm">
            #{serialNumber}
          </div>

          {/* Voter Info */}
          <div className="flex-1 min-w-0">
            {/* Name and Voter ID */}
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 truncate leading-tight">
                  {voter.name || '—'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                    {voter.voterId || '—'}
                  </span>
                  <button
                    onClick={handleCopyVoterId}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    title="Copy Voter ID"
                  >
                    {copied ? <FiCheck className="text-green-500 text-sm" /> : <FiCopy className="text-sm" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Details Row */}
            <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-2">
              {/* Booth */}
              {voter.boothNumber && (
                <div className="flex items-center gap-2 bg-blue-50 px-2 py-1 rounded-lg">
                  <FiMapPin className="text-blue-500 text-sm flex-shrink-0" />
                  <span className="text-xs font-medium">बूथ {voter.boothNumber}</span>
                </div>
              )}
              
              {/* Age */}
              {voter.age && (
                <div className="flex items-center gap-2 bg-purple-50 px-2 py-1 rounded-lg">
                  <FiUser className="text-purple-500 text-sm flex-shrink-0" />
                  <span className="text-xs font-medium">उम्र {voter.age}</span>
                </div>
              )}
              
              {/* Gender */}
              {voter.gender && (
                <div className="bg-gray-50 px-2 py-1 rounded-lg">
                  <span className="text-xs font-medium capitalize">
                    {voter.gender === 'male' ? 'पुरुष' : 
                     voter.gender === 'female' ? 'महिला' : 
                     voter.gender}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {/* Phone Call */}
          {voter.phone && (
            <button
              onClick={handleCall}
              className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-all duration-200 shadow-sm hover:shadow"
              title="Call"
            >
              <FiPhone className="text-base" />
            </button>
          )}
          {/* Chevron for navigation hint */}
          <FiChevronRight className="text-gray-400 text-lg flex-shrink-0" />
        </div>
      </div>

      {/* Copy Success Toast */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg text-sm animate-fade-in shadow-lg z-50 flex items-center gap-2">
          <FiCheck className="text-sm" />
          <span>वोटर आईडी कॉपी हुआ</span>
        </div>
      )}
    </div>
  );
};

// Ultra Compact version for very dense lists
export const UltraCompactVoterCard = ({ voter, index }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const serialNumber = voter.serialNumber || index + 1;

  const handleViewDetails = () => {
    navigate(`/voter/${voter.id}`);
  };

  const handleCopyVoterId = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(voter.voterId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div 
      className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 cursor-pointer active:bg-gray-50 mx-2 my-1.5"
      onClick={handleViewDetails}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Serial */}
          <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white px-2 py-1.5 rounded-lg text-xs font-bold min-w-[32px] text-center flex-shrink-0 shadow-sm">
            {serialNumber}
          </div>

          {/* Name and Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {voter.name || '—'}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Voter ID */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                  {voter.voterId?.slice(-4) || '—'}
                </span>
                <button
                  onClick={handleCopyVoterId}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded-lg transition-colors duration-200"
                >
                  {copied ? <FiCheck className="text-green-500 text-xs" /> : <FiCopy className="text-xs" />}
                </button>
              </div>

              {/* Booth indicator */}
              {voter.boothNumber && (
                <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                  <FiMapPin className="text-xs" />
                  <span>बूथ {voter.boothNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chevron */}
        <FiChevronRight className="text-gray-400 ml-1 flex-shrink-0" />
      </div>

      {/* Copy Success Toast */}
      {copied && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1.5 rounded text-xs animate-fade-in shadow-lg z-50">
          <span>कॉपी हुआ</span>
        </div>
      )}
    </div>
  );
};

// Usage in a list component would look like:
export const VoterList = ({ voters, loading, compact = false }) => {
  if (loading) {
    return (
      <div className="space-y-3 px-2">
        {[...Array(10)].map((_, index) => (
          <div key={index} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse mx-2">
            <div className="flex items-center gap-3">
              <div className="bg-gray-200 rounded-xl w-10 h-8 flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="bg-gray-200 rounded h-4 w-2/3"></div>
                <div className="flex gap-2">
                  <div className="bg-gray-200 rounded h-6 w-20"></div>
                  <div className="bg-gray-200 rounded h-6 w-16"></div>
                </div>
              </div>
              <div className="bg-gray-200 rounded-lg w-8 h-8 flex-shrink-0"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const CardComponent = compact ? UltraCompactVoterCard : VoterCard;

  return (
    <div className="space-y-3 py-2">
      {voters.map((voter, index) => (
        <CardComponent 
          key={voter.id || index} 
          voter={voter} 
          index={index} 
        />
      ))}
    </div>
  );
};

export default VoterCard;