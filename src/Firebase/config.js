import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, get, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Add this to your Firebase config
const loadVotersInChunks = async () => {
  setLoading(true);
  const allVoters = [];
  const BATCH_SIZE = 1000;
  
  try {
    const votersRef = ref(db, 'voters');
    const snapshot = await get(votersRef);
    
    if (snapshot.exists()) {
      let count = 0;
      snapshot.forEach((childSnapshot) => {
        if (count < BATCH_SIZE) { // Only load first 1000 records
          const raw = childSnapshot.val();
          allVoters.push({
            id: childSnapshot.key,
            name: raw.name || raw.Name || '',
            voterId: raw.voterId || raw.VoterId || '',
            boothNumber: raw.boothNumber,
            pollingStationAddress: raw.pollingStationAddress
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
};

const firebaseConfig = {
    apiKey: "AIzaSyC44TAT32_FyPYifRZkztHJ1vlMHuJh1i4",
    authDomain: "electionappdemo-951a5.firebaseapp.com",
    projectId: "electionappdemo-951a5",
    storageBucket: "electionappdemo-951a5.firebasestorage.app",
    messagingSenderId: "159994830645",
    appId: "1:159994830645:web:618f895cc3698f7989f67c",
    databaseURL: "https://electionappdemo-951a5-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, set, push, get, query, orderByChild, equalTo, onValue };
export const storage = getStorage(app);