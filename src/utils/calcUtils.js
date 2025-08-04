import { ROW_SELECTION_PROPAGATION_DEFAULT } from "@mui/x-data-grid/internals";
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

// ✨ BƯỚC 2.2: CẬP NHẬT HÀM NÀY
const calcCarryoverEnd = (row, projectType) => {
    // Thêm projectType
    // Nếu là dự án "Nhà máy", áp dụng công thức mới
    if (projectType === "Nhà máy") {
        const carryover = Number(parseNumber(row.carryover || "0")); // Chuyển Tiếp ĐK
        const carryoverMinus = Number(parseNumber(row.carryoverMinus || "0")); // Được Trừ Quý Này
        const cpVuot = Number(parseNumber(row.cpVuot || "0")); // CP Vượt

        return String(carryover - carryoverMinus + cpVuot);
    }

    // Nếu không, giữ nguyên công thức cũ cho các loại dự án khác
    const dc = Number(parseNumber(row.directCost)),
        al = Number(parseNumber(row.allocated)),
        rev = Number(parseNumber(row.revenue)),
        car = Number(parseNumber(row.carryover)),
        carMinus = Number(parseNumber(row.carryoverMinus)),
        part1 = rev === 0 ? 0 : rev < dc + al ? dc + al - rev : 0;
    return String(part1 + car - carMinus);
};

const calcNoPhaiTraCK = (row) => {
    // Lấy và chuyển đổi các giá trị cần thiết sang dạng số
    const carMinus = Number(parseNumber(row.carryoverMinus || "0"));
    const dc = Number(parseNumber(row.directCost || "0"));
    const al = Number(parseNumber(row.allocated || "0"));
    const rev = Number(parseNumber(row.revenue || "0"));
    const debt = Number(parseNumber(row.debt || "0"));

    // ---- BỔ SUNG: Điều kiện kiểm tra Doanh thu bằng 0 ----
    if (rev === 0) {
        // Nếu Doanh thu bằng 0, áp dụng công thức mới
        return String(debt - dc);
    }

    // Nếu Doanh thu khác 0, giữ nguyên công thức cũ
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
    // Lấy các giá trị cần thiết từ dòng
    const directCost = Number(parseNumber(row.directCost || "0")); // Chi Phí Trực Tiếp
    const allocated = Number(parseNumber(row.allocated || "0")); // Phân Bổ
    const debt = Number(parseNumber(row.debt || "0")); // Nợ Phải Trả ĐK
    const revenue = Number(parseNumber(row.revenue || "0")); // Doanh Thu

    // Tính toán vế 'W' theo công thức mới
    const W = directCost + allocated - debt;
    console.log(" W", directCost, allocated, debt, row.description);
    // Vế 'I' chính là Doanh thu
    const I = revenue;

    // Áp dụng điều kiện và trả về kết quả
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
        projectType = "", // Thêm projectType
    } = {}
) => {
    if (!row.project) return;
    if (row.project.includes("-VT") || row.project.includes("-NC")) {
        row.revenue = "0"; // ép doanh thu về 0 cho -VT, -NC
    } else if (row.project.includes("-CP")) {
        if (row.isRevenueManual) {
            // Nếu có, thì không làm gì cả, giữ nguyên giá trị revenue người dùng đã nhập
        } else {
            // Nếu không, thực hiện tính toán tự động như cũ
            const hskh = Number(parseNumber(row.hskh));
            const orv = Number(parseNumber(overallRevenue));
            const pta = Number(parseNumber(projectTotalAmount));
            row.revenue = pta === 0 ? "0" : String((hskh * orv) / pta);
        }
    }

    // ✨ SỬA LẠI THỨ TỰ TÍNH TOÁN Ở ĐÂY ✨
    row.carryoverMinus = calcCarryoverMinus(row);
    row.totalCost = calcTotalCost(row);
    row.cpVuot = calcCpVuot(row); // Phải tính CP Vượt trước

    // Sau đó mới tính các giá trị phụ thuộc vào CP Vượt
    row.carryoverEnd = calcCarryoverEnd(row, projectType);

    if (!isUserEditingNoPhaiTraCK && row.project.includes("-CP"))
        row.noPhaiTraCK = calcNoPhaiTraCK(row);
    // TÍNH TOÁN CP SAU QUYẾT TOÁN THEO CÔNG THỨC MỚI NHẤT
    // =========================================================
    const debt = parseNumber(row.debt || "0");
    const directCost = parseNumber(row.directCost || "0");
    const noPhaiTraCK = parseNumber(row.noPhaiTraCK || "0");

    // ✅ ĐÃ CẬP NHẬT CÔNG THỨC MỚI TẠI ĐÂY
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
