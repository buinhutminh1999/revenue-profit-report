import { parseNumber } from "./numberUtils";
// ---------- Calculation Functions ----------

const calcCarryoverMinus = ({ directCost, allocated, revenue, carryover }) => {
    const dc = Number(parseNumber(directCost)),
        al = Number(parseNumber(allocated)),
        rev = Number(parseNumber(revenue)),
        car = Number(parseNumber(carryover));
    if (dc + al > rev) return "0";
    const remain = rev - (dc + al);
    return String(remain < car ? remain : car);
};

const calcCarryoverEnd = (row) => {
    const dc = Number(parseNumber(row.directCost)),
        al = Number(parseNumber(row.allocated)),
        rev = Number(parseNumber(row.revenue)),
        car = Number(parseNumber(row.carryover)),
        carMinus = Number(parseNumber(row.carryoverMinus)),
        part1 = rev === 0 ? 0 : rev < dc + al ? dc + al - rev : 0;
    return String(part1 + car - carMinus);
};

const calcNoPhaiTraCK = (row) => {
    const carMinus = Number(parseNumber(row.carryoverMinus)),
        dc = Number(parseNumber(row.directCost)),
        al = Number(parseNumber(row.allocated)),
        rev = Number(parseNumber(row.revenue)),
        debt = Number(parseNumber(row.debt)),
        part1 = carMinus + dc + al < rev ? rev - (dc + al) - carMinus : 0;
    return String(part1 + debt);
};

const calcTotalCost = (row) => {
    const dc = Number(parseNumber(row.directCost)),
        al = Number(parseNumber(row.allocated)),
        rev = Number(parseNumber(row.revenue)),
        inv = Number(parseNumber(row.inventory)),
        debt = Number(parseNumber(row.debt)),
        ton = Number(parseNumber(row.tonKhoUngKH)),
        noCK = Number(parseNumber(row.noPhaiTraCK)),
        proj = (row.project || "").toUpperCase();
    return proj.includes("-VT") || proj.includes("-NC")
        ? String(inv - debt + dc + al + noCK - ton)
        : String(rev === 0 ? dc + al : rev);
};

export const calcAllFields = (
    row,
    {
        isUserEditingNoPhaiTraCK = false,
        overallRevenue = "0",
        projectTotalAmount = "0",
    } = {}
) => {
    if (!row.project) return;
    if (row.project.includes("-VT") || row.project.includes("-NC")) {
        row.revenue = "0"; // ép doanh thu về 0 cho -VT, -NC
    } else if (row.project.includes("-CP")) {
        // ✨ BẮT ĐẦU THAY ĐỔI ✨
        // Kiểm tra xem dòng này có đang được ưu tiên nhập tay không
        if (row.isRevenueManual) {
            // Nếu có, thì không làm gì cả, giữ nguyên giá trị revenue người dùng đã nhập
        } else {
            // Nếu không, thực hiện tính toán tự động như cũ
            const hskh = Number(parseNumber(row.hskh));
            const orv = Number(parseNumber(overallRevenue));
            const pta = Number(parseNumber(projectTotalAmount));
            row.revenue = pta === 0 ? "0" : String((hskh * orv) / pta);
        }
        // ✨ KẾT THÚC THAY ĐỔI ✨
    }
    row.carryoverMinus = calcCarryoverMinus(row);
    row.carryoverEnd = calcCarryoverEnd(row);
    if (!isUserEditingNoPhaiTraCK && row.project.includes("-CP"))
        row.noPhaiTraCK = calcNoPhaiTraCK(row);
    row.totalCost = calcTotalCost(row);
};

// ---------- Hidden Columns Helper (cho -VT, -NC) ----------
export const getHiddenColumnsForProject = (project) =>
    project.includes("-VT") || project.includes("-NC")
        ? [
              "allocated",
              "carryover",
              "carryoverMinus",
              "carryoverEnd",
              "hskh",
              "revenue",
          ]
        : [];
