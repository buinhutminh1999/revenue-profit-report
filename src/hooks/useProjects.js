import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../services/firebase-config";

/**
 * Hook to get real-time projects list
 * 
 * @param {string} filterType - Optional project type filter
 * @returns {Object} { projects, isLoading, error }
 */
export function useProjects(filterType = "") {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    const colRef = collection(db, "projects");

    let q = query(colRef, orderBy("name", "asc"));

    if (filterType) {
      q = query(colRef, where("type", "==", filterType), orderBy("name", "asc"));
    }

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          // Ensure revenueHSKH defaults to 0 if missing
          revenueHSKH: doc.data().revenueHSKH || 0,
        }));
        setProjects(list);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching projects:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [filterType]);

  return { projects, isLoading, error };
}
