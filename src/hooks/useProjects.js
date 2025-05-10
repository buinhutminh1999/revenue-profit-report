import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase-config';

/* ---------- data-fetching hooks ---------- */
export function useProjects() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    let mounted = true;
    getDocs(collection(db, "projects")).then((snap) => {
      if (!mounted) return;
      const active = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            isClosed: !!data.isClosed,
            closedFrom: data.closedFrom ?? null,
          };
        })
        .filter((p) => !p.isClosed);      // ← chỉ giữ project chưa đóng
      setProjects(active);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return projects;
}
