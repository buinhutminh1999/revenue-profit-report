// src/hooks/usePrevQuarterData.js

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase-config";
import { toNum } from "../utils/numberUtils";
import { getPrevQuarter } from "../utils/quarterHelpers";

export const COL_QUARTER = "costAllocationsQuarter";
export const salaryRowId = "salary-cost";

export function usePrevQuarterData(year, quarter, mainRows) {
  const [extraRows, setExtraRows] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // 1. Lấy tổng lương cố định của quý này
      const fixedSnap = await getDoc(
        doc(db, "costAllocations", `${year}_${quarter}`)
      );
      const totalThiCongFixed = fixedSnap.exists()
        ? toNum(fixedSnap.data().totalThiCongFixed ?? 0)
        : 0;

      // 2. Lấy document quý hiện tại đã lưu
      const currRef = doc(db, COL_QUARTER, `${year}_${quarter}`);
      const currSnap = await getDoc(currRef);
      const savedRows = currSnap.exists() ? currSnap.data().mainRows || [] : [];

      // 3. Lấy dữ liệu quý trước để tính carryOver
      const { year: py, quarter: pq } = getPrevQuarter(year, quarter);
      const prevSnap = await getDoc(doc(db, COL_QUARTER, `${py}_${pq}`));
      const prevRows = prevSnap.exists() ? prevSnap.data().mainRows || [] : [];
      const prevCumById = {};
      const prevCumByLabel = {};
      prevRows.forEach(r => {
        if (!r.fixed) {
          const v = toNum(r.cumCurrent);
          prevCumById[r.id] = v;
          prevCumByLabel[(r.label ?? r.name ?? "").trim().toLowerCase()] = v;
        }
      });

      // 4. Dùng mainRows + prevCum để build baseRows
      const latest = (mainRows || []).filter(r => !r.fixed);
      const latestIds = new Set(latest.map(r => r.id));
      let baseRows = [];

      if (currSnap.exists()) {
        // reuse những rows còn trong latest
        baseRows = savedRows
          .filter(r => !r.fixed && latestIds.has(r.id))
          .map(r => ({
            id: r.id,
            label: r.label ?? r.name ?? "",
            pct: r.pct ?? toNum(r.percentThiCong) ?? 0,
            carryOver: toNum(r.carryOver),
            used: toNum(r.used),
            allocated: toNum(r.allocated ?? r.thiCongValue ?? 0),
            cumCurrent: toNum(r.cumCurrent),
            cumQuarterOnly: toNum(r.cumQuarterOnly),
          }));

        // thêm row mới nếu mainRows có nhưng savedRows chưa có
        latest.forEach(r => {
          if (!baseRows.some(b => b.id === r.id)) {
            const carry =
              prevCumById[r.id] ??
              prevCumByLabel[(r.label ?? r.name ?? "").trim().toLowerCase()] ??
              0;
            const used = toNum(r.used);
            const alloc = toNum(r.thiCongValue);
            baseRows.push({
              id: r.id,
              label: r.label ?? r.name ?? "",
              pct: 0,
              carryOver: carry,
              used,
              allocated: alloc,
              cumCurrent: used - alloc + carry,
              cumQuarterOnly: used - alloc,
            });
          }
        });
      } else {
        // lần đầu khởi tạo
        baseRows = latest.map(r => {
          const carry =
            prevCumById[r.id] ??
            prevCumByLabel[(r.label ?? r.name ?? "").trim().toLowerCase()] ??
            0;
          const used = toNum(r.used);
          const alloc = toNum(r.thiCongValue);
          return {
            id: r.id,
            label: r.label ?? r.name ?? "",
            pct: 0,
            carryOver: carry,
            used,
            allocated: alloc,
            cumCurrent: used - alloc + carry,
            cumQuarterOnly: used - alloc,
          };
        });
      }

      // 5. Đảm bảo có row "+ Chi phí lương" và merge pct đã lưu + cập nhật allocated
      const savedSalary = savedRows.find(r => r.id === salaryRowId);
      let finalRows = baseRows.filter(r => r.id !== salaryRowId);
      finalRows.unshift({
        id: salaryRowId,
        label: "+ Chi phí lương",
        pct: savedSalary?.pct ?? 0,
        carryOver: 0,
        used: 0,
        allocated: totalThiCongFixed,
        cumCurrent: 0,
        cumQuarterOnly: 0,
        fixed: false,
      });

      // 6. Ghi lại nếu cần và đẩy vào state
      await setDoc(
        currRef,
        { mainRows: finalRows, updated_at: serverTimestamp() },
        { merge: true }
      );
      if (mounted) setExtraRows(finalRows);
    })();

    return () => {
      mounted = false;
    };
  }, [year, quarter, mainRows]);

  return [extraRows, setExtraRows];
}
