import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";
import { toNum } from "../utils/numberUtils";
import { getPrevQuarter } from "../utils/quarterHelpers";

export const COL_QUARTER = "costAllocationsQuarter";
export const salaryRowId  = "salary-cost";

/**
 * @param {number} year 
 * @param {string} quarter 
 * @param {Array} mainRows    // dữ liệu chính từ hook useQuarterMainData
 * @param {string} typeFilter // "Thi công" | "Nhà máy" | "KH-ĐT"
 */
export function usePrevQuarterData(year, quarter, mainRows, typeFilter) {
  const [extraRows, setExtraRows] = useState([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // 1️⃣ Lấy document costAllocations để đọc 3 tổng cố định
      const fxSnap = await getDoc(
        doc(db, "costAllocations", `${year}_${quarter}`)
      );
      const data = fxSnap.exists() ? fxSnap.data() : {};

      // 2️⃣ Chuyển về số và gom vào object theo type
      const totals = {
        "Thi công": toNum(data.totalThiCongFixed  ?? 0),
        "Nhà máy":  toNum(data.totalNhaMayFixed   ?? 0),
        "KH-ĐT":    toNum(data.totalKhdtFixed     ?? 0),
      };
      const totalFixed = totals[typeFilter] || 0;

      // 3️⃣ Lấy các dòng đã lưu của quý hiện tại (nếu có)
      const curSnap = await getDoc(
        doc(db, COL_QUARTER, `${year}_${quarter}`)
      );
      const saved = curSnap.exists() ? curSnap.data().mainRows || [] : [];

      // 4️⃣ Lấy carry-over và overrun từ quý trước
      const { year: py, quarter: pq } = getPrevQuarter(year, quarter);
      const prevSnap = await getDoc(
        doc(db, COL_QUARTER, `${py}_${pq}`)
      );
      const prevRows = prevSnap.exists() ? prevSnap.data().mainRows || [] : [];

      const prevCarry = {};
      const prevOver  = {};
      prevRows.forEach(r => {
        if (r.fixed) return;
        const key = (r.label ?? r.name ?? "").trim().toLowerCase();
        prevCarry[r.id] = prevCarry[key] = toNum(r.cumCurrent);

        if (r.overrun && Object.keys(r.overrun).length) {
          prevOver[r.id] = prevOver[key] = {};
          Object.entries(r.overrun).forEach(([pid, val]) => {
            prevOver[r.id][pid] = prevOver[key][pid] = toNum(val);
          });
        } else {
          // fallback: lấy trực tiếp giá trị cột project
          const projVals = {};
          Object.entries(r).forEach(([k, v]) => {
            if ([
              "id","label","name","pct","percentThiCong",
              "carryOver","allocated","used",
              "cumQuarterOnly","cumCurrent","overrun","fixed"
            ].includes(k)) return;
            projVals[k] = toNum(v);
          });
          prevOver[r.id] = prevOver[key] = projVals;
        }
      });

      // 5️⃣ Ghép với mainRows để tạo baseRows
      const latest    = (mainRows || []).filter(r => !r.fixed);
      const latestIds = new Set(latest.map(r => r.id));

      const makeBase = src => {
        const key   = (src.label ?? src.name ?? "").trim().toLowerCase();
        const carry = prevCarry[src.id] ?? prevCarry[key] ?? 0;
        const used  = toNum(src.used);
        // chú ý: ở đây src.thiCongValue luôn là giá trị phân bổ gốc
        const alloc = toNum(src.thiCongValue);

        return {
          id             : src.id,
          label          : src.label ?? src.name ?? "",
          pct            : 0,
          carryOver      : carry,
          used,
          allocated      : alloc,
          cumCurrent     : used - alloc + carry,
          cumQuarterOnly : used - alloc,
          prevOver       : prevOver[src.id] || prevOver[key] || {},
        };
      };

      let baseRows;
      if (curSnap.exists()) {
        // 5a. tái sử dụng saved rồi patch lại prevOver
        baseRows = saved
          .filter(r => !r.fixed && latestIds.has(r.id))
          .map(r => ({
            ...makeBase(r),
            pct           : r.pct ?? toNum(r.percentThiCong) ?? 0,
            carryOver     : toNum(r.carryOver),
            used          : toNum(r.used),
            allocated     : toNum(r.allocated ?? r.thiCongValue ?? 0),
            cumCurrent    : toNum(r.cumCurrent),
            cumQuarterOnly: toNum(r.cumQuarterOnly),
            fixed         : false,
          }));
        // thêm những dòng mới
        latest.forEach(r => {
          if (!baseRows.some(b => b.id === r.id)) {
            baseRows.push(makeBase(r));
          }
        });
      } else {
        // lần đầu khởi tạo
        baseRows = latest.map(makeBase);
      }

      // 6️⃣ Chèn dòng + Chi phí lương lên đầu, dùng totalFixed tuỳ type
      const savedSalary = saved.find(r => r.id === salaryRowId);
      const rowsNoSalary = baseRows.filter(r => r.id !== salaryRowId);

      const salaryRow = {
        id             : salaryRowId,
        label          : "+ Chi phí lương",
        pct            : savedSalary?.pct       ?? 0,
        carryOver      : savedSalary?.carryOver ?? 0,
        used           : 0,
        allocated      : totalFixed,
        cumCurrent     : 0,
        cumQuarterOnly : 0,
        prevOver       : {},   // lương không có prevOver
        fixed          : false,
      };

      if (mounted) {
        setExtraRows([salaryRow, ...rowsNoSalary]);
      }
    })();

    return () => { mounted = false; };
  }, [year, quarter, mainRows, typeFilter]);

  return [extraRows, setExtraRows];
}
