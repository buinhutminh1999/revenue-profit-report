/* ---------- constants & helper ---------- */

export const COL_MAIN = "costAllocations";
export const cats = [
    { key: "overallRevenue", label: "DOANH THU" },
    { key: "totalCost", label: "TỔNG CHI PHÍ" },
];

export const isFixed = (id) => id === "overallRevenue" || id === "totalCost";
