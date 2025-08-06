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

// Hàm tính toán mới cho "CP Trừ Vào Chuyển Tiếp"
const calcPayableDeductionThisQuarter = (row) => {
    const directCost = Number(parseNumber(row.directCost || "0"));
    const revenue = Number(parseNumber(row.revenue || "0"));
    const carryover = Number(parseNumber(row.carryover || "0"));

    // if(Chi Phí Trực Tiếp > Doanh Thu; 0; ...)
    if (directCost > revenue) {
        return "0";
    }

    const revenueMinusDirectCost = revenue - directCost;

    // if(...; if(Doanh Thu - Chi Phí Trực Tiếp < Chuyển Tiếp ĐK; Doanh Thu - Chi Phí Trực Tiếp; Chuyển Tiếp ĐK))
    if (revenueMinusDirectCost < carryover) {
        return String(revenueMinusDirectCost);
    } else {
        return String(carryover);
    }
};

const calcCarryoverEnd = (row, projectType) => {
    // Nếu là dự án "Nhà máy", áp dụng công thức mới
    if (projectType === "Nhà máy") {
        const carryover = Number(parseNumber(row.carryover || "0"));
        const carryoverMinus = Number(parseNumber(row.carryoverMinus || "0"));
        const cpVuot = Number(parseNumber(row.cpVuot || "0"));
        return String(carryover - carryoverMinus + cpVuot);
    }

    // Nếu không, giữ nguyên công thức cũ
    const dc = Number(parseNumber(row.directCost)),
        al = Number(parseNumber(row.allocated)),
        rev = Number(parseNumber(row.revenue)),
        car = Number(parseNumber(row.carryover)),
        carMinus = Number(parseNumber(row.carryoverMinus)),
        part1 = rev === 0 ? 0 : rev < dc + al ? dc + al - rev : 0;
    return String(part1 + car - carMinus);
};

const calcNoPhaiTraCK = (row) => {
    const carMinus = Number(parseNumber(row.carryoverMinus || "0"));
    const dc = Number(parseNumber(row.directCost || "0"));
    const al = Number(parseNumber(row.allocated || "0"));
    const rev = Number(parseNumber(row.revenue || "0"));
    const debt = Number(parseNumber(row.debt || "0"));

    if (rev === 0) {
        return String(debt - dc);
    }

    const part1 = carMinus + dc + al < rev ? rev - (dc + al) - carMinus : 0;
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

const calcCpVuot = (row) => {
    const directCost = Number(parseNumber(row.directCost || "0"));
    const allocated = Number(parseNumber(row.allocated || "0"));
    const debt = Number(parseNumber(row.debt || "0"));
    const revenue = Number(parseNumber(row.revenue || "0"));

    const W = directCost + allocated - debt;
    const I = revenue;

    if (W > I) {
        return String(W - I);
    }
    return "0";
};

export const calcAllFields = (
    row,
    {
        isUserEditingNoPhaiTraCK = false,
        overallRevenue = "0",
        projectTotalAmount = "0",
        projectType = "",
    } = {}
) => {
    if (!row.project) return;
    if (row.project.includes("-VT") || row.project.includes("-NC")) {
        row.revenue = "0";
    } else if (row.project.includes("-CP")) {
        if (!row.isRevenueManual) {
            const hskh = Number(parseNumber(row.hskh));
            const orv = Number(parseNumber(overallRevenue));
            const pta = Number(parseNumber(projectTotalAmount));
            row.revenue = pta === 0 ? "0" : String((hskh * orv) / pta);
        }
    }

    // --- THỰC HIỆN TÍNH TOÁN MỚI ---
    // Chỉ tính khi là dự án Nhà máy vì cột này chỉ hiển thị cho loại dự án đó
    if (projectType === "Nhà máy") {
        row.payableDeductionThisQuarter = calcPayableDeductionThisQuarter(row);
    }

    // --- CÁC TÍNH TOÁN CÒN LẠI ---
    row.carryoverMinus = calcCarryoverMinus(row);
    row.totalCost = calcTotalCost(row);
    row.cpVuot = calcCpVuot(row);
    row.carryoverEnd = calcCarryoverEnd(row, projectType);

    if (!isUserEditingNoPhaiTraCK && row.project.includes("-CP"))
        row.noPhaiTraCK = calcNoPhaiTraCK(row);

    const debt = parseNumber(row.debt || "0");
    const directCost = parseNumber(row.directCost || "0");
    const noPhaiTraCK = parseNumber(row.noPhaiTraCK || "0");

    row.cpSauQuyetToan = String(directCost + noPhaiTraCK - debt);
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
