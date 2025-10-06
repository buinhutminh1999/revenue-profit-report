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

const calcNoPhaiTraCK = (row, projectType) => {
    const carMinus = Number(parseNumber(row.carryoverMinus || "0"));
    const dc = Number(parseNumber(row.directCost || "0"));
    const al = Number(parseNumber(row.allocated || "0"));
    const rev = Number(parseNumber(row.revenue || "0"));
    const debt = Number(parseNumber(row.debt || "0"));
    // MỚI: Lấy thêm giá trị từ cột "Nợ phải trả CK NM"
    const noCKNM = Number(parseNumber(row.noPhaiTraCKNM || "0"));

    // =================================================================
    // CẬP NHẬT LOGIC CHO DỰ ÁN "NHÀ MÁY" THEO YÊU CẦU
    // =================================================================
    if (projectType === "Nhà máy") {
        // Điều kiện A được cập nhật để bao gồm noCKNM
        const conditionA = carMinus + dc + al + noCKNM - debt;
        const conditionB = rev;

        if (conditionA < conditionB) {
            // Công thức tính kết quả cũng được cập nhật để bao gồm noCKNM
            const result = rev - carMinus - dc - al - noCKNM + debt;
            return String(result);
        } else {
            return "0"; // Trả về 0 nếu điều kiện sai
        }
    }
    // =================================================================
    // GIỮ NGUYÊN: Logic cũ cho các loại dự án khác
    // =================================================================
    else {
        if (rev === 0) {
            return String(debt - dc);
        }

        const part1 = carMinus + dc + al < rev ? rev - (dc + al) - carMinus : 0;
        return String(part1 + debt);
    }
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
    // MỚI: Lấy thêm giá trị từ cột "Nợ phải trả CK NM"
    const noCKNM = Number(parseNumber(row.noPhaiTraCKNM || "0"));

    // Tính toán giá trị cốt lõi theo công thức của bạn
    const result = directCost + allocated + noCKNM - debt - revenue;

    // Sử dụng Math.max để đảm bảo kết quả không bao giờ là số âm
    return String(Math.max(0, result));
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

    if (projectType === "Nhà máy") {
        row.payableDeductionThisQuarter = calcPayableDeductionThisQuarter(row);
    }

    row.carryoverMinus = calcCarryoverMinus(row);
    row.totalCost = calcTotalCost(row);
    const project = row.project || "";
    if (project.includes("-VT") || project.includes("-NC")) {
        row.cpVuot = "0";
    } else {
        row.cpVuot = calcCpVuot(row);
    }

    // ⭐ BẢO VỆ CÁC GIÁ TRỊ ĐÃ QUYẾT TOÁN ⭐
    // Chỉ tính toán lại các cột này nếu dòng CHƯA được quyết toán
    if (!row.isFinalized) {
        row.carryoverEnd = calcCarryoverEnd(row, projectType);

        if (!isUserEditingNoPhaiTraCK && row.project.includes("-CP")) {
            row.noPhaiTraCK = calcNoPhaiTraCK(row, projectType);
        }
    }

    // Phần tính toán `cpSauQuyetToan` vẫn giữ nguyên
    const directCost = parseNumber(row.directCost || "0");
    const allocated = parseNumber(row.allocated || "0");
    const noPhaiTraCK = parseNumber(row.noPhaiTraCK || "0");
    const carryoverEnd = parseNumber(row.carryoverEnd || "0");
    const debt = parseNumber(row.debt || "0");
    const inventory = parseNumber(row.inventory || "0");

    row.cpSauQuyetToan = String(
        directCost +
        allocated +
        noPhaiTraCK -
        carryoverEnd -
        debt -
        inventory
    );
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
              "cpVuot"
          ]
        : [];
