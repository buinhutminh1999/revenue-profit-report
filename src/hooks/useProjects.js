import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase-config";

/**
 * Hook lấy danh sách projects, cho phép lọc theo trường `type`
 *
 * @param {string} filteredType - Giá trị `type` muốn lọc ("Nhà máy", "Công trình", ...). Để trống => không lọc.
 * @returns {Array} Mảng các project { id, ...data }
 */
export function useProjects(filteredType = "") {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    // Tham chiếu tới collection projects
    const colRef = collection(db, "projects");

    // Nếu có giá trị filteredType, thêm điều kiện where
    const q = filteredType
      ? query(colRef, where("type", "==", filteredType))
      : colRef;

    // Lắng nghe realtime snapshot
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProjects(list);
    });

    return () => unsub();
  }, [filteredType]);

  return projects;
}
