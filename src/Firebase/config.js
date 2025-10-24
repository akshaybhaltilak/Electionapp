import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, get, query, orderByChild, equalTo, onValue, off, update, remove } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAjWIDIXvYg83EDH09I-1ef_TRlgoVJnWA",
  authDomain: "jannetaa-2bc82.firebaseapp.com",
  databaseURL: "https://jannetaa-2bc82-default-rtdb.firebaseio.com",
  projectId: "jannetaa-2bc82",
  storageBucket: "jannetaa-2bc82.firebasestorage.app",
  messagingSenderId: "839872960195",
  appId: "1:839872960195:web:c840f64a1007fee235b476",
  databaseURL:"https://jannetaa-2bc82-default-rtdb.firebaseio.com/"
};


const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);

// Export all Firebase database methods
export { ref, set, push, get, query, orderByChild, equalTo, onValue, off, update, remove };

// Booth Management Functions
export const boothAPI = {
  // Get all booths in real-time
  getBoothsRealtime: (callback) => {
    const boothsRef = ref(db, 'booths');
    const unsubscribe = onValue(boothsRef, (snapshot) => {
      if (snapshot.exists()) {
        const boothsData = [];
        snapshot.forEach((childSnapshot) => {
          boothsData.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
        callback(boothsData);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error('Error fetching booths:', error);
      callback([], error);
    });
    
    return unsubscribe;
  },

  // Get single booth by ID
  getBoothById: async (boothId) => {
    try {
      const boothRef = ref(db, `booths/${boothId}`);
      const snapshot = await get(boothRef);
      if (snapshot.exists()) {
        return { id: boothId, ...snapshot.val() };
      }
      return null;
    } catch (error) {
      console.error('Error getting booth:', error);
      throw error;
    }
  },

  // Create or update booth
  saveBooth: async (boothData, boothId = null) => {
    try {
      if (boothId) {
        // Update existing booth
        const boothRef = ref(db, `booths/${boothId}`);
        await update(boothRef, boothData);
        return boothId;
      } else {
        // Create new booth
        const boothsRef = ref(db, 'booths');
        const newBoothRef = push(boothsRef);
        await set(newBoothRef, {
          ...boothData,
          createdAt: new Date().toISOString(),
          status: 'active'
        });
        return newBoothRef.key;
      }
    } catch (error) {
      console.error('Error saving booth:', error);
      throw error;
    }
  },

  // Update booth status
  updateBoothStatus: async (boothId, status) => {
    try {
      const boothRef = ref(db, `booths/${boothId}`);
      await update(boothRef, { status });
    } catch (error) {
      console.error('Error updating booth status:', error);
      throw error;
    }
  },

  // Add karyakarta to booth
  addKaryakarta: async (boothId, karyakartaData) => {
    try {
      const karyakartasRef = ref(db, `booths/${boothId}/karyakartas`);
      const newKaryakartaRef = push(karyakartasRef);
      await set(newKaryakartaRef, {
        ...karyakartaData,
        assignedAt: new Date().toISOString()
      });
      return newKaryakartaRef.key;
    } catch (error) {
      console.error('Error adding karyakarta:', error);
      throw error;
    }
  },

  // Update karyakarta
  updateKaryakarta: async (boothId, karyakartaId, updates) => {
    try {
      const karyakartaRef = ref(db, `booths/${boothId}/karyakartas/${karyakartaId}`);
      await update(karyakartaRef, updates);
    } catch (error) {
      console.error('Error updating karyakarta:', error);
      throw error;
    }
  },

  // Remove karyakarta from booth
  removeKaryakarta: async (boothId, karyakartaId) => {
    try {
      const karyakartaRef = ref(db, `booths/${boothId}/karyakartas/${karyakartaId}`);
      await remove(karyakartaRef);
    } catch (error) {
      console.error('Error removing karyakarta:', error);
      throw error;
    }
  },

  // Get voters by booth number
  getVotersByBooth: async (boothNumber) => {
    try {
      const votersRef = ref(db, 'voters');
      const boothQuery = query(votersRef, orderByChild('boothNumber'), equalTo(boothNumber));
      const snapshot = await get(boothQuery);
      
      if (snapshot.exists()) {
        const voters = [];
        snapshot.forEach((childSnapshot) => {
          voters.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
        return voters;
      }
      return [];
    } catch (error) {
      console.error('Error getting voters by booth:', error);
      throw error;
    }
  },

  // Update voter count for a booth
  updateBoothVoterCount: async (boothId, voterCount) => {
    try {
      const boothRef = ref(db, `booths/${boothId}`);
      await update(boothRef, { voterCount });
    } catch (error) {
      console.error('Error updating voter count:', error);
      throw error;
    }
  },

  // Update surveyed count for a booth
  updateBoothSurveyedCount: async (boothId, surveyedCount) => {
    try {
      const boothRef = ref(db, `booths/${boothId}`);
      await update(boothRef, { surveyedCount });
    } catch (error) {
      console.error('Error updating surveyed count:', error);
      throw error;
    }
  }
};

// Voter Management Functions (existing - kept for compatibility)
export const voterAPI = {
  loadVotersInChunks: async (setLoading, setVoters, setTotalCount, BATCH_SIZE = 1000) => {
    setLoading(true);
    const allVoters = [];
    
    try {
      const votersRef = ref(db, 'voters');
      const snapshot = await get(votersRef);
      
      if (snapshot.exists()) {
        let count = 0;
        snapshot.forEach((childSnapshot) => {
          if (count < BATCH_SIZE) {
            const raw = childSnapshot.val();
            allVoters.push({
              id: childSnapshot.key,
              name: raw.name || raw.Name || '',
              voterId: raw.voterId || raw.VoterId || '',
              boothNumber: raw.boothNumber,
              pollingStationAddress: raw.pollingStationAddress,
              age: raw.age,
              gender: raw.gender,
              village: raw.village,
              phone: raw.phone
            });
            count++;
          }
        });
        
        setVoters(allVoters);
        setTotalCount(allVoters.length);
      }
    } catch (error) {
      console.error('Error loading voters:', error);
    } finally {
      setLoading(false);
    }
  },

  // Search voters with filters
  searchVoters: async (filters = {}) => {
    try {
      const votersRef = ref(db, 'voters');
      const snapshot = await get(votersRef);
      
      if (snapshot.exists()) {
        let voters = [];
        snapshot.forEach((childSnapshot) => {
          const voter = {
            id: childSnapshot.key,
            ...childSnapshot.val()
          };
          
          // Apply filters
          let matches = true;
          if (filters.name && !voter.name?.toLowerCase().includes(filters.name.toLowerCase())) {
            matches = false;
          }
          if (filters.boothNumber && voter.boothNumber !== filters.boothNumber) {
            matches = false;
          }
          if (filters.village && voter.village !== filters.village) {
            matches = false;
          }
          if (filters.phone && voter.phone !== filters.phone) {
            matches = false;
          }
          if (filters.gender && voter.gender !== filters.gender) {
            matches = false;
          }
          if (filters.age && voter.age != filters.age) {
            matches = false;
          }
          
          if (matches) {
            voters.push(voter);
          }
        });
        
        return voters;
      }
      return [];
    } catch (error) {
      console.error('Error searching voters:', error);
      throw error;
    }
  }
};

// Initialize sample booth data if needed
export const initializeSampleBooths = async () => {
  try {
    const boothsRef = ref(db, 'booths');
    const snapshot = await get(boothsRef);
    
    if (!snapshot.exists()) {
      const sampleBooths = {
        booth1: {
          boothNumber: "001",
          location: "Main Street Primary School",
          pollingStationAddress: "123 Main Street, Downtown",
          village: "Downtown",
          voterCount: 1250,
          surveyedCount: 320,
          status: "active",
          createdAt: new Date().toISOString(),
          karyakartas: {
            kary1: {
              name: "Rajesh Kumar",
              phone: "9876543210",
              role: "supervisor",
              assignedAt: new Date().toISOString()
            }
          }
        },
        booth2: {
          boothNumber: "002",
          location: "Community Hall",
          pollingStationAddress: "456 Oak Avenue, Suburbia",
          village: "Suburbia",
          voterCount: 980,
          surveyedCount: 150,
          status: "active",
          createdAt: new Date().toISOString(),
          karyakartas: {}
        }
      };
      
      await set(boothsRef, sampleBooths);
      console.log('Sample booths initialized');
    }
  } catch (error) {
    console.error('Error initializing sample booths:', error);
  }
};