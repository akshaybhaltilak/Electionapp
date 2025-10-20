import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Firebase exports assumed to come from ../Firebase/config
import { db, ref, get, set, update } from '../Firebase/config';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Icons
import { FiArrowLeft, FiDownload, FiPrinter, FiMessageCircle, FiMail, FiHash, FiEdit, FiX, FiSearch } from 'react-icons/fi';
import { FaWhatsapp, FaRegFilePdf } from 'react-icons/fa';
import { GiVote } from 'react-icons/gi';

// Features added in this update:
// 1) Family: ability to Remove a family member and View full details of a member (modal)
// 2) Survey: shows input fields for "info" attributes that are missing in the voter record

const FullVoterDetails = () => {
  const { voterId } = useParams();
  const navigate = useNavigate();

  const [voter, setVoter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

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

  // Load voters in chunks (first N records) to avoid huge downloads
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

  // --- share/download/print preserved ---
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
  const printVoterDetails = () => { const el = document.getElementById('voter-receipt'); const w = window.open('','_blank'); w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${el.innerHTML}</body></html>`); w.document.close(); setTimeout(()=>{ w.print(); w.close(); }, 400); };

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

        <div id="voter-receipt" className="bg-white rounded-2xl -mt-6 shadow-lg overflow-hidden border border-gray-100">
          <div className="p-4 pt-6">
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

                    {/* Show the missing info fields only */}
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

        <div className="fixed left-4 right-4 bottom-4 max-w-md mx-auto">
          <div className="bg-white p-3 rounded-2xl shadow-lg flex gap-2 border">
            <button onClick={shareOnWhatsApp} className="flex-1 bg-green-500 text-white py-2 rounded flex items-center justify-center gap-2"><FaWhatsapp />WhatsApp</button>
            <button onClick={shareViaSMS} className="flex-1 bg-blue-500 text-white py-2 rounded flex items-center justify-center gap-2"><FiMessageCircle />SMS</button>
            <button onClick={downloadAsImage} className="bg-purple-600 text-white p-2 rounded flex items-center gap-2"><FiDownload /></button>
            <button onClick={downloadAsPDF} className="bg-red-600 text-white p-2 rounded flex items-center gap-2"><FaRegFilePdf /></button>
            <button onClick={printVoterDetails} className="bg-indigo-600 text-white p-2 rounded flex items-center gap-2"><FiPrinter /></button>
          </div>
        </div>

        {/* Family modal */}
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

        {/* Member detail modal */}
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
