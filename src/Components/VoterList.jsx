import React, { useState, useCallback, memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as ReactWindow from 'react-window';

const FixedSizeList = ReactWindow.FixedSizeList || (ReactWindow.default && ReactWindow.default.FixedSizeList) || ReactWindow.default || null;
import { FiCopy, FiMapPin, FiPhone, FiUser, FiLoader, FiCheck, FiChevronRight } from 'react-icons/fi';
import TranslatedText from './TranslatedText';

const VoterRow = memo(({ data, index, style }) => {
  const voter = data.voters[index];
  const [copied, setCopied] = useState(false);

  const handleCopyVoterId = useCallback(async (e) => {
    e && e.stopPropagation();
    try {
      await navigator.clipboard.writeText(voter.voterId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [voter.voterId]);

  const handleCall = useCallback((e) => {
    e && e.stopPropagation();
    if (voter.phone) {
      window.open(`tel:${voter.phone}`);
    }
  }, [voter.phone]);

  const handleViewDetails = useCallback((e) => {
    e && e.stopPropagation();
    if (data && typeof data.onView === 'function') {
      data.onView(voter);
    } else {
      console.log('View details:', voter.id);
    }
  }, [data, voter]);

  if (!voter) {
    return (
      <div style={style} className="px-4">
        <div className="animate-pulse bg-gray-200/60 rounded-lg h-16 mb-2"></div>
      </div>
    );
  }

  return (
    <div style={style} className="px-4 mb-2">
      <div 
        className="bg-white rounded-lg p-3 border-b border-gray-100 hover:bg-gray-50 transition-all duration-150 cursor-pointer active:bg-gray-100"
        onClick={handleViewDetails}
      >
        <div className="flex items-center justify-between">
          {/* Left Section - Serial, Name, and Basic Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Serial Number */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-1 rounded text-xs font-bold min-w-[32px] text-center flex-shrink-0">
              #{index + 1}
            </div>

            {/* Voter Info */}
            <div className="flex-1 min-w-0">
              {/* Name and Voter ID */}
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {voter.name || '—'}
                </h3>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                    {voter.voterId || '—'}
                  </span>
                  <button
                    onClick={handleCopyVoterId}
                    className="p-0.5 text-gray-400 hover:text-blue-600 rounded transition-colors duration-200"
                    title="Copy Voter ID"
                  >
                    {copied ? <FiCheck className="text-green-500 text-xs" /> : <FiCopy className="text-xs" />}
                  </button>
                </div>
              </div>

              {/* Details Row */}
              <div className="flex items-center gap-3 text-xs text-gray-600">
                {/* Booth */}
                {voter.boothNumber && (
                  <div className="flex items-center gap-1">
                    <FiMapPin className="text-blue-500 text-xs" />
                    <span>बूथ {voter.boothNumber}</span>
                  </div>
                )}
                
                {/* Age */}
                {voter.age && (
                  <div className="flex items-center gap-1">
                    <FiUser className="text-purple-500 text-xs" />
                    <span>उम्र {voter.age}</span>
                  </div>
                )}
                
                {/* Gender */}
                {voter.gender && (
                  <span className="capitalize">
                    {voter.gender === 'male' ? 'पुरुष' : 
                     voter.gender === 'female' ? 'महिला' : 
                     voter.gender}
                  </span>
                )}
              </div>

              {/* Polling Station Address */}
              {voter.pollingStationAddress && (
                <p className="text-xs text-gray-500 truncate mt-1">
                  {voter.pollingStationAddress}
                </p>
              )}
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {/* Phone Call */}
            {voter.phone && (
              <button
                onClick={handleCall}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                title="Call"
              >
                <FiPhone className="text-sm" />
              </button>
            )}
            {/* Chevron */}
            <FiChevronRight className="text-gray-400 text-sm ml-1" />
          </div>
        </div>

        {/* Copy Success Toast */}
        {copied && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1.5 rounded text-xs animate-fade-in shadow-lg z-50">
            <div className="flex items-center gap-1.5">
              <FiCheck className="text-xs" />
              <span>कॉपी हुआ</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

VoterRow.displayName = 'VoterRow';

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
      className="bg-white p-2 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
      onClick={handleViewDetails}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Serial */}
          <div className="bg-orange-500 text-white px-1.5 py-0.5 rounded text-xs font-bold min-w-[24px] text-center flex-shrink-0">
            {serialNumber}
          </div>

          {/* Name */}
          <span className="text-sm font-medium text-gray-900 truncate flex-1">
            {voter.name || '—'}
          </span>

          {/* Voter ID */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
              {voter.voterId?.slice(-4) || '—'}
            </span>
            <button
              onClick={handleCopyVoterId}
              className="p-0.5 text-gray-400 hover:text-blue-600 rounded"
            >
              {copied ? <FiCheck className="text-green-500 text-xs" /> : <FiCopy className="text-xs" />}
            </button>
          </div>
        </div>

        {/* Booth indicator */}
        {voter.boothNumber && (
          <div className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium flex-shrink-0">
            {voter.boothNumber}
          </div>
        )}
      </div>

      {/* Copy Success Toast */}
      {copied && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-2 py-1 rounded text-xs animate-fade-in shadow-lg z-50">
          <span>कॉपी हुआ</span>
        </div>
      )}
    </div>
  );
};

// Enhanced loading skeleton
const LoadingSkeleton = () => (
  <div className="px-4 mb-2">
    <div className="bg-white rounded-lg p-3 border-b border-gray-100 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="bg-gray-200 rounded w-8 h-6"></div>
        <div className="flex-1 space-y-2">
          <div className="bg-gray-200 rounded h-4 w-1/3"></div>
          <div className="bg-gray-200 rounded h-3 w-1/4"></div>
        </div>
      </div>
    </div>
  </div>
);

const VoterList = ({ voters, loading, onLoadMore, hasMore, compact = false }) => {
  const itemHeight = compact ? 60 : 80; // Reduced height for compact design
  const navigate = useNavigate();

  const listData = useMemo(() => ({
    voters,
    loading,
    onLoadMore,
    hasMore,
    onView: (v) => navigate(`/voter/${v.id}`)
  }), [voters, loading, onLoadMore, hasMore, navigate]);

  if (loading && voters.length === 0) {
    return (
      <div className="space-y-1">
        {[...Array(10)].map((_, index) => (
          <div key={index} className="bg-white p-3 border-b border-gray-100 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="bg-gray-200 rounded w-8 h-6"></div>
              <div className="flex-1 space-y-2">
                <div className="bg-gray-200 rounded h-4 w-1/3"></div>
                <div className="bg-gray-200 rounded h-3 w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (voters.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400 mb-4">
          <FiUser className="text-4xl mx-auto" />
        </div>
        <p className="text-gray-600 font-medium mb-2">
          <TranslatedText>No voters found</TranslatedText>
        </p>
        <p className="text-gray-500 text-sm">
          <TranslatedText>Try adjusting your search or filters</TranslatedText>
        </p>
      </div>
    );
  }

  // Fallback for FixedSizeList
  if (!FixedSizeList) {
    const CardComponent = compact ? UltraCompactVoterCard : VoterRow;
    
    return (
      <div className="space-y-1">
        {voters.map((voter, idx) => (
          compact ? (
            <UltraCompactVoterCard 
              key={voter.id || idx} 
              voter={voter} 
              index={idx} 
            />
          ) : (
            <VoterRow 
              key={voter.id || idx} 
              data={{ voters, onView: (v) => navigate(`/voter/${v.id}`) }} 
              index={idx} 
              style={{}} 
            />
          )
        ))}
        {loading && voters.length > 0 && (
          <div className="flex justify-center items-center py-4 border-t border-gray-100">
            <FiLoader className="animate-spin text-orange-500 text-xl mr-3" />
            <span className="text-gray-600">
              <TranslatedText>Loading more voters...</TranslatedText>
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <FixedSizeList
        height={600}
        itemCount={voters.length}
        itemSize={itemHeight}
        itemData={listData}
        className="scrollbar-hide"
      >
        {VoterRow}
      </FixedSizeList>

      {/* Loading indicator for additional items */}
      {loading && voters.length > 0 && (
        <div className="flex justify-center items-center py-4 border-t border-gray-100">
          <FiLoader className="animate-spin text-orange-500 text-xl mr-3" />
          <span className="text-gray-600">
            <TranslatedText>Loading more voters...</TranslatedText>
          </span>
        </div>
      )}
    </div>
  );
};

export default VoterList;