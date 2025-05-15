import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase-config';
import { toNum } from '../utils/numberUtils';
import {pickDirectCostMap} from '../utils/pickDirectCostMap';

/**
 * Hook realtime lấy dữ liệu dự án hàng loạt (revenue + directCostMap) từ Firestore
 * projects: array of { id }
 * year, quarter: string/number
 */
export function useProjectData(projects, year, quarter) {
  const [projData, setProjData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projects?.length) {
      setProjData({});
      setLoading(false);
      return;
    }

    setLoading(true);
    // Tạo listener realtime cho mỗi project
    const unsubscribes = projects.map((p) => {
      const ref = doc(db, 'projects', p.id, 'years', String(year), 'quarters', quarter);
      return onSnapshot(ref, (snap) => {
        const data = snap.data() || {};
        setProjData((prev) => ({
          ...prev,
          [p.id]: {
            overallRevenue: toNum(data.overallRevenue),
            directCostMap: pickDirectCostMap(data),
          },
        }));
        setLoading(false);
      });
    });

    // Cleanup khi unmount hoặc params thay đổi
    return () => unsubscribes.forEach((unsub) => unsub());
  }, [projects, year, quarter]);

  return { projData, loading };
}
