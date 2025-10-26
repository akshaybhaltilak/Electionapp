// VoterPrintService.js
// Full-featured print service: English text, Marathi text (UTF-8) and Marathi bitmap fallback.
// Usage:
//   const svc = new VoterPrintService();
//   await svc.printReceipt(voterObj, 'marathi'); // will pick bitmap if supportsUnicode=false

export class VoterPrintService {
  constructor() {
    this.printerDevice = null;
    this.printerCharacteristic = null;
    this.bluetoothConnected = false;

    // If true, service will try to print Marathi as UTF-8 text.
    // If false, the service will use bitmap printing for Marathi (recommended for many cheap printers).
    this.supportsUnicode = false;

    // Candidate & labels (editable)
    this.candidateInfo = {
      name: "Akshay Bhaltilak",
      party: "BJP",
      electionSymbol: "LOTUS",
      slogan: "Vikasit Bharat, Samruddha Maharashtra",
      contact: "9876543210",
      area: "Akola"
    };

    this.marathiCandidateInfo = {
      name: "अक्षय भालtilक".replace('til', 'टि') /* quick placeholder fix if copy artifacts */, // you may replace with exact name
      party: "भारतीय जनता पक्ष",
      electionSymbol: "कमळ",
      slogan: "विकसित भारत, समृद्ध महाराष्ट्र",
      contact: "९८७६५४३२१०",
      area: "अकोला"
    };

    this.englishLabels = {
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

    this.marathiLabels = {
      voterInformation: "मतदार माहिती",
      name: "नाव",
      voterId: "मतदार ओळखपत्र क्रमांक",
      serialNumber: "अनुक्रमांक",
      booth: "बूथ क्रमांक",
      pollingStation: "मतदान केंद्र",
      age: "वय",
      gender: "लिंग",
      part: "भाग",
      voted: "मतदान झाले",
      pending: "मतदान बाकी",
      details: "तपशील",
      address: "पत्ता",
      family: "कुटुंब",
      contact: "संपर्क",
      date: "तारीख",
      time: "वेळ",
      thankYou: "धन्यवाद",
      jaiHind: "जय हिंद",
      votingCompleted: "मतदान पूर्ण",
      pendingVoting: "मतदान बाकी",
      village: "गाव",
      taluka: "तालुका",
      houseNumber: "मकान क्रमांक"
    };
  }

  // --- UTILITIES ----------------------------------------------------------

  isConnected() {
    return this.bluetoothConnected && this.printerDevice && this.printerDevice.gatt && this.printerDevice.gatt.connected;
  }

  wrapText(text = '', maxWidth = 32) {
    if (!text) return [''];
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const w of words) {
      const candidate = current ? (current + ' ' + w) : w;
      if (candidate.length <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  transliterateToEnglish(text = '') {
    if (!text) return '';
    const map = {
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
    let out = text;
    Object.keys(map).forEach(k => {
      out = out.split(k).join(map[k]);
    });
    return out;
  }

  splitDataIntoChunks(dataString, chunkSize = 500) {
    // Use UTF-8 encoding so Marathi characters are preserved
    const encoder = new TextEncoder(); // utf-8
    const bytes = encoder.encode(dataString);
    const chunks = [];
    for (let i = 0; i < bytes.length; i += chunkSize) {
      chunks.push(bytes.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // write chunks to characteristic with appropriate method
  async writeChunks(characteristic, chunks) {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (characteristic.properties.write) {
        await characteristic.writeValue(chunk);
      } else if (characteristic.properties.writeWithoutResponse) {
        await characteristic.writeValueWithoutResponse(chunk);
      } else {
        throw new Error('Characteristic is not writable');
      }
      // small delay
      await new Promise(r => setTimeout(r, 50));
    }
  }

  // --- BLUETOOTH CONNECT / DISCONNECT ------------------------------------

  async connectBluetooth() {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not supported. Use Chrome/Edge on Android with Web Bluetooth enabled.');
    }
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'RPD' }, { namePrefix: 'RP' }, { namePrefix: 'BT' }
        ],
        optionalServices: [
          'device_information',
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '0000ff00-0000-1000-8000-00805f9b34fb'
        ]
      });

      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      let printerService = services.find(s => s.uuid.includes('ff00') || s.uuid.includes('ffe0') || s.uuid.includes('18f0')) || services[0];
      const characteristics = await printerService.getCharacteristics();
      let writeChar = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse) || characteristics[0];

      this.printerDevice = device;
      this.printerCharacteristic = writeChar;
      this.bluetoothConnected = true;

      // Auto-disconnect listener for safety
      device.addEventListener('gattserverdisconnected', () => {
        this.bluetoothConnected = false;
        this.printerDevice = null;
        this.printerCharacteristic = null;
      });

      return { device, server, characteristic: writeChar };
    } catch (err) {
      this.bluetoothConnected = false;
      this.printerDevice = null;
      this.printerCharacteristic = null;
      throw err;
    }
  }

  disconnectBluetooth() {
    try {
      if (this.printerDevice && this.printerDevice.gatt.connected) {
        this.printerDevice.gatt.disconnect();
      }
    } catch (e) { /* ignore */ }
    this.bluetoothConnected = false;
    this.printerDevice = null;
    this.printerCharacteristic = null;
  }

  // --- ESC/POS TEXT COMMANDS (English) ----------------------------------

  generateEnglishESC_POSCommands(voter) {
    const labels = this.englishLabels;
    const candidate = this.candidateInfo;
    const commands = [];

    commands.push('\x1B\x40'); // init
    commands.push('\x1B\x61\x01'); // center
    commands.push('\x1D\x21\x11'); // double big
    commands.push(`${candidate.party}\n`);
    commands.push('\x1D\x21\x00'); // normal
    commands.push(`${candidate.name}\n`);
    commands.push(`Symbol: ${candidate.electionSymbol}\n`);
    commands.push(`${candidate.slogan}\n`);
    commands.push('--------------------------------\n');

    commands.push('\x1B\x61\x00'); // left
    commands.push('\x1B\x45\x01'); // bold
    commands.push(`${labels.voterInformation}\n`);
    commands.push('\x1B\x45\x00');
    commands.push('--------------------------------\n');

    commands.push(`${labels.name}:\n  ${voter?.name || 'N/A'}\n\n`);
    commands.push(`${labels.voterId}:\n  ${voter?.voterId || 'N/A'}\n\n`);
    commands.push(`${labels.booth}: ${voter?.boothNumber || voter?.booth || 'N/A'}\n`);
    commands.push(`${labels.part}: ${voter?.listPart || voter?.part || '1'}\n`);
    commands.push(`${labels.age}: ${voter?.age || '-'} | ${labels.gender}: ${voter?.gender || '-'}\n`);
    commands.push('--------------------------------\n');

    commands.push('\x1B\x61\x01');
    commands.push('\x1B\x45\x01');
    commands.push(voter?.voted ? `✓ ${labels.votingCompleted}\n` : `● ${labels.pendingVoting}\n`);
    commands.push('\x1B\x45\x00');
    commands.push('--------------------------------\n');

    // Polling station wrap
    const ps = voter?.pollingStation || voter?.pollingStationAddress || '';
    if (ps) {
      commands.push(`${labels.pollingStation}:\n`);
      const psLines = this.wrapText(ps, 32);
      psLines.forEach(l => commands.push(`  ${l}\n`));
    }

    if (voter?.village) commands.push(`${labels.village}: ${voter.village}\n`);
    if (voter?.taluka) commands.push(`${labels.taluka}: ${voter.taluka}\n`);
    if (voter?.houseNumber) commands.push(`${labels.houseNumber}: ${voter.houseNumber}\n`);

    if (Array.isArray(voter?.family) && voter.family.length) {
      commands.push('--------------------------------\n');
      commands.push(`${labels.family} (${voter.family.length}):\n`);
      voter.family.slice(0, 3).forEach((m, i) => commands.push(`  ${i + 1}. ${m.name}\n`));
      if (voter.family.length > 3) commands.push(`  ... and ${voter.family.length - 3} more\n`);
    }

    commands.push('================================\n');
    commands.push('\x1B\x61\x01');
    commands.push(`${labels.contact}: ${candidate.contact}\n`);
    commands.push(`${candidate.area}\n`);
    commands.push('--------------------------------\n');
    const now = new Date();
    commands.push(`${labels.date}: ${now.toLocaleDateString('en-IN')}\n`);
    commands.push(`${labels.time}: ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit'})}\n`);
    commands.push('--------------------------------\n');
    commands.push(`${labels.thankYou}!\n`);
    commands.push(`${labels.jaiHind}!\n`);
    commands.push('\n\n\n');
    commands.push('\x1D\x56\x41\x03'); // cut

    return commands.join('');
  }

  // --- MARATHI TEXT ESC/POS (UTF-8) -------------------------------------

  generateMarathiESC_POSCommands(voter) {
    // This uses actual Devanagari text; ensure supportsUnicode=true and printer supports UTF-8
    const labels = this.marathiLabels;
    const c = this.marathiCandidateInfo;
    const commands = [];

    commands.push('\x1B\x40');
    commands.push('\x1B\x61\x01');
    commands.push('\x1D\x21\x11');
    commands.push(`${c.party}\n`);
    commands.push('\x1D\x21\x00');
    commands.push(`${c.name}\n`);
    commands.push('\x1B\x45\x00');
    commands.push(`चिन्ह: ${c.electionSymbol}\n`);
    commands.push(`${c.slogan}\n`);
    commands.push('--------------------------------\n');

    commands.push('\x1B\x61\x00');
    commands.push('\x1B\x45\x01');
    commands.push(`${labels.voterInformation}\n`);
    commands.push('\x1B\x45\x00');
    commands.push('--------------------------------\n');

    commands.push(`नाव:\n  ${voter?.name || 'N/A'}\n\n`);
    commands.push(`मतदार ओळखपत्र क्रमांक:\n  ${voter?.voterId || 'N/A'}\n\n`);
    commands.push(`बूथ क्रमांक: ${voter?.boothNumber || voter?.booth || 'N/A'}\n`);
    commands.push(`भाग: ${voter?.listPart || voter?.part || '१'}\n`);
    commands.push(`वय: ${voter?.age || '-'} | लिंग: ${voter?.gender || '-'}\n`);
    commands.push('--------------------------------\n');

    commands.push('\x1B\x61\x01');
    commands.push('\x1B\x45\x01');
    commands.push(voter?.voted ? `✓ ${labels.votingCompleted}\n` : `○ ${labels.pendingVoting}\n`);
    commands.push('\x1B\x45\x00');
    commands.push('--------------------------------\n');

    const ps = voter?.pollingStation || voter?.pollingStationAddress || '';
    if (ps) {
      commands.push(`मतदान केंद्र:\n`);
      this.wrapText(ps, 32).forEach(l => commands.push(`  ${l}\n`));
    }

    if (voter?.village) commands.push(`गाव: ${voter.village}\n`);
    if (voter?.taluka) commands.push(`तालुका: ${voter.taluka}\n`);
    if (voter?.houseNumber) commands.push(`मकान क्रमांक: ${voter.houseNumber}\n`);

    if (Array.isArray(voter?.family) && voter.family.length) {
      commands.push('--------------------------------\n');
      commands.push(`कुटुंब सदस्य (${voter.family.length}):\n`);
      voter.family.slice(0, 3).forEach((m, i) => commands.push(`  ${i + 1}. ${m.name}\n`));
      if (voter.family.length > 3) commands.push(`  ... आणि ${voter.family.length - 3} अधिक\n`);
    }

    commands.push('================================\n');
    commands.push('\x1B\x61\x01');
    commands.push(`संपर्क: ${c.contact}\n`);
    commands.push(`${c.area}\n`);
    commands.push('--------------------------------\n');
    const now = new Date();
    commands.push(`तारीख: ${now.toLocaleDateString('mr-IN')}\n`);
    commands.push(`वेळ: ${now.toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' })}\n`);
    commands.push('--------------------------------\n');
    commands.push(`धन्यवाद!\n`);
    commands.push(`जय हिंद!\n`);
    commands.push('\n\n\n');
    commands.push('\x1D\x56\x41\x03'); // cut

    return commands.join('');
  }

  // --- MARATHI BITMAP GENERATION (canvas -> ESC/POS raster) --------------

  // Draw text on canvas (multi-line) and return Uint8Array ESC/POS raster bytes (GS v 0).
  // widthPx sets canvas width (commonly 384 for 58mm printers). Adjust if printer uses different width.
  async generateMarathiBitmapESCCommands(voter, options = {}) {
    const widthPx = options.widthPx || 384; // typical for 58mm printers
    const padding = 10;
    const lineHeight = 28;
    const fontFamily = options.fontFamily || "Noto Sans Devanagari, Arial, sans-serif"; // recommend Noto Sans Devanagari
    const fontSize = options.fontSize || 22;

    // Build text lines
    const c = this.marathiCandidateInfo;
    const lines = [];
    lines.push(c.party);
    lines.push(c.name);
    lines.push(`चिन्ह: ${c.electionSymbol}`);
    lines.push(c.slogan);
    lines.push('--------------------------------');
    lines.push('मतदार माहिती');
    lines.push('--------------------------------');
    lines.push(`नाव: ${voter?.name || 'N/A'}`);
    lines.push(`मतदार ओळखपत्र क्रमांक: ${voter?.voterId || 'N/A'}`);
    lines.push(`बूथ क्रमांक: ${voter?.boothNumber || 'N/A'}`);
    lines.push(`भाग: ${voter?.listPart || '१'}`);
    lines.push(`वय: ${voter?.age || '-'} | लिंग: ${voter?.gender || '-'}`);
    lines.push(voter?.voted ? '✓ मतदान पूर्ण' : '○ मतदान बाकी');
    lines.push('--------------------------------');
    const ps = voter?.pollingStation || voter?.pollingStationAddress || '';
    if (ps) {
      lines.push('मतदान केंद्र:');
      // split polling station into chunks about 30-35 chars
      const psChunks = this.wrapText(ps, 32);
      lines.push(...psChunks);
    }
    if (voter?.village) lines.push(`गाव: ${voter.village}`);
    if (voter?.taluka) lines.push(`तालुका: ${voter.taluka}`);
    if (voter?.houseNumber) lines.push(`मकान क्रमांक: ${voter.houseNumber}`);
    if (Array.isArray(voter?.family) && voter.family.length) {
      lines.push('--------------------------------');
      lines.push(`कुटुंब सदस्य (${voter.family.length}):`);
      voter.family.slice(0, 3).forEach((m, i) => lines.push(`  ${i + 1}. ${m.name}`));
      if (voter.family.length > 3) lines.push(`  ... आणि ${voter.family.length - 3} अधिक`);
    }
    lines.push('================================');
    lines.push(`संपर्क: ${c.contact}`);
    lines.push(c.area);
    const now = new Date();
    lines.push(`तारीख: ${now.toLocaleDateString('mr-IN')}`);
    lines.push(`वेळ: ${now.toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' })}`);
    lines.push('धन्यवाद!');
    lines.push('जय हिंद!');

    // Create canvas
    const canvas = document.createElement('canvas');
    // compute height
    const canvasHeight = padding * 2 + lines.length * lineHeight;
    canvas.width = widthPx;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw black text
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';
    ctx.font = `${fontSize}px ${fontFamily}`;

    let y = padding;
    for (const line of lines) {
      // If a line is very long, perform simple wrap based on characters
      const maxChars = Math.floor((widthPx - padding * 2) / (fontSize * 0.6)); // approx
      if (line.length > maxChars) {
        const wrapped = this.wrapText(line, maxChars);
        for (const wline of wrapped) {
          ctx.fillText(wline, padding, y);
          y += lineHeight;
        }
      } else {
        ctx.fillText(line, padding, y);
        y += lineHeight;
      }
    }

    // Convert to monochrome bitmap (threshold)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const mono = new Uint8ClampedArray(canvas.width * canvas.height);
    for (let i = 0, p = 0; i < imageData.data.length; i += 4, p++) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      // luminance
      const lum = (0.299 * r + 0.587 * g + 0.114 * b);
      mono[p] = lum < 200 ? 1 : 0; // black threshold
    }

    // Convert monochrome to ESC/POS raster (GS v 0)
    const width = canvas.width;
    const height = canvas.height;
    const bytesPerRow = Math.ceil(width / 8);
    const rasterData = new Uint8Array(bytesPerRow * height);

    for (let yRow = 0; yRow < height; yRow++) {
      for (let x = 0; x < width; x++) {
        const pixel = mono[yRow * width + x];
        if (pixel) {
          const byteIndex = yRow * bytesPerRow + Math.floor(x / 8);
          const bitIndex = 7 - (x % 8);
          rasterData[byteIndex] |= (1 << bitIndex);
        }
      }
    }

    // Build ESC/POS GS v 0 header
    // GS v 0: 1D 76 30 m xL xH yL yH d...
    // m = 0 (normal)
    const header = [0x1D, 0x76, 0x30, 0x00];
    const xL = bytesPerRow & 0xFF;
    const xH = (bytesPerRow >> 8) & 0xFF;
    const yL = height & 0xFF;
    const yH = (height >> 8) & 0xFF;

    const out = new Uint8Array(header.length + 4 + rasterData.length + 10);
    let offset = 0;
    out.set(header, offset); offset += header.length;
    out[offset++] = xL; out[offset++] = xH; out[offset++] = yL; out[offset++] = yH;
    out.set(rasterData, offset); offset += rasterData.length;

    // Add few line feeds and cut at end
    out[offset++] = 0x0A; out[offset++] = 0x0A; out[offset++] = 0x0A;
    // Partial cut (if supported) - GS V A n  => 1D 56 41 n
    out[offset++] = 0x1D; out[offset++] = 0x56; out[offset++] = 0x41; out[offset++] = 0x03;

    return out.slice(0, offset); // trimmed
  }

  // --- MAIN PRINT ENTRY POINT --------------------------------------------

  // language: 'english' or 'marathi'
  async printReceipt(voter, language = 'english') {
    if (!voter) throw new Error('No voter data provided');

    // ensure connection
    let connection;
    if (this.isConnected()) {
      connection = { device: this.printerDevice, characteristic: this.printerCharacteristic };
    } else {
      connection = await this.connectBluetooth();
    }
    const characteristic = connection.characteristic;

    // Choose method
    if (language === 'english') {
      const text = this.generateEnglishESC_POSCommands(voter);
      const chunks = this.splitDataIntoChunks(text, 500);
      await this.writeChunks(characteristic, chunks);
      return true;
    }

    // marathi
    if (this.supportsUnicode) {
      // attempt text-based UTF-8 printing
      const text = this.generateMarathiESC_POSCommands(voter);
      const chunks = this.splitDataIntoChunks(text, 500);
      try {
        await this.writeChunks(characteristic, chunks);
        return true;
      } catch (err) {
        // fallback to bitmap if failure
        console.warn('UTF-8 Marathi printing failed; falling back to bitmap', err);
      }
    }

    // Bitmap fallback
    const imgCommands = await this.generateMarathiBitmapESCCommands(voter, { widthPx: 384, fontFamily: 'Noto Sans Devanagari, Arial', fontSize: 22 });
    // split binary Uint8Array into chunks of ~490 bytes
    const chunkSize = 490;
    for (let offset = 0; offset < imgCommands.length; offset += chunkSize) {
      const slice = imgCommands.slice(offset, offset + chunkSize);
      if (characteristic.properties.write) {
        await characteristic.writeValue(slice);
      } else if (characteristic.properties.writeWithoutResponse) {
        await characteristic.writeValueWithoutResponse(slice);
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return true;
  }
}
