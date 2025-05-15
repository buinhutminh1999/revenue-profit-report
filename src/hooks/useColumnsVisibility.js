import { useState, useEffect } from "react";

export default function useColumnsVisibility(columnsAll) {
  const keyList = columnsAll.map((c) => c.key);
  const [visibility, setVisibility] = useState(() => {
    const saved = localStorage.getItem("columnsVisibility");
    if (saved) {
      try {
        const obj = JSON.parse(saved);
        return keyList.reduce((acc, key) => {
          acc[key] = typeof obj[key] === "boolean" ? obj[key] : true;
          return acc;
        }, {});
      } catch {
        /* ignore */
      }
    }
    return keyList.reduce((acc, key) => ((acc[key] = true), acc), {});
  });

  useEffect(() => {
    localStorage.setItem("columnsVisibility", JSON.stringify(visibility));
  }, [visibility]);

  const toggle = (key) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return { visibility, toggle };
}