// hooks/useProjectMeta.js
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";

export function useProjectMeta(projectId) {
  const [projectTotal, setProjectTotal] = useState("0");
  const [error, setError] = useState(null);
  useEffect(() => {
    getDoc(doc(db, "projects", projectId))
      .then(snap => snap.exists() && setProjectTotal(snap.data().totalAmount || "0"))
      .catch(e => setError(e));
  }, [projectId]);
  return { projectTotal, error };
}
