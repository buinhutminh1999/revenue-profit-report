import { salaryRowId } from "../hooks/usePrevQuarterData";
import { toNum } from "./numberUtils";

export const processRowUpdate = useCallback(
        (newRow, oldRow, mainRows, projects, projData, mainRows, getDC) => {
            /* ── ❶ Nếu là hàng lương ─────────────────────────── */
            if (newRow.id === salaryRowId) {
                // Giữ nguyên allocated (lấy lại từ oldRow hoặc extraRows)
                newRow.allocated = oldRow?.allocated ?? toNum(newRow.allocated);

                // vẫn cho người dùng chỉnh pct & carryOver
                const pct = parseFloat(newRow.pct) || 0;
                newRow.pct = pct;
                newRow.carryOver = toNum(newRow.carryOver);
            } else {
                /* ── ❷ Hàng thường – logic cũ ───────────────────── */
                const pct = parseFloat(newRow.pct) || 0;
                newRow.pct = pct;
                newRow.carryOver = toNum(newRow.carryOver);

                const main =
                    mainRows.find((m) => m.id === newRow.id) ||
                    mainRows.find(
                        (m) =>
                            ((m.label ?? m.name) || "").trim().toLowerCase() ===
                            newRow.label.trim().toLowerCase()
                    ) ||
                    {};

                newRow.allocated = toNum(
                    main.allocated ?? main.thiCongValue ?? 0
                );
            }

            /* ── ❸ Tính lại used, cumCurrent… (dùng chung) ───── */
            projects.forEach((p) => {
                const revQ = toNum(projData[p.id]?.overallRevenue);
                const dc = getDC(p.id, newRow.label);
                newRow[p.id] = Math.round(
                    (revQ * (newRow.pct || 0)) / 100 - dc
                );
            });

            newRow.used = projects.reduce((s, p) => s + (newRow[p.id] || 0), 0);
            newRow.cumCurrent =
                newRow.used - newRow.allocated + newRow.carryOver;
            newRow.cumQuarterOnly = newRow.used - newRow.allocated;

            setExtraRows((rs) =>
                rs.map((r) => (r.id === newRow.id ? { ...r, ...newRow } : r))
            );
            return newRow;
        },
        [projects, projData, mainRows, getDC]
    );