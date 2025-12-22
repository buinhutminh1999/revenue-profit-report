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
    // ✅ LOGIC MỚI: Tất cả công trình KHÔNG có -CP được xử lý như VT/NC
    const isCpProject = proj.includes("-CP");
    return !isCpProject
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
    // ✅ LOGIC MỚI: Áp dụng công thức VT/NC cho TẤT CẢ công trình KHÔNG có đuôi -CP
    // Bao gồm: -VT, -NC, hoặc bất kỳ công trình nào không có -CP (đuôi trống, -abc, -xyz, v.v.)
    if (!row.project) return;

    const isCpProject = row.project.includes("-CP");
    const isVtNcProject = !isCpProject; // Tất cả công trình không phải -CP được xử lý như VT/NC

    // ⭐ LOGIC MỚI ƯU TIÊN HÀNG ĐẦU: ÁP DỤNG CÔNG THỨC "SỐNG" ⭐
    // Kiểm tra nếu là công trình VT/NC và có trường 'baseForNptck' được truyền từ quý trước.
    // ✅ CHỈ áp dụng công thức TỰ ĐỘNG nếu người dùng KHÔNG đang chỉnh sửa noPhaiTraCK
    if (!isUserEditingNoPhaiTraCK && isVtNcProject && row.hasOwnProperty('baseForNptck') && row.baseForNptck !== null) {
        // Lấy giá trị gốc đã tính ở quý trước
        const baseValue = Number(parseNumber(row.baseForNptck));
        // Lấy Chi Phí Trực Tiếp của quý HIỆN TẠI (khi người dùng nhập)
        const directCost_Current = Number(parseNumber(row.directCost || "0"));

        // Công thức cuối cùng: NPTĐK(Q2) - CPTT(Q2) - CPTT(Q3)
        row.noPhaiTraCK = String(baseValue - directCost_Current);
    }

    // Các logic tính toán khác giữ nguyên
    if (isVtNcProject) {
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

    if (isVtNcProject) {
        row.cpVuot = "0";
    } else {
        row.cpVuot = calcCpVuot(row);
    }

    // ✅ LUÔN tính lại carryoverEnd (bỏ điều kiện isFinalized để đảm bảo giá trị luôn đúng)
    row.carryoverEnd = calcCarryoverEnd(row, projectType);

    // Chỉ tính NPT CK tự động cho các dự án -CP (không phải VT/NC)
    if (!isUserEditingNoPhaiTraCK && !isVtNcProject && row.project.includes("-CP")) {
        row.noPhaiTraCK = calcNoPhaiTraCK(row, projectType);
    }

    const directCost = parseNumber(row.directCost || "0");
    const allocated = parseNumber(row.allocated || "0");
    const debt = parseNumber(row.debt || "0"); // Lấy giá trị NPT ĐK

    // 💡 BẮT ĐẦU LOGIC KHẮC PHỤC
    const isStandardProject = row.project.includes("-CP") || isVtNcProject;
    let noPhaiTraCK = parseNumber(row.noPhaiTraCK || "0"); // Sử dụng giá trị đã tính hoặc 0

    if (!isStandardProject) {
        // Đối với công trình tùy chỉnh (CHIPHIPHAITRAKHAC), 
        // chúng ta buộc NPT CK = NPT ĐK để triệt tiêu nhau.
        noPhaiTraCK = debt;
    }
    // 💡 KẾT THÚC LOGIC KHẮC PHỤC

    const carryoverEnd = parseNumber(row.carryoverEnd || "0");
    const inventory = parseNumber(row.inventory || "0");

    // Ghi lại noPhaiTraCK đã điều chỉnh vào row (quan trọng cho hiển thị và lưu DB)
    row.noPhaiTraCK = String(noPhaiTraCK);

    // Dòng 232: Công thức tính CP Sau Quyết Toán
    row.cpSauQuyetToan = String(
        directCost + allocated + noPhaiTraCK - carryoverEnd - debt - inventory
    );
};

// ---------- Hidden Columns Helper ----------
// ✅ LOGIC MỚI: Ẩn các cột cho TẤT CẢ công trình KHÔNG có đuôi -CP
export const getHiddenColumnsForProject = (project) => {
    const proj = (project || "").toUpperCase();
    const isCpProject = proj.includes("-CP");
    return !isCpProject
        ? ["allocated", "carryover", "carryoverMinus", "carryoverEnd", "hskh", "revenue", "cpVuot"]
        : [];
};

// =================================================================
// KẾT THÚC KHỐI CODE THAY THẾ
// =================================================================
// ---------- Hidden Columns Helper (cho -VT, -NC) ----------