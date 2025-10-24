import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, ref, onValue, off, update } from '../Firebase/config';
import { 
  FiArrowLeft, 
  FiMessageCircle, 
  FiUsers, 
  FiBarChart2, 
  FiSend,
  FiCalendar,
  FiCheck,
  FiTrendingUp
} from 'react-icons/fi';

const Campaign = () => {
  const [voters, setVoters] = useState([]);
  const [selectedVoters, setSelectedVoters] = useState([]);
  const [campaignMessage, setCampaignMessage] = useState('');
  const [campaignHistory, setCampaignHistory] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const votersRef = ref(db, 'voters');
    const campaignsRef = ref(db, 'campaigns');

    const unsubscribeVoters = onValue(votersRef, (snapshot) => {
      if (snapshot.exists()) {
        const votersData = Object.values(snapshot.val());
        setVoters(votersData);
        
        // Calculate stats
        const totalVoters = votersData.length;
        const withPhone = votersData.filter(v => v.phone).length;
        const contacted = votersData.filter(v => v.lastContacted).length;
        
        setStats({ totalVoters, withPhone, contacted });
      }
      setLoading(false);
    });

    const unsubscribeCampaigns = onValue(campaignsRef, (snapshot) => {
      if (snapshot.exists()) {
        setCampaignHistory(Object.values(snapshot.val()).reverse().slice(0, 10));
      }
    });

    return () => {
      off(votersRef, 'value', unsubscribeVoters);
      off(campaignsRef, 'value', unsubscribeCampaigns);
    };
  }, []);

  const sendBulkCampaign = async () => {
    if (!campaignMessage.trim() || selectedVoters.length === 0) return;

    try {
      const campaignId = Date.now().toString();
      const updates = {};
      const timestamp = new Date().toISOString();

      // Update campaign history
      updates[`campaigns/${campaignId}`] = {
        id: campaignId,
        message: campaignMessage,
        recipients: selectedVoters.length,
        timestamp: timestamp,
        status: 'sent'
      };

      // Update voter records
      selectedVoters.forEach(voterId => {
        updates[`voters/${voterId}/lastContacted`] = timestamp;
        updates[`voters/${voterId}/lastCampaign`] = campaignMessage;
      });

      await update(ref(db), updates);
      
      setCampaignMessage('');
      setSelectedVoters([]);
      alert(`Campaign sent to ${selectedVoters.length} voters successfully!`);
    } catch (error) {
      console.error('Error sending campaign:', error);
      alert('Failed to send campaign. Please try again.');
    }
  };

  const predefinedMessages = [
    "Don't forget to vote! Your voice matters.",
    "Remember to cast your vote today. Every vote counts!",
    "Exercise your right to vote. Make a difference!",
    "Your vote is your voice. Please vote today!",
    "Thank you for being a responsible citizen. Don't forget to vote!"
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-600 font-medium">Loading campaign data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-b-3xl shadow-lg">
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
                <h1 className="text-2xl font-bold">Campaign Management</h1>
                <p className="text-purple-100">Reach out to voters with targeted messages</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
              <div className="text-2xl font-bold">{stats.totalVoters?.toLocaleString() || 0}</div>
              <div className="text-purple-100 text-sm">Total Voters</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
              <div className="text-2xl font-bold">{stats.withPhone?.toLocaleString() || 0}</div>
              <div className="text-purple-100 text-sm">Reachable</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
              <div className="text-2xl font-bold">{stats.contacted?.toLocaleString() || 0}</div>
              <div className="text-purple-100 text-sm">Contacted</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Campaign Composer */}
        <div className="bg-white rounded-3xl shadow-lg border border-purple-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FiMessageCircle className="text-purple-600" />
            Create Campaign
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Campaign Message
              </label>
              <textarea
                value={campaignMessage}
                onChange={(e) => setCampaignMessage(e.target.value)}
                placeholder="Enter your campaign message here..."
                rows="4"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              />
            </div>

            {/* Predefined Messages */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quick Messages
              </label>
              <div className="grid grid-cols-1 gap-2">
                {predefinedMessages.map((msg, index) => (
                  <button
                    key={index}
                    onClick={() => setCampaignMessage(msg)}
                    className="text-left p-3 bg-gray-50 rounded-lg hover:bg-purple-50 border border-gray-200 hover:border-purple-300 transition-all"
                  >
                    <span className="text-sm text-gray-700">{msg}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Selected: <span className="font-semibold">{selectedVoters.length}</span> voters
              </div>
              <button
                onClick={sendBulkCampaign}
                disabled={!campaignMessage.trim() || selectedVoters.length === 0}
                className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <FiSend />
                Send Campaign
              </button>
            </div>
          </div>
        </div>

        {/* Campaign History */}
        <div className="bg-white rounded-3xl shadow-lg border border-purple-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FiCalendar className="text-purple-600" />
            Recent Campaigns
          </h2>
          
          <div className="space-y-3">
            {campaignHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FiMessageCircle className="inline text-4xl mb-3 text-gray-300" />
                <p>No campaigns sent yet</p>
              </div>
            ) : (
              campaignHistory.map((campaign) => (
                <div key={campaign.id} className="border border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-gray-700 flex-1">{campaign.message}</p>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium ml-2">
                      {campaign.recipients} sent
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <FiCalendar size={14} />
                    {new Date(campaign.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Campaign Analytics */}
        <div className="bg-white rounded-3xl shadow-lg border border-purple-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FiTrendingUp className="text-purple-600" />
            Campaign Analytics
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl p-4">
              <div className="text-2xl font-bold">{(stats.contacted / stats.withPhone * 100 || 0).toFixed(1)}%</div>
              <div className="text-purple-100 text-sm">Reach Rate</div>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl p-4">
              <div className="text-2xl font-bold">{campaignHistory.length}</div>
              <div className="text-blue-100 text-sm">Total Campaigns</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Campaign;