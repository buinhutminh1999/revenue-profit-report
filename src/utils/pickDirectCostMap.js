import { normalize, toNum } from "./numberUtils";

/** ----------------------------------------------------------
 *  Lấy directCost nằm trong mảng items của document quarter
 *  -------------------------------------------------------- */
export function pickDirectCostMap(qDoc = {}) {
    const map = {};
    (qDoc.items || []).forEach((it) => {
        const cost = toNum(it.directCost ?? it.chiPhiTrucTiep ?? it.total ?? 0);
        if (!cost) return;

        const raw = it.description ?? it.label ?? it.name ?? "";
        const key = normalize(raw);
        map[key] = (map[key] || 0) + cost;
    });
    return map;
}