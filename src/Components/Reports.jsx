import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, ref, onValue, off } from '../Firebase/config';
import { 
  FiArrowLeft, 
  FiBarChart2, 
  FiUsers, 
  FiTrendingUp,
  FiDownload,
  FiPrinter,
  FiMapPin,
  FiPhone,
  FiCheck,
  FiMessageCircle
} from 'react-icons/fi';

const Reports = () => {
  const [voters, setVoters] = useState([]);
  const [booths, setBooths] = useState([]);
  const [karyakartas, setKaryakartas] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');

  const navigate = useNavigate();

  useEffect(() => {
    const votersRef = ref(db, 'voters');
    const boothsRef = ref(db, 'booths');
    const karyakartasRef = ref(db, 'karyakartas');
    const campaignsRef = ref(db, 'campaigns');

    const unsubscribeVoters = onValue(votersRef, (snapshot) => {
      if (snapshot.exists()) {
        setVoters(Object.values(snapshot.val()));
      } else {
        setVoters([]);
      }
    });

    const unsubscribeBooths = onValue(boothsRef, (snapshot) => {
      if (snapshot.exists()) {
        setBooths(Object.values(snapshot.val()));
      } else {
        setBooths([]);
      }
    });

    const unsubscribeKaryakartas = onValue(karyakartasRef, (snapshot) => {
      if (snapshot.exists()) {
        setKaryakartas(Object.values(snapshot.val()));
      } else {
        setKaryakartas([]);
      }
    });

    const unsubscribeCampaigns = onValue(campaignsRef, (snapshot) => {
      if (snapshot.exists()) {
        setCampaigns(Object.values(snapshot.val()));
      } else {
        setCampaigns([]);
      }
      setLoading(false);
    });

    return () => {
      off(votersRef, 'value', unsubscribeVoters);
      off(boothsRef, 'value', unsubscribeBooths);
      off(karyakartasRef, 'value', unsubscribeKaryakartas);
      off(campaignsRef, 'value', unsubscribeCampaigns);
    };
  }, []);

  // Calculate statistics with safe defaults
  const stats = {
    totalVoters: voters?.length || 0,
    totalVoted: voters?.filter(v => v?.voted)?.length || 0,
    totalBooths: booths?.length || 0,
    totalKaryakartas: karyakartas?.length || 0,
    assignedBooths: booths?.filter(b => b?.assignedKaryakarta)?.length || 0,
    withPhone: voters?.filter(v => v?.phone)?.length || 0,
    contacted: voters?.filter(v => v?.lastContacted)?.length || 0,
    totalCampaigns: campaigns?.length || 0
  };

  const votingProgress = stats.totalVoters > 0 ? (stats.totalVoted / stats.totalVoters * 100).toFixed(1) : 0;
  const contactRate = stats.withPhone > 0 ? (stats.contacted / stats.withPhone * 100).toFixed(1) : 0;
  const assignmentRate = stats.totalBooths > 0 ? (stats.assignedBooths / stats.totalBooths * 100).toFixed(1) : 0;

  // Booth performance data with safe property access
  const boothPerformance = (booths || [])
    .map(booth => {
      // Safely access booth properties with fallbacks
      const boothName = booth?.pollingStationAddress || booth?.name || 'Unknown Booth';
      const voterCount = booth?.voterCount || booth?.voters?.length || 0;
      const votedCount = booth?.votedCount || booth?.voters?.filter(v => v?.voted)?.length || 0;
      
      return {
        name: boothName.length > 20 ? boothName.substring(0, 20) + '...' : boothName,
        voters: voterCount,
        voted: votedCount,
        progress: voterCount > 0 ? (votedCount / voterCount * 100) : 0
      };
    })
    .filter(booth => booth.voters > 0) // Only show booths with voters
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5);

  // Voting trend data (simulated)
  const votingTrends = [
    { day: 'Mon', votes: 45 },
    { day: 'Tue', votes: 52 },
    { day: 'Wed', votes: 48 },
    { day: 'Thu', votes: 65 },
    { day: 'Fri', votes: 70 },
    { day: 'Sat', votes: 85 },
    { day: 'Sun', votes: 92 }
  ];

  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      statistics: stats,
      topBooths: boothPerformance,
      votingTrends: votingTrends
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `election-report-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-orange-600 font-medium">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-b-3xl shadow-lg">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)} 
                className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-all"
              >
                <FiArrowLeft className="text-white text-lg" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Analytics & Reports</h1>
                <p className="text-orange-100">Comprehensive election campaign insights</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={exportReport}
                className="bg-white/20 text-white px-4 py-3 rounded-xl font-semibold hover:bg-white/30 transition-all flex items-center gap-2"
              >
                <FiDownload />
                Export
              </button>
              <button className="bg-white text-orange-600 px-4 py-3 rounded-xl font-semibold hover:bg-orange-50 transition-all flex items-center gap-2">
                <FiPrinter />
                Print
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
              <div className="text-2xl font-bold">{votingProgress}%</div>
              <div className="text-orange-100 text-sm">Voting Progress</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
              <div className="text-2xl font-bold">{contactRate}%</div>
              <div className="text-orange-100 text-sm">Contact Rate</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
              <div className="text-2xl font-bold">{assignmentRate}%</div>
              <div className="text-orange-100 text-sm">Assignment Rate</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
              <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
              <div className="text-orange-100 text-sm">Campaigns Run</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-lg border border-blue-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <FiUsers className="text-blue-600 text-lg" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700">{stats.totalVoters}</div>
                <div className="text-sm text-blue-600">Total Voters</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-green-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <FiCheck className="text-green-600 text-lg" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700">{stats.totalVoted}</div>
                <div className="text-sm text-green-600">Votes Cast</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-purple-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <FiMapPin className="text-purple-600 text-lg" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-700">{stats.totalBooths}</div>
                <div className="text-sm text-purple-600">Polling Stations</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-orange-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <FiMessageCircle className="text-orange-600 text-lg" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-700">{stats.contacted}</div>
                <div className="text-sm text-orange-600">Voters Contacted</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voting Progress Chart */}
          <div className="bg-white rounded-3xl shadow-lg border border-orange-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-orange-600" />
              Voting Progress by Booth
            </h2>
            <div className="space-y-4">
              {boothPerformance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiMapPin className="inline text-4xl mb-3 text-gray-300" />
                  <p>No booth data available</p>
                  <p className="text-sm mt-2">Add booths to see performance metrics</p>
                </div>
              ) : (
                boothPerformance.map((booth, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">{booth.name}</span>
                      <span className="text-gray-500">{booth.progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-orange-400 to-red-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${booth.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{booth.voted} voted</span>
                      <span>{booth.voters} total</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Voting Trends Chart */}
          <div className="bg-white rounded-3xl shadow-lg border border-orange-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiBarChart2 className="text-orange-600" />
              Daily Voting Trends
            </h2>
            <div className="flex items-end justify-between h-48 gap-2">
              {votingTrends.map((day, index) => {
                const height = (day.votes / 100) * 100;
                return (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div className="text-xs text-gray-500 mb-2">{day.votes}</div>
                    <div 
                      className="w-full bg-gradient-to-t from-orange-500 to-red-500 rounded-t-lg transition-all duration-500"
                      style={{ height: `${height}%` }}
                    ></div>
                    <div className="text-xs text-gray-600 mt-2">{day.day}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voter Demographics */}
          <div className="bg-white rounded-3xl shadow-lg border border-orange-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Voter Demographics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                <span className="text-blue-700 font-medium">Voters with Phone</span>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                  {stats.withPhone} ({stats.totalVoters > 0 ? ((stats.withPhone / stats.totalVoters) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                <span className="text-green-700 font-medium">Voters Contacted</span>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">
                  {stats.contacted} ({contactRate}%)
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
                <span className="text-purple-700 font-medium">Booths Assigned</span>
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-semibold">
                  {stats.assignedBooths} ({assignmentRate}%)
                </span>
              </div>
            </div>
          </div>

          {/* Campaign Performance */}
          <div className="bg-white rounded-3xl shadow-lg border border-orange-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Campaign Performance</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl">
                <span className="text-indigo-700 font-medium">Total Campaigns</span>
                <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-semibold">
                  {stats.totalCampaigns}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-pink-50 rounded-xl">
                <span className="text-pink-700 font-medium">Avg. Reach per Campaign</span>
                <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full font-semibold">
                  {stats.totalCampaigns > 0 ? Math.round(stats.contacted / stats.totalCampaigns) : 0} voters
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-teal-50 rounded-xl">
                <span className="text-teal-700 font-medium">Response Rate</span>
                <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full font-semibold">
                  {contactRate}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Status */}
        <div className="bg-white rounded-3xl shadow-lg border border-orange-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Data Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-lg font-bold text-gray-700">{stats.totalVoters}</div>
              <div className="text-sm text-gray-600">Voters Loaded</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-lg font-bold text-gray-700">{stats.totalBooths}</div>
              <div className="text-sm text-gray-600">Booths Loaded</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-lg font-bold text-gray-700">{stats.totalKaryakartas}</div>
              <div className="text-sm text-gray-600">Team Members</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-lg font-bold text-gray-700">{stats.totalCampaigns}</div>
              <div className="text-sm text-gray-600">Campaigns</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;