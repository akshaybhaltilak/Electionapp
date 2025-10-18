import * as XLSX from 'xlsx';
import { db, ref, get } from '../Firebase/config';

export const exportToExcel = async (searchTerm, filters, password) => {
  // Verify password
  if (password !== 'admin123') {
    throw new Error('Invalid password. Please try again.');
  }

  try {
    const votersRef = ref(db, 'voters');
    const snapshot = await get(votersRef);
    
    if (!snapshot.exists()) {
      throw new Error('No data available to export');
    }

    const allVoters = [];
    snapshot.forEach((childSnapshot) => {
      const raw = childSnapshot.val();
      allVoters.push({
        id: childSnapshot.key,
        name: raw.name || raw.Name || '',
        voterId: raw.voterId || raw.VoterId || '',
        boothNumber: raw.boothNumber,
        pollingStationAddress: raw.pollingStationAddress,
        age: raw.age,
        gender: raw.gender
      });
    });

    // Apply current filters for export
    let filteredVoters = allVoters;
    if (searchTerm.trim()) {
      const terms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
      filteredVoters = allVoters.filter(voter => {
        const searchText = `${voter.name} ${voter.voterId}`.toLowerCase();
        return terms.every(term => searchText.includes(term));
      });
    }

    if (filters.boothNumber) {
      filteredVoters = filteredVoters.filter(voter => 
        voter.boothNumber && voter.boothNumber.toString().includes(filters.boothNumber)
      );
    }

    if (filters.pollingStationAddress) {
      filteredVoters = filteredVoters.filter(voter =>
        voter.pollingStationAddress && 
        voter.pollingStationAddress.toLowerCase().includes(filters.pollingStationAddress.toLowerCase())
      );
    }

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(filteredVoters.map(voter => ({
      'Voter ID': voter.voterId,
      'Name': voter.name,
      'Booth Number': voter.boothNumber,
      'Polling Station': voter.pollingStationAddress,
      'Age': voter.age,
      'Gender': voter.gender
    })));

    // Create workbook and export
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Voters Data');
    
    const fileName = `voters-data-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    return fileName;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data. Please try again.');
  }
};