import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Firebase exports assumed to come from ../Firebase/config
import { db, ref, get, set, update } from '../Firebase/config';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Icons
import { FiArrowLeft, FiDownload, FiPrinter, FiMessageCircle, FiMail, FiHash, FiEdit, FiX, FiSearch, FiBluetooth } from 'react-icons/fi';
import { FaWhatsapp, FaRegFilePdf } from 'react-icons/fa';
import { GiVote } from 'react-icons/gi';

const FullVoterDetails = () => {
  const { voterId } = useParams();
  const navigate = useNavigate();

  const [voter, setVoter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [printing, setPrinting] = useState(false);
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  const [printerDevice, setPrinterDevice] = useState(null);
  const [printerCharacteristic, setPrinterCharacteristic] = useState(null);

  // family UI
  const [allVoters, setAllVoters] = useState([]);
  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [addingFamily, setAddingFamily] = useState(false);

  // member detail modal
  const [memberDetailOpen, setMemberDetailOpen] = useState(false);
  const [memberDetail, setMemberDetail] = useState(null);

  // for same-booth / same-address lists
  const [sameBoothOpen, setSameBoothOpen] = useState(false);
  const [sameAddressOpen, setSameAddressOpen] = useState(false);
  const [sameBoothList, setSameBoothList] = useState([]);
  const [sameAddressList, setSameAddressList] = useState([]);

  // survey fields local
  const [surveyData, setSurveyData] = useState({ phone: '', dob: '', village: '', address: '' });

  // info fields we consider important
  const infoFields = [
    { key: 'village', label: 'Village' },
    { key: 'taluka', label: 'Taluka' },
    { key: 'houseNumber', label: 'House No' },
    { key: 'pollingStationAddress', label: 'Polling Station Address' },
    { key: 'pollingStation', label: 'Polling Station' }
  ];

  // Candidate branding information
  const candidateInfo = {
    name: "RAJESH KUMAR",
    party: "BHARATIYA JANTA PARTY",
    electionSymbol: "LOTUS",
    
  };

  // Derived filtered list for family modal
  const filteredVoters = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allVoters.filter(v => v.id !== (voter && voter.id));
    return allVoters.filter(v => ((v.name || '').toLowerCase().includes(q) || (v.voterId || '').toLowerCase().includes(q)) && v.id !== (voter && voter.id));
  }, [allVoters, searchTerm, voter]);

  useEffect(() => { loadVoterDetails(); }, [voterId]);

  const loadVoterDetails = async () => {
    setLoading(true);
    try {
      if (db && voterId) {
        const voterRef = ref(db, `voters/${voterId}`);
        const snap = await get(voterRef);
        if (snap && snap.exists()) {
          const data = { id: voterId, ...snap.val() };
          setVoter(data);
          setSurveyData({
            phone: data.phone || '',
            dob: data.dob || '',
            village: data.village || '',
            address: data.address || data.pollingStationAddress || ''
          });
        } else {
          const saved = localStorage.getItem(`voter_${voterId}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            setVoter(parsed);
            setSurveyData({ phone: parsed.phone || '', dob: parsed.dob || '', village: parsed.village || '', address: parsed.address || '' });
          } else setVoter(null);
        }
      } else {
        const saved = localStorage.getItem(`voter_${voterId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setVoter(parsed);
          setSurveyData({ phone: parsed.phone || '', dob: parsed.dob || '', village: parsed.village || '', address: parsed.address || '' });
        } else setVoter(null);
      }
    } catch (err) {
      console.error('loadVoterDetails', err);
      setVoter(null);
    } finally {
      setLoading(false);
    }
  };

  // Load voters in chunks (first N record) to avoid huge downloads
  const loadVotersInChunks = async (batchSize = 1000) => {
    setLoading(true);
    const list = [];
    try {
      if (!db) {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith('voter_')) {
            try { list.push(JSON.parse(localStorage.getItem(k))); } catch (e){}
          }
        });
        setAllVoters(list.slice(0, batchSize));
        return;
      }

      const votersRef = ref(db, 'voters');
      const snap = await get(votersRef);
      if (snap && snap.exists()) {
        let count = 0;
        snap.forEach(childSnap => {
          if (count < batchSize) {
            const raw = childSnap.val();
            list.push({
              id: childSnap.key,
              name: raw.name || raw.Name || '',
              voterId: raw.voterId || raw.VoterId || '',
              boothNumber: raw.boothNumber || raw.booth,
              pollingStationAddress: raw.pollingStationAddress || raw.pollingStation || raw.address || ''
            });
            count++;
          }
        });
      }
      setAllVoters(list);
    } catch (err) {
      console.error('loadVotersInChunks', err);
    } finally {
      setLoading(false);
    }
  };

  // persist voter helpers
  const persistVoter = async (data) => {
    try {
      if (db && data && data.id) {
        await set(ref(db, `voters/${data.id}`), data);
      }
    } catch (e) { console.warn('DB persist failed', e); }
    try { if (data && data.id) localStorage.setItem(`voter_${data.id}`, JSON.stringify(data)); } catch(e){}
  };

  const toggleVoted = async () => {
    if (!voter) return;
    const updated = { ...voter, voted: !voter.voted };
    setVoter(updated);
    await persistVoter(updated);
  };

  const addFamilyMember = async (member) => {
    if (!voter) return;
    setAddingFamily(true);
    try {
      const family = Array.isArray(voter.family) ? [...voter.family] : [];
      if (family.find(m => m.id === member.id)) {
        alert('Member already in family');
        setAddingFamily(false);
        return;
      }
      family.push({ id: member.id, name: member.name || member.voterId || ('Voter ' + member.id) });
      const updated = { ...voter, family };
      setVoter(updated);
      await persistVoter(updated);
      try { await update(ref(db, `voters/${voter.id}`), { family }); } catch(e){}
      alert('Family member added');
    } catch (err) {
      console.error('addFamilyMember', err);
      alert('Could not add family member');
    } finally { setAddingFamily(false); }
  };

  const removeFamilyMember = async (memberId) => {
    if (!voter) return;
    if (!Array.isArray(voter.family)) return;
    const family = voter.family.filter(m => m.id !== memberId);
    const updated = { ...voter, family };
    setVoter(updated);
    await persistVoter(updated);
    try { await update(ref(db, `voters/${voter.id}`), { family }); } catch(e){}
    alert('Family member removed');
  };

  const fetchMemberDetails = async (memberId) => {
    setMemberDetail(null);
    try {
      if (db) {
        const snap = await get(ref(db, `voters/${memberId}`));
        if (snap && snap.exists()) {
          setMemberDetail({ id: memberId, ...snap.val() });
          setMemberDetailOpen(true);
          return;
        }
      }
      // fallback to localStorage
      const saved = localStorage.getItem(`voter_${memberId}`);
      if (saved) {
        setMemberDetail(JSON.parse(saved));
        setMemberDetailOpen(true);
        return;
      }
      alert('Member details not found');
    } catch (err) {
      console.error('fetchMemberDetails', err);
      alert('Error fetching member details');
    }
  };

  // get lists for Info helpers
  const computeSameBooth = async () => {
    if (!voter) return;
    if (allVoters && allVoters.length) {
      const list = allVoters.filter(v => v.boothNumber && voter.boothNumber && v.boothNumber === voter.boothNumber && v.id !== voter.id);
      setSameBoothList(list);
      setSameBoothOpen(true);
      return;
    }
    try {
      const votersRef = ref(db, 'voters');
      const snap = await get(votersRef);
      const res = [];
      if (snap && snap.exists()) {
        snap.forEach(child => {
          const raw = child.val();
          const b = raw.boothNumber || raw.booth;
          if (b && voter.boothNumber && b === voter.boothNumber && child.key !== voter.id) {
            res.push({ id: child.key, name: raw.name || '', voterId: raw.voterId || '' });
          }
        });
      }
      setSameBoothList(res);
      setSameBoothOpen(true);
    } catch (err) { console.error('computeSameBooth', err); }
  };

  const computeSameAddress = async () => {
    if (!voter) return;
    if (allVoters && allVoters.length) {
      const list = allVoters.filter(v => v.pollingStationAddress && voter.pollingStationAddress && v.pollingStationAddress === voter.pollingStationAddress && v.id !== voter.id);
      setSameAddressList(list);
      setSameAddressOpen(true);
      return;
    }
    try {
      const votersRef = ref(db, 'voters');
      const snap = await get(votersRef);
      const res = [];
      if (snap && snap.exists()) {
        snap.forEach(child => {
          const raw = child.val();
          const addr = raw.pollingStationAddress || raw.pollingStation || raw.address || '';
          if (addr && voter.pollingStationAddress && addr === voter.pollingStationAddress && child.key !== voter.id) {
            res.push({ id: child.key, name: raw.name || '', voterId: raw.voterId || '' });
          }
        });
      }
      setSameAddressList(res);
      setSameAddressOpen(true);
    } catch (err) { console.error('computeSameAddress', err); }
  };

  const saveSurvey = async (extraInfo = {}) => {
    if (!voter) return;
    // Merge surveyData and any filled info fields
    const merged = { ...voter, ...extraInfo, phone: surveyData.phone, dob: surveyData.dob, village: surveyData.village, address: surveyData.address };
    setVoter(merged);
    await persistVoter(merged);
    try { await update(ref(db, `voters/${voter.id}`), merged); } catch(e){}
    alert('Survey saved');
  };

  // --- share/download functions ---
  const generateWhatsAppMessage = () => `Voter: ${voter?.name || ''}
Voter ID: ${voter?.voterId || ''}`;
  const shareOnWhatsApp = async () => {
    const message = generateWhatsAppMessage();
    const el = document.getElementById('voter-receipt');
    try { setDownloading(true); const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#fff', useCORS: true }); canvas.toBlob(async (blob) => { const file = new File([blob], 'receipt.png', { type: 'image/png' }); if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: message }); } else { window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank'); } setDownloading(false); }); } catch(e){ console.error(e); window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank'); setDownloading(false); }
  };
  const shareViaSMS = () => window.open(`sms:?body=${encodeURIComponent(generateWhatsAppMessage())}`, '_blank');
  const shareViaEmail = () => window.open(`mailto:?subject=${encodeURIComponent('Voter Details')}&body=${encodeURIComponent(generateWhatsAppMessage())}`, '_blank');
  const downloadAsImage = async () => { setDownloading(true); try { const el = document.getElementById('voter-receipt'); const canvas = await html2canvas(el, { scale: 3, backgroundColor: '#fff', useCORS: true }); const image = canvas.toDataURL('image/png'); const link = document.createElement('a'); link.href = image; link.download = `voter-${voter?.voterId || 'receipt'}.png`; document.body.appendChild(link); link.click(); document.body.removeChild(link); } catch(e){ console.error(e); alert('Error'); } finally{ setDownloading(false); } };
  const downloadAsPDF = async () => { setDownloading(true); try { const el = document.getElementById('voter-receipt'); const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#fff', useCORS: true }); const imgWidth = 210; const imgHeight = (canvas.height * imgWidth) / canvas.width; const pdf = new jsPDF('p','mm','a4'); pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,imgWidth,imgHeight); pdf.save(`voter-${voter?.voterId || 'receipt'}.pdf`); } catch(e){ console.error(e); alert('Error'); } finally{ setDownloading(false); } };

  // Bluetooth Connection Management
  const connectBluetooth = async () => {
    if (!navigator.bluetooth) {
      alert('Bluetooth is not supported in this browser. Please use Chrome or Edge on Android.');
      return null;
    }

    try {
      setPrinting(true);
      
      console.log('Requesting Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: 'RPD588' },
          { name: 'RPD-588' },
          { name: 'RP-588' },
          { name: 'BT-588' },
          { namePrefix: 'RPD' },
          { namePrefix: 'RP' },
          { namePrefix: 'BT' }
        ],
        optionalServices: [
          'generic_access',
          'device_information',
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '0000ff00-0000-1000-8000-00805f9b34fb'
        ]
      });

      console.log('Connecting to GATT server...');
      const server = await device.gatt.connect();
      
      console.log('Getting primary services...');
      const services = await server.getPrimaryServices();

      // Try to find the correct service
      let printerService = null;
      for (let service of services) {
        if (service.uuid.includes('ff00') || service.uuid.includes('ffe0') || service.uuid.includes('18f0')) {
          printerService = service;
          break;
        }
      }

      if (!printerService) {
        printerService = services[0];
      }

      console.log('Using service:', printerService.uuid);
      
      const characteristics = await printerService.getCharacteristics();
      console.log('Available characteristics:', characteristics.map(c => c.uuid));

      // Find write characteristic
      let writeCharacteristic = characteristics.find(c => 
        c.properties.write || c.properties.writeWithoutResponse
      );

      if (!writeCharacteristic) {
        writeCharacteristic = characteristics[0];
      }

      console.log('Using characteristic:', writeCharacteristic.uuid);
      
      // Store device and characteristic for later use
      setPrinterDevice(device);
      setPrinterCharacteristic(writeCharacteristic);
      setBluetoothConnected(true);
      setPrinting(false);
      
      return { device, server, characteristic: writeCharacteristic };
      
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      setPrinting(false);
      setBluetoothConnected(false);
      
      if (error.name === 'NotFoundError') {
        alert('No Bluetooth printer found. Please make sure:\n\n1. Your RPD-588 printer is turned ON\n2. Bluetooth is enabled on your device\n3. Printer is in pairing mode\n4. Printer is within range');
      } else if (error.name === 'SecurityError') {
        alert('Bluetooth permissions denied. Please allow Bluetooth access in your browser settings.');
      } else {
        alert(`Bluetooth connection failed: ${error.message}\n\nPlease ensure your printer is paired and try again.`);
      }
      return null;
    }
  };

  // Generate ESC/POS commands with improved design and candidate branding
  const generateESC_POSCommands = () => {
    const commands = [];
    
    // Initialize printer
    commands.push('\x1B\x40'); // Initialize
    
    // Candidate Branding Header - Center aligned
    commands.push('\x1B\x61\x01'); // Center alignment
    
    // Party Name - Double height
    commands.push('\x1D\x21\x11'); // Double height and width
    commands.push(`${candidateInfo.party}\n`);
    commands.push('\x1D\x21\x00'); // Normal text
    
    // Candidate Name - Bold
    commands.push('\x1B\x45\x01'); // Bold on
    commands.push(`${candidateInfo.name}\n`);
    commands.push('\x1B\x45\x00'); // Bold off
    
    // Election Symbol
    commands.push(`Symbol: ${candidateInfo.electionSymbol}\n`);
    
    // Slogan
    commands.push(`${candidateInfo.slogan}\n`);
    commands.push('------------------------\n');
    
    // Reset to left alignment for voter details
    commands.push('\x1B\x61\x00'); // Left alignment
    
    // Voter Details Section Header
    commands.push('\x1B\x45\x01'); // Bold on
    commands.push('VOTER INFORMATION\n');
    commands.push('\x1B\x45\x00'); // Bold off
    commands.push('------------------------\n');
    
    // Voter details with better formatting
    commands.push(`Name: ${voter?.name || 'N/A'}\n`);
    commands.push(`Voter ID: ${voter?.voterId || 'N/A'}\n`);
    commands.push(`Part: ${voter?.listPart || voter?.part || '1'}\n`);
    commands.push(`Age: ${voter?.age || '-'} | Gender: ${voter?.gender || '-'}\n`);
    
    // Voted status with emphasis
    if (voter?.voted) {
      commands.push('------------------------\n');
      commands.push('\x1B\x45\x01'); // Bold on
      commands.push('VOTING COMPLETED\n');
      commands.push('\x1B\x45\x00'); // Bold off
    } else {
      commands.push('------------------------\n');
      commands.push('\x1B\x45\x01'); // Bold on
      commands.push('PENDING VOTING\n');
      commands.push('\x1B\x45\x00'); // Bold off
    }
    commands.push('------------------------\n');
    
    // Additional voter details (limited to essential fields)
    commands.push('\x1B\x45\x01'); // Bold on
    commands.push('DETAILS:\n');
    commands.push('\x1B\x45\x00'); // Bold off
    
    // Only include essential info fields to reduce data size
    const essentialFields = infoFields.slice(0, 2); // Limit to first 2 fields
    essentialFields.forEach(field => {
      const value = voter?.[field.key] || '-';
      if (value && value !== '-') {
        commands.push(`${field.label}: ${value}\n`);
      }
    });
    
    // Address information (truncated if too long)
    const address = voter?.pollingStationAddress || voter?.address;
    if (address) {
      commands.push('------------------------\n');
      commands.push('Address:\n');
      // Split long address into multiple lines and limit length
      const shortAddress = address.length > 100 ? address.substring(0, 100) + '...' : address;
      const addressLines = shortAddress.match(/.{1,30}/g) || [shortAddress];
      addressLines.forEach(line => commands.push(`${line}\n`));
    }
    
    // Family members section (limited to 3 members)
    if (Array.isArray(voter?.family) && voter.family.length > 0) {
      commands.push('------------------------\n');
      commands.push('\x1B\x45\x01'); // Bold on
      const familyCount = Math.min(voter.family.length, 3);
      commands.push(`Family (${familyCount}):\n`);
      commands.push('\x1B\x45\x00'); // Bold off
      voter.family.slice(0, 3).forEach((member, index) => {
        commands.push(`${index + 1}. ${member.name}\n`);
      });
      if (voter.family.length > 3) {
        commands.push(`... +${voter.family.length - 3} more\n`);
      }
    }
    
    // Footer section
    commands.push('------------------------\n');
    commands.push('\x1B\x61\x01'); // Center alignment
    commands.push('Contact: ');
    commands.push(candidateInfo.contact);
    commands.push('\n');
    commands.push(candidateInfo.area);
    commands.push('\n');
    
    // Date and time
    commands.push('------------------------\n');
    commands.push(`Date: ${new Date().toLocaleDateString('en-IN')}\n`);
    commands.push(`Time: ${new Date().toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}\n`);
    
    // Thank you message
    commands.push('Thank you!\n');
    commands.push('Jai Hind!\n');
    
    // Feed paper and cut
    commands.push('\n\n'); // Feed paper
    commands.push('\x1D\x56\x00'); // Cut paper
    
    return commands.join('');
  };

  // Split data into chunks of max 500 bytes
  const splitDataIntoChunks = (data, chunkSize = 500) => {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const chunks = [];
    
    for (let i = 0; i < dataBytes.length; i += chunkSize) {
      const chunk = dataBytes.slice(i, i + chunkSize);
      chunks.push(chunk);
    }
    
    return chunks;
  };

  // Print function with chunked data
  const printViaBluetooth = async () => {
    if (!voter) {
      alert('No voter data available');
      return;
    }

    try {
      setPrinting(true);
      
      let connection;
      
      // Check if we already have a connected device
      if (printerDevice && printerCharacteristic && bluetoothConnected) {
        console.log('Using existing Bluetooth connection');
        connection = {
          device: printerDevice,
          characteristic: printerCharacteristic
        };
      } else {
        // Connect to Bluetooth if not already connected
        console.log('Establishing new Bluetooth connection');
        connection = await connectBluetooth();
        if (!connection) {
          setPrinting(false);
          return;
        }
      }

      const { characteristic } = connection;

      // Generate receipt content with improved design
      const receiptText = generateESC_POSCommands();
      console.log('Receipt text length:', receiptText.length);
      
      // Split data into chunks
      const chunks = splitDataIntoChunks(receiptText, 500);
      console.log(`Splitting data into ${chunks.length} chunks`);
      
      // Send data to printer in chunks
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Sending chunk ${i + 1}/${chunks.length}`);
        
        if (characteristic.properties.write) {
          await characteristic.writeValue(chunks[i]);
        } else if (characteristic.properties.writeWithoutResponse) {
          await characteristic.writeValueWithoutResponse(chunks[i]);
        }
        
        // Small delay between chunks to prevent overwhelming the printer
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      console.log('All chunks sent successfully');
      alert('Receipt printed successfully! 🎉');

    } catch (error) {
      console.error('Printing failed:', error);
      
      // Reset connection on error
      setBluetoothConnected(false);
      setPrinterDevice(null);
      setPrinterCharacteristic(null);
      
      if (error.message.includes('GATT Server') || error.message.includes('disconnected')) {
        alert('Printer connection lost. Please reconnect and try again.');
      } else if (error.message.includes('512 bytes')) {
        alert('Print data too large. Trying alternative method...');
        // Try alternative printing method
        await printViaBluetoothAlternative();
      } else {
        alert(`Printing failed: ${error.message}\n\nPlease check:\n1. Printer is turned ON\n2. Paper is loaded\n3. Printer is within range`);
      }
    } finally {
      setPrinting(false);
    }
  };

  // Alternative printing method with even smaller chunks
  const printViaBluetoothAlternative = async () => {
    try {
      if (!printerCharacteristic) {
        throw new Error('No printer connection');
      }

      // Generate simpler receipt to reduce data size
      const simpleReceipt = generateSimpleReceipt();
      const chunks = splitDataIntoChunks(simpleReceipt, 200); // Even smaller chunks
      
      console.log(`Sending ${chunks.length} small chunks`);
      
      for (let i = 0; i < chunks.length; i++) {
        await printerCharacteristic.writeValueWithoutResponse(chunks[i]);
        await new Promise(resolve => setTimeout(resolve, 100)); // Longer delay
      }
      
      alert('Receipt printed successfully! 🎉');
    } catch (error) {
      console.error('Alternative printing failed:', error);
      throw error;
    }
  };

  // Generate simpler receipt for alternative method
 const generateSimpleReceipt = () => {
  const lines = [];
  
  lines.push('\x1B\x40'); // Initialize
  lines.push('\x1B\x61\x01'); // Center
  
  // Compact Header
  lines.push('BJP - Akshay Bhaltilak\n');
  lines.push('LOTUS (2)\n');
  lines.push('----------------\n');
  
  lines.push('\x1B\x61\x00'); // Left
  
  // Essential Voter Info
  lines.push(`Name: ${voter?.name || 'N/A'}\n`);
  lines.push(`ID: ${voter?.voterId || 'N/A'}\n`);
  lines.push(`Age: ${voter?.age || '-'} | ${voter?.gender || '-'}\n`);
  
  // Voting Status
  lines.push(voter?.voted ? 'VOTED ✓\n' : 'PENDING\n');
  lines.push('----------------\n');
  
  // Polling Station Info
  const pollingAddress = voter?.pollingStationAddress || voter?.address;
  if (pollingAddress) {
    lines.push('Polling Station:\n');
    const shortAddr = pollingAddress.length > 35 ? pollingAddress.substring(0, 35) + '...' : pollingAddress;
    lines.push(`${shortAddr}\n`);
  }
  
  // Room Number
  const roomNo = voter?.roomNumber || voter?.houseNumber;
  if (roomNo) {
    lines.push(`Room: ${roomNo}\n`);
  }
  
  // Part Info
  const part = voter?.listPart || voter?.part;
  if (part) {
    lines.push(`Part: ${part}\n`);
  }
  
  lines.push('----------------\n');
  lines.push('\x1B\x61\x01'); // Center
  lines.push('Jai Hind!\n');
  
  lines.push('\n\n');
  lines.push('\x1D\x56\x00'); // Cut
  
  return lines.join('');
};

  // Disconnect Bluetooth
  const disconnectBluetooth = async () => {
    if (printerDevice && printerDevice.gatt.connected) {
      try {
        await printerDevice.gatt.disconnect();
        console.log('Bluetooth disconnected');
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
    setBluetoothConnected(false);
    setPrinterDevice(null);
    setPrinterCharacteristic(null);
    alert('Bluetooth printer disconnected');
  };

  // Simple text print for testing
  const simplePrint = () => {
    // Create a simplified text version for copying
    const receiptContent = `
${candidateInfo.party}
${candidateInfo.name}
Symbol: ${candidateInfo.electionSymbol}
${candidateInfo.slogan}
────────────────────────
VOTER INFORMATION
────────────────────────
Name: ${voter?.name || 'N/A'}
Voter ID: ${voter?.voterId || 'N/A'}
Part: ${voter?.listPart || voter?.part || '1'}
Age: ${voter?.age || '-'} | Gender: ${voter?.gender || '-'}
Status: ${voter?.voted ? 'VOTING COMPLETED' : 'PENDING VOTING'}
────────────────────────
Contact: ${candidateInfo.contact}
Area: ${candidateInfo.area}
Printed: ${new Date().toLocaleDateString('en-IN')}
Thank you for your support!
Jai Hind!
    `.trim();

    const textArea = document.createElement('textarea');
    textArea.value = receiptContent;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      alert('Receipt text copied to clipboard! 📋\nYou can paste it into any text app.');
    } catch (err) {
      alert(`Copy this text manually:\n\n${receiptContent}`);
    }
    
    document.body.removeChild(textArea);
  };

  if (loading) return (<div className="min-h-screen flex items-center justify-center p-4">Loading...</div>);
  if (!voter) return (<div className="min-h-screen flex items-center justify-center p-4"><div>Voter not found<button onClick={()=>navigate('/')}>Back</button></div></div>);

  // Determine which info fields are missing and show them in survey
  const missingInfoFields = infoFields.filter(f => !voter[f.key] || voter[f.key] === '');

  return (
    <div className="min-h-screen bg-[#fff7ef] p-4 pb-28">
      <div className="max-w-md mx-auto">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-b-3xl text-white pt-6 pb-4 px-4 relative">
          <button onClick={() => navigate(-1)} className="absolute left-4 top-4 bg-white/20 p-2 rounded-full"><FiArrowLeft /></button>
          <div className="text-center text-lg font-bold">{voter.name}</div>
          <div className="mt-3">
            <div className="flex justify-around text-sm font-medium">
              <div onClick={() => setActiveTab('info')} className={`pb-2 ${activeTab === 'info' ? 'border-b-2 border-white' : 'text-white/80 cursor-pointer'}`}>Info</div>
              <div onClick={() => setActiveTab('family')} className={`pb-2 ${activeTab === 'family' ? 'border-b-2 border-white' : 'text-white/80 cursor-pointer'}`}>Family</div>
              <div onClick={() => setActiveTab('survey')} className={`pb-2 ${activeTab === 'survey' ? 'border-b-2 border-white' : 'text-white/80 cursor-pointer'}`}>Survey</div>
            </div>
          </div>
        </div>

        {/* Main receipt for display */}
        <div id="voter-receipt" className="bg-white rounded-2xl -mt-6 shadow-lg overflow-hidden border border-gray-100">
          <div className="p-4 pt-6">
            {/* Candidate Branding in Display */}
            <div className="text-center mb-4 bg-saffron-50 p-3 rounded-lg border border-saffron-200">
              <div className="text-sm font-bold text-saffron-800">{candidateInfo.party}</div>
              <div className="text-lg font-bold text-gray-800">{candidateInfo.name}</div>
              <div className="text-xs text-gray-600">Symbol: {candidateInfo.electionSymbol}</div>
              <div className="text-xs text-gray-700 mt-1">{candidateInfo.slogan}</div>
            </div>

            <div className="text-center">
              <div className="text-gray-800 font-bold text-xl">{voter.name}</div>
              <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1"><FiHash /> {voter.voterId || 'N/A'}</div>
                <div>Part {voter.listPart || voter.part || '1'}</div>
                <div>Age {voter.age || '-'}</div>
                <div>Gender {voter.gender || '-'}</div>
              </div>
              <div className="mt-3 flex items-center justify-center gap-3">
                <button onClick={toggleVoted} className={`px-3 py-1 rounded-full font-semibold ${voter.voted ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{voter.voted ? 'VOTED ✓' : 'Mark as Voted'}</button>
              </div>
            </div>

            <div className="mt-4 border-t pt-3">
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 gap-3 text-sm">
                  {infoFields.map(f => <Detail key={f.key} label={f.label} value={voter[f.key] || '-'} />)}

                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-600">Address</div>
                    <div className="text-sm font-semibold text-gray-800 mt-1">{voter.pollingStationAddress || voter.address || '-'}</div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-600">Polling Station</div>
                    <div className="text-sm font-semibold text-gray-800 mt-1">{voter.pollingStation || voter.pollingStationAddress || '-'}</div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={computeSameBooth} className="flex-1 bg-blue-500 text-white py-2 rounded">Show Same Booth</button>
                    <button onClick={computeSameAddress} className="flex-1 bg-indigo-500 text-white py-2 rounded">Show Same Address</button>
                  </div>
                </div>
              )}

              {activeTab === 'family' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Family Members</div>
                    <button onClick={() => { setFamilyModalOpen(true); loadVotersInChunks(); }} className="text-sm bg-orange-500 text-white px-3 py-1 rounded">Add Member</button>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    {Array.isArray(voter.family) && voter.family.length ? (
                      <ul className="space-y-2">
                        {voter.family.map((m) => (
                          <li key={m.id} className="flex justify-between items-center">
                            <div className="text-sm">{m.name}</div>
                            <div className="flex items-center gap-2">
                              <button onClick={()=>fetchMemberDetails(m.id)} className="text-sm bg-blue-500 text-white px-2 py-1 rounded">View</button>
                              <button onClick={()=>removeFamilyMember(m.id)} className="text-sm bg-red-500 text-white px-2 py-1 rounded">Remove</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-gray-500">No family members added.</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'survey' && (
                <div className="space-y-3">
                  <div className="text-sm font-medium">Edit Survey Details (also fill missing Info fields)</div>

                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs">Phone</label>
                    <input value={surveyData.phone} onChange={(e)=>setSurveyData(s=>({...s, phone: e.target.value}))} className="p-2 border rounded" />

                    <label className="text-xs">Date of Birth</label>
                    <input type="date" value={surveyData.dob} onChange={(e)=>setSurveyData(s=>({...s, dob: e.target.value}))} className="p-2 border rounded" />

                    {missingInfoFields.length ? (
                      missingInfoFields.map((f) => {
                        return (
                          <div key={f.key}>
                            <label className="text-xs">{f.label}</label>
                            <input
                              value={surveyData && surveyData[f.key] !== undefined ? surveyData[f.key] : ''}
                              onChange={(e) => setSurveyData(s => ({ ...s, [f.key]: e.target.value }))}
                              className="p-2 border rounded"
                            />
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-gray-500">
                        No missing info fields. You can still update phone or dob.
                      </div>
                    )}

                    <label className="text-xs">Address</label>
                    <textarea value={surveyData.address} onChange={(e)=>setSurveyData(s=>({...s, address: e.target.value}))} className="p-2 border rounded" rows={3} />

                    <div className="flex gap-2">
                      <button onClick={() => {
                        // create an object of filled info fields from surveyData for keys that were missing
                        const extra = {};
                        missingInfoFields.forEach(f => { if (surveyData[f.key]) extra[f.key] = surveyData[f.key]; });
                        saveSurvey(extra);
                      }} className="bg-green-600 text-white px-4 py-2 rounded">Save</button>

                      <button onClick={() => { setSurveyData({ phone: voter.phone || '', dob: voter.dob || '', village: voter.village || '', address: voter.address || '' }); }} className="bg-gray-200 px-4 py-2 rounded">Reset</button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div className="mt-4 text-center text-xs text-gray-400 border-t pt-3">
              <div className="flex items-center justify-center gap-2 mb-1"><GiVote className="text-orange-500" />Generated by VoterData Pro</div>
              <div>{new Date().toLocaleDateString('en-IN')}</div>
            </div>

          </div>
        </div>

        {/* Print Options Section */}
        <div className="fixed left-4 right-4 bottom-4 max-w-md mx-auto">
          <div className="bg-white p-3 rounded-2xl shadow-lg flex flex-col gap-2 border">
            <div className="flex gap-2">
              <button onClick={shareOnWhatsApp} className="flex-1 bg-green-500 text-white py-2 rounded flex items-center justify-center gap-2"><FaWhatsapp />WhatsApp</button>
              <button onClick={shareViaSMS} className="flex-1 bg-blue-500 text-white py-2 rounded flex items-center justify-center gap-2"><FiMessageCircle />SMS</button>
              <button onClick={downloadAsImage} className="bg-purple-600 text-white p-2 rounded flex items-center gap-2"><FiDownload /></button>
              <button onClick={downloadAsPDF} className="bg-red-600 text-white p-2 rounded flex items-center gap-2"><FaRegFilePdf /></button>
            </div>
            
            {/* Bluetooth Print Options */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={printViaBluetooth} 
                disabled={printing}
                className="bg-indigo-600 text-white py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {printing ? (
                  <>Printing...</>
                ) : (
                  <><FiBluetooth className="text-white" />{bluetoothConnected ? 'Print' : 'Connect & Print'}</>
                )}
              </button>
              
              {bluetoothConnected && (
                <button 
                  onClick={disconnectBluetooth}
                  className="bg-red-600 text-white py-2 rounded flex items-center justify-center gap-2 text-sm"
                >
                  Disconnect
                </button>
              )}
              
              {!bluetoothConnected && (
                <button 
                  onClick={simplePrint}
                  className="bg-orange-600 text-white py-2 rounded flex items-center justify-center gap-2 text-sm"
                >
                  Copy Text
                </button>
              )}
            </div>
            
            <div className="text-xs text-center text-gray-500 mt-1">
              {bluetoothConnected ? 
                '✓ Bluetooth Connected - Ready to Print' : 
                'Connect RPD-588 Printer for Receipt'}
            </div>
          </div>
        </div>

        {/* Rest of your modals remain the same */}
        {familyModalOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-lg p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-bold">Add Family Member</div>
                <button onClick={() => setFamilyModalOpen(false)} className="p-2"><FiX /></button>
              </div>

              <div className="mb-3">
                <div className="relative">
                  <input value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} placeholder="Search by name or voter id" className="w-full p-2 border rounded pl-10" />
                  <FiSearch className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>

              <div className="max-h-60 overflow-auto space-y-2">
                {filteredVoters.length ? filteredVoters.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-semibold">{v.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{v.voterId || v.id}</div>
                    </div>
                    <div>
                      <button onClick={()=>addFamilyMember(v)} disabled={addingFamily} className="bg-orange-500 text-white px-3 py-1 rounded text-sm">Add</button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-sm text-gray-500">No voters found</div>
                )}
              </div>

              <div className="mt-3 text-right">
                <button onClick={()=>setFamilyModalOpen(false)} className="px-4 py-2 rounded bg-gray-200">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Other modals remain unchanged */}
        {memberDetailOpen && memberDetail && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-bold">Member Details</div>
                <button onClick={() => setMemberDetailOpen(false)} className="p-2"><FiX /></button>
              </div>

              <div className="space-y-2 text-sm">
                <div><strong>Name:</strong> {memberDetail.name}</div>
                <div><strong>Voter ID:</strong> {memberDetail.voterId || memberDetail.id}</div>
                <div><strong>Age:</strong> {memberDetail.age || '-'}</div>
                <div><strong>Gender:</strong> {memberDetail.gender || '-'}</div>
                <div><strong>Village:</strong> {memberDetail.village || '-'}</div>
                <div><strong>Taluka:</strong> {memberDetail.taluka || '-'}</div>
                <div><strong>Address:</strong> {memberDetail.address || memberDetail.pollingStationAddress || '-'}</div>
              </div>

              <div className="mt-4 text-right">
                <button onClick={()=>setMemberDetailOpen(false)} className="px-4 py-2 rounded bg-gray-200">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Same Booth Modal */}
        {sameBoothOpen && (
          <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-lg p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-bold">Voters in Same Booth</div>
                <button onClick={() => setSameBoothOpen(false)} className="p-2"><FiX /></button>
              </div>
              <div className="max-h-80 overflow-auto">
                {sameBoothList.length ? sameBoothList.map(v => (
                  <div key={v.id} className="p-2 border-b flex justify-between">
                    <div><div className="font-semibold">{v.name}</div><div className="text-xs text-gray-500">{v.voterId}</div></div>
                    <div className="text-xs text-gray-500">{v.id}</div>
                  </div>
                )) : (<div className="text-sm text-gray-500">No voters found</div>)}
              </div>
            </div>
          </div>
        )}

        {/* Same Address Modal */}
        {sameAddressOpen && (
          <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-lg p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-bold">Voters with Same Address</div>
                <button onClick={() => setSameAddressOpen(false)} className="p-2"><FiX /></button>
              </div>
              <div className="max-h-80 overflow-auto">
                {sameAddressList.length ? sameAddressList.map(v => (
                  <div key={v.id} className="p-2 border-b flex justify-between">
                    <div><div className="font-semibold">{v.name}</div><div className="text-xs text-gray-500">{v.voterId}</div></div>
                    <div className="text-xs text-gray-500">{v.id}</div>
                  </div>
                )) : (<div className="text-sm text-gray-500">No voters found</div>)}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

const Detail = ({ label, value, highlight }) => (
  <div className={`flex justify-between items-start gap-3 ${highlight ? 'font-semibold' : ''}`}>
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-sm text-gray-800 text-right">{value}</div>
  </div>
);

export default FullVoterDetails;