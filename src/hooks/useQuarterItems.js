// hooks/useQuarterItems.js
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";
import { generateUniqueId } from "../utils/idUtils";
import { calcAllFields } from "../utils/calcUtils";

export function useQuarterItems({ projectId, year, quarter, overallRevenue, projectTotalAmount }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getDoc(doc(db, "projects", projectId, "years", year, "quarters", quarter))
      .then(snap => {
        const data = snap.exists() ? snap.data().items || [] : [];
        data.forEach(r => {
          r.id = r.id || generateUniqueId();
          calcAllFields(r, { overallRevenue, projectTotalAmount });
        });
        setItems(data);
      })
      .catch(e => setError(e))
      .finally(() => setLoading(false));
  }, [projectId, year, quarter, overallRevenue, projectTotalAmount]);

  const save = async (newItems, overall) => {
    setLoading(true);
    try {
      await setDoc(doc(db, "projects", projectId, "years", year, "quarters", quarter), {
        items: newItems,
        overallRevenue: overall,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  return { items, setItems, loading, error, save };
}
