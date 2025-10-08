import React, { useState, useEffect } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
} from "@mui/material";
import {
    Box,
    Typography,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    Chip,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    Switch,
    FormControlLabel,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { collection, getDocs, setDoc, doc, getDoc, collectionGroup, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase-config";
import { toNum, formatNumber } from "../utils/numberUtils";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import ProfitSummaryTable from "../reports/ProfitSummaryTable";
import FunctionsIcon from '@mui/icons-material/Functions'; // <-- THÊM DÒNG NÀY
import ProfitReportFormulaGuide from '../components/reports_performance-profit-report/ProfitReportFormulaGuide'; // <-- THÊM DÒNG NÀY (sửa lại đường dẫn nếu cần)

export default function ProfitReportQuarter() {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedQuarter, setSelectedQuarter] = useState("Q1");
    const [rows, setRows] = useState([]);
    const [tvMode, setTvMode] = useState(true);
    const [editingCell, setEditingCell] = useState({ idx: -1, field: "" });
    const [addModal, setAddModal] = useState(false);
    const [addProject, setAddProject] = useState({
        group: "I.1. Dân Dụng + Giao Thông",
        name: "",
        type: "",
    });
    const [loading, setLoading] = useState(false);
    const [summaryTargets, setSummaryTargets] = useState({
        revenueTargetXayDung: 0,
        profitTargetXayDung: 0,
        revenueTargetSanXuat: 0,
        profitTargetSanXuat: 0,
        revenueTargetDauTu: 0,
        profitTargetDauTu: 0,
    });
    const [formulaDialogOpen, setFormulaDialogOpen] = useState(false); // <-- THÊM DÒNG NÀY

    const handleSummaryTargetChange = (targetKey, value) => {
        setSummaryTargets((prevTargets) => ({
            ...prevTargets,
            [targetKey]: value,
        }));
    };

    const cpVuotLabel = `CP VƯỢT QUÝ ${selectedQuarter} ${selectedYear}`;

    const cellStyle = {
        minWidth: tvMode ? 120 : 80,
        fontSize: tvMode ? "1.1rem" : "0.9rem", // Cỡ chữ to hơn đáng kể
        px: tvMode ? 1 : 2,
        py: tvMode ? 2 : 1, // Tăng khoảng cách dọc
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        overflow: "hidden",
        textOverflow: "ellipsis",
        border: "1px solid #ccc",
    };

    // =================================================================
    // CÁC HÀM TÍNH TOÁN (HELPER FUNCTIONS)
    // =================================================================
    const updateLDXRow = (inputRows) => {
        const rows = [...inputRows];
        const idxMain = rows.findIndex((r) =>
            (r.name || "").toUpperCase().includes("TỪ LDX")
        );
        const idxLNLD = rows.findIndex((r) =>
            (r.name || "").toUpperCase().includes("LIÊN DOANH (LDX)")
        );
        const idxLNPT = rows.findIndex((r) =>
            (r.name || "")
                .toUpperCase()
                .includes("PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)")
        );
        const idxGiam = rows.findIndex((r) =>
            (r.name || "").toUpperCase().includes("GIẢM LN LDX")
        );
        if (
            idxMain !== -1 &&
            idxLNLD !== -1 &&
            idxLNPT !== -1 &&
            idxGiam !== -1
        ) {
            const revenue =
                toNum(rows[idxLNLD]?.revenue) +
                toNum(rows[idxLNPT]?.revenue) -
                toNum(rows[idxGiam]?.revenue);
            const cost =
                toNum(rows[idxLNLD]?.cost) +
                toNum(rows[idxLNPT]?.cost) -
                toNum(rows[idxGiam]?.cost);
            const profit = revenue - cost;
            const percent = revenue !== 0 ? (profit / revenue) * 100 : null;
            rows[idxMain] = {
                ...rows[idxMain],
                revenue,
                cost,
                profit,
                percent,
            };
        }
        return rows;
    };

    function updateSalanRow(rows) {
        const idxSalan = rows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)"
        );
        const idxLoiNhuan = rows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "LỢI NHUẬN LIÊN DOANH (SÀ LAN)"
        );
        const idxPhaiChi = rows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)"
        );
        if (idxSalan !== -1 && idxLoiNhuan !== -1 && idxPhaiChi !== -1) {
            const rev1 = toNum(rows[idxLoiNhuan]?.revenue);
            const rev2 = toNum(rows[idxPhaiChi]?.revenue);
            const cost1 = toNum(rows[idxLoiNhuan]?.cost);
            const cost2 = toNum(rows[idxPhaiChi]?.cost);
            const profit1 = toNum(rows[idxLoiNhuan]?.profit);
            const profit2 = toNum(rows[idxPhaiChi]?.profit);
            rows[idxSalan] = {
                ...rows[idxSalan],
                revenue: rev1 - rev2 || null,
                cost: cost1 - cost2 || null,
                profit: profit1 - profit2 || null,
                percent: null,
            };
        }
        return rows;
    }

    const updateDTLNLDXRow = (inputRows) => {
        const rows = [...inputRows];
        const idxMain = rows.findIndex((r) =>
            (r.name || "").toUpperCase().includes("DT + LN ĐƯỢC CHIA TỪ LDX")
        );
        const idxLDX = rows.findIndex((r) =>
            (r.name || "").toUpperCase().includes("LIÊN DOANH (LDX)")
        );
        const idxLDXPT = rows.findIndex((r) =>
            (r.name || "")
                .toUpperCase()
                .includes("PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)")
        );
        const idxGiam = rows.findIndex((r) =>
            (r.name || "").toUpperCase().includes("GIẢM LN LDX")
        );
        if (idxMain !== -1) {
            const revenue =
                toNum(rows[idxLDX]?.revenue) -
                toNum(rows[idxLDXPT]?.revenue) -
                toNum(rows[idxGiam]?.revenue);
            const cost =
                toNum(rows[idxLDX]?.cost) -
                toNum(rows[idxLDXPT]?.cost) -
                toNum(rows[idxGiam]?.cost);
            const profit =
                toNum(rows[idxLDX]?.profit) -
                toNum(rows[idxLDXPT]?.profit) -
                toNum(rows[idxGiam]?.profit);
            rows[idxMain] = {
                ...rows[idxMain],
                revenue,
                cost,
                profit,
                percent: null,
            };
        }
        return rows;
    };

    const updateThuNhapKhacRow = (inputRows) => {
        const rows = [...inputRows];
        const idxMain = rows.findIndex(
            (r) =>
                (r.name || "").toUpperCase() ===
                "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY"
        );
        const detailRows = [];
        if (idxMain !== -1) {
            for (let i = idxMain + 1; i < rows.length; i++) {
                const name = (rows[i].name || "").trim().toUpperCase();
                if (/^[IVX]+\./.test(name)) break;
                if (!name) continue;
                detailRows.push(rows[i]);
            }
            if (detailRows.length > 0) {
                const revenue = detailRows.reduce(
                    (s, r) => s + toNum(r.revenue),
                    0
                );
                const cost = detailRows.reduce((s, r) => s + toNum(r.cost), 0);
                const profit = detailRows.reduce(
                    (s, r) => s + toNum(r.profit),
                    0
                );
                const target = toNum(rows[idxMain].target);
                const percent = target !== 0 ? (profit / target) * 100 : null;
                rows[idxMain] = {
                    ...rows[idxMain],
                    revenue,
                    cost,
                    profit,
                    percent,
                };
            }
        }
        return rows;
    };

    const updateDauTuRow = (inputRows) => {
        const rows = [...inputRows];
        const idxMain = rows.findIndex((r) =>
            (r.name || "").toUpperCase().startsWith("III. ĐẦU TƯ")
        );
        if (idxMain === -1) return rows;
        const detailRows = [];
        for (let i = idxMain + 1; i < rows.length; i++) {
            const name = (rows[i].name || "").trim().toUpperCase();
            if (/^[IVX]+\./.test(name) || name === "TỔNG") break;
            if (!name) continue;
            detailRows.push(rows[i]);
        }
        if (detailRows.length > 0) {
            const revenue = detailRows.reduce(
                (s, r) => s + toNum(r.revenue),
                0
            );
            const cost = detailRows.reduce((s, r) => s + toNum(r.cost), 0);
            const profit = detailRows.reduce((s, r) => s + toNum(r.profit), 0);
            const percent = revenue !== 0 ? (profit / revenue) * 100 : null;
            rows[idxMain] = {
                ...rows[idxMain],
                revenue,
                cost,
                profit,
                percent,
            };
        }
        return rows;
    };
    const updateGroupI1 = (rows) => {
        const idxI1 = rows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "I.1. DÂN DỤNG + GIAO THÔNG"
        );

        if (idxI1 === -1) return rows;

        let i = idxI1 + 1;
        const childRows = [];
        // Lặp qua các hàng con cho đến khi gặp mục I.2 hoặc mục lớn tiếp theo
        while (
            i < rows.length &&
            !(
                rows[i].name &&
                (rows[i].name.toUpperCase().startsWith("I.2") ||
                    (rows[i].name.match(/^[IVX]+\./) &&
                        !rows[i].name.toUpperCase().startsWith("I.1")))
            )
        ) {
            // Chỉ thêm vào các hàng con không phải là tiêu đề nhóm
            if (rows[i].name && !rows[i].name.match(/^[IVX]+\./)) {
                childRows.push(rows[i]);
            }
            i++;
        }

        const revenue = childRows.reduce((s, r) => s + toNum(r.revenue), 0);
        const cost = childRows.reduce((s, r) => s + toNum(r.cost), 0);
        const profit = revenue - cost;
        const percent = revenue ? (profit / revenue) * 100 : null;

        const newRows = [...rows];
        newRows[idxI1] = { ...newRows[idxI1], revenue, cost, profit, percent };
        return newRows;
    };
    // TÍNH LẠI NHÓM I.2. KÈ TỪ CÁC HÀNG CON
    const updateGroupI2 = (rows) => {
        const idxI2 = rows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "I.2. KÈ"
        );
        if (idxI2 === -1) return rows;

        let i = idxI2 + 1;
        const childRows = [];
        // lấy tất cả hàng con dưới I.2 cho tới khi gặp mục lớn tiếp theo (I.3..., II..., III...)
        while (i < rows.length) {
            const name = (rows[i].name || "").trim().toUpperCase();
            if (/^[IVX]+\./.test(name) && !name.startsWith("I.2")) break;
            if (name && !/^[IVX]+\./.test(name)) childRows.push(rows[i]);
            i++;
        }

        const revenue = childRows.reduce((s, r) => s + toNum(r.revenue), 0);
        const cost = childRows.reduce((s, r) => s + toNum(r.cost), 0);
        // Khuyến nghị: cộng trực tiếp cột Lợi nhuận của các hàng con để nhất quán với I.4/II.1
        const profit = childRows.reduce((s, r) => s + toNum(r.profit), 0);
        const percent = revenue ? (profit / revenue) * 100 : null;

        const newRows = [...rows];
        newRows[idxI2] = { ...newRows[idxI2], revenue, cost, profit, percent };
        return newRows;
    };

    const updateGroupI3 = (rows) => {
    const idxI3 = rows.findIndex(
        (r) =>
            (r.name || "").trim().toUpperCase() ===
            "I.3. CÔNG TRÌNH CÔNG TY CĐT"
    );
    if (idxI3 === -1) return rows;
    let i = idxI3 + 1;
    const childRows = [];
    while (
        i < rows.length &&
        !(rows[i].name && rows[i].name.match(/^[IVX]+\./))
    ) {
        childRows.push(rows[i]);
        i++;
    }

    // Vẫn tính tổng Doanh thu và Chi phí để hiển thị trên dòng tổng hợp
    const revenue = childRows.reduce((s, r) => s + toNum(r.revenue), 0);
    const cost = childRows.reduce((s, r) => s + toNum(r.cost), 0);

    // ✅ THAY ĐỔI THEO YÊU CẦU MỚI
    // Công thức: Lợi nhuận = LN(hàng con 1) - LN(hàng con 2) - LN(hàng con 3) ...
    const profit = childRows.reduce((acc, currentRow, index) => {
        const currentProfit = toNum(currentRow.profit);
        // Nếu là phần tử đầu tiên, lấy nó làm giá trị khởi tạo
        if (index === 0) {
            return currentProfit;
        }
        // Các phần tử sau đó sẽ được trừ đi từ giá trị đã có
        return acc - currentProfit;
    }, 0); // Khởi tạo với 0

    const percent = revenue ? (profit / revenue) * 100 : null;
    const newRows = [...rows];
    newRows[idxI3] = { ...newRows[idxI3], revenue, cost, profit, percent };
    return newRows;
};

    // DÁN TOÀN BỘ HÀM MỚI NÀY VÀO
    // ----------------------------------------------------------------
    const updateGroupI4 = (rows) => {
        const idxI4 = rows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() === "I.4. XÍ NGHIỆP XD II"
        );
        if (idxI4 === -1) return rows;

        let i = idxI4 + 1;
        const childRows = [];
        // Lặp để lấy tất cả các hàng con của nhóm I.4
        while (
            i < rows.length &&
            !(rows[i].name || "").trim().toUpperCase().startsWith("II.")
        ) {
            childRows.push(rows[i]);
            i++;
        }

        // Vẫn tính tổng Doanh thu và Chi phí để hiển thị
        const revenue = childRows.reduce((s, r) => s + toNum(r.revenue), 0);
        const cost = childRows.reduce((s, r) => s + toNum(r.cost), 0);

        // ✅ LOGIC MỚI: Tính lợi nhuận bằng cách SUM trực tiếp cột Lợi nhuận của các hàng con
        const profit = childRows.reduce((s, r) => s + toNum(r.profit), 0);

        const percent = revenue ? (profit / revenue) * 100 : null;
        const newRows = [...rows];
        newRows[idxI4] = { ...newRows[idxI4], revenue, cost, profit, percent };
        return newRows;
    };
    // ----------------------------------------------------------------

    const updateXayDungRow = (inputRows) => {
    const rows = [...inputRows];
    const idxI = rows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "I. XÂY DỰNG"
    );
    if (idxI === -1) return rows;

    const idxI1 = rows.findIndex(
        (r) =>
            (r.name || "").trim().toUpperCase() ===
            "I.1. DÂN DỤNG + GIAO THÔNG"
    );
    const idxI2 = rows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "I.2. KÈ"
    );
    // ✅ THÊM DÒNG NÀY
    const idxI3 = rows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "I.3. CÔNG TRÌNH CÔNG TY CĐT"
    );


    const revenue =
        toNum(rows[idxI1]?.revenue) + toNum(rows[idxI2]?.revenue) + toNum(rows[idxI3]?.revenue); // ✅ THÊM DOANH THU CỦA I.3
    const cost = toNum(rows[idxI1]?.cost) + toNum(rows[idxI2]?.cost) + toNum(rows[idxI3]?.cost); // ✅ THÊM CHI PHÍ CỦA I.3
    const profit = revenue - cost;

    const target = toNum(rows[idxI].target);
    const percent = target !== 0 ? (profit / target) * 100 : null;

    rows[idxI] = { ...rows[idxI], revenue, cost, profit, percent };
    return rows;
};

    const updateSanXuatRow = (inputRows) => {
        const rows = [...inputRows];
        const idxII = rows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "II. SẢN XUẤT"
        );
        if (idxII === -1) return rows;

        const idxII1 = rows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "II.1. SẢN XUẤT"
        );
        const idxII2 = rows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "II.2. DT + LN ĐƯỢC CHIA TỪ LDX"
        );
        const idxII3 = rows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)"
        );

        const revenue =
            toNum(rows[idxII1]?.revenue) +
            toNum(rows[idxII2]?.revenue) +
            toNum(rows[idxII3]?.revenue);

        const profit =
            toNum(rows[idxII1]?.profit) +
            toNum(rows[idxII2]?.profit) +
            toNum(rows[idxII3]?.profit);

        const percent = revenue ? (profit / revenue) * 100 : null;

        rows[idxII] = {
            ...rows[idxII],
            revenue: null,
            cost: null,
            profit: profit === 0 ? null : profit,
            percent,
        };

        return rows;
    };
    const updateGroupII1 = (inputRows) => {
        const rows = [...inputRows];
        const idxMain = rows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "II.1. SẢN XUẤT"
        );

        if (idxMain === -1) return rows;

        const detailRows = [];
        for (let i = idxMain + 1; i < rows.length; i++) {
            const name = (rows[i].name || "").trim().toUpperCase();
            if (/^II\.[2-9]/.test(name) || /^[IVX]+\./.test(name)) {
                break;
            }
            if (!name) continue;
            detailRows.push(rows[i]);
        }

        if (detailRows.length > 0) {
            const revenue = detailRows.reduce(
                (s, r) => s + toNum(r.revenue),
                0
            );
            const cost = detailRows.reduce((s, r) => s + toNum(r.cost), 0);

            // --- BẮT ĐẦU SỬA ĐỔI ---
            // CÔNG THỨC MỚI (ĐÚNG): Cộng dồn trực tiếp từ cột Lợi nhuận của các hàng con
            const profit = detailRows.reduce(
                (s, r) => s + toNum(r.profit),
                0
            );
            // --- KẾT THÚC SỬA ĐỔI ---

            const percent = revenue ? (profit / revenue) * 100 : null;

            rows[idxMain] = {
                ...rows[idxMain],
                revenue,
                cost,
                profit,
                percent,
            };
        }
        return rows;
    };
    const calculateTotals = (currentRows) => {
        const updatedRows = [...currentRows];

        // Tìm index của các hàng cần thiết
        const idxTotal = updatedRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "TỔNG"
        );
        const idxIXD = updatedRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "I. XÂY DỰNG"
        );
        const idxII1 = updatedRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "II.1. SẢN XUẤT"
        );
        const idxII2 = updatedRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "II.2. DT + LN ĐƯỢC CHIA TỪ LDX"
        );
        const idxII3 = updatedRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)"
        );
        const idxII4 = updatedRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY"
        );
        // --- BẮT ĐẦU THÊM MỚI ---
        const idxIDT = updatedRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "III. ĐẦU TƯ"
        );
        // --- KẾT THÚC THÊM MỚI ---

        if (
            idxTotal !== -1 &&
            idxIXD !== -1 &&
            idxII1 !== -1 &&
            idxII2 !== -1 &&
            idxII3 !== -1 &&
            idxII4 !== -1 &&
            idxIDT !== -1 // <-- Thêm điều kiện kiểm tra
        ) {
            const totalRevenue =
                toNum(updatedRows[idxIXD]?.revenue) +
                toNum(updatedRows[idxII1]?.revenue) +
                toNum(updatedRows[idxII2]?.revenue) +
                toNum(updatedRows[idxII3]?.revenue) +
                toNum(updatedRows[idxII4]?.revenue) +
                toNum(updatedRows[idxIDT]?.revenue); // <-- Cộng thêm doanh thu Đầu tư

            const totalCost =
                toNum(updatedRows[idxIXD]?.cost) +
                toNum(updatedRows[idxII1]?.cost) +
                toNum(updatedRows[idxII2]?.cost) +
                toNum(updatedRows[idxII3]?.cost) +
                toNum(updatedRows[idxII4]?.cost) +
                toNum(updatedRows[idxIDT]?.cost); // <-- Cộng thêm chi phí Đầu tư

            const totalProfit =
                toNum(updatedRows[idxIXD]?.profit) +
                toNum(updatedRows[idxII1]?.profit) +
                toNum(updatedRows[idxII2]?.profit) +
                toNum(updatedRows[idxII3]?.profit) +
                toNum(updatedRows[idxII4]?.profit) +
                toNum(updatedRows[idxIDT]?.profit); // <-- Cộng thêm lợi nhuận Đầu tư

            updatedRows[idxTotal] = {
                ...updatedRows[idxTotal],
                revenue: totalRevenue || null,
                cost: totalCost || null,
                profit: totalProfit || null,
                percent: null,
            };
        }
        return updatedRows;
    };

    const updateVuotCPRows = (inputRows) => {
        const rows = [...inputRows];
        const costOverXD =
            rows.find((r) => (r.name || "").toUpperCase() === "I. XÂY DỰNG")
                ?.costOverQuarter || 0;
        const costOverSX =
            rows.find((r) => (r.name || "").toUpperCase() === "II. SẢN XUẤT")
                ?.costOverQuarter || 0;
        const costOverDT =
            rows.find((r) => (r.name || "").toUpperCase() === "III. ĐẦU TƯ")
                ?.costOverQuarter || 0;
        // ✅ BỔ SUNG: Tìm và lấy lợi nhuận từ hàng "Chi phí đã trả trước"
        const chiPhiTraTruocProfit =
            rows.find((r) => (r.name || "").toUpperCase() === "+ CHI PHÍ ĐÃ TRẢ TRƯỚC")
                ?.profit || 0;
        const idxVuotBPXD = rows.findIndex(
            (r) => (r.name || "").toUpperCase() === "+VƯỢT CP BPXD"
        );
        const idxVuotBPSX = rows.findIndex(
            (r) => (r.name || "").toUpperCase() === "+VƯỢT CP BPSX"
        );
        const idxVuotBPDT = rows.findIndex(
            (r) => (r.name || "").toUpperCase() === "+VƯỢT CP BPĐT"
        );
        let profitBPXD = 0,
            profitBPSX = 0,
            profitBPDT = 0;
        if (idxVuotBPXD !== -1) {
            profitBPXD = toNum(costOverXD);
            rows[idxVuotBPXD].profit = profitBPXD;
        }
        if (idxVuotBPSX !== -1) {
            profitBPSX = toNum(costOverSX);
            rows[idxVuotBPSX].profit = profitBPSX;
        }
        if (idxVuotBPDT !== -1) {
            profitBPDT = toNum(costOverDT);
            rows[idxVuotBPDT].profit = profitBPDT;
        }

        // --- BẮT ĐẦU THAY ĐỔI ---
        const vuotQuarterName = `VƯỢT ${selectedQuarter}`.toUpperCase();
        const idxCpVuot = rows.findIndex(
            (r) => (r.name || "").toUpperCase() === vuotQuarterName
        );
        if (idxCpVuot !== -1) {
            rows[idxCpVuot].profit = profitBPXD + profitBPSX + profitBPDT + toNum(chiPhiTraTruocProfit);
        }
        // --- KẾT THÚC THAY ĐỔI ---

        return rows;
    };
    const updateLoiNhuanRongRow = (inputRows) => {
        const rows = [...inputRows];

        // Tên các hàng cần tìm
        const finalProfitRowName = `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`;
        const vuotQuarterRowName = `VƯỢT ${selectedQuarter}`;

        // Tìm index của các hàng
        const idxLNRong = rows.findIndex(
            (r) => (r.name || "").toUpperCase() === "LỢI NHUẬN RÒNG"
        );
        const idxLNFinal = rows.findIndex(
            (r) =>
                (r.name || "").toUpperCase() ===
                finalProfitRowName.toUpperCase()
        );

        // ✅ Sửa tên 'idxVuotQ2' thành 'idxVuotQuarter'
        const idxVuotQuarter = rows.findIndex(
            (r) =>
                (r.name || "").toUpperCase() ===
                vuotQuarterRowName.toUpperCase()
        );

        // Chỉ tính toán khi tìm thấy tất cả các hàng cần thiết
        if (idxLNRong !== -1 && idxLNFinal !== -1 && idxVuotQuarter !== -1) {
            // Lấy giá trị lợi nhuận từ các hàng
            const loiNhuanSauGiamTru = toNum(rows[idxLNFinal].profit);
            // ✅ Sửa tên 'vuotQ2Profit' thành 'vuotQuarterProfit'
            const vuotQuarterProfit = toNum(rows[idxVuotQuarter].profit);
            console.log('vuotQuarterProfit', vuotQuarterProfit)
            // Công thức tính toán vẫn giữ nguyên
            rows[idxLNRong].profit = loiNhuanSauGiamTru + vuotQuarterProfit;
        }

        return rows;
    };
    // DÁN TOÀN BỘ CODE NÀY VÀO VỊ TRÍ useEffect CŨ
    useEffect(() => {
        // Hàm này chứa toàn bộ logic lấy và xử lý dữ liệu của bạn
        const processData = async () => {
            console.log("Realtime update triggered! Reprocessing data...");
            setLoading(true);

            // ✅ BƯỚC 1: ĐIỀN LẠI LOGIC VÀO 2 HÀM NÀY
            const getCostOverQuarter = async (fieldName) => {
                try {
                    const snap = await getDoc(
                        doc(db, "costAllocationsQuarter", `${selectedYear}_${selectedQuarter}`)
                    );
                    if (snap.exists()) return toNum(snap.data()[fieldName]);
                } catch { }
                return 0;
            };

            const getCpVuotSanXuat = async () => {
                try {
                    const docRef = doc(db, `projects/HKZyMDRhyXJzJiOauzVe/years/${selectedYear}/quarters/${selectedQuarter}`);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (Array.isArray(data.items) && data.items.length > 0) {
                            return data.items.reduce((sum, item) => sum + toNum(item.cpVuot || 0), 0);
                        }
                        if (data.cpVuot !== undefined) {
                            return toNum(data.cpVuot);
                        }
                    }
                } catch (error) {
                    console.error("Lỗi khi lấy cpVuot cho Sản xuất:", error);
                }
                return 0;
            };

            const [
                projectsSnapshot,
                cpVuotCurr,
                cpVuotNhaMay,
                cpVuotKhdt,
                profitChangesDoc,
            ] = await Promise.all([
                getDocs(collection(db, "projects")),
                getCostOverQuarter("totalThiCongCumQuarterOnly"),
                getCpVuotSanXuat(),
                getCostOverQuarter("totalKhdtCumQuarterOnly"),
                getDoc(doc(db, "profitChanges", `${selectedYear}_${selectedQuarter}`)),
            ]);

            const projects = await Promise.all(
                projectsSnapshot.docs.map(async (d) => {
                    const data = d.data();
                    let revenue = 0;
                    let cost = 0;

                    try {
                        const qPath = `projects/${d.id}/years/${selectedYear}/quarters/${selectedQuarter}`;
                        const qSnap = await getDoc(doc(db, qPath));

                        if (qSnap.exists()) {
                            // Lấy tổng doanh thu của quý (overallRevenue)
                            revenue = toNum(qSnap.data().overallRevenue);

                            // Lấy loại công trình để áp dụng logic điều kiện
                            const projectType = (data.type || "").toLowerCase();

                            // Bắt đầu kiểm tra điều kiện
                            if (projectType.includes("nhà máy")) {
                                // TRƯỜNG HỢP 1: NẾU LÀ CÔNG TRÌNH SẢN XUẤT (NHÀ MÁY)
                                // -> Luôn tính chi phí bằng tổng của `totalCost`
                                if (Array.isArray(qSnap.data().items) && qSnap.data().items.length > 0) {
                                    cost = qSnap
                                        .data()
                                        .items.reduce(
                                            (sum, item) => sum + toNum(item.totalCost || 0),
                                            0
                                        );
                                }
                            } else {
                                // TRƯỜNG HỢP 2: CÁC LOẠI CÔNG TRÌNH CÒN LẠI (Dân dụng, Kè, CĐT, v.v.)
                                // -> Áp dụng logic tính toán phức tạp
                                if (Array.isArray(qSnap.data().items) && qSnap.data().items.length > 0) {
                                    const totalItemsRevenue = qSnap
                                        .data()
                                        .items.reduce(
                                            (sum, item) => sum + toNum(item.revenue || 0),
                                            0
                                        );

                                    if (totalItemsRevenue === 0 && revenue === 0) {
                                        // Điều kiện đặc biệt: Nếu cả 2 doanh thu = 0 -> chi phí = 0
                                        cost = 0;
                                    } else {
                                        // Logic cũ
                                        if (totalItemsRevenue === 0) {
                                            // Nếu chỉ doanh thu chi tiết = 0 -> chi phí = tổng `cpSauQuyetToan`
                                            cost = qSnap
                                                .data()
                                                .items.reduce(
                                                    (sum, item) =>
                                                        sum + toNum(item.cpSauQuyetToan || 0),
                                                    0
                                                );
                                        } else {
                                            // Nếu có doanh thu chi tiết -> chi phí = tổng `totalCost`
                                            cost = qSnap
                                                .data()
                                                .items.reduce(
                                                    (sum, item) =>
                                                        sum + toNum(item.totalCost || 0),
                                                    0
                                                );
                                        }
                                    }
                                } else if (revenue === 0) {
                                    // Xử lý trường hợp không có 'items' và không có doanh thu
                                    cost = 0;
                                }
                            }
                        }
                    } catch (error) {
                        console.error("Lỗi khi lấy dữ liệu công trình:", d.id, error);
                    }

                    // Lợi nhuận luôn được tính lại dựa trên doanh thu và chi phí vừa xác định
                    const profit = revenue - cost;
                    const plannedProfitMargin = data.estimatedProfitMargin || null;

                    // Trả về đối tượng công trình hoàn chỉnh để hiển thị
                    return {
                        projectId: d.id,
                        name: data.name,
                        revenue,
                        cost,
                        profit,
                        percent: plannedProfitMargin,
                        costOverQuarter: null,
                        target: null,
                        note: "",
                        suggest: "",
                        type: data.type || "",
                        editable: true,
                    };
                })
            );

            // =================================================================
            // ✅ KẾT THÚC KHỐI CODE THAY THẾ
            // =================================================================

            const finalProfitRowName = `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`;
            const saved = await getDoc(
                doc(db, "profitReports", `${selectedYear}_${selectedQuarter}`)
            );

            const defaultTargets = {
                revenueTargetXayDung: 0,
                profitTargetXayDung: 0,
                revenueTargetSanXuat: 0,
                profitTargetSanXuat: 0,
                revenueTargetDauTu: 0,
                profitTargetDauTu: 0,
            };
            if (saved.exists() && saved.data().summaryTargets) {
                setSummaryTargets({
                    ...defaultTargets,
                    ...saved.data().summaryTargets,
                });
            } else {
                setSummaryTargets(defaultTargets);
            }

            let processedRows; // Khai báo biến ở ngoài để có thể truy cập trong cả if/else

            if (
                saved.exists() &&
                Array.isArray(saved.data().rows) &&
                saved.data().rows.length > 0
            ) {
                // BƯỚC 1: Lấy các hàng không phải là công trình (tiêu đề, tổng, v.v.) từ báo cáo đã lưu.
                // Điều này giúp giữ lại các giá trị được nhập thủ công ở các hàng tổng hợp.
                processedRows = saved
                    .data()
                    .rows.filter((savedRow) => !savedRow.projectId);
                // --- BẮT ĐẦU SỬA LỖI ---
                // Kiểm tra xem hàng "LỢI NHUẬN RÒNG" đã tồn tại trong dữ liệu đã lưu chưa
                const loiNhuanRongExists = processedRows.some(
                    (r) => (r.name || "").toUpperCase() === "LỢI NHUẬN RÒNG"
                );

                // Nếu chưa tồn tại, thêm nó vào cuối danh sách
                if (!loiNhuanRongExists) {
                    processedRows.push({
                        name: "LỢI NHUẬN RÒNG",
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                        editable: false,
                    });
                }
                // --- KẾT THÚC SỬA LỖI ---

                // BƯỚC 2: Coi TẤT CẢ công trình từ database là "dự án mới" cần được chèn lại.
                const newProjects = projects; // Lấy toàn bộ danh sách công trình mới nhất

                // BƯỚC 3: Chạy lại logic chèn công trình vào các nhóm tương ứng.
                // (Giữ nguyên đoạn code này như cũ)
                // BÊN TRONG HÀM fetchData và khối if (saved.exists() ...)

                // BƯỚC 3: Chạy lại logic chèn công trình vào các nhóm tương ứng.
                if (newProjects.length > 0) {
                    // ====================== BẮT ĐẦU CODE MỚI ======================

                    // 1. Tách các dự án có tên chứa "KÈ" ra một nhóm riêng
                    const keProjects = newProjects.filter((p) =>
                        (p.name || "").toUpperCase().includes("KÈ")
                    );
                    // Các dự án còn lại không chứa "KÈ"
                    const otherProjects = newProjects.filter(
                        (p) => !(p.name || "").toUpperCase().includes("KÈ")
                    );

                    // 2. Ưu tiên chèn các dự án "KÈ" vào đúng nhóm "I.2. KÈ"
                    if (keProjects.length > 0) {
                        const keGroupIndex = processedRows.findIndex(
                            (r) =>
                                (r.name || "").trim().toUpperCase() ===
                                "I.2. KÈ"
                        );
                        if (keGroupIndex !== -1) {
                            processedRows.splice(
                                keGroupIndex + 1,
                                0,
                                ...keProjects.map((p) => ({
                                    ...p,
                                    editable: true,
                                }))
                            );
                        }
                    }

                    // 3. Sử dụng logic groupMapping cũ cho các dự án CÒN LẠI
                    const groupMapping = {
                        "Thi cong": "I.1. DÂN DỤNG + GIAO THÔNG",
                        "Thi công": "I.1. DÂN DỤNG + GIAO THÔNG",
                        CĐT: "I.3. CÔNG TRÌNH CÔNG TY CĐT",
                        XNII: "I.4. XÍ NGHIỆP XD II",
                        "KH-ĐT": "III. ĐẦU TƯ",
                        "Nhà máy": "II.1. SẢN XUẤT",
                    };

                    Object.entries(groupMapping).forEach(
                        ([type, groupName]) => {
                            // Chỉ lọc từ các dự án còn lại (otherProjects)
                            const projectsToAdd = otherProjects.filter(
                                (p) => p.type === type
                            );
                            if (projectsToAdd.length > 0) {
                                const groupIndex = processedRows.findIndex(
                                    (r) =>
                                        (r.name || "").trim().toUpperCase() ===
                                        groupName.toUpperCase()
                                );
                                if (groupIndex !== -1) {
                                    processedRows.splice(
                                        groupIndex + 1,
                                        0,
                                        ...projectsToAdd.map((p) => ({
                                            ...p,
                                            editable: true,
                                        }))
                                    );
                                }
                            }
                        }
                    );
                    // ====================== KẾT THÚC CODE MỚI ======================
                }
            } else {
                // Logic để tạo báo cáo mới khi chưa có dữ liệu lưu
                const groupBy = (arr, cond) => arr.filter(cond);
                const sumGroup = (group) => {
                    const revenue = group.reduce(
                        (s, r) => s + toNum(r.revenue),
                        0
                    );
                    const cost = group.reduce((s, r) => s + toNum(r.cost), 0);
                    const profit = revenue - cost;
                    const percent = revenue ? (profit / revenue) * 100 : null;
                    return { revenue, cost, profit, percent };
                };
                const groupI1 = groupBy(
                    projects,
                    (r) =>
                        (r.type === "Thi cong" || r.type === "Thi công") &&
                        (r.revenue !== 0 || r.cost !== 0) &&
                        !(r.name || "").toUpperCase().includes("KÈ")
                );
                const groupI2 = groupBy(projects, (r) =>
                    (r.name || "").toUpperCase().includes("KÈ")
                );
                const groupI3 = groupBy(projects, (r) => r.type === "CĐT");
                const groupI4 = groupBy(projects, (r) => r.type === "XNII");
                const groupII = projects.filter((r) =>
                    (r.type || "").toLowerCase().includes("nhà máy")
                );
                const groupIII_DauTu = groupBy(
                    projects,
                    (r) => r.type === "KH-ĐT"
                );

                processedRows = [
                    {
                        name: "I. XÂY DỰNG",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        costOverQuarter: null,
                    },
                    {
                        name: "I.1. Dân Dụng + Giao Thông",
                        ...sumGroup(groupI1),
                    },
                    ...groupI1,
                    { name: "I.2. KÈ", ...sumGroup(groupI2), percent: null },
                    ...groupI2,
                    {
                        name: "I.3. CÔNG TRÌNH CÔNG TY CĐT",
                        ...sumGroup(groupI3),
                    },
                    ...groupI3,
                    { name: "I.4. Xí nghiệp XD II", ...sumGroup(groupI4) },
                    ...groupI4,
                    {
                        name: "II. SẢN XUẤT",
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: "II.1. SẢN XUẤT",
                        ...sumGroup(groupII),
                        costOverQuarter: null,
                    },
                    ...groupII.map((p) => ({ ...p, editable: false })),
                    {
                        name: "II.2. DT + LN ĐƯỢC CHIA TỪ LDX",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: "LỢI NHUẬN LIÊN DOANH (LDX)",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: "GIẢM LN LDX",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: "LỢI NHUẬN LIÊN DOANH (SÀ LAN)",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: "LỢI NHUẬN BÁN SP NGOÀI (RON CỐNG + 68)",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: "III. ĐẦU TƯ",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        costOverQuarter: null,
                    },
                    ...groupIII_DauTu.map((p) => ({ ...p, editable: true })),
                    {
                        name: "TỔNG",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`,
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: "V. GIẢM LỢI NHUẬN",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: "VI. THU NHẬP KHÁC",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: `VII. KHTSCĐ NĂM ${selectedYear}`,
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: "VIII. GIẢM LÃI ĐT DỰ ÁN",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: finalProfitRowName,
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: `VƯỢT ${selectedQuarter}`,
                        revenue: null,
                        cost: null,
                        profit: null,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: "+Vượt CP BPXD",
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: "+Vượt CP BPSX",
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: "+Vượt CP BPĐT",
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: "+ Chi phí đã trả trước",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        // <-- THÊM HÀNG MỚI TẠI ĐÂY
                        name: "LỢI NHUẬN RÒNG",
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                        editable: false, // Hàng này không cho phép sửa thủ công
                    },
                ];
            }

            const idxXD = processedRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "I. XÂY DỰNG"
            );
            if (idxXD !== -1)
                processedRows[idxXD].costOverQuarter = cpVuotCurr || 0;

            const idxSX = processedRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "II. SẢN XUẤT"
            );
            if (idxSX !== -1)
                processedRows[idxSX].costOverQuarter = -toNum(cpVuotNhaMay) || 0;

            const idxDT = processedRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "III. ĐẦU TƯ"
            );
            if (idxDT !== -1)
                processedRows[idxDT].costOverQuarter = cpVuotKhdt || 0;

            let finalRows = processedRows;

            let totalDecreaseProfit = 0;
            let totalIncreaseProfit = 0;
            if (profitChangesDoc.exists()) {
                totalDecreaseProfit = toNum(
                    profitChangesDoc.data().totalDecreaseProfit
                );
                totalIncreaseProfit = toNum(
                    profitChangesDoc.data().totalIncreaseProfit
                );
            }
            const idxV_update = finalRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() === "V. GIẢM LỢI NHUẬN"
            );
            if (idxV_update !== -1)
                finalRows[idxV_update].profit = totalDecreaseProfit;

            const idxVI_update = finalRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() === "VI. THU NHẬP KHÁC"
            );
            if (idxVI_update !== -1)
                finalRows[idxVI_update].profit = totalIncreaseProfit;
            // BƯỚC 1: Cập nhật các nhóm con và các mục chi tiết
            finalRows = updateGroupI1(finalRows);
            finalRows = updateGroupI2(finalRows);
            finalRows = updateGroupI3(finalRows);
            finalRows = updateGroupI4(finalRows);
            finalRows = updateLDXRow(finalRows);
            finalRows = updateDTLNLDXRow(finalRows);
            finalRows = updateSalanRow(finalRows);
            finalRows = updateThuNhapKhacRow(finalRows);
            finalRows = updateGroupII1(finalRows);
            finalRows = updateDauTuRow(finalRows);

            // BƯỚC 2: Cập nhật các mục tổng hợp lớn (phụ thuộc vào các nhóm con)
            finalRows = updateXayDungRow(finalRows);
            finalRows = updateSanXuatRow(finalRows);

            // BƯỚC 3: Tính toán dòng TỔNG (phụ thuộc vào các mục lớn)
            finalRows = calculateTotals(finalRows);

            // BƯỚC 4: Cập nhật Lợi nhuận Quý (phụ thuộc vào TỔNG)
            const idxTotal = finalRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "TỔNG"
            );
            const idxIV = finalRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() ===
                    `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`.toUpperCase()
            );
            if (idxIV !== -1 && idxTotal !== -1) {
                finalRows[idxIV].profit = toNum(finalRows[idxTotal].profit);
            }

            // BƯỚC 5: Tính "LỢI NHUẬN SAU GIẢM TRỪ" (phụ thuộc vào Lợi nhuận Quý và các mục V, VI, VII, VIII)
            const idxV = finalRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "V. GIẢM LỢI NHUẬN"
            );
            const idxVI = finalRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "VI. THU NHẬP KHÁC"
            );
            const idxVII = finalRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() ===
                    `VII. KHTSCĐ NĂM ${selectedYear}`.toUpperCase()
            );
            const idxVIII = finalRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() ===
                    "VIII. GIẢM LÃI ĐT DỰ ÁN"
            );
            const idxLNFinal = finalRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() ===
                    `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`.toUpperCase()
            );

            if (
                idxLNFinal !== -1 &&
                idxIV !== -1 &&
                idxV !== -1 &&
                idxVI !== -1 &&
                idxVII !== -1 &&
                idxVIII !== -1
            ) {
                finalRows[idxLNFinal].profit =
                    toNum(finalRows[idxIV].profit) -
                    toNum(finalRows[idxV].profit) +
                    toNum(finalRows[idxVI].profit) -
                    toNum(finalRows[idxVII].profit) -
                    toNum(finalRows[idxVIII].profit);
            }

            // BƯỚC 6: Cập nhật các khoản vượt chi
            finalRows = updateVuotCPRows(finalRows);

            // BƯỚC 7: Tính LỢI NHUẬN RÒNG (phụ thuộc vào "LỢI NHUẬN SAU GIẢM TRỪ" và "VƯỢT QUÝ")
            finalRows = updateLoiNhuanRongRow(finalRows);

            if (
                idxLNFinal !== -1 &&
                idxIV !== -1 &&
                idxV !== -1 &&
                idxVI !== -1 &&
                idxVII !== -1 &&
                idxVIII !== -1
            ) {
                finalRows[idxLNFinal].profit =
                    toNum(finalRows[idxIV].profit) -
                    toNum(finalRows[idxV].profit) +
                    toNum(finalRows[idxVI].profit) -
                    toNum(finalRows[idxVII].profit) -
                    toNum(finalRows[idxVIII].profit);
            }

            const filteredRows = finalRows.filter((r) => {
                const rev = toNum(r.revenue);
                const cost = toNum(r.cost);
                const profit = toNum(r.profit);
                const nameUpper = (r.name || "").trim().toUpperCase();
                if (
                    nameUpper === "I.1. DÂN DỤNG + GIAO THÔNG" ||
                    nameUpper === "I.2. KÈ"
                ) {
                    return rev !== 0 || cost !== 0 || profit !== 0;
                }

                const alwaysShowRows = [
                    "LỢI NHUẬN LIÊN DOANH (LDX)",
                    "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)",
                    "GIẢM LN LDX",
                    "LỢI NHUẬN LIÊN DOANH (SÀ LAN)",
                    "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)",
                    "LỢI NHUẬN BÁN SP NGOÀI (RON CỐNG + 68)",
                ];
                if (alwaysShowRows.includes(nameUpper)) {
                    return true;
                }

                if (rev === 0 && cost === 0 && profit === 0) {
                    if (
                        /^[IVX]+\./.test(nameUpper) ||
                        [
                            "I. XÂY DỰNG",
                            "II. SẢN XUẤT",
                            "III. ĐẦU TƯ",
                            "TỔNG",
                            `VƯỢT ${selectedQuarter}`.toUpperCase(),
                            "+VƯỢT CP BPXD",
                            "+VƯỢT CP BPSX",
                            "+VƯỢT CP BPĐT",
                            `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`.toUpperCase(),
                            "+ CHI PHÍ ĐÃ TRẢ TRƯỚC",
                            "LỢI NHUẬN RÒNG", // <-- THÊM DÒNG NÀY VÀO ĐÂY
                        ].includes(nameUpper)
                    ) {
                        return true;
                    }
                    return false;
                }
                return true;
            });

            setRows(filteredRows);
            setLoading(false);
        };

        processData();

        // Mảng chứa các hàm để hủy listener
        const unsubscribes = [];

        const debouncedProcess = () => {
            clearTimeout(window.reportDebounceTimeout);
            window.reportDebounceTimeout = setTimeout(processData, 500); // Chờ 500ms
        };

        // Listener 1: Lắng nghe thay đổi trên collection `projects` (thêm/xóa dự án)
        unsubscribes.push(onSnapshot(collection(db, "projects"), () => {
            console.log("Change detected in 'projects' collection.");
            debouncedProcess();
        }));

        // Listener 2: Lắng nghe thay đổi trên TẤT CẢ các collection con `quarters`
        unsubscribes.push(onSnapshot(collectionGroup(db, 'quarters'), () => {
            console.log("Change detected in a 'quarters' sub-collection.");
            debouncedProcess();
        }));

        // ✅ THÊM MỚI - Listener 3: Lắng nghe thay đổi của file costAllocationsQuarter
        unsubscribes.push(onSnapshot(doc(db, "costAllocationsQuarter", `${selectedYear}_${selectedQuarter}`), () => {
            console.log("Change detected in 'costAllocationsQuarter'.");
            debouncedProcess();
        }));

        // ✅ THÊM MỚI - Listener 4: Lắng nghe thay đổi của file profitChanges
        unsubscribes.push(onSnapshot(doc(db, "profitChanges", `${selectedYear}_${selectedQuarter}`), () => {
            console.log("Change detected in 'profitChanges'.");
            debouncedProcess();
        }));


        // Hàm dọn dẹp: sẽ chạy khi component unmount hoặc khi year/quarter thay đổi
        return () => {
            console.log("Cleaning up all listeners for quarter report.");
            unsubscribes.forEach(unsub => unsub());
            clearTimeout(window.reportDebounceTimeout);
        };

    }, [selectedYear, selectedQuarter]);

    const handleSave = async (rowsToSave) => {
        const rowsData = Array.isArray(rowsToSave) ? rowsToSave : rows;
        const dataToSave = {
            rows: rowsData,
            summaryTargets: summaryTargets,
            updatedAt: new Date().toISOString(),
        };
        await setDoc(
            doc(db, "profitReports", `${selectedYear}_${selectedQuarter}`),
            dataToSave
        );
        console.log("Đã lưu báo cáo và chỉ tiêu thành công!");
    };

    const rowsHideRevenueCost = [
        `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`.toUpperCase(),
        "V. GIẢM LỢI NHUẬN",
        "VI. THU NHẬP KHÁC",
        `VII. KHTSCĐ NĂM ${selectedYear}`.toUpperCase(),
        "VIII. GIẢM LÃI ĐT DỰ ÁN",
        `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`.toUpperCase(),
        `+ VƯỢT CP BPXN DO KO ĐẠT DT ${selectedQuarter}`.toUpperCase(),
        `+ VƯỢT CP BPSX DO KO ĐẠT DT ${selectedQuarter}`.toUpperCase(),
        `+ VƯỢT CP BPĐT DO KO CÓ DT ${selectedQuarter} (LÃI + THUÊ VP)`.toUpperCase(),
        "+ CHI PHÍ ĐÃ TRẢ TRƯỚC",
    ];
    const format = (v, field = "", row = {}) => {
        const name = (row.name || "").trim().toUpperCase();

        // ✅ THÊM ĐIỀU KIỆN MỚI TẠI ĐÂY
        if (name === "I.1. DÂN DỤNG + GIAO THÔNG" && field === "percent") {
            return "–";
        }
        // KẾT THÚC THÊM MỚI

        if (field === "percent" && name === "TỔNG") return "–";
        if (
            ["revenue", "cost"].includes(field) &&
            rowsHideRevenueCost.includes(name)
        ) {
            return "–";
        }
        if (field === "percent" && name === "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY") {
            return "–";
        }
        if (v === null || v === undefined) return "–";
        if (typeof v === "number")
            return field === "percent" ? `${v.toFixed(2)}%` : formatNumber(v);
        return v;
    };

    const isDetailUnderII1 = (idx) => {
        const idxII1 = rows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "II.1. SẢN XUẤT"
        );
        const idxEnd = (() => {
            for (let i = idxII1 + 1; i < rows.length; i++) {
                const name = (rows[i].name || "").trim().toUpperCase();
                if (
                    name.startsWith("II.2") ||
                    name.startsWith("II.3") ||
                    name.startsWith("II.4") ||
                    name.startsWith("III.")
                ) {
                    return i;
                }
            }
            return rows.length;
        })();
        return (
            idx > idxII1 &&
            idx < idxEnd &&
            !(rows[idx].name || "").match(/^[IVX]+\./)
        );
    };

    const handleCellChange = (e, idx, field) => {
        const rawValue = e.target.value;
        let newValue;
        if (["note", "suggest"].includes(field)) {
            newValue = rawValue;
        } else {
            newValue = toNum(rawValue);
        }

        if (
            ["revenue", "cost"].includes(field) &&
            typeof newValue === "number" &&
            newValue < 0
        ) {
            return;
        }

        let newRows = [...rows];
        newRows[idx][field] = newValue;

        const name = (newRows[idx].name || "").trim().toUpperCase();
        // Đoạn code mới để dán vào
        // ----------------------------------------------------------------
        // ✅ BẮT ĐẦU LOGIC MỚI: TỰ ĐỘNG TÍNH LỢI NHUẬN
        // Một hàng được tự động tính lợi nhuận nếu nó là một công trình có thể chỉnh sửa.
        // Thuộc tính `editable: true` đã được thiết lập cho các công trình mới và các hàng cần chỉnh sửa.
        const isEditableProjectRow = newRows[idx].editable === true;

        // Khi người dùng thay đổi "Doanh thu" hoặc "Chi phí" của một hàng có thể chỉnh sửa,
        // tự động tính lại "Lợi nhuận" cho hàng đó.
        if (["revenue", "cost"].includes(field) && isEditableProjectRow) {
            const rev = toNum(newRows[idx].revenue);
            const cost = toNum(newRows[idx].cost);
            newRows[idx].profit = rev - cost;
        }
        // --- TÍNH TOÁN LẠI CÁC DÒNG TỔNG HỢP THEO ĐÚNG THỨ TỰ ---
        let finalRows = newRows;

        // BƯỚC 1: Cập nhật các nhóm con và các mục chi tiết
        finalRows = updateGroupI1(finalRows);
        finalRows = updateGroupI2(finalRows);
        finalRows = updateGroupI3(finalRows);
        finalRows = updateGroupI4(finalRows);
        finalRows = updateLDXRow(finalRows);
        finalRows = updateDTLNLDXRow(finalRows);
        finalRows = updateSalanRow(finalRows);
        finalRows = updateThuNhapKhacRow(finalRows);
        finalRows = updateGroupII1(finalRows);
        finalRows = updateDauTuRow(finalRows);

        // BƯỚC 2: Cập nhật các mục tổng hợp lớn (phụ thuộc vào các nhóm con)
        finalRows = updateXayDungRow(finalRows);
        finalRows = updateSanXuatRow(finalRows);

        // BƯỚC 3: Tính toán dòng TỔNG (phụ thuộc vào các mục lớn)
        finalRows = calculateTotals(finalRows);

        // BƯỚC 4: Cập nhật Lợi nhuận Quý (phụ thuộc vào TỔNG)
        const idxTotal = finalRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "TỔNG"
        );
        const idxIV = finalRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`.toUpperCase()
        );
        if (idxIV !== -1 && idxTotal !== -1) {
            finalRows[idxIV].profit = toNum(finalRows[idxTotal].profit);
        }

        // BƯỚC 5: Tính "LỢI NHUẬN SAU GIẢM TRỪ" (phụ thuộc vào Lợi nhuận Quý và các mục V, VI, VII, VIII)
        const idxV = finalRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "V. GIẢM LỢI NHUẬN"
        );
        const idxVI = finalRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "VI. THU NHẬP KHÁC"
        );
        const idxVII = finalRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                `VII. KHTSCĐ NĂM ${selectedYear}`.toUpperCase()
        );
        const idxVIII = finalRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "VIII. GIẢM LÃI ĐT DỰ ÁN"
        );
        const idxLNFinal = finalRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`.toUpperCase()
        );

        if (
            idxLNFinal !== -1 &&
            idxIV !== -1 &&
            idxV !== -1 &&
            idxVI !== -1 &&
            idxVII !== -1 &&
            idxVIII !== -1
        ) {
            finalRows[idxLNFinal].profit =
                toNum(finalRows[idxIV].profit) -
                toNum(finalRows[idxV].profit) +
                toNum(finalRows[idxVI].profit) -
                toNum(finalRows[idxVII].profit) -
                toNum(finalRows[idxVIII].profit);
        }
        // BƯỚC 6: Cập nhật các khoản vượt chi
        finalRows = updateVuotCPRows(finalRows);

        // BƯỚC 7: Tính LỢI NHUẬN RÒNG (phụ thuộc vào "LỢI NHUẬN SAU GIẢM TRỪ" và "VƯỢT QUÝ")
        finalRows = updateLoiNhuanRongRow(finalRows);

        // Cập nhật state cuối cùng để UI hiển thị
        setRows(finalRows);
    };
    const isDetailUnderI1 = (idx) => {
        const idxI1 = rows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "I.1. DÂN DỤNG + GIAO THÔNG"
        );
        const idxI2 = rows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "I.2. KÈ"
        );
        return (
            idx > idxI1 &&
            (idxI2 === -1 || idx < idxI2) &&
            !(rows[idx].name || "").match(/^[IVX]+\./)
        );
    };

    const renderEditableCell = (r, idx, field, align = "right") => {
        const isEditing =
            editingCell.idx === idx && editingCell.field === field;
        const value = r[field];
        const disallowedFields = ["percent"];
        const nameUpper = (r.name || "").trim().toUpperCase();
        const isCalcRow = [
            `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`,
            `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`.toUpperCase(),
            `+ Vượt CP BPXN do ko đạt DT ${selectedQuarter}`,
            `V. GIẢM LỢI NHUẬN`,
            "VI. THU NHẬP KHÁC",
        ].includes(nameUpper);
        // THÊM ĐOẠN CODE MỚI NÀY VÀO
        // ----------------------------------------------------------------
        // ✅ BẮT ĐẦU LOGIC MỚI: KIỂM TRA QUYỀN CHỈNH SỬA
        const isProjectDetailRow = !!r.projectId; // Hàng này là chi tiết của một dự án nếu có projectId

        const allowEdit = (() => {
            // Không bao giờ cho phép sửa các cột tính toán hoặc bị cấm
            if (disallowedFields.includes(field) || isCalcRow) {
                return false;
            }
            // Cho phép sửa các cột target, note, suggest
            if (["target", "note", "suggest"].includes(field)) {
                return true;
            }
            // Đối với các cột còn lại (revenue, cost, profit):
            // Chỉ cho phép sửa nếu hàng đó được đánh dấu là "editable" VÀ không phải là hàng chi tiết của dự án.
            if (["revenue", "cost", "profit"].includes(field)) {
                return r.editable && !isProjectDetailRow;
            }
            // Mặc định không cho sửa
            return false;
        })();
        // ✅ KẾT THÚC LOGIC MỚI
        // ----------------------------------------------------------------
        if (field === "costOverQuarter") {
            if (nameUpper === "III. ĐẦU TƯ") {
                return (
                    <TableCell
                        align={align}
                        sx={cellStyle}
                        onDoubleClick={() => setEditingCell({ idx, field })}
                    >
                        {isEditing ? (
                            <TextField
                                size="small"
                                variant="standard"
                                value={value ?? ""}
                                onChange={(e) =>
                                    handleCellChange(e, idx, field)
                                }
                                onBlur={() =>
                                    setEditingCell({ idx: -1, field: "" })
                                }
                                onKeyDown={(e) =>
                                    e.key === "Enter" &&
                                    setEditingCell({ idx: -1, field: "" })
                                }
                                autoFocus
                                inputProps={{ style: { textAlign: align } }}
                            />
                        ) : (
                            format(value)
                        )}
                    </TableCell>
                );
            }
            return (
                <TableCell align={align} sx={cellStyle}>
                    {format(value)}
                </TableCell>
            );
        }

        return (
            <TableCell
                align={align}
                sx={cellStyle}
                onDoubleClick={() =>
                    allowEdit && setEditingCell({ idx, field })
                }
            >
                {allowEdit && isEditing ? (
                    <TextField
                        size="small"
                        variant="standard"
                        value={value}
                        onChange={(e) => handleCellChange(e, idx, field)}
                        onBlur={() => setEditingCell({ idx: -1, field: "" })}
                        onKeyDown={(e) =>
                            e.key === "Enter" &&
                            setEditingCell({ idx: -1, field: "" })
                        }
                        autoFocus
                        inputProps={{ style: { textAlign: align } }}
                    />
                ) : field === "suggest" && value ? (
                    <Chip label={format(value)} color="warning" size="small" />
                ) : (
                    format(value, field, r)
                )}
            </TableCell>
        );
    };

    const handleExportExcel = async () => {
        if (!rows || rows.length === 0) return;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Báo cáo quý");
        sheet.views = [{ state: "frozen", ySplit: 1 }];
        const headers = [
            "CÔNG TRÌNH",
            "DOANH THU",
            "CHI PHÍ ĐÃ CHI",
            "LỢI NHUẬN",
            "% LN / GIÁ VỐN", // Thêm vào đây
            "% LN THEO KH", // <-- ĐÃ SỬA
            "% LN QUÍ",
            "CP VƯỢT QUÝ",
            "CHỈ TIÊU",
            "THUẬN LỢI / KHÓ KHĂN",
            "ĐỀ XUẤT",
        ];
        sheet.addRow(headers);
        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, size: 13, name: "Arial" };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFCCE5FF" },
            };
            cell.border = {
                top: { style: "medium" },
                bottom: { style: "medium" },
                left: { style: "thin" },
                right: { style: "thin" },
            };
        });
        rows.forEach((r, idx) => {
            const row = sheet.addRow([
                r.name,
                r.revenue,
                r.cost,
                r.profit,
                r.projectId && toNum(r.cost) > 0
                    ? toNum(r.profit) / toNum(r.cost)
                    : "",
                r.percent != null ? +r.percent : "",
                r.revenue ? +(r.profit / r.revenue) * 100 : "",
                r.costOverQuarter,
                r.target,
                r.note,
                r.suggest,
            ]);
            const name = (r.name || "").trim().toUpperCase();
            const isGroup = /^[IVX]+\./.test(name);
            const isTotal = name.includes("TỔNG");
            row.eachCell((cell, col) => {
                cell.font = {
                    name: "Arial",
                    size: 12,
                    bold: isGroup || isTotal,
                };
                cell.alignment = {
                    horizontal: col === 1 ? "left" : "right",
                    vertical: "middle",
                };
                if ([2, 3, 4, 7, 8].includes(col)) cell.numFmt = "#,##0";
                if ([5, 6].includes(col)) cell.numFmt = '0.00"%"';
                if (col === 10 && r.suggest) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFFFF3B3" },
                    };
                } else if (isGroup) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFFFF4CC" },
                    };
                } else if (isTotal) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFDFFFD6" },
                    };
                } else if (idx % 2 === 1) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFF9F9F9" },
                    };
                }
                cell.border = {
                    top: { style: "thin", color: { argb: "FFDDDDDD" } },
                    bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
                    left: { style: "thin", color: { argb: "FFDDDDDD" } },
                    right: { style: "thin", color: { argb: "FFDDDDDD" } },
                };
            });
        });
        sheet.columns = [
            { width: 40 },
            { width: 18 },
            { width: 18 },
            { width: 18 },
            { width: 16 }, // % LN / GIÁ VỐN

            { width: 16 },
            { width: 14 },
            { width: 18 },
            { width: 18 },
            { width: 28 },
            { width: 22 },
        ];
        const buffer = await workbook.xlsx.writeBuffer();
        const dateStr = new Date()
            .toLocaleDateString("vi-VN")
            .replaceAll("/", "-");
        saveAs(
            new Blob([buffer]),
            `BaoCaoLoiNhuan_${selectedQuarter}_${selectedYear}_${dateStr}.xlsx`
        );
    };

    const isDTLNLDX = (r) => {
        const name = (r.name || "").trim().toUpperCase();
        return (
            name.includes("DT + LN ĐƯỢC CHIA TỪ LDX") ||
            name.includes("DT + LN ĐƯỢC CHIA TỪ SÀ LAN")
        );
    };

    const getValueByName = (name, field) => {
        const row = rows.find(
            (r) => (r.name || "").trim().toUpperCase() === name.toUpperCase()
        );
        return row ? toNum(row[field]) : 0;
    };

    const summaryData = {
        revenueXayDung: getValueByName("I. XÂY DỰNG", "revenue"),
        profitXayDung: getValueByName("I. XÂY DỰNG", "profit"),
        costOverXayDung: getValueByName("I. XÂY DỰNG", "costOverQuarter"),
        revenueSanXuat: getValueByName("II.1. SẢN XUẤT", "revenue"),
        profitSanXuat: getValueByName("II. SẢN XUẤT", "profit"),
        costOverSanXuat: getValueByName("II. SẢN XUẤT", "costOverQuarter"),
        revenueDauTu: getValueByName("III. ĐẦU TƯ", "revenue"),
        profitDauTu: getValueByName("III. ĐẦU TƯ", "profit"),
        costOverDauTu: getValueByName("III. ĐẦU TƯ", "costOverQuarter"),
    };

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "#f7faff", py: 4 }}>
            {loading && (
                <Box
                    sx={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        bgcolor: "rgba(255,255,255,0.6)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1300,
                    }}
                >
                    <CircularProgress size={64} color="primary" />
                </Box>
            )}
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 2,
                        flexWrap: "wrap",
                        gap: 2,
                        rowGap: 2,
                    }}
                >
                    <Typography
                        variant="h6"
                        fontWeight={700}
                        color="primary"
                        sx={{ fontSize: { xs: 16, sm: 18, md: 20 } }}
                    >
                        Báo cáo quý: {selectedQuarter}.{selectedYear}
                    </Typography>
                    <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        flexWrap="wrap"
                    >
                        <Button
                            variant="outlined"
                            color="secondary"
                            startIcon={<FunctionsIcon />}
                            onClick={() => setFormulaDialogOpen(true)} // Mở dialog khi click
                            sx={{ borderRadius: 2, minWidth: 100 }}
                        >
                            Công Thức
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<SaveIcon />}
                            onClick={handleSave}
                            sx={{ borderRadius: 2, minWidth: 100 }}
                        >
                            Lưu
                        </Button>
                        <Button
                            variant="outlined"
                            color="info"
                            onClick={handleExportExcel}
                            sx={{ borderRadius: 2, minWidth: 100 }}
                        >
                            Excel
                        </Button>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>Quý</InputLabel>
                            <Select
                                value={selectedQuarter}
                                label="Chọn quý"
                                onChange={(e) =>
                                    setSelectedQuarter(e.target.value)
                                }
                            >
                                {"Q1 Q2 Q3 Q4".split(" ").map((q) => (
                                    <MenuItem key={q} value={q}>
                                        {q}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            size="small"
                            label="Năm"
                            type="number"
                            value={selectedYear}
                            onChange={(e) =>
                                setSelectedYear(Number(e.target.value))
                            }
                            sx={{ minWidth: 80 }}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={tvMode}
                                    onChange={() => setTvMode(!tvMode)}
                                />
                            }
                            label="TV"
                        />
                        <Button
                            variant="outlined"
                            color="success"
                            onClick={() => setAddModal(true)}
                            sx={{ borderRadius: 2, minWidth: 100 }}
                        >
                            + Thêm
                        </Button>
                    </Stack>
                </Box>
                <ProfitSummaryTable
                    data={summaryData}
                    targets={summaryTargets}
                    onTargetChange={handleSummaryTargetChange}
                />
                <TableContainer
                    sx={{
                        maxHeight: "75vh",
                        minWidth: 1200,
                        overflowX: "auto",
                        border: "1px solid #e0e0e0",
                        borderRadius: 1,
                    }}
                >
                    <Table size="small" sx={{ minWidth: 1200 }}>
                        <TableHead
                            sx={{
                                position: "sticky",
                                top: 0,
                                zIndex: 100,
                                // Đặt nền xanh cho toàn bộ khu vực a
                                backgroundColor: "#1565c0",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",

                                // Áp dụng style cho tất cả các ô tiêu đề (th) bên trong
                                "& th": {
                                    color: "#ffffff !important", // Chữ màu trắng (thêm !important để ưu tiên)
                                    backgroundColor: "#1565c0 !important", // Nền màu xanh (thêm !important để đảm bảo)
                                    fontWeight: 700,
                                    fontSize: { xs: 12, sm: 14, md: 16 },
                                    textAlign: "center",
                                    borderBottom: "2px solid #fff",
                                    whiteSpace: "nowrap",
                                    px: 2,
                                    py: 1,
                                },
                            }}
                        >
                            <TableRow>
                                {[
                                    "CÔNG TRÌNH",
                                    "DOANH THU",
                                    "CHI PHÍ ĐÃ CHI",
                                    "LỢI NHUẬN",
                                    "% LN / GIÁ VỐN",
                                    "% LN THEO KH", // <-- ĐÃ SỬA
                                    "% LN QUÍ",
                                    cpVuotLabel,
                                    "CHỈ TIÊU",
                                    "THUẬN LỢI / KHÓ KHĂN",
                                    "ĐỀ XUẤT",
                                ].map((label, i) => (
                                    <TableCell
                                        key={i}
                                        align={i > 0 ? "right" : "left"}
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: {
                                                xs: 12,
                                                sm: 14,
                                                md: 16,
                                            },
                                            whiteSpace: "nowrap",
                                            px: 2,
                                            py: 1,
                                        }}
                                    >
                                        {label}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((r, idx) => (
                                <TableRow
                                    key={idx}
                                    sx={{
                                        height: { xs: 48, md: 56 },
                                        bgcolor: r.name
                                            ?.toUpperCase()
                                            .includes("LỢI NHUẬN SAU GIẢM TRỪ")
                                            ? "#f3e5f5"
                                            : r.name?.includes("TỔNG")
                                                ? "#e8f5e9"
                                                : r.name?.match(/^[IVX]+\./)
                                                    ? "#fff9c4"
                                                    : idx % 2 === 0
                                                        ? "#ffffff"
                                                        : "#f9f9f9",
                                        "&:hover": { bgcolor: "#f5f5f5" },
                                        fontWeight: r.name
                                            ?.toUpperCase()
                                            .includes("LỢI NHUẬN SAU GIẢM TRỪ")
                                            ? 900
                                            : r.name?.includes("TỔNG")
                                                ? 800
                                                : r.name?.match(/^[IVX]+\./)
                                                    ? 700
                                                    : 400,
                                        fontSize: r.name
                                            ?.toUpperCase()
                                            .includes("LỢI NHUẬN SAU GIẢM TRỪ")
                                            ? 20
                                            : r.name?.match(/^[IVX]+\./)
                                                ? 18
                                                : "inherit",
                                    }}
                                >
                                    <TableCell
                                        sx={{
                                            minWidth: 300,
                                            maxWidth: 300,
                                            whiteSpace: "normal",
                                            wordBreak: "break-word",
                                            px: 2,
                                            py: 1,
                                        }}
                                        title={r.name}
                                    >
                                        {r.name?.match(/^[IVX]+\./) && (
                                            <KeyboardArrowRightIcon
                                                fontSize={
                                                    tvMode ? "medium" : "small"
                                                }
                                                sx={{
                                                    verticalAlign: "middle",
                                                    mr: 0.5,
                                                }}
                                            />
                                        )}
                                        {r.name}
                                    </TableCell>
                                    {renderEditableCell(r, idx, "revenue")}
                                    {renderEditableCell(r, idx, "cost")}
                                    {renderEditableCell(r, idx, "profit")}
                                    <TableCell align="center" sx={cellStyle}>
                                        {
                                            // THÊM ĐIỀU KIỆN MỚI Ở ĐÂY
                                            isDetailUnderI1(idx) ||
                                                isDetailUnderII1(idx)
                                                ? "–" // Nếu là chi tiết của I.1 hoặc II.1, luôn hiển thị "–"
                                                : r.projectId &&
                                                    toNum(r.cost) > 0 // Giữ lại logic cũ cho các trường hợp khác
                                                    ? `${(
                                                        (toNum(r.profit) /
                                                            toNum(r.cost)) *
                                                        100
                                                    ).toFixed(2)}%`
                                                    : "–"
                                        }
                                    </TableCell>
                                    {isDTLNLDX(r) ? (
                                        <TableCell
                                            align="center"
                                            sx={{ ...cellStyle, px: 2, py: 1 }}
                                        >
                                            <Typography
                                                sx={{
                                                    fontStyle: "italic",
                                                    color: "#757575",
                                                }}
                                            >
                                                –
                                            </Typography>
                                        </TableCell>
                                    ) : (
                                        renderEditableCell(
                                            r,
                                            idx,
                                            "percent",
                                            "center"
                                        )
                                    )}
                                    <TableCell
                                        align="center"
                                        sx={{ ...cellStyle, px: 2, py: 1 }}
                                    >
                                        {isDTLNLDX(r) ||
                                            (r.name || "").trim().toUpperCase() ===
                                            "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY" ||
                                            (r.name || "").trim().toUpperCase() ===
                                            "I.2. KÈ" ||
                                            (r.name || "").trim().toUpperCase() ===
                                            "TỔNG" ? (
                                            <Typography
                                                sx={{
                                                    fontStyle: "italic",
                                                    color: "#757575",
                                                }}
                                            >
                                                –
                                            </Typography>
                                        ) : (
                                            format(
                                                r.revenue
                                                    ? (r.profit / r.revenue) *
                                                    100
                                                    : null,
                                                "percent",
                                                r
                                            )
                                        )}
                                    </TableCell>
                                    {renderEditableCell(
                                        r,
                                        idx,
                                        "costOverQuarter"
                                    )}
                                    {renderEditableCell(r, idx, "target")}
                                    {renderEditableCell(
                                        r,
                                        idx,
                                        "note",
                                        "center"
                                    )}
                                    {renderEditableCell(
                                        r,
                                        idx,
                                        "suggest",
                                        "center"
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Dialog open={addModal} onClose={() => setAddModal(false)}>
                    <DialogTitle sx={{ fontWeight: "bold" }}>
                        Thêm Công Trình Mới
                    </DialogTitle>
                    <DialogContent sx={{ minWidth: 400, pt: 2 }}>
                        <Stack spacing={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Nhóm</InputLabel>
                                <Select
                                    label="Nhóm"
                                    value={addProject.group}
                                    onChange={(e) =>
                                        setAddProject((p) => ({
                                            ...p,
                                            group: e.target.value,
                                        }))
                                    }
                                >
                                    {[
                                        "I.1. Dân Dụng + Giao Thông",
                                        "I.2. KÈ",
                                        "I.3. CÔNG TRÌNH CÔNG TY CĐT",
                                        "I.4. Xí nghiệp XD II",
                                        'II.1. SẢN XUẤT',
                                        "III. ĐẦU TƯ",
                                    ].map((g) => (
                                        <MenuItem key={g} value={g}>
                                            {g}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField
                                fullWidth
                                size="small"
                                label="Tên công trình"
                                value={addProject.name}
                                onChange={(e) =>
                                    setAddProject((p) => ({
                                        ...p,
                                        name: e.target.value,
                                    }))
                                }
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ pr: 3, pb: 2 }}>
                        <Button onClick={() => setAddModal(false)}>Huỷ</Button>
                        <Button
                            variant="contained"
                            onClick={() => {
                                if (!addProject.name.trim()) return;

                                // ==========================================================
                                // ✅ BẮT ĐẦU LOGIC MỚI THEO YÊU CẦU CỦA BẠN
                                // ==========================================================
                                let projectType = ""; // Mặc định type là chuỗi rỗng

                                if (
                                    addProject.group === "I.4. Xí nghiệp XD II"
                                ) {
                                    projectType = "xnxd2";
                                } else if (
                                    addProject.group === "II.1. SẢN XUẤT"
                                ) {
                                    // <-- ĐIỀU KIỆN BẠN YÊU CẦU
                                    projectType = "Nhà máy";
                                } else if (
                                    addProject.group ===
                                    "I.3. CÔNG TRÌNH CÔNG TY CĐT"
                                ) {
                                    projectType = "CĐT";
                                } else if (addProject.group === "III. ĐẦU TƯ") {
                                    projectType = "KH-ĐT";
                                } else {
                                    projectType = "Thi công"; // Mặc định cho "I.1. Dân Dụng + Giao Thông" và các trường hợp khác
                                }
                                // ==========================================================
                                // ✅ KẾT THÚC LOGIC MỚI
                                // ==========================================================

                                let insertIndex = -1;
                                let groupLabel = addProject.group
                                    .trim()
                                    .toUpperCase();
                                let rowsCopy = [...rows];
                                const idxGroup = rowsCopy.findIndex(
                                    (r) =>
                                        (r.name || "").trim().toUpperCase() ===
                                        groupLabel
                                );

                                if (idxGroup !== -1) {
                                    insertIndex = idxGroup + 1;
                                    while (
                                        insertIndex < rowsCopy.length &&
                                        !(
                                            rowsCopy[insertIndex].name &&
                                            rowsCopy[insertIndex].name.match(
                                                /^[IVX]+\./
                                            )
                                        ) &&
                                        ![
                                            "I. XÂY DỰNG",
                                            "II. SẢN XUẤT",
                                            "TỔNG",
                                        ].includes(
                                            (
                                                rowsCopy[insertIndex].name || ""
                                            ).toUpperCase()
                                        )
                                    ) {
                                        insertIndex++;
                                    }
                                } else {
                                    insertIndex = rowsCopy.length - 1;
                                }

                                rowsCopy.splice(insertIndex, 0, {
                                    name: addProject.name,
                                    type: projectType, // <-- SỬ DỤNG TYPE ĐÃ XÁC ĐỊNH
                                    revenue: 0,
                                    cost: 0,
                                    profit: 0,
                                    percent: null,
                                    costOverQuarter: null,
                                    target: null,
                                    note: "",
                                    suggest: "",
                                    editable: true,
                                });

                                setRows(rowsCopy);
                                setAddModal(false);
                                setAddProject({
                                    group: "I.1. Dân Dụng + Giao Thông",
                                    name: "",
                                    type: "",
                                });
                            }}
                            disabled={!addProject.name.trim()}
                        >
                            Thêm
                        </Button>
                    </DialogActions>
                </Dialog>
            </Paper>
            <ProfitReportFormulaGuide
                open={formulaDialogOpen}
                onClose={() => setFormulaDialogOpen(false)}
            />
        </Box>
    );
}
