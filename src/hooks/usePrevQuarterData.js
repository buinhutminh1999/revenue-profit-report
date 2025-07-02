import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";
import { toNum } from "../utils/numberUtils";
import { getPrevQuarter } from "../utils/quarterHelpers";

export const COL_QUARTER = "costAllocationsQuarter";
export const salaryRowId = "salary-cost";

/**
 * @param {number} year
 * @param {string} quarter
 * @param {Array}  mainRows    dữ liệu chính từ hook useQuarterMainData
 * @param {string} typeFilter  "Thi công" | "Nhà máy" | "KH-ĐT"
 */
export function usePrevQuarterData(year, quarter, mainRows, typeFilter) {
    const [extraRows, setExtraRows] = useState([]);

    // map typeFilter ⇒ đúng field value trong mainRows
    const valKeyMap = {
        "Thi công": "thiCongValue",
        "Nhà máy": "nhaMayValue",
        "KH-ĐT": "khdtValue",
    };
    const valKey = valKeyMap[typeFilter];

    useEffect(() => {
        let mounted = true;

        (async () => {
            // 1️⃣ đọc tổng fixed cho từng type
            const fxSnap = await getDoc(
                doc(db, "costAllocations", `${year}_${quarter}`)
            );
            const dataFX = fxSnap.exists() ? fxSnap.data() : {};
            const totals = {
                "Thi công": toNum(dataFX.totalThiCongFixed ?? 0),
                "Nhà máy": toNum(dataFX.totalNhaMayFixed ?? 0),
                "KH-ĐT": toNum(dataFX.totalKhdtFixed ?? 0),
            };
            const totalFixed = totals[typeFilter] || 0;

            // 2️⃣ đọc saved mainRows của quý hiện tại
            const curSnap = await getDoc(
                doc(db, COL_QUARTER, `${year}_${quarter}`)
            );
            const saved = curSnap.exists() ? curSnap.data().mainRows || [] : [];

            // 3️⃣ lấy carry-over & overrun từ quý trước
            const { year: py, quarter: pq } = getPrevQuarter(year, quarter);
            const prevSnap = await getDoc(doc(db, COL_QUARTER, `${py}_${pq}`));
            const prevRows = prevSnap.exists()
                ? prevSnap.data().mainRows || []
                : [];

            const prevCarry = {};
            const prevOver = {};
            prevRows.forEach((r) => {
                if (r.fixed) return;
                const key = (r.label ?? r.name ?? "").trim().toLowerCase();
                prevCarry[r.id] = prevCarry[key] = toNum(r.cumCurrent);
                if (r.overrun && Object.keys(r.overrun).length) {
                    prevOver[r.id] = prevOver[key] = {};
                    Object.entries(r.overrun).forEach(([pid, val]) => {
                        prevOver[r.id][pid] = prevOver[key][pid] = toNum(val);
                    });
                } else {
                    const projVals = {};
                    Object.entries(r).forEach(([k, v]) => {
                        if (
                            [
                                "id",
                                "label",
                                "name",
                                "pct",
                                "percentThiCong",
                                "carryOver",
                                "allocated",
                                "used",
                                "cumQuarterOnly",
                                "cumCurrent",
                                "overrun",
                                "fixed",
                            ].includes(k)
                        )
                            return;
                        projVals[k] = toNum(v);
                    });
                    prevOver[r.id] = prevOver[key] = projVals;
                }
            });

            // 4️⃣ build baseRows từ mainRows (chưa có salary)
            const latest = (mainRows || []).filter((r) => !r.fixed);
            const latestIds = new Set(latest.map((r) => r.id));
            const makeBase = (src) => {
                const key = (src.label ?? src.name ?? "").trim().toLowerCase();
                const carry = prevCarry[src.id] ?? prevCarry[key] ?? 0;
                const used = toNum(src.used);
                const alloc = toNum(src[valKey] ?? 0);
                return {
                    id: src.id,
                    label: src.label ?? src.name ?? "",
                    pct: 0,
                    carryOver: carry,
                    used,
                    allocated: alloc,
                    cumCurrent: used - alloc + carry,
                    cumQuarterOnly: used - alloc,
                    prevOver: prevOver[src.id] || prevOver[key] || {},
                };
            };

            let baseRows;
            if (curSnap.exists()) {
                // 4a. reuse saved rows, nhưng allocated lấy từ saved.byType[typeFilter].value
                baseRows = saved
                    .filter((r) => !r.fixed && latestIds.has(r.id))
                    .map((r) => {
                        const b = makeBase(r);
                        const typeData = r.byType?.[typeFilter] || {};
                        return {
                            ...b,
                            pct:
                                typeData.pct !== undefined &&
                                typeData.pct !== null
                                    ? typeData.pct
                                    : b.pct,

                            carryOver: toNum(typeData.carryOver) || b.carryOver,
                            used: toNum(typeData.used) || b.used,
                            allocated: toNum(
                                typeData.value ?? // ★ ưu tiên value
                                    typeData.allocated ?? // ★ fallback allocated cũ
                                    b.allocated // ★ fallback từ makeBase
                            ),
                            cumQuarterOnly:
                                toNum(typeData.cumQuarterOnly) ||
                                b.cumQuarterOnly,
                            cumCurrent:
                                toNum(typeData.cumCurrent) || b.cumCurrent,
                            fixed: false,
                        };
                    });
                // 4b. thêm các hàng mới từ mainRows nếu có
                latest.forEach((r) => {
                    if (!baseRows.some((b) => b.id === r.id)) {
                        baseRows.push(makeBase(r));
                    }
                });
            } else {
                // lần đầu khởi tạo
                baseRows = latest.map(makeBase);
            }

            // 5️⃣ chèn dòng + Chi phí lương lên đầu
            const savedSalary = saved.find((r) => r.id === salaryRowId);
            const rowsNoSalary = baseRows.filter((r) => r.id !== salaryRowId);
            const salaryRow = {
                id: salaryRowId,
                label: "+ Chi phí lương",
                pct: toNum(savedSalary?.pct) || 0,
                carryOver: toNum(savedSalary?.carryOver) || 0,
                used: 0,
                allocated: totalFixed,
                cumCurrent: 0,
                cumQuarterOnly: 0,
                prevOver: {},
                fixed: false,
            };

            if (mounted) {
                setExtraRows([salaryRow, ...rowsNoSalary]);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [year, quarter, mainRows, typeFilter]);

    return [extraRows, setExtraRows];
}
