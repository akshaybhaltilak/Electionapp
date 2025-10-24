// VoterPrintService.js
export class VoterPrintService {
  constructor() {
    this.printerDevice = null;
    this.printerCharacteristic = null;
    this.bluetoothConnected = false;
  }

  // Candidate branding information
  candidateInfo = {
    name: "Akshay Bhaltilak",
    party: "BJP",
    electionSymbol: "LOTUS",
    slogan: "Vikasit Bharat, Samruddha Maharashtra",
    contact: "9876543210",
    area: "Akola"
  };

  // Marathi candidate info
  marathiCandidateInfo = {
    name: "अक्षय भालटिलक",
    party: "भारतीय जनता पक्ष",
    electionSymbol: "कमळ",
    slogan: "विकसित भारत, समृद्ध महाराष्ट्र",
    contact: "९८७६५४३२१०",
    area: "अकोला"
  };

  // English labels for printing
  englishLabels = {
    voterInformation: "VOTER INFORMATION",
    name: "Name",
    voterId: "Voter ID",
    serialNumber: "Serial No",
    booth: "Booth No",
    pollingStation: "Polling Station",
    age: "Age",
    gender: "Gender",
    part: "Part",
    voted: "VOTED",
    pending: "PENDING",
    details: "DETAILS",
    address: "Address",
    family: "Family",
    contact: "Contact",
    date: "Date",
    time: "Time",
    thankYou: "Thank you",
    jaiHind: "Jai Hind",
    votingCompleted: "VOTING COMPLETED",
    pendingVoting: "PENDING VOTING",
    village: "Village",
    taluka: "Taluka",
    houseNumber: "House No"
  };

  // Marathi labels for printing (using English transliteration for thermal printer)
  marathiLabels = {
    voterInformation: "MATDAR MAHITI",
    name: "NAV",
    voterId: "MATDAR ID",
    serialNumber: "ANK",
    booth: "BOOTH ANK",
    pollingStation: "MATDAN KENDRA",
    age: "VAY",
    gender: "LING",
    part: "BHAG",
    voted: "MATDAN ZALE",
    pending: "MATDAN BAKI",
    details: "TAPSHIL",
    address: "PATTA",
    family: "KUTUMB",
    contact: "SAMPARK",
    date: "TARIKH",
    time: "VEL",
    thankYou: "DHANYAVAD",
    jaiHind: "JAI HIND",
    votingCompleted: "MATDAN PURNA",
    pendingVoting: "MATDAN BAKI",
    village: "GAV",
    taluka: "TALUKA",
    houseNumber: "MAKAN ANK"
  };

  isConnected() {
    return this.bluetoothConnected && this.printerDevice && this.printerDevice.gatt.connected;
  }

  // Helper function to wrap text to specific width
  wrapText = (text, maxWidth) => {
    if (!text || text.length === 0) return [''];
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + word).length <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [''];
  };

  // Convert Marathi text to English transliteration for printing
  transliterateToEnglish(text) {
    if (!text) return '';
    
    // Basic transliteration map for common Marathi words
    const transliterationMap = {
      'अक्षय': 'Akshay',
      'भालटिलक': 'Bhaltilak',
      'भारतीय': 'Bharatiya',
      'जनता': 'Janata',
      'पक्ष': 'Pakshat',
      'कमळ': 'Kamal',
      'विकसित': 'Vikasit',
      'भारत': 'Bharat',
      'समृद्ध': 'Samruddha',
      'महाराष्ट्र': 'Maharashtra',
      'अकोला': 'Akola',
      'मतदार': 'Matdar',
      'माहिती': 'Mahiti',
      'नाव': 'Nav',
      'ओळखपत्र': 'Id',
      'क्रमांक': 'Ank',
      'अनुक्रमांक': 'Ank',
      'बूथ': 'Booth',
      'मतदान': 'Matdan',
      'केंद्र': 'Kendra',
      'वय': 'Vay',
      'लिंग': 'Ling',
      'भाग': 'Bhag',
      'झाले': 'Zale',
      'बाकी': 'Baki',
      'तपशील': 'Tapshil',
      'पत्ता': 'Patta',
      'कुटुंब': 'Kutumb',
      'सदस्य': 'Sadasya',
      'संपर्क': 'Sampark',
      'तारीख': 'Tarik',
      'वेळ': 'Vel',
      'धन्यवाद': 'Dhanyavad',
      'जय': 'Jai',
      'हिंद': 'Hind',
      'पूर्ण': 'Purna',
      'गाव': 'Gav',
      'तालुका': 'Taluka',
      'मकान': 'Makan'
    };

    let result = text;
    
    // Replace common Marathi words with English transliteration
    Object.keys(transliterationMap).forEach(marathiWord => {
      const regex = new RegExp(marathiWord, 'g');
      result = result.replace(regex, transliterationMap[marathiWord]);
    });

    return result;
  }

  // Generate ESC/POS commands for English text
  generateEnglishESC_POSCommands(voter) {
    const commands = [];
    const labels = this.englishLabels;
    const candidate = this.candidateInfo;

    // Initialize printer
    commands.push('\x1B\x40'); // ESC @ - Initialize
    
    // ============================================
    // HEADER SECTION - Candidate Branding
    // ============================================
    commands.push('\x1B\x61\x01'); // Center alignment
    commands.push('\x1B\x45\x01'); // Bold ON
    
    // Party name - Large text
    commands.push('\x1D\x21\x11'); // Double height + width
    commands.push(`${candidate.party}\n`);
    commands.push('\x1D\x21\x00'); // Reset size
    
    // Candidate name
    commands.push(`${candidate.name}\n`);
    commands.push('\x1B\x45\x00'); // Bold OFF
    
    // Symbol and slogan
    commands.push(`Symbol: ${candidate.electionSymbol}\n`);
    commands.push(`${candidate.slogan}\n`);
    
    // Separator line
    commands.push('================================\n');
    
    // ============================================
    // VOTER DETAILS SECTION
    // ============================================
    commands.push('\x1B\x61\x00'); // Left alignment
    commands.push('\x1B\x45\x01'); // Bold ON
    commands.push(`${labels.voterInformation}\n`);
    commands.push('\x1B\x45\x00'); // Bold OFF
    commands.push('--------------------------------\n');
    
    // Key voter information
    commands.push(`${labels.name}:\n`);
    commands.push(`  ${voter?.name || 'N/A'}\n\n`);
    
    commands.push(`${labels.voterId}:\n`);
    commands.push(`  ${voter?.voterId || 'N/A'}\n\n`);
    
    commands.push(`${labels.booth}: ${voter?.boothNumber || voter?.booth || 'N/A'}\n`);
    commands.push(`${labels.part}: ${voter?.listPart || voter?.part || '1'}\n`);
    commands.push(`${labels.age}: ${voter?.age || '-'} | ${labels.gender}: ${voter?.gender || '-'}\n`);
    
    commands.push('--------------------------------\n');
    
    // ============================================
    // VOTING STATUS - HIGHLIGHTED
    // ============================================
    commands.push('\x1B\x61\x01'); // Center alignment
    commands.push('\x1B\x45\x01'); // Bold ON
    commands.push('\x1D\x21\x01'); // Double height
    
    if (voter?.voted) {
      commands.push(`[✓] ${labels.votingCompleted}\n`);
    } else {
      commands.push(`[ ] ${labels.pendingVoting}\n`);
    }
    
    commands.push('\x1D\x21\x00'); // Reset size
    commands.push('\x1B\x45\x00'); // Bold OFF
    commands.push('================================\n');
    
    // ============================================
    // ADDITIONAL DETAILS
    // ============================================
    commands.push('\x1B\x61\x00'); // Left alignment
    
    // Polling Station
    const pollingStation = voter?.pollingStation || voter?.pollingStationAddress || 'N/A';
    commands.push(`${labels.pollingStation}:\n`);
    const psLines = this.wrapText(pollingStation, 32);
    psLines.forEach(line => commands.push(`  ${line}\n`));
    commands.push('\n');
    
    // Village and other details
    if (voter?.village) {
      commands.push(`${labels.village}: ${voter.village}\n`);
    }
    if (voter?.taluka) {
      commands.push(`${labels.taluka}: ${voter.taluka}\n`);
    }
    if (voter?.houseNumber) {
      commands.push(`${labels.houseNumber}: ${voter.houseNumber}\n`);
    }
    
    // Address if available
    const address = voter?.pollingStationAddress || voter?.address;
    if (address && address.length > 0) {
      commands.push('--------------------------------\n');
      commands.push(`${labels.address}:\n`);
      const addrLines = this.wrapText(address, 32);
      addrLines.forEach(line => commands.push(`  ${line}\n`));
    }
    
    // ============================================
    // FAMILY MEMBERS (if any, limit to 3)
    // ============================================
    if (Array.isArray(voter?.family) && voter.family.length > 0) {
      commands.push('--------------------------------\n');
      commands.push('\x1B\x45\x01'); // Bold ON
      commands.push(`${labels.family} Members (${voter.family.length}):\n`);
      commands.push('\x1B\x45\x00'); // Bold OFF
      
      voter.family.slice(0, 3).forEach((member, idx) => {
        commands.push(`  ${idx + 1}. ${member.name}\n`);
      });
      
      if (voter.family.length > 3) {
        commands.push(`  ... and ${voter.family.length - 3} more\n`);
      }
    }
    
    // ============================================
    // FOOTER SECTION
    // ============================================
    commands.push('================================\n');
    commands.push('\x1B\x61\x01'); // Center alignment
    
    // Contact info
    commands.push(`${labels.contact}: ${candidate.contact}\n`);
    commands.push(`${candidate.area}\n`);
    
    // Date and time
    commands.push('--------------------------------\n');
    const now = new Date();
    commands.push(`${labels.date}: ${now.toLocaleDateString('en-IN')}\n`);
    commands.push(`${labels.time}: ${now.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })}\n`);
    
    // Thank you message
    commands.push('--------------------------------\n');
    commands.push(`${labels.thankYou}!\n`);
    commands.push(`${labels.jaiHind}!\n`);
    
    // Feed paper and cut
    commands.push('\n\n\n'); // Extra line feeds
    commands.push('\x1D\x56\x41\x03'); // Partial cut
    
    return commands.join('');
  }

  // Generate ESC/POS commands for Marathi text (using transliteration)
  generateMarathiESC_POSCommands(voter) {
    const commands = [];
    const labels = this.marathiLabels;
    const candidate = this.marathiCandidateInfo;

    // Initialize printer
    commands.push('\x1B\x40'); // ESC @ - Initialize
    
    // ============================================
    // HEADER SECTION - Candidate Branding in Marathi Transliteration
    // ============================================
    commands.push('\x1B\x61\x01'); // Center alignment
    commands.push('\x1B\x45\x01'); // Bold ON
    
    // Party name - Large text
    commands.push('\x1D\x21\x11'); // Double height + width
    commands.push(`${this.transliterateToEnglish(candidate.party)}\n`);
    commands.push('\x1D\x21\x00'); // Reset size
    
    // Candidate name
    commands.push(`${this.transliterateToEnglish(candidate.name)}\n`);
    commands.push('\x1B\x45\x00'); // Bold OFF
    
    // Symbol and slogan
    commands.push(`Chinh: ${this.transliterateToEnglish(candidate.electionSymbol)}\n`);
    commands.push(`${this.transliterateToEnglish(candidate.slogan)}\n`);
    
    // Separator line
    commands.push('================================\n');
    
    // ============================================
    // VOTER DETAILS SECTION IN MARATHI TRANSLITERATION
    // ============================================
    commands.push('\x1B\x61\x00'); // Left alignment
    commands.push('\x1B\x45\x01'); // Bold ON
    commands.push(`${labels.voterInformation}\n`);
    commands.push('\x1B\x45\x00'); // Bold OFF
    commands.push('--------------------------------\n');
    
    // Key voter information in Marathi transliteration
    commands.push(`${labels.name}:\n`);
    commands.push(`  ${this.transliterateToEnglish(voter?.name) || 'N/A'}\n\n`);
    
    commands.push(`${labels.voterId}:\n`);
    commands.push(`  ${voter?.voterId || 'N/A'}\n\n`);
    
    commands.push(`${labels.booth}: ${voter?.boothNumber || voter?.booth || 'N/A'}\n`);
    commands.push(`${labels.part}: ${voter?.listPart || voter?.part || '1'}\n`);
    commands.push(`${labels.age}: ${voter?.age || '-'} | ${labels.gender}: ${voter?.gender || '-'}\n`);
    
    commands.push('--------------------------------\n');
    
    // ============================================
    // VOTING STATUS - HIGHLIGHTED IN MARATHI TRANSLITERATION
    // ============================================
    commands.push('\x1B\x61\x01'); // Center alignment
    commands.push('\x1B\x45\x01'); // Bold ON
    commands.push('\x1D\x21\x01'); // Double height
    
    if (voter?.voted) {
      commands.push(`[✓] ${labels.votingCompleted}\n`);
    } else {
      commands.push(`[ ] ${labels.pendingVoting}\n`);
    }
    
    commands.push('\x1D\x21\x00'); // Reset size
    commands.push('\x1B\x45\x00'); // Bold OFF
    commands.push('================================\n');
    
    // ============================================
    // ADDITIONAL DETAILS IN MARATHI TRANSLITERATION
    // ============================================
    commands.push('\x1B\x61\x00'); // Left alignment
    
    // Polling Station in Marathi transliteration
    const pollingStation = voter?.pollingStation || voter?.pollingStationAddress || 'N/A';
    commands.push(`${labels.pollingStation}:\n`);
    const psLines = this.wrapText(this.transliterateToEnglish(pollingStation), 32);
    psLines.forEach(line => commands.push(`  ${line}\n`));
    commands.push('\n');
    
    // Village and other details in Marathi transliteration
    if (voter?.village) {
      commands.push(`${labels.village}: ${this.transliterateToEnglish(voter.village)}\n`);
    }
    if (voter?.taluka) {
      commands.push(`${labels.taluka}: ${this.transliterateToEnglish(voter.taluka)}\n`);
    }
    if (voter?.houseNumber) {
      commands.push(`${labels.houseNumber}: ${voter.houseNumber}\n`);
    }
    
    // Address if available
    const address = voter?.pollingStationAddress || voter?.address;
    if (address && address.length > 0) {
      commands.push('--------------------------------\n');
      commands.push(`${labels.address}:\n`);
      const addrLines = this.wrapText(this.transliterateToEnglish(address), 32);
      addrLines.forEach(line => commands.push(`  ${line}\n`));
    }
    
    // ============================================
    // FAMILY MEMBERS IN MARATHI TRANSLITERATION (if any, limit to 3)
    // ============================================
    if (Array.isArray(voter?.family) && voter.family.length > 0) {
      commands.push('--------------------------------\n');
      commands.push('\x1B\x45\x01'); // Bold ON
      commands.push(`${labels.family} Sadasya (${voter.family.length}):\n`);
      commands.push('\x1B\x45\x00'); // Bold OFF
      
      voter.family.slice(0, 3).forEach((member, idx) => {
        commands.push(`  ${idx + 1}. ${this.transliterateToEnglish(member.name)}\n`);
      });
      
      if (voter.family.length > 3) {
        commands.push(`  ... ani ${voter.family.length - 3} adhik\n`);
      }
    }
    
    // ============================================
    // FOOTER SECTION IN MARATHI TRANSLITERATION
    // ============================================
    commands.push('================================\n');
    commands.push('\x1B\x61\x01'); // Center alignment
    
    // Contact info
    commands.push(`${labels.contact}: ${candidate.contact}\n`);
    commands.push(`${this.transliterateToEnglish(candidate.area)}\n`);
    
    // Date and time in Marathi format
    commands.push('--------------------------------\n');
    const now = new Date();
    commands.push(`${labels.date}: ${now.toLocaleDateString('mr-IN')}\n`);
    commands.push(`${labels.time}: ${now.toLocaleTimeString('mr-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })}\n`);
    
    // Thank you message in Marathi transliteration
    commands.push('--------------------------------\n');
    commands.push(`${labels.thankYou}!\n`);
    commands.push(`${labels.jaiHind}!\n`);
    
    // Feed paper and cut
    commands.push('\n\n\n'); // Extra line feeds
    commands.push('\x1D\x56\x41\x03'); // Partial cut
    
    return commands.join('');
  }

  // Generate proper Marathi text receipt for copying (with actual Marathi characters)
  generateMarathiTextReceipt(voter) {
    const candidate = this.marathiCandidateInfo;
    
    let receipt = `
════════════════════════════════
${candidate.party}
${candidate.name}
चिन्ह: ${candidate.electionSymbol}
${candidate.slogan}
════════════════════════════════

मतदार माहिती
────────────────────────────────
नाव: ${voter?.name || 'N/A'}
मतदार ओळखपत्र क्रमांक: ${voter?.voterId || 'N/A'}
बूथ क्रमांक: ${voter?.boothNumber || voter?.booth || 'N/A'}
भाग: ${voter?.listPart || voter?.part || '१'}
वय: ${voter?.age || '-'} | लिंग: ${voter?.gender || '-'}

────────────────────────────────
${voter?.voted ? `✓ मतदान पूर्ण` : `○ मतदान बाकी`}
════════════════════════════════

मतदान केंद्र:
${voter?.pollingStation || voter?.pollingStationAddress || 'N/A'}

${voter?.village ? `गाव: ${voter.village}` : ''}
${voter?.taluka ? `तालुका: ${voter.taluka}` : ''}
${voter?.houseNumber ? `मकान क्रमांक: ${voter.houseNumber}` : ''}

${Array.isArray(voter?.family) && voter.family.length > 0 ? `
────────────────────────────────
कुटुंब सदस्य (${voter.family.length}):
${voter.family.slice(0, 3).map((m, i) => `  ${i + 1}. ${m.name}`).join('\n')}
${voter.family.length > 3 ? `  ... आणि ${voter.family.length - 3} अधिक` : ''}
` : ''}

════════════════════════════════
संपर्क: ${candidate.contact}
${candidate.area}

तारीख: ${new Date().toLocaleDateString('mr-IN')}
वेळ: ${new Date().toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' })}
────────────────────────────────
धन्यवाद!
जय हिंद!
════════════════════════════════
    `.trim();
    
    return receipt;
  }

  // Bluetooth Connection Management
  async connectBluetooth() {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth is not supported in this browser. Please use Chrome or Edge on Android.');
    }

    try {
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
      this.printerDevice = device;
      this.printerCharacteristic = writeCharacteristic;
      this.bluetoothConnected = true;
      
      return { device, server, characteristic: writeCharacteristic };
      
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      this.bluetoothConnected = false;
      this.printerDevice = null;
      this.printerCharacteristic = null;
      
      if (error.name === 'NotFoundError') {
        throw new Error('No Bluetooth printer found. Please make sure:\n\n1. Your RPD-588 printer is turned ON\n2. Bluetooth is enabled on your device\n3. Printer is in pairing mode\n4. Printer is within range');
      } else if (error.name === 'SecurityError') {
        throw new Error('Bluetooth permissions denied. Please allow Bluetooth access in your browser settings.');
      } else {
        throw new Error(`Bluetooth connection failed: ${error.message}\n\nPlease ensure your printer is paired and try again.`);
      }
    }
  }

  // Split data into chunks of max 500 bytes
  splitDataIntoChunks(data, chunkSize = 500) {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const chunks = [];
    
    for (let i = 0; i < dataBytes.length; i += chunkSize) {
      const chunk = dataBytes.slice(i, i + chunkSize);
      chunks.push(chunk);
    }
    
    return chunks;
  }

  // Main print function with language selection
  async printReceipt(voter, language = 'english') {
    if (!voter) {
      throw new Error('No voter data available');
    }

    let connection;
    
    // Check if we already have a connected device
    if (this.isConnected()) {
      console.log('Using existing Bluetooth connection');
      connection = {
        device: this.printerDevice,
        characteristic: this.printerCharacteristic
      };
    } else {
      // Connect to Bluetooth if not already connected
      console.log('Establishing new Bluetooth connection');
      connection = await this.connectBluetooth();
      if (!connection) {
        throw new Error('Failed to connect to Bluetooth printer');
      }
    }

    const { characteristic } = connection;

    // Generate receipt content based on language selection
    let receiptText;
    if (language === 'marathi') {
      receiptText = this.generateMarathiESC_POSCommands(voter);
      console.log('Marathi receipt text generated');
    } else {
      receiptText = this.generateEnglishESC_POSCommands(voter);
      console.log('English receipt text generated');
    }
    
    console.log('Receipt text length:', receiptText.length);
    
    // Split data into chunks
    const chunks = this.splitDataIntoChunks(receiptText, 500);
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

    console.log(`All ${language} receipt chunks sent successfully`);
    return true;
  }

  // Disconnect Bluetooth
  disconnectBluetooth() {
    if (this.printerDevice && this.printerDevice.gatt.connected) {
      try {
        this.printerDevice.gatt.disconnect();
        console.log('Bluetooth disconnected');
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
    this.bluetoothConnected = false;
    this.printerDevice = null;
    this.printerCharacteristic = null;
  }
}