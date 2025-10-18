import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, ref, get } from '../Firebase/config';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Icons
import {
  FiArrowLeft,
  FiShare2,
  FiDownload,
  FiFileText,
  FiPrinter,
  FiImage,
  FiMessageCircle,
  FiMail,
  FiPhone,
  FiUser,
  FiMapPin,
  FiHash,
  FiCalendar,
  FiStar,
} from 'react-icons/fi';
import { FaWhatsapp, FaRegFilePdf, FaShareAlt } from 'react-icons/fa';
import { GiVote } from 'react-icons/gi';
import TranslatedText from './TranslatedText';
import { MarsIcon, VenusIcon } from 'lucide-react';

const FullVoterDetails = () => {
  const { voterId } = useParams();
  const navigate = useNavigate();
  const [voter, setVoter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);

  // Sample political data - replace with your actual data
  const politicalInfo = {
    candidateName: "Rajesh Kumar",
    partyName: "Bharatiya Janata Party",
    partySymbol: "Lotus",
    slogan: "Development for All",
    contact: "+91-9876543210",
    website: "www.rajeshkumar.com"
  };

  useEffect(() => {
    loadVoterDetails();
  }, [voterId]);

  const loadVoterDetails = async () => {
    try {
      const voterRef = ref(db, `voters/${voterId}`);
      const snapshot = await get(voterRef);
      
      if (snapshot.exists()) {
        setVoter({ id: voterId, ...snapshot.val() });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading voter details:', error);
      setLoading(false);
    }
  };

  const generateWhatsAppMessage = () => {
    const baseMessage = `🗳️ *Voter Information* 🗳️\n\n` +
      `👤 *Name:* ${voter.name}\n` +
      `🆔 *Voter ID:* ${voter.voterId}\n` +
      `🏛️ *Booth:* ${voter.boothNumber}\n` +
      `📍 *Address:* ${voter.pollingStationAddress}\n` +
      `${voter.age ? `🎂 *Age:* ${voter.age}\n` : ''}` +
      `${voter.gender ? `⚧️ *Gender:* ${voter.gender}\n` : ''}` +
      `\n━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*Your Local Candidate* 👇\n\n` +
      `🎯 *Candidate:* ${politicalInfo.candidateName}\n` +
      `🏛️ *Party:* ${politicalInfo.partyName}\n` +
      `🌺 *Symbol:* ${politicalInfo.partySymbol}\n` +
      `📢 *Slogan:* ${politicalInfo.slogan}\n` +
      `📞 *Contact:* ${politicalInfo.contact}\n` +
      `🌐 *Website:* ${politicalInfo.website}\n\n` +
      `*Remember to vote on election day!* ✅\n` +
      `*Your vote matters!* 💪`;

    return baseMessage;
  };

  const shareOnWhatsApp = () => {
    const message = generateWhatsAppMessage();
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const shareViaSMS = () => {
    const message = `Voter Details:\nName: ${voter.name}\nVoter ID: ${voter.voterId}\nBooth: ${voter.boothNumber}\nAddress: ${voter.pollingStationAddress}${voter.age ? `\nAge: ${voter.age}` : ''}${voter.gender ? `\nGender: ${voter.gender}` : ''}\n\nCandidate: ${politicalInfo.candidateName}\nParty: ${politicalInfo.partyName}`;
    const url = `sms:?body=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const shareViaEmail = () => {
    const subject = `Voter Details - ${voter.name}`;
    const body = `Voter Details:\n\nName: ${voter.name}\nVoter ID: ${voter.voterId}\nBooth Number: ${voter.boothNumber}\nPolling Station Address: ${voter.pollingStationAddress}${voter.age ? `\nAge: ${voter.age}` : ''}${voter.gender ? `\nGender: ${voter.gender}` : ''}${voter.serialNumber ? `\nSerial Number: ${voter.serialNumber}` : ''}\n\nCandidate Information:\nName: ${politicalInfo.candidateName}\nParty: ${politicalInfo.partyName}\nSymbol: ${politicalInfo.partySymbol}\nContact: ${politicalInfo.contact}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  };

  const downloadAsImage = async () => {
    setDownloading(true);
    try {
      const element = document.getElementById('voter-details-card');
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      const image = canvas.toDataURL('image/png', 1.0);
      
      const link = document.createElement('a');
      link.download = `voter-${voter.voterId}-${Date.now()}.png`;
      link.href = image;
      link.click();
    } catch (error) {
      console.error('Error downloading image:', error);
    } finally {
      setDownloading(false);
    }
  };

  const downloadAsPDF = async () => {
    setDownloading(true);
    try {
      const element = document.getElementById('voter-details-card');
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`voter-${voter.voterId}-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  const printVoterDetails = () => {
    const printContent = document.getElementById('voter-details-card').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        ${printContent}
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          Printed from VoterData Pro - ${new Date().toLocaleDateString()}
        </div>
      </div>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full absolute top-0 left-0 animate-spin"></div>
          </div>
          <div className="text-blue-600 text-lg font-semibold mt-4">
            <TranslatedText>Loading voter details...</TranslatedText>
          </div>
        </div>
      </div>
    );
  }

  if (!voter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-xl border border-blue-100 max-w-md w-full">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            <TranslatedText>Voter Not Found</TranslatedText>
          </h2>
          <p className="text-gray-600 mb-6">
            <TranslatedText>The requested voter details could not be found.</TranslatedText>
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <TranslatedText>Back to Dashboard</TranslatedText>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-white text-blue-600 hover:text-blue-700 font-semibold px-4 py-3 rounded-xl shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-200"
          >
            <FiArrowLeft className="text-lg" />
            <TranslatedText>Back</TranslatedText>
          </button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <GiVote className="text-blue-600" />
              <TranslatedText>Voter Profile</TranslatedText>
            </h1>
            <p className="text-gray-600 text-sm">Complete voter information</p>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowShareOptions(!showShareOptions)}
              className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-4 py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all duration-200"
            >
              <FaShareAlt />
              <TranslatedText>Share</TranslatedText>
            </button>
            
            {showShareOptions && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-10 min-w-[200px]">
                <div className="space-y-2">
                  <button
                    onClick={shareOnWhatsApp}
                    className="flex items-center gap-3 w-full text-left p-3 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    <FaWhatsapp className="text-green-500 text-xl" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    onClick={shareViaSMS}
                    className="flex items-center gap-3 w-full text-left p-3 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <FiMessageCircle className="text-blue-500 text-xl" />
                    <span>Text SMS</span>
                  </button>
                  <button
                    onClick={shareViaEmail}
                    className="flex items-center gap-3 w-full text-left p-3 rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    <FiMail className="text-purple-500 text-xl" />
                    <span>Email</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Voter Card */}
        <div id="voter-details-card" className="bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden mb-8">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{voter.name}</h2>
                <p className="text-blue-100">Voter ID: {voter.voterId}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <GiVote className="text-3xl" />
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <FiUser className="text-blue-500" />
                  Personal Information
                </h3>
                
                <InfoCard
                  icon={FiHash}
                  label="Serial Number"
                  value={voter.serialNumber || 'N/A'}
                  color="blue"
                />
                <InfoCard
                  icon={FiFileText}
                  label="Voter ID"
                  value={voter.voterId}
                  color="green"
                />
                {voter.age && (
                  <InfoCard
                    icon={FiCalendar}
                    label="Age"
                    value={voter.age}
                    color="purple"
                  />
                )}
                {voter.gender && (
                  <InfoCard
                    icon={voter.gender === 'Male' ? MarsIcon : VenusIcon}
                    label="Gender"
                    value={voter.gender}
                    color="pink"
                  />
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <FiMapPin className="text-red-500" />
                  Location Details
                </h3>
                
                <InfoCard
                  icon={FiMapPin}
                  label="Booth Number"
                  value={voter.boothNumber}
                  color="red"
                />
                <InfoCard
                  icon={FiMapPin}
                  label="Polling Station"
                  value={voter.pollingStationAddress}
                  color="indigo"
                  fullWidth
                />
              </div>
            </div>

            {/* Political Information Flyer */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200 mb-6">
              <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center gap-2">
                <FiStar className="text-orange-600" />
                Your Local Candidate
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-orange-700 font-medium">Candidate:</span>
                      <span className="text-orange-900 font-semibold">{politicalInfo.candidateName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-700 font-medium">Party:</span>
                      <span className="text-orange-900 font-semibold">{politicalInfo.partyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-700 font-medium">Symbol:</span>
                      <span className="text-orange-900 font-semibold">{politicalInfo.partySymbol}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-orange-700 font-medium">Slogan:</span>
                      <span className="text-orange-900 font-semibold">{politicalInfo.slogan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-700 font-medium">Contact:</span>
                      <span className="text-orange-900 font-semibold">{politicalInfo.contact}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6">
          <h3 className="text-xl font-bold text-gray-800 text-center mb-6">
            <TranslatedText>Export & Share Options</TranslatedText>
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <ActionButton
              icon={FaWhatsapp}
              label="WhatsApp"
              color="bg-green-500 hover:bg-green-600"
              onClick={shareOnWhatsApp}
            />
            <ActionButton
              icon={FiMessageCircle}
              label="SMS"
              color="bg-blue-500 hover:bg-blue-600"
              onClick={shareViaSMS}
            />
            <ActionButton
              icon={FiMail}
              label="Email"
              color="bg-purple-500 hover:bg-purple-600"
              onClick={shareViaEmail}
            />
            <ActionButton
              icon={FiImage}
              label="Image"
              color="bg-indigo-500 hover:bg-indigo-600"
              onClick={downloadAsImage}
            />
            <ActionButton
              icon={FiPrinter}
              label="Print"
              color="bg-gray-600 hover:bg-gray-700"
              onClick={printVoterDetails}
            />
            <ActionButton
              icon={FaRegFilePdf}
              label="PDF"
              color="bg-red-500 hover:bg-red-600"
              onClick={downloadAsPDF}
            />
          </div>

          {downloading && (
            <div className="text-center mt-6">
              <div className="inline-flex items-center gap-3 bg-blue-100 text-blue-700 px-4 py-2 rounded-xl">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium">
                  <TranslatedText>Preparing download...</TranslatedText>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoCard = ({ icon: Icon, label, value, color = "blue", fullWidth = false }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    pink: 'bg-pink-100 text-pink-600'
  };

  return (
    <div className={`bg-gray-50 rounded-xl p-4 border border-gray-200 ${fullWidth ? 'col-span-2' : ''}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="text-lg" />
        </div>
        <div className="text-sm font-semibold text-gray-700">
          <TranslatedText>{label}</TranslatedText>
        </div>
      </div>
      <div className="text-gray-800 font-medium pl-11">
        {value}
      </div>
    </div>
  );
};

const ActionButton = ({ icon: Icon, label, color, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`${color} text-white py-3 px-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg active:scale-95 flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    <Icon className="text-xl" />
    <span className="text-xs text-center">
      <TranslatedText>{label}</TranslatedText>
    </span>
  </button>
);

export default FullVoterDetails;