import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, ref, onValue, off } from '../Firebase/config';

const ListModePage = () => {
  const { mode } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const process = useCallback((raw) => {
    if (!raw) return [];
    return Object.entries(raw).map(([k, v]) => ({
      id: k,
      name: v.name || v.Name || 'Unknown',
      voterId: v.voterId || '',
      boothNumber: v.boothNumber || v.booth || '',
      pollingStationAddress: v.pollingStationAddress || v.pollingStation || v.address || '',
      village: v.village || v.Village || '',
      age: v.age || ''
    }));
  }, []);

  useEffect(() => {
    setLoading(true);
    const r = ref(db, 'voters');
    onValue(r, (snap) => {
      if (snap.exists()) {
        let list = process(snap.val());
        switch (mode) {
          case 'name':
            list.sort((a,b)=> (a.name||'').localeCompare(b.name||''));
            break;
          case 'serial':
            list.sort((a,b)=> (a.id||'').localeCompare(b.id||'', undefined, { numeric: true }));
            break;
          case 'village':
            list.sort((a,b)=> (a.village||'').localeCompare(b.village||''));
            break;
          case 'pollingStationAddress':
            list.sort((a,b)=> (a.pollingStationAddress||'').localeCompare(b.pollingStationAddress||''));
            break;
          case 'age':
            list.sort((a,b)=> (parseInt(a.age)||0) - (parseInt(b.age)||0));
            break;
          case 'mobile':
            list = list.filter(i => i.voterId || i.phone);
            break;
          case 'withoutMobile':
            list = list.filter(i => !i.phone);
            break;
          default:
            break;
        }
        setItems(list);
      } else {
        setItems([]);
      }
      setLoading(false);
    });

    return () => off(r);
  }, [mode, process]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white p-4 shadow sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded bg-gray-100">Back</button>
          <h1 className="text-lg font-semibold">List: {mode}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {loading ? <p>Loading...</p> : (
          <ul className="divide-y bg-white rounded-lg shadow">
            {items.map((it, idx) => (
              <li key={it.id} className="p-3 flex justify-between items-center">
                <div className="min-w-0">
                  <div className="font-medium truncate">{idx+1}. {it.name}</div>
                  <div className="text-xs text-gray-500 truncate">{it.village || it.pollingStationAddress}</div>
                </div>
                <div className="text-xs text-gray-600 ml-3">{it.boothNumber}</div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default ListModePage;
