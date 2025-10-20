import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, ref, get, storage, onValue, off } from '../Firebase/config';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Icons
import {
  FiArrowLeft,
  FiShare2,
  FiDownload,
  FiPrinter,
  FiMessageCircle,
  FiMail,
  FiPhone,
  FiUser,
  FiMapPin,
  FiHash,
  FiCalendar,
  FiStar,
  FiHome,
  FiFlag,
  FiPhoneCall,
  FiEdit,
  FiSave,
  FiX,
  FiCamera
} from 'react-icons/fi';
import { FaWhatsapp, FaRegFilePdf, FaIndianRupeeSign } from 'react-icons/fa6';
import { GiVote } from 'react-icons/gi';
import TranslatedText from './TranslatedText';

const FullVoterDetails = () => {
  const { voterId } = useParams();
  const navigate = useNavigate();
  const [voter, setVoter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Editable political data with localStorage persistence
  const [politicalInfo, setPoliticalInfo] = useState(() => {
    const saved = localStorage.getItem('localCandidateInfo');
    return saved ? JSON.parse(saved) : {
      candidateName: "Rajesh Kumar",
      partyName: "Bharatiya Janata Party",
      partySymbol: "Lotus",
      slogan: "Development for All",
      contact: "+91-9876543210",
      website: "www.rajeshkumar.com",
      achievements: [
        "Built 5 new schools in constituency",
        "Improved road infrastructure",
        "Healthcare initiatives"
      ],
      candidateImage: null
    };
  });

  // Save to localStorage whenever politicalInfo changes
  useEffect(() => {
    localStorage.setItem('localCandidateInfo', JSON.stringify(politicalInfo));
  }, [politicalInfo]);

  // Sync candidate info from Home branding (localStorage + RTDB) for a unified source
  useEffect(() => {
    const HOME_BRANDING_KEY = 'janetaa_home_branding_v1';

    const mapBrandingToCandidate = (branding, current) => {
      if (!branding) return null;
      return {
        candidateName: branding.leaderName || (current && current.candidateName) || politicalInfo.candidateName,
        partyName: branding.partyName || (current && current.partyName) || politicalInfo.partyName || '',
        partySymbol: branding.serialNumber || (current && current.partySymbol) || politicalInfo.partySymbol || '',
        slogan: branding.slogan || (current && current.slogan) || politicalInfo.slogan,
        contact: branding.contact || (current && current.contact) || politicalInfo.contact || '',
        website: branding.website || (current && current.website) || politicalInfo.website || '',
        achievements: (branding.achievements && branding.achievements.length) ? branding.achievements : (current && current.achievements) || politicalInfo.achievements || [],
        candidateImage: branding.leaderImageUrl || (current && current.candidateImage) || politicalInfo.candidateImage || null
      };
    };

    // Try localStorage first
    try {
      const raw = localStorage.getItem(HOME_BRANDING_KEY);
      if (raw) {
        const branding = JSON.parse(raw);
        const mapped = mapBrandingToCandidate(branding, null);
        if (mapped) setPoliticalInfo(prev => ({ ...prev, ...mapped }));
      }
    } catch (e) {
      // ignore
    }

    // Subscribe to remote branding (realtime)
    try {
      const remoteRef = ref(db, 'branding/current');
      const callback = (snap) => {
        const remote = snap.val();
        if (remote) {
          // only overwrite if user is not actively editing
          setPoliticalInfo(prev => {
            if (editing) return prev;
            const mapped = mapBrandingToCandidate(remote, prev);
            return { ...prev, ...mapped };
          });
        }
      };
      onValue(remoteRef, callback);
      return () => off(remoteRef, 'value', callback);
    } catch (e) {
      // realtime not available
    }
  }, [editing]);

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

  const handleInputChange = (field, value) => {
    setPoliticalInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAchievementChange = (index, value) => {
    const newAchievements = [...politicalInfo.achievements];
    newAchievements[index] = value;
    setPoliticalInfo(prev => ({
      ...prev,
      achievements: newAchievements
    }));
  };

  const addAchievement = () => {
    setPoliticalInfo(prev => ({
      ...prev,
      achievements: [...prev.achievements, "New achievement"]
    }));
  };

  const removeAchievement = (index) => {
    setPoliticalInfo(prev => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index)
    }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Please select an image smaller than 5MB');
      return;
    }

    setImageUploading(true);
    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    try {
      // Upload to Firebase Storage
      const imageRef = storageRef(storage, `candidate-images/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setPoliticalInfo(prev => ({
        ...prev,
        candidateImage: downloadURL
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const generateWhatsAppMessage = () => {
    const message = `🗳️ *VOTER INFORMATION RECEIPT* 🗳️
━━━━━━━━━━━━━━━━━━━━

👤 *VOTER DETAILS*
• Name: ${voter.name}
• Voter ID: ${voter.voterId}
• Booth: ${voter.boothNumber}
• Address: ${voter.pollingStationAddress}
${voter.age ? `• Age: ${voter.age} years\n` : ''}${voter.gender ? `• Gender: ${voter.gender}\n` : ''}

📍 *POLLING INFORMATION*
• Booth: ${voter.boothNumber}
• Station: ${voter.pollingStationAddress}

🎯 *YOUR CANDIDATE*
• Candidate: ${politicalInfo.candidateName}
• Party: ${politicalInfo.partyName}
• Symbol: ${politicalInfo.partySymbol}
• Slogan: ${politicalInfo.slogan}
• Contact: ${politicalInfo.contact}

📞 *QUICK ACTIONS*
• Call Candidate: ${politicalInfo.contact}
• Visit: ${politicalInfo.website}

💡 *Remember to vote! Your voice matters!*
✅ Verified by VoterData Pro`;

    return message;
  };

  const shareOnWhatsApp = () => {
    (async () => {
      const message = generateWhatsAppMessage();
      const imageUrl = politicalInfo.candidateImage;

      const fetchImageBlob = async (url) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error('Image fetch failed');
          return await res.blob();
        } catch (err) {
          return null;
        }
      };

      try {
        if (navigator.canShare && imageUrl) {
          const blob = await fetchImageBlob(imageUrl);
          if (blob) {
            const file = new File([blob], 'candidate.jpg', { type: blob.type || 'image/jpeg' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], text: message, title: 'Voter Receipt' });
              setShowShareOptions(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Web Share failed', err);
      }

      // fallback to wa.me text-only
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      setShowShareOptions(false);
    })();
  };

  const shareViaSMS = () => {
    const message = `Voter Details:\nName: ${voter.name}\nVoter ID: ${voter.voterId}\nBooth: ${voter.boothNumber}\nAddress: ${voter.pollingStationAddress}${voter.age ? `\nAge: ${voter.age}` : ''}${voter.gender ? `\nGender: ${voter.gender}` : ''}\n\nCandidate: ${politicalInfo.candidateName}\nParty: ${politicalInfo.partyName}\nContact: ${politicalInfo.contact}`;
    const url = `sms:?body=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setShowShareOptions(false);
  };

  const shareViaEmail = () => {
    const subject = `Voter Details - ${voter.name}`;
    const body = `VOTER INFORMATION RECEIPT\n\nVOTER DETAILS:\nName: ${voter.name}\nVoter ID: ${voter.voterId}\nBooth Number: ${voter.boothNumber}\nPolling Station: ${voter.pollingStationAddress}${voter.age ? `\nAge: ${voter.age}` : ''}${voter.gender ? `\nGender: ${voter.gender}` : ''}\n\nCANDIDATE INFORMATION:\nName: ${politicalInfo.candidateName}\nParty: ${politicalInfo.partyName}\nSymbol: ${politicalInfo.partySymbol}\nContact: ${politicalInfo.contact}\nWebsite: ${politicalInfo.website}\n\nThank you for using VoterData Pro!`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
    setShowShareOptions(false);
  };

  const downloadAsImage = async () => {
    setDownloading(true);
    try {
      const element = document.getElementById('voter-receipt');
      const canvas = await html2canvas(element, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight
      });
      const image = canvas.toDataURL('image/png', 1.0);
      
      const link = document.createElement('a');
      link.download = `voter-receipt-${voter.voterId}.png`;
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
      const element = document.getElementById('voter-receipt');
      const canvas = await html2canvas(element, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`voter-receipt-${voter.voterId}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  const printVoterDetails = () => {
    const printContent = document.getElementById('voter-receipt').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Voter Receipt - ${voter.name}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @media print {
              body { 
                font-family: 'Arial', sans-serif; 
                margin: 0; 
                padding: 10px;
                background: white;
                font-size: 12px;
              }
              .print-container {
                max-width: 100%;
                margin: 0 auto;
              }
              .no-print { display: none !important; }
              .print-break { page-break-inside: avoid; }
            }
            @media screen {
              body { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent}
          </div>
        </body>
      </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <div className="w-16 h-16 border-4 border-orange-200 rounded-full animate-spin"></div>
            <div className="w-16 h-16 border-4 border-transparent border-t-orange-600 rounded-full absolute top-0 left-0 animate-spin"></div>
          </div>
          <div className="text-orange-700 text-lg font-semibold">
            <TranslatedText>Loading voter details...</TranslatedText>
          </div>
        </div>
      </div>
    );
  }

  if (!voter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-xl border border-orange-200 max-w-md w-full">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            <TranslatedText>Voter Not Found</TranslatedText>
          </h2>
          <p className="text-gray-600 mb-6">
            <TranslatedText>The requested voter details could not be found.</TranslatedText>
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <TranslatedText>Back to Dashboard</TranslatedText>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-white text-orange-600 hover:text-orange-700 font-semibold px-4 py-3 rounded-xl shadow-lg border border-orange-200 hover:shadow-xl transition-all duration-200"
        >
          <FiArrowLeft className="text-lg" />
          <span className="hidden sm:inline"><TranslatedText>Back</TranslatedText></span>
        </button>
        
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2 justify-center">
            <GiVote className="text-orange-600" />
            <TranslatedText>Voter Receipt</TranslatedText>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Toggle Button */}
          <button
            onClick={() => setEditing(!editing)}
            className={`flex items-center gap-2 font-semibold px-4 py-3 rounded-xl shadow-lg transition-all duration-200 ${
              editing 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-white text-orange-600 hover:text-orange-700 border border-orange-200'
            }`}
          >
            {editing ? <FiSave className="text-lg" /> : <FiEdit className="text-lg" />}
            <span className="hidden sm:inline">{editing ? 'Save' : 'Edit'}</span>
          </button>

          {/* Share Button */}
          <div className="relative">
            <button
              onClick={() => setShowShareOptions(!showShareOptions)}
              className="flex items-center gap-2 bg-orange-600 text-white font-semibold px-4 py-3 rounded-xl shadow-lg hover:bg-orange-700 transition-all duration-200"
            >
              <FiShare2 />
              <span className="hidden sm:inline"><TranslatedText>Share</TranslatedText></span>
            </button>
            
            {showShareOptions && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-50 min-w-[180px]">
                <div className="space-y-2">
                  <button
                    onClick={shareOnWhatsApp}
                    className="flex items-center gap-3 w-full text-left p-3 rounded-lg hover:bg-green-50 transition-colors text-sm"
                  >
                    <FaWhatsapp className="text-green-500 text-lg" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    onClick={shareViaSMS}
                    className="flex items-center gap-3 w-full text-left p-3 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                  >
                    <FiMessageCircle className="text-blue-500 text-lg" />
                    <span>Text SMS</span>
                  </button>
                  <button
                    onClick={shareViaEmail}
                    className="flex items-center gap-3 w-full text-left p-3 rounded-lg hover:bg-purple-50 transition-colors text-sm"
                  >
                    <FiMail className="text-purple-500 text-lg" />
                    <span>Email</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voter Receipt Card */}
      <div id="voter-receipt" className="bg-white rounded-2xl shadow-2xl border border-orange-200 overflow-hidden mb-6 max-w-2xl mx-auto print:shadow-none print:border-2">
        {/* Receipt Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-5 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <GiVote className="text-2xl" />
            <h2 className="text-xl font-bold">VOTER INFORMATION RECEIPT</h2>
          </div>
          <p className="text-orange-100 text-sm">Official Voter Data Record</p>
        </div>

        {/* Receipt Body */}
        <div className="p-5">
          {/* Voter Main Info */}
          <div className="text-center mb-6 border-b border-gray-200 pb-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">{voter.name}</h3>
            <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-2">
              <FiHash className="text-xs" />
              Voter ID: {voter.voterId}
            </div>
          </div>

          {/* Personal Details Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
              <h4 className="text-lg font-semibold text-gray-800">Personal Details</h4>
            </div>
            <div className="space-y-3">
              <DetailRow icon={FiUser} label="Full Name" value={voter.name} />
              <DetailRow icon={FiHash} label="Voter ID" value={voter.voterId} />
              {voter.age && <DetailRow icon={FiCalendar} label="Age" value={`${voter.age} years`} />}
              {voter.gender && <DetailRow icon={FiUser} label="Gender" value={voter.gender} />}
            </div>
          </div>

          {/* Voting Details Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
              <h4 className="text-lg font-semibold text-gray-800">Voting Details</h4>
            </div>
            <div className="space-y-3">
              <DetailRow icon={FiHome} label="Booth Number" value={voter.boothNumber} />
              <DetailRow icon={FiMapPin} label="Polling Station" value={voter.pollingStationAddress} fullWidth />
            </div>
          </div>

          {/* Political Flyer Section */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border-2 border-orange-300 mb-4">
            <div className="text-center mb-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <FiStar className="text-orange-500" />
                <h4 className="text-lg font-bold text-orange-800">Your Local Candidate</h4>
                <FiStar className="text-orange-500" />
              </div>
              <div className="w-20 h-1 bg-orange-400 mx-auto rounded-full"></div>
            </div>

            {/* Candidate Image / Badge */}
            <div className="text-center mb-4">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-36 h-36 rounded-full bg-gradient-to-br from-orange-400 to-amber-300 p-1 shadow-xl inline-flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-white overflow-hidden">
                      <img
                        src={imagePreview || politicalInfo.candidateImage || '/placeholder-person.png'}
                        alt="Candidate"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Party badge */}
                  <div className="absolute -bottom-2 right-0 bg-white rounded-full p-1 shadow-md border border-orange-200">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-orange-50">
                      <span className="text-xs text-orange-600 font-bold">{politicalInfo.partySymbol || 'SYM'}</span>
                    </div>
                  </div>

                  {editing && (
                    <button
                      onClick={() => {
                        setPoliticalInfo(prev => ({ ...prev, candidateImage: null }));
                        setImagePreview(null);
                        setSelectedImage(null);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <FiX size={14} />
                    </button>
                  )}
                </div>

                {editing && (
                  <div className="flex flex-col items-center gap-2">
                    <label className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-orange-600 transition-colors text-sm">
                      <FiCamera />
                      {imageUploading ? 'Uploading...' : (politicalInfo.candidateImage ? 'Change Image' : 'Add Image')}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={imageUploading}
                      />
                    </label>
                    {imageUploading && (
                      <div className="text-orange-600 text-sm flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600"></div>
                        Uploading...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <EditableRow 
                editing={editing}
                label="Candidate" 
                value={politicalInfo.candidateName}
                onChange={(value) => handleInputChange('candidateName', value)}
                highlight 
              />
              <EditableRow 
                editing={editing}
                label="Party" 
                value={politicalInfo.partyName}
                onChange={(value) => handleInputChange('partyName', value)}
              />
              <EditableRow 
                editing={editing}
                label="Symbol" 
                value={politicalInfo.partySymbol}
                onChange={(value) => handleInputChange('partySymbol', value)}
              />
              <EditableRow 
                editing={editing}
                label="Slogan" 
                value={politicalInfo.slogan}
                onChange={(value) => handleInputChange('slogan', value)}
              />
              <EditableRow 
                editing={editing}
                label="Contact" 
                value={politicalInfo.contact}
                onChange={(value) => handleInputChange('contact', value)}
              />
              <EditableRow 
                editing={editing}
                label="Website" 
                value={politicalInfo.website}
                onChange={(value) => handleInputChange('website', value)}
              />
            </div>

            {/* Achievements */}
            <div className="mt-4 pt-3 border-t border-orange-200">
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-sm font-semibold text-orange-700">Key Achievements:</h5>
                {editing && (
                  <button
                    onClick={addAchievement}
                    className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition-colors"
                  >
                    Add +
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {politicalInfo.achievements.map((achievement, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs text-orange-600">
                    {editing ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={achievement}
                          onChange={(e) => handleAchievementChange(index, e.target.value)}
                          className="flex-1 px-2 py-1 border border-orange-300 rounded text-orange-700 text-xs"
                          placeholder="Enter achievement"
                        />
                        <button
                          onClick={() => removeAchievement(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-orange-500 mt-0.5">•</span>
                        <span>{achievement}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="text-center border-t border-gray-200 pt-4">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-2">
              <GiVote className="text-orange-500" />
              <span>Generated by VoterData Pro</span>
            </div>
            <p className="text-xs text-gray-400">
              {new Date().toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons - Mobile Optimized */}
      <div className="fixed bottom-4 left-4 right-4 z-40">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-orange-200">
          <div className="grid grid-cols-5 gap-2">
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
              icon={FiDownload}
              label="Image"
              color="bg-purple-500 hover:bg-purple-600"
              onClick={downloadAsImage}
            />
            <ActionButton
              icon={FaRegFilePdf}
              label="PDF"
              color="bg-red-500 hover:bg-red-600"
              onClick={downloadAsPDF}
            />
            <ActionButton
              icon={FiPrinter}
              label="Print"
              color="bg-indigo-500 hover:bg-indigo-600"
              onClick={printVoterDetails}
            />
          </div>

          {downloading && (
            <div className="text-center mt-3">
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-2 rounded-xl text-sm">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600"></div>
                <span>Preparing download...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ icon: Icon, label, value, fullWidth = false }) => (
  <div className={`flex items-start gap-3 ${fullWidth ? 'col-span-2' : ''}`}>
    <div className="bg-orange-100 p-2 rounded-lg flex-shrink-0 mt-0.5">
      <Icon className="text-orange-600 text-sm" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm text-gray-600 font-medium mb-1">{label}</div>
      <div className="text-gray-800 font-semibold text-base leading-tight break-words">{value}</div>
    </div>
  </div>
);

const EditableRow = ({ editing, label, value, onChange, highlight = false }) => (
  <div className="flex justify-between items-center py-1">
    <span className={`text-sm font-medium ${highlight ? 'text-orange-700 font-bold' : 'text-orange-600'}`}>
      {label}:
    </span>
    {editing ? (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`text-sm font-semibold px-2 py-1 border border-orange-300 rounded ${
          highlight ? 'text-orange-800 text-base' : 'text-orange-700'
        } bg-white`}
      />
    ) : (
      <span className={`text-sm font-semibold ${highlight ? 'text-orange-800 text-base' : 'text-orange-700'}`}>
        {value}
      </span>
    )}
  </div>
);

const FlyerRow = ({ label, value, highlight = false }) => (
  <div className="flex justify-between items-center py-1">
    <span className={`text-sm font-medium ${highlight ? 'text-orange-700 font-bold' : 'text-orange-600'}`}>
      {label}:
    </span>
    <span className={`text-sm font-semibold ${highlight ? 'text-orange-800 text-base' : 'text-orange-700'}`}>
      {value}
    </span>
  </div>
);

const ActionButton = ({ icon: Icon, label, color, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`${color} text-white py-3 px-2 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg active:scale-95 flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-xs`}
  >
    <Icon className="text-lg" />
    <span className="text-xs text-center leading-tight">{label}</span>
  </button>
);

export default FullVoterDetails;