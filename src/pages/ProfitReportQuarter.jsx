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
import { collection, getDocs, setDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";
import { toNum, formatNumber } from "../utils/numberUtils";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import ProfitSummaryTable from "../reports/ProfitSummaryTable";
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
    const [loading, setLoading] = useState(false); // thêm state này
    console.log(
        "TỔNG %LN Quý",
        rows.find((r) => (r.name || "").trim().toUpperCase() === "TỔNG")
            ?.percent
    );
    const [summaryTargets, setSummaryTargets] = useState({
        revenueTargetXayDung: 0,
        profitTargetXayDung: 0,
        revenueTargetSanXuat: 0,
        profitTargetSanXuat: 0,
        revenueTargetDauTu: 0,
        profitTargetDauTu: 0,
    });
    // Đổi nhãn cột "CP VƯỢT QUÝ <hiện tại>"
    const cpVuotLabel = `CP VƯỢT QUÝ ${selectedQuarter} ${selectedYear}`;

    const cellStyle = {
        // Khi TV mode, giảm minWidth để ô co lại vừa khít
        minWidth: tvMode ? 80 : 120,

        // Font-size khi TV mode nhỏ hơn chút, bình thường dùng responsive
        fontSize: tvMode ? 16 : { xs: 12, sm: 14, md: 16 },

        // Padding ngang/dọc nhỏ hơn khi TV mode
        px: tvMode ? 1 : 2,
        py: tvMode ? 0.5 : 1,

        whiteSpace: "nowrap",
        verticalAlign: "middle",
        overflow: "hidden",
        textOverflow: "ellipsis",
        border: "1px solid #ccc",
    };

    // Các hàm tính group (giữ nguyên)
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
                toNum(rows[idxLNLD].revenue) +
                toNum(rows[idxLNPT].revenue) -
                toNum(rows[idxGiam].revenue);
            const cost =
                toNum(rows[idxLNLD].cost) +
                toNum(rows[idxLNPT].cost) -
                toNum(rows[idxGiam].cost);
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
            const rev1 = toNum(rows[idxLoiNhuan].revenue);
            const rev2 = toNum(rows[idxPhaiChi].revenue);
            const cost1 = toNum(rows[idxLoiNhuan].cost);
            const cost2 = toNum(rows[idxPhaiChi].cost);
            const profit1 = toNum(rows[idxLoiNhuan].profit);
            const profit2 = toNum(rows[idxPhaiChi].profit);

            rows[idxSalan] = {
                ...rows[idxSalan],
                revenue: rev1 - rev2 || null,
                cost: cost1 - cost2 || null,
                profit: profit1 - profit2 || null,
                percent: null, // luôn là dấu "–"
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
            // Không hiển thị % chỉ tiêu LN quý và % LN quý
            rows[idxMain] = {
                ...rows[idxMain],
                revenue,
                cost,
                profit,
                percent: null, // Cột % CHỈ TIÊU LN KH để dấu –
                // % LN QUÍ hiển thị "–" là do phần format ở UI đã để rồi, không cần xử lý thêm
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

        // Các dòng chi tiết là những dòng bên dưới, không bắt đầu bằng số La Mã
        const detailRows = [];
        for (let i = idxMain + 1; i < rows.length; i++) {
            const name = (rows[i].name || "").trim().toUpperCase();
            if (/^[IVX]+\./.test(name)) break; // dừng khi gặp dòng tổng hợp tiếp theo
            if (!name) continue;
            detailRows.push(rows[i]);
        }

        if (idxMain !== -1 && detailRows.length > 0) {
            const revenue = detailRows.reduce(
                (s, r) => s + toNum(r.revenue),
                0
            );
            const cost = detailRows.reduce((s, r) => s + toNum(r.cost), 0);
            const profit = detailRows.reduce((s, r) => s + toNum(r.profit), 0); // ✅ Tính từ dòng chi tiết
            const target = toNum(rows[idxMain].target);
            const percent = target !== 0 ? (profit / target) * 100 : null;

            rows[idxMain] = {
                ...rows[idxMain],
                revenue,
                cost,
                profit, // ✅ Gán đúng tổng từ dòng chi tiết
                percent,
            };
        }

        return rows;
    };

    const updateDauTuRow = (inputRows) => {
        const rows = [...inputRows];
        const idxMain = rows.findIndex((r) =>
            (r.name || "").toUpperCase().startsWith("III. ĐẦU TƯ")
        );

        if (idxMain === -1) return rows;

        // Lấy các dòng chi tiết bên dưới "III. ĐẦU TƯ"
        const detailRows = [];
        for (let i = idxMain + 1; i < rows.length; i++) {
            const name = (rows[i].name || "").trim().toUpperCase();
            // Nếu gặp nhóm mới (bắt đầu bằng ký tự La Mã + dấu chấm) hoặc gặp "TỔNG" thì dừng
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

    // Hàm tổng hợp lại dòng I.3. CÔNG TRÌNH CÔNG TY CĐT dựa vào các dòng con bên dưới
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
        const revenue = childRows.reduce((s, r) => s + toNum(r.revenue), 0);
        const cost = childRows.reduce((s, r) => s + toNum(r.cost), 0);
        const profit = revenue - cost;
        const percent = revenue ? (profit / revenue) * 100 : null;
        const newRows = [...rows];
        newRows[idxI3] = {
            ...newRows[idxI3],
            revenue,
            cost,
            profit,
            percent,
        };
        return newRows;
    };
    // Hàm tổng hợp lại dòng I.4. Xí nghiệp XD II
    const updateGroupI4 = (rows) => {
        const idxI4 = rows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() === "I.4. XÍ NGHIỆP XD II"
        );

        // Nếu không tìm thấy dòng I.4 thì thoát
        if (idxI4 === -1) return rows;

        let i = idxI4 + 1;
        const childRows = [];

        // Lặp qua các dòng con bên dưới, dừng lại khi gặp mục "II. SẢN XUẤT"
        while (
            i < rows.length &&
            !(rows[i].name || "").trim().toUpperCase().startsWith("II.")
        ) {
            childRows.push(rows[i]);
            i++;
        }

        // Tính tổng từ các dòng con
        const revenue = childRows.reduce((s, r) => s + toNum(r.revenue), 0);
        const cost = childRows.reduce((s, r) => s + toNum(r.cost), 0);
        const profit = revenue - cost;
        const percent = revenue ? (profit / revenue) * 100 : null;

        // Cập nhật giá trị vào dòng I.4
        const newRows = [...rows];
        newRows[idxI4] = {
            ...newRows[idxI4],
            revenue,
            cost,
            profit,
            percent,
        };

        return newRows;
    };
    // === HÀM TÍNH TỔNG MỚI (DÁN VÀO ĐÂY) ===
    const calculateTotals = (currentRows) => {
        const updatedRows = [...currentRows];

        // 1. Tìm chỉ số của tất cả các hàng cần thiết
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

        // 2. Kiểm tra và tính toán nếu tìm thấy tất cả các hàng
        if (
            idxTotal !== -1 &&
            idxIXD !== -1 &&
            idxII1 !== -1 &&
            idxII2 !== -1 &&
            idxII3 !== -1 &&
            idxII4 !== -1
        ) {
            const totalRevenue =
                toNum(updatedRows[idxIXD]?.revenue) +
                toNum(updatedRows[idxII1]?.revenue) +
                toNum(updatedRows[idxII2]?.revenue) +
                toNum(updatedRows[idxII3]?.revenue) +
                toNum(updatedRows[idxII4]?.revenue);

            const totalCost =
                toNum(updatedRows[idxIXD]?.cost) +
                toNum(updatedRows[idxII1]?.cost) +
                toNum(updatedRows[idxII2]?.cost) +
                toNum(updatedRows[idxII3]?.cost) +
                toNum(updatedRows[idxII4]?.cost);

            const totalProfit =
                toNum(updatedRows[idxIXD]?.profit) +
                toNum(updatedRows[idxII1]?.profit) +
                toNum(updatedRows[idxII2]?.profit) +
                toNum(updatedRows[idxII3]?.profit) +
                toNum(updatedRows[idxII4]?.profit);

            // 3. Cập nhật dòng TỔNG
            updatedRows[idxTotal] = {
                ...updatedRows[idxTotal],
                revenue: totalRevenue === 0 ? null : totalRevenue,
                cost: totalCost === 0 ? null : totalCost,
                profit: totalProfit === 0 ? null : totalProfit,
                percent: null,
            };
        }

        return updatedRows;
    };
    // Đặt hàm này cùng với các hàm update... khác của bạn

    const updateVuotCPRows = (inputRows) => {
        const rows = [...inputRows];

        // 1. Lấy giá trị chi phí vượt quý từ các nhóm ngành lớn
        const costOverXD =
            rows.find((r) => (r.name || "").toUpperCase() === "I. XÂY DỰNG")
                ?.costOverQuarter || 0;
        const costOverSX =
            rows.find((r) => (r.name || "").toUpperCase() === "II. SẢN XUẤT")
                ?.costOverQuarter || 0;
        const costOverDT =
            rows.find((r) => (r.name || "").toUpperCase() === "III. ĐẦU TƯ")
                ?.costOverQuarter || 0;

        // 2. Tìm chỉ số của các hàng con
        const idxVuotBPXD = rows.findIndex(
            (r) => (r.name || "").toUpperCase() === "+VƯỢT CP BPXD"
        );
        const idxVuotBPSX = rows.findIndex(
            (r) => (r.name || "").toUpperCase() === "+VƯỢT CP BPSX"
        );
        const idxVuotBPDT = rows.findIndex(
            (r) => (r.name || "").toUpperCase() === "+VƯỢT CP BPĐT"
        );

        // 3. Cập nhật lợi nhuận cho các hàng con (như cũ)
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

        // 4. ✨ TÍNH TOÁN MỚI: Tìm hàng "CP VƯỢT DỰ KẾ" và tính tổng lợi nhuận
        const idxCpVuotDuKe = rows.findIndex(
            (r) => (r.name || "").toUpperCase() === "CP VƯỢT DỰ KẾ"
        );

        if (idxCpVuotDuKe !== -1) {
            // Cộng tổng lợi nhuận từ 3 hàng con
            rows[idxCpVuotDuKe].profit = profitBPXD + profitBPSX + profitBPDT;
        }

        return rows;
    };
    const updateChiPhiTraTruocRow = (inputRows, finalProfitRowName) => {
        const rows = [...inputRows];

        // Tìm chỉ số của các hàng liên quan
        const idxFinalProfit = rows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                finalProfitRowName.toUpperCase()
        );
        const idxCpVuotDuKe = rows.findIndex(
            (r) => (r.name || "").toUpperCase() === "CP VƯỢT DỰ KẾ"
        );
        const idxChiPhiTraTruoc = rows.findIndex(
            (r) => (r.name || "").toUpperCase() === "+ CHI PHÍ ĐÃ TRẢ TRƯỚC"
        );

        // Nếu tìm thấy tất cả các hàng cần thiết
        if (
            idxFinalProfit !== -1 &&
            idxCpVuotDuKe !== -1 &&
            idxChiPhiTraTruoc !== -1
        ) {
            // Lấy giá trị lợi nhuận từ các hàng nguồn
            const finalProfit = toNum(rows[idxFinalProfit].profit);
            const cpVuotDuKeProfit = toNum(rows[idxCpVuotDuKe].profit);

            // Thực hiện phép tính và gán kết quả
            rows[idxChiPhiTraTruoc].profit = finalProfit - cpVuotDuKeProfit;
        }

        return rows;
    };
    // Helper lấy revenue 3 dòng nhóm
    const summaryRowsGroupRevenue = (rows) => {
        // Chuyển về chữ hoa, bỏ khoảng trắng để tránh lỗi chính tả
        const getRevenue = (name) => {
            const idx = rows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === name
            );
            return idx !== -1 ? toNum(rows[idx].revenue) : 0;
        };
        return {
            revenueXayDung: getRevenue("I. XÂY DỰNG"),
            revenueSanXuat: getRevenue("II. SẢN XUẤT"),
            revenueDauTu: getRevenue("III. ĐẦU TƯ"),
        };
    };
    const handleSummaryTargetChange = (targetKey, value) => {
        setSummaryTargets((prevTargets) => ({
            ...prevTargets,
            [targetKey]: value,
        }));
    };
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // Helper: Lấy trường tổng hợp costOverQuarter cho từng nhóm
            const getCostOverQuarter = async (fieldName) => {
                try {
                    const snap = await getDoc(
                        doc(
                            db,
                            "costAllocationsQuarter",
                            `${selectedYear}_${selectedQuarter}`
                        )
                    );
                    if (snap.exists()) {
                        return toNum(snap.data()[fieldName]);
                    }
                } catch {}
                return 0;
            };

            // 1. Lấy toàn bộ dự án và tính doanh thu, chi phí, lợi nhuận từng dự án
            const projectsSnapshot = await getDocs(collection(db, "projects"));
            const projects = await Promise.all(
                projectsSnapshot.docs.map(async (d) => {
                    const data = d.data();
                    let revenue = 0,
                        cost = 0;
                    try {
                        const qPath = `projects/${d.id}/years/${selectedYear}/quarters/${selectedQuarter}`;
                        const qSnap = await getDoc(doc(db, qPath));
                        if (qSnap.exists()) {
                            revenue = toNum(qSnap.data().overallRevenue);
                            if (Array.isArray(qSnap.data().items)) {
                                cost = qSnap
                                    .data()
                                    .items.reduce(
                                        (sum, item) =>
                                            sum + toNum(item.totalCost),
                                        0
                                    );
                            }
                        }
                    } catch {}
                    const profit = revenue - cost;
                    const percent = revenue ? (profit / revenue) * 100 : null;
                    return {
                        projectId: d.id,
                        name: data.name,
                        revenue,
                        cost,
                        profit,
                        percent,
                        costOverQuarter: null,
                        target: null,
                        note: "",
                        suggest: "",
                        type: data.type || "",
                        editable: true,
                    };
                })
            );

            // 2. Nhóm dự án theo loại để sum
            const groupBy = (arr, cond) => arr.filter(cond);
            const sumGroup = (group) => {
                const revenue = group.reduce((s, r) => s + toNum(r.revenue), 0);
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
            const others = projects.filter(
                (r) =>
                    ![...groupI1, ...groupI2, ...groupI3, ...groupII].includes(
                        r
                    )
            );

            const finalProfitRowName = `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`;

            // 3. Lấy dữ liệu Firestore đã lưu
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
            // Nếu có dữ liệu đã lưu thì đọc, không thì dùng giá trị mặc định (0)
            if (saved.exists() && saved.data().summaryTargets) {
                // Kết hợp dữ liệu đã lưu và mặc định để tránh lỗi thiếu trường
                setSummaryTargets({
                    ...defaultTargets,
                    ...saved.data().summaryTargets,
                });
            } else {
                // Nếu không có gì được lưu, đặt chỉ tiêu về 0
                setSummaryTargets(defaultTargets);
            }
            if (
                saved.exists() &&
                Array.isArray(saved.data().rows) &&
                saved.data().rows.length > 0
            ) {
                // ✅ BƯỚC KHẮC PHỤC: LỌC BỎ CÁC DỰ ÁN ĐÃ BỊ XÓA
                // 1. Lấy danh sách ID của tất cả các project còn tồn tại
                const existingProjectIds = projects.map((p) => p.projectId);

                // 2. Lọc mảng `rows` từ dữ liệu đã lưu
                let updatedRows = saved.data().rows.filter((row) => {
                    // Giữ lại các dòng tổng hợp (không có projectId)
                    if (!row.projectId) {
                        return true;
                    }
                    // Chỉ giữ lại các dòng project có ID nằm trong danh sách project còn tồn tại
                    return existingProjectIds.includes(row.projectId);
                });
                // =================================================================
                // ✨ BẮT ĐẦU ĐOẠN CODE SỬA LỖI ✨
                // Kiểm tra xem I.4 đã tồn tại trong dữ liệu đã lưu chưa
                const i4Exists = updatedRows.some(
                    (r) =>
                        (r.name || "").trim().toUpperCase() ===
                        "I.4. XÍ NGHIỆP XD II"
                );

                // Nếu chưa tồn tại, hãy chèn nó vào
                if (!i4Exists) {
                    // Tìm vị trí của dòng I.3 để chèn I.4 vào ngay sau nó
                    let insertionIndex = updatedRows.findIndex(
                        (r) =>
                            (r.name || "").trim().toUpperCase() ===
                            "I.3. CÔNG TRÌNH CÔNG TY CĐT"
                    );

                    if (insertionIndex !== -1) {
                        // Đi tới cuối các dòng con của I.3
                        insertionIndex++;
                        while (
                            insertionIndex < updatedRows.length &&
                            !/^[IVX]+\./.test(
                                updatedRows[insertionIndex].name || ""
                            )
                        ) {
                            insertionIndex++;
                        }

                        // Tạo cấu trúc cho dòng I.4 mới
                        const groupI4Data = [
                            {
                                name: "I.4. Xí nghiệp XD II",
                                ...sumGroup(groupI4),
                            },
                            ...groupI4, // Thêm các dự án con của I.4 nếu có
                        ];

                        // Chèn cấu trúc I.4 vào đúng vị trí
                        updatedRows.splice(insertionIndex, 0, ...groupI4Data);
                    }
                }
                // ✨ KẾT THÚC ĐOẠN CODE SỬA LỖI ✨
                // =================================================================
                // Phần code còn lại của bạn giữ nguyên từ đây...
                // ================== BẮT ĐẦU PHẦN CHỈNH SỬA ==================
                // 1. Luôn fetch lại giá trị CP Vượt Quý mới nhất
                const [cpVuotCurr, cpVuotNhaMay, cpVuotKhdt] =
                    await Promise.all([
                        getCostOverQuarter("totalThiCongCumQuarterOnly"),
                        getCostOverQuarter("totalNhaMayCumQuarterOnly"),
                        getCostOverQuarter("totalKhdtCumQuarterOnly"),
                    ]);

                // 2. Tìm index của các hàng cần cập nhật trong dữ liệu vừa tải
                const idxXD = updatedRows.findIndex(
                    (r) => (r.name || "").trim().toUpperCase() === "I. XÂY DỰNG"
                );
                const idxSX = updatedRows.findIndex(
                    (r) =>
                        (r.name || "").trim().toUpperCase() === "II. SẢN XUẤT"
                );
                const idxDT = updatedRows.findIndex(
                    (r) => (r.name || "").trim().toUpperCase() === "III. ĐẦU TƯ"
                );

                // 3. Ghi đè giá trị `costOverQuarter` cũ bằng giá trị mới nhất
                if (idxXD !== -1)
                    updatedRows[idxXD].costOverQuarter = cpVuotCurr || 0;
                if (idxSX !== -1)
                    updatedRows[idxSX].costOverQuarter = cpVuotNhaMay || 0;
                if (idxDT !== -1)
                    updatedRows[idxDT].costOverQuarter = cpVuotKhdt || 0;
                // ================== KẾT THÚC PHẦN CHỈNH SỬA ==================

                // 1. Định nghĩa các hàng cần chèn
                const newRowsTemplate = [
                    {
                        name: "CP VƯỢT DỰ KẾ",
                        revenue: null,
                        cost: null,
                        profit: null,
                        percent: null,
                    },
                    {
                        name: "+Vượt CP BPXD",
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: "+Vượt CP BPSX",
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: "+Vượt CP BPĐT",
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                    },
                ];

                // 2. Kiểm tra xem các hàng này đã tồn tại chưa
                const cpVuotDuKeExists = updatedRows.some(
                    (row) => (row.name || "").toUpperCase() === "CP VƯỢT DỰ KẾ"
                );
                // 3. Nếu chưa tồn tại, hãy chèn chúng vào vị trí mới
                if (!cpVuotDuKeExists) {
                    // TÌM VỊ TRÍ CỦA HÀNG "LỢI NHUẬN SAU GIẢM TRỪ"
                    const insertionIndex = updatedRows.findIndex(
                        (row) =>
                            (row.name || "")
                                .toUpperCase()
                                .startsWith(`=> LỢI NHUẬN SAU GIẢM TRỪ`) // <<-- VỊ TRÍ MỚI
                    );

                    // Nếu tìm thấy, chèn các hàng mới ngay sau nó
                    if (insertionIndex !== -1) {
                        updatedRows.splice(
                            insertionIndex + 1, // <<-- Chèn ngay sau hàng "LỢI NHUẬN SAU GIẢM TRỪ"
                            0,
                            ...newRowsTemplate
                        );
                    }
                }
                // ——————————————————————————————————————————————————————————
                // 1. Cập nhật I.1. Dân Dụng + Giao Thông

                // 1.1. Xây groupI1 (công trình thuộc Thi công, không chứa "KÈ")
                const groupI1 = projects.filter(
                    (r) =>
                        (r.type === "Thi cong" || r.type === "Thi công") &&
                        (r.revenue !== 0 || r.cost !== 0) &&
                        !(r.name || "").toUpperCase().includes("KÈ")
                );

                // 1.2. Tìm vị trí dòng "I.1. DÂN DỤNG + GIAO THÔNG"
                const idxI1 = updatedRows.findIndex(
                    (r) =>
                        (r.name || "").trim().toUpperCase() ===
                        "I.1. DÂN DỤNG + GIAO THÔNG"
                );

                if (idxI1 !== -1) {
                    // 1.3. Thu thập tên các dòng con hiện có dưới I.1
                    let existedNamesI1 = [];
                    let j = idxI1 + 1;
                    while (
                        j < updatedRows.length &&
                        !(
                            (updatedRows[j].name || "")
                                .toUpperCase()
                                .startsWith("I.2.") ||
                            (updatedRows[j].name || "")
                                .trim()
                                .match(/^[IVX]+\./)
                        )
                    ) {
                        if (updatedRows[j].name) {
                            existedNamesI1.push(
                                (updatedRows[j].name || "").trim()
                            );
                        }
                        j++;
                    }

                    // 1.4. Với mỗi project trong groupI1, update hoặc chèn mới
                    groupI1.forEach((p) => {
                        const idxDetail = updatedRows.findIndex(
                            (r) =>
                                (r.name || "").trim() === (p.name || "").trim()
                        );
                        if (idxDetail !== -1) {
                            updatedRows[idxDetail] = {
                                ...updatedRows[idxDetail],
                                revenue: p.revenue,
                                cost: p.cost,
                                profit: p.profit,
                                percent: p.percent,
                                editable: false,
                            };
                        } else {
                            updatedRows.splice(j, 0, {
                                projectId: p.projectId,
                                name: p.name,
                                revenue: p.revenue,
                                cost: p.cost,
                                profit: p.profit,
                                percent: p.percent,
                                costOverQuarter: null,
                                target: null,
                                note: "",
                                suggest: "",
                                type: p.type,
                                editable: false,
                            });
                            j++;
                        }
                    });

                    // 1.5. Tính lại tổng cho I.1
                    let sumRevenueI1 = 0,
                        sumCostI1 = 0,
                        sumProfitI1 = 0;
                    let k = idxI1 + 1;
                    while (
                        k < updatedRows.length &&
                        !(
                            (updatedRows[k].name || "")
                                .toUpperCase()
                                .startsWith("I.2.") ||
                            (updatedRows[k].name || "")
                                .trim()
                                .match(/^[IVX]+\./)
                        )
                    ) {
                        sumRevenueI1 += toNum(updatedRows[k].revenue);
                        sumCostI1 += toNum(updatedRows[k].cost);
                        sumProfitI1 += toNum(updatedRows[k].profit);
                        k++;
                    }
                    updatedRows[idxI1] = {
                        ...updatedRows[idxI1],
                        revenue: sumRevenueI1,
                        cost: sumCostI1,
                        profit: sumProfitI1,
                        percent:
                            sumRevenueI1 !== 0
                                ? (sumProfitI1 / sumRevenueI1) * 100
                                : null,
                    };
                }

                // ——————————————————————————————————————————————————————————
                // 2. Cập nhật I.2. KÈ

                // 2.1. Xây groupI2 (công trình có tên chứa "KÈ")
                const groupI2 = projects.filter((r) =>
                    (r.name || "").toUpperCase().includes("KÈ")
                );

                // 2.2. Tìm vị trí dòng "I.2. KÈ"
                const idxI2 = updatedRows.findIndex(
                    (r) => (r.name || "").trim().toUpperCase() === "I.2. KÈ"
                );

                if (idxI2 !== -1) {
                    // 2.3. Thu thập tên các dòng con hiện có dưới I.2
                    let existedNamesI2 = [];
                    let m = idxI2 + 1;
                    while (
                        m < updatedRows.length &&
                        !(
                            (updatedRows[m].name || "")
                                .toUpperCase()
                                .startsWith("I.3.") ||
                            (updatedRows[m].name || "")
                                .trim()
                                .match(/^[IVX]+\./)
                        )
                    ) {
                        if (updatedRows[m].name) {
                            existedNamesI2.push(
                                (updatedRows[m].name || "").trim()
                            );
                        }
                        m++;
                    }

                    // 2.4. Với mỗi project trong groupI2, update hoặc chèn mới
                    groupI2.forEach((p) => {
                        const idxDetail2 = updatedRows.findIndex(
                            (r) =>
                                (r.name || "").trim() === (p.name || "").trim()
                        );
                        if (idxDetail2 !== -1) {
                            updatedRows[idxDetail2] = {
                                ...updatedRows[idxDetail2],
                                revenue: p.revenue,
                                cost: p.cost,
                                profit: p.profit,
                                percent: p.percent,
                                editable: false,
                            };
                        } else {
                            updatedRows.splice(m, 0, {
                                projectId: p.projectId,
                                name: p.name,
                                revenue: p.revenue,
                                cost: p.cost,
                                profit: p.profit,
                                percent: p.percent,
                                costOverQuarter: null,
                                target: null,
                                note: "",
                                suggest: "",
                                type: p.type,
                                editable: false,
                            });
                            m++;
                        }
                    });

                    // 2.5. Tính lại tổng cho I.2
                    let sumRevenueI2 = 0,
                        sumCostI2 = 0,
                        sumProfitI2 = 0;
                    let n = idxI2 + 1;
                    while (
                        n < updatedRows.length &&
                        !(
                            (updatedRows[n].name || "")
                                .toUpperCase()
                                .startsWith("I.3.") ||
                            (updatedRows[n].name || "")
                                .trim()
                                .match(/^[IVX]+\./)
                        )
                    ) {
                        sumRevenueI2 += toNum(updatedRows[n].revenue);
                        sumCostI2 += toNum(updatedRows[n].cost);
                        sumProfitI2 += toNum(updatedRows[n].profit);
                        n++;
                    }
                    updatedRows[idxI2] = {
                        ...updatedRows[idxI2],
                        revenue: sumRevenueI2,
                        cost: sumCostI2,
                        profit: sumProfitI2,
                        percent:
                            sumRevenueI2 !== 0
                                ? (sumProfitI2 / sumRevenueI2) * 100
                                : null,
                    };
                }

                // ——————————————————————————————————————————————————————————
                // 3. Cập nhật II.1. SẢN XUẤT

                // 3.1. Xử lý các detail dưới II.1
                groupII.forEach((p) => {
                    const idx = updatedRows.findIndex(
                        (r) => (r.name || "").trim() === (p.name || "").trim()
                    );
                    if (idx !== -1) {
                        updatedRows[idx] = {
                            ...updatedRows[idx],
                            revenue: p.revenue,
                            cost: p.cost,
                            profit: p.profit,
                            percent: p.percent,
                            editable: false,
                        };
                    }
                });

                // 3.2. Thêm công trình mới nếu có
                const idxII1 = updatedRows.findIndex(
                    (r) =>
                        (r.name || "").trim().toUpperCase() === "II.1. SẢN XUẤT"
                );
                let j2 = idxII1 + 1,
                    existedNamesII = [];
                while (
                    j2 < updatedRows.length &&
                    !(
                        updatedRows[j2].name &&
                        updatedRows[j2].name.match(/^[IVX]+\./)
                    )
                ) {
                    existedNamesII.push((updatedRows[j2].name || "").trim());
                    j2++;
                }
                const newProjectsII = groupII.filter(
                    (p) => !existedNamesII.includes((p.name || "").trim())
                );
                if (newProjectsII.length > 0 && idxII1 !== -1) {
                    updatedRows.splice(
                        idxII1 + 1,
                        0,
                        ...newProjectsII.map((p) => ({
                            ...p,
                            editable: false,
                        }))
                    );
                }

                // 3.3. Tính lại tổng cho II.1
                if (idxII1 !== -1) {
                    let i = idxII1 + 1;
                    const detailRows = [];
                    while (
                        i < updatedRows.length &&
                        !(updatedRows[i].name || "").trim().match(/^[IVX]+\./)
                    ) {
                        detailRows.push(updatedRows[i]);
                        i++;
                    }

                    const sumRevenue = detailRows.reduce(
                        (s, r) => s + toNum(r.revenue),
                        0
                    );
                    const sumCost = detailRows.reduce(
                        (s, r) => s + toNum(r.cost),
                        0
                    );
                    const sumProfit = detailRows.reduce(
                        (s, r) => s + toNum(r.profit),
                        0
                    );
                    const sumPercent =
                        sumRevenue !== 0
                            ? (sumProfit / sumRevenue) * 100
                            : null;

                    updatedRows[idxII1] = {
                        ...updatedRows[idxII1],
                        revenue: sumRevenue,
                        cost: sumCost,
                        profit: sumProfit,
                        percent: sumPercent,
                    };
                }

                // ——————————————————————————————————————————————————————————
                // 4. Cập nhật V. GIẢM LỢI NHUẬN và VI. THU NHẬP KHÁC

                let totalDecreaseProfit = 0;
                let totalIncreaseProfit = 0;
                try {
                    const profitChangesDoc = await getDoc(
                        doc(
                            db,
                            "profitChanges",
                            `${selectedYear}_${selectedQuarter}`
                        )
                    );
                    if (profitChangesDoc.exists()) {
                        totalDecreaseProfit = toNum(
                            profitChangesDoc.data().totalDecreaseProfit
                        );
                        totalIncreaseProfit = toNum(
                            profitChangesDoc.data().totalIncreaseProfit
                        );
                    }
                } catch {
                    totalDecreaseProfit = 0;
                    totalIncreaseProfit = 0;
                }

                const idxV = updatedRows.findIndex(
                    (r) =>
                        (r.name || "").trim().toUpperCase() ===
                        "V. GIẢM LỢI NHUẬN"
                );
                if (idxV !== -1) {
                    updatedRows[idxV].profit = totalDecreaseProfit;
                }

                const idxVI = updatedRows.findIndex(
                    (r) =>
                        (r.name || "").trim().toUpperCase() ===
                        "VI. THU NHẬP KHÁC"
                );
                if (idxVI !== -1) {
                    updatedRows[idxVI].profit = totalIncreaseProfit;
                }

                // ——————————————————————————————————————————————————————————
                // 5. Lọc (loại bỏ) tất cả các dòng con có revenue === 0 && cost === 0 && profit === 0

                // ——————————————————————————————————————————————————————————
                // 5. Lọc (loại bỏ) các dòng con không có dữ liệu, nhưng giữ lại các dòng chỉ định

                updatedRows = updatedRows.filter((r) => {
                    const rev = toNum(r.revenue);
                    const cost = toNum(r.cost);
                    const profit = toNum(r.profit);
                    const nameUpper = (r.name || "").trim().toUpperCase();

                    // ✅ DANH SÁCH CÁC HÀNG LUÔN HIỂN THỊ (THEO YÊU CẦU CỦA BẠN)
                    const alwaysShowRows = [
                        "LỢI NHUẬN LIÊN DOANH (LDX)",
                        "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)",
                        "GIẢM LN LDX",
                        "LỢI NHUẬN LIÊN DOANH (SÀ LAN)",
                        "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)",
                        "LỢI NHUẬN BÁN SP NGOÀI (RON CỐNG + 68)",
                        `DOANH THU BLX ${selectedQuarter} N${selectedYear} - D21`.toUpperCase(),
                    ];

                    // Nếu tên dòng nằm trong danh sách luôn hiển thị, giữ lại nó
                    if (alwaysShowRows.includes(nameUpper)) {
                        return true;
                    }

                    // Nếu cả 3 giá trị đều là 0:
                    if (rev === 0 && cost === 0 && profit === 0) {
                        // Giữ lại nếu là các dòng tổng hợp hoặc nhóm chính
                        if (
                            /^[IVX]+\./.test(nameUpper) ||
                            [
                                "I. XÂY DỰNG",
                                "I.1. DÂN DỤNG + GIAO THÔNG",
                                "I.2. KÈ",
                                "I.3. CÔNG TRÌNH CÔNG TY CĐT",
                                "I.4. XÍ NGHIỆP XD II",
                                "II. SẢN XUẤT",
                                "II.1. SẢN XUẤT",
                                "II.2. DT + LN ĐƯỢC CHIA TỪ LDX",
                                "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)",
                                "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY",
                                "III. ĐẦU TƯ",
                                `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`.toUpperCase(),
                                "V. GIẢM LỢI NHUẬN",
                                "VI. THU NHẬP KHÁC",
                                `VII. KHTSCĐ NĂM ${selectedYear}`.toUpperCase(),
                                "VIII. GIẢM LÃI ĐT DỰ ÁN",
                                "TỔNG",
                                "CP VƯỢT DỰ KẾ",
                                "+VƯỢT CP BPXD",
                                "+VƯỢT CP BPSX",
                                "+VƯỢT CP BPĐT",
                                `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`.toUpperCase(),
                                "+ CHI PHÍ ĐÃ TRẢ TRƯỚC",
                            ].includes(nameUpper)
                        ) {
                            return true;
                        }
                        // Nếu không, loại bỏ dòng này
                        return false;
                    }

                    // Nếu có ít nhất một giá trị khác 0, giữ lại
                    return true;
                });

                // ——————————————————————————————————————————————————————————

                // ——————————————————————————————————————————————————————————
                updatedRows = updateGroupI4(updatedRows); // ✨ THÊM DÒNG NÀY

                updatedRows = updateVuotCPRows(updatedRows); // <<< THÊM DÒNG NÀY
                updatedRows = updateChiPhiTraTruocRow(
                    updatedRows,
                    finalProfitRowName
                );

                setRows(updatedRows);
                setLoading(false);
                return;
            }

            // 4. Build lại defaultRows
            let defaultRows = [
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
                    ...sumGroup(groupI1) /*... */,
                },
                ...groupI1,
                { name: "I.2. KÈ", ...sumGroup(groupI2), percent: null },
                ...groupI2,
                { name: "I.3. CÔNG TRÌNH CÔNG TY CĐT", ...sumGroup(groupI3) },
                { name: "I.4. Xí nghiệp XD II", ...sumGroup(groupI4) },

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
                {
                    name: `DOANH THU BLX ${selectedQuarter} N${selectedYear} - D21`,
                    revenue: 0,
                    cost: 0,
                    profit: 0,
                    percent: null,
                    editable: true,
                },
                {
                    name: "TỔNG",
                    ...sumGroup([
                        ...groupI1,
                        ...groupI2,
                        ...groupI3,
                        ...groupII,
                        ...others,
                    ]),
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

                // --- KHỐI ĐÃ SẮP XẾP LẠI ĐÚNG VỊ TRÍ ---
                {
                    name: "CP VƯỢT DỰ KẾ",
                    revenue: null,
                    cost: null,
                    profit: null,
                    percent: null,
                    editable: true,
                },
                {
                    name: "+Vượt CP BPXD",
                    revenue: null,
                    cost: null,
                    profit: 0,
                    percent: null,
                    editable: true,
                },
                {
                    name: "+Vượt CP BPSX",
                    revenue: null,
                    cost: null,
                    profit: 0,
                    percent: null,
                    editable: true,
                },
                {
                    name: "+Vượt CP BPĐT",
                    revenue: null,
                    cost: null,
                    profit: 0,
                    percent: null,
                    editable: true,
                },
                {
                    name: "+ Chi phí đã trả trước",
                    revenue: 0,
                    cost: 0,
                    profit: 0,
                    percent: null,
                },
            ];

            // 5. Lấy costOverQuarter cho các nhóm (gom lại 1 lần)
            const [cpVuotCurr, cpVuotNhaMay, cpVuotKhdt] = await Promise.all([
                getCostOverQuarter("totalThiCongCumQuarterOnly"),
                getCostOverQuarter("totalNhaMayCumQuarterOnly"),
                getCostOverQuarter("totalKhdtCumQuarterOnly"),
            ]);

            // Gán vào defaultRows
            const idxXD = defaultRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "I. XÂY DỰNG"
            );
            if (idxXD !== -1)
                defaultRows[idxXD].costOverQuarter = cpVuotCurr || 0;
            const idxSX = defaultRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "II. SẢN XUẤT"
            );
            if (idxSX !== -1)
                defaultRows[idxSX].costOverQuarter = cpVuotNhaMay || 0;
            const idxDauTu = defaultRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "III. ĐẦU TƯ"
            );
            if (idxDauTu !== -1)
                defaultRows[idxDauTu].costOverQuarter = cpVuotKhdt || 0;

            // 6. Lấy lợi nhuận vượt BPXN, BPSX, BPĐT
            let bpVotProfit = cpVuotCurr || 0;
            let bpBPSXProfit = cpVuotNhaMay || 0;
            let khdtProfit = 0;
            try {
                const khdtDoc = await getDoc(
                    doc(db, "costAllocationsQuarter", `${selectedYear}_Q1`)
                );
                if (khdtDoc.exists()) {
                    khdtProfit = toNum(khdtDoc.data().totalKhdtCumQuarterOnly);
                }
            } catch {
                khdtProfit = 0;
            }

            const idxBPXN = defaultRows.findIndex((r) =>
                (r.name || "")
                    .trim()
                    .toUpperCase()
                    .startsWith("+ VƯỢT CP BPXN DO KO ĐẠT DT")
            );
            if (idxBPXN !== -1) defaultRows[idxBPXN].profit = bpVotProfit;

            const idxBPSX = defaultRows.findIndex((r) =>
                (r.name || "")
                    .trim()
                    .toUpperCase()
                    .startsWith("+ VƯỢT CP BPSX DO KO ĐẠT DT")
            );
            if (idxBPSX !== -1) defaultRows[idxBPSX].profit = bpBPSXProfit;

            const idxBPDT = defaultRows.findIndex((r) =>
                (r.name || "")
                    .trim()
                    .toUpperCase()
                    .startsWith("+ VƯỢT CP BPĐT DO KO CÓ DT")
            );
            if (idxBPDT !== -1) defaultRows[idxBPDT].profit = khdtProfit;

            // 7. Lấy giá trị giảm lợi nhuận & thu nhập khác
            let totalDecreaseProfit = 0;
            let totalIncreaseProfit = 0;
            try {
                const profitChangesDoc = await getDoc(
                    doc(
                        db,
                        "profitChanges",
                        `${selectedYear}_${selectedQuarter}`
                    )
                );
                if (profitChangesDoc.exists()) {
                    totalDecreaseProfit = toNum(
                        profitChangesDoc.data().totalDecreaseProfit
                    );
                    totalIncreaseProfit = toNum(
                        profitChangesDoc.data().totalIncreaseProfit
                    );
                }
            } catch {}

            const idxV = defaultRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() === "V. GIẢM LỢI NHUẬN"
            );
            if (idxV !== -1) defaultRows[idxV].profit = totalDecreaseProfit;

            const idxVI = defaultRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() === "VI. THU NHẬP KHÁC"
            );
            if (idxVI !== -1) defaultRows[idxVI].profit = totalIncreaseProfit;

            // 8. Tính toán các dòng nhóm, tổng hợp
            let updatedRows = updateLDXRow(defaultRows);
            updatedRows = updateDTLNLDXRow(updatedRows);
            updatedRows = updateSalanRow(updatedRows);
            updatedRows = updateThuNhapKhacRow(updatedRows);
            updatedRows = updateDauTuRow(updatedRows);
            updatedRows = updateGroupI3(updatedRows);
            updatedRows = updateGroupI4(updatedRows); // ✨ THÊM DÒNG NÀY

            updatedRows = updateVuotCPRows(updatedRows); // <<< THÊM DÒNG NÀY
            updatedRows = updateChiPhiTraTruocRow(
                updatedRows,
                finalProfitRowName
            );

            // 9. Tính lại II. SẢN XUẤT (sum các nhóm con)
            const idxII = updatedRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "II. SẢN XUẤT"
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
            if (
                idxII !== -1 &&
                idxII1 !== -1 &&
                idxII2 !== -1 &&
                idxII3 !== -1
            ) {
                const profit =
                    toNum(updatedRows[idxII1].profit) +
                    toNum(updatedRows[idxII2].profit) +
                    toNum(updatedRows[idxII3].profit);

                updatedRows[idxII] = {
                    ...updatedRows[idxII],
                    profit,
                };
            }

            // 10. Tính lại nhóm I. XÂY DỰNG
            const idxI = updatedRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "I. XÂY DỰNG"
            );
            const idxI1 = updatedRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() ===
                    "I.1. DÂN DỤNG + GIAO THÔNG"
            );
            const idxI2 = updatedRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "I.2. KÈ"
            );
            if (idxI !== -1 && idxI1 !== -1 && idxI2 !== -1) {
                const rev =
                    toNum(updatedRows[idxI1].revenue) +
                    toNum(updatedRows[idxI2].revenue);
                const cost =
                    toNum(updatedRows[idxI1].cost) +
                    toNum(updatedRows[idxI2].cost);
                const profit = rev - cost;
                updatedRows[idxI].revenue = rev;
                updatedRows[idxI].cost = cost;
                updatedRows[idxI].profit = profit;
                const target = toNum(updatedRows[idxI].target);
                updatedRows[idxI].percent =
                    target !== 0 ? (profit / target) * 100 : null;
            }

            updatedRows = calculateTotals(updatedRows); // Gọi hàm tính tổng mới
            const idxTotal = updatedRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "TỔNG"
            );

            // 12. Tính lại IV. LỢI NHUẬN ... = profit của TỔNG
            const idxIV = updatedRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() ===
                    `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`.toUpperCase()
            );
            if (idxIV !== -1 && idxTotal !== -1) {
                updatedRows[idxIV] = {
                    ...updatedRows[idxIV],
                    revenue: 0,
                    cost: 0,
                    profit: toNum(updatedRows[idxTotal].profit),
                    percent: null,
                };
            }

            // 13. Tính lại LỢI NHUẬN SAU GIẢM TRỪ
            const idxVII = updatedRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() ===
                    `VII. KHTSCĐ NĂM ${selectedYear}`.toUpperCase()
            );
            const idxVIII = updatedRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() ===
                    "VIII. GIẢM LÃI ĐT DỰ ÁN"
            );
            const idxLNFinal = updatedRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() ===
                    finalProfitRowName.trim().toUpperCase()
            );
            if (
                idxLNFinal !== -1 &&
                idxIV !== -1 &&
                idxV !== -1 &&
                idxVI !== -1 &&
                idxVII !== -1 &&
                idxVIII !== -1
            ) {
                updatedRows[idxLNFinal] = {
                    ...updatedRows[idxLNFinal],
                    revenue: 0,
                    cost: 0,
                    profit:
                        toNum(updatedRows[idxIV].profit) -
                        toNum(updatedRows[idxV].profit) +
                        toNum(updatedRows[idxVI].profit) -
                        toNum(updatedRows[idxVII].profit) -
                        toNum(updatedRows[idxVIII].profit),
                    percent: null,
                };
            }

            setRows(updatedRows);
            setLoading(false);
        };

        fetchData();
        // eslint-disable-next-line
    }, [selectedYear, selectedQuarter]);

    // Bên trong component ProfitReportQuarter

    const handleSave = async (rowsToSave) => {
        const rowsData = Array.isArray(rowsToSave) ? rowsToSave : rows;

        // Dữ liệu sẽ được lưu lên Firestore
        const dataToSave = {
            rows: rowsData,
            summaryTargets: summaryTargets, // <<< THÊM DÒNG NÀY ĐỂ LƯU CHỈ TIÊU
            updatedAt: new Date().toISOString(),
        };

        // Gọi hàm setDoc với dữ liệu đã cập nhật
        await setDoc(
            doc(db, "profitReports", `${selectedYear}_${selectedQuarter}`),
            dataToSave
        );

        // Có thể thêm thông báo thành công ở đây
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
        // Dòng tổng cột %LN Quý luôn là –
        if (field === "percent" && name === "TỔNG") return "–";
        // Nếu là dòng đặc biệt và cột doanh thu hoặc chi phí đã chi => luôn là "–"
        if (
            ["revenue", "cost"].includes(field) &&
            rowsHideRevenueCost.includes(name)
        ) {
            return "–";
        }
        // Các dòng group đặc biệt khác...
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
    // Bên trong component ProfitReportQuarter, HÃY THAY THẾ TOÀN BỘ HÀM handleCellChange BẰNG ĐOẠN MÃ DƯỚI ĐÂY:

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

        // ✅ SỬA LỖI: TÁCH MẢNG TÊN HÀNG RA BIẾN RIÊNG
        const autoProfitRowNames = [
            "LỢI NHUẬN LIÊN DOANH (LDX)",
            "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)",
            "GIẢM LN LDX",
            "LỢI NHUẬN LIÊN DOANH (SÀ LAN)",
            "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)",
            "LỢI NHUẬN BÁN SP NGOÀI (RON CỐNG + 68)",
        ];

        // Sử dụng mảng tên hàng để kiểm tra
        const isAutoProfitRow = autoProfitRowNames.includes(name);

        // Các dòng cho phép nhập tay lợi nhuận và tính % chỉ tiêu
        // ✅ SỬA LỖI: Dùng lại biến mảng 'autoProfitRowNames' với spread syntax (...)
        const isCalcPercentTarget = [
            ...autoProfitRowNames,
            "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY",
        ].includes(name);

        // Khi nhập target cho các dòng đặc biệt, cập nhật % chỉ tiêu LN quý
        if (field === "target" && isCalcPercentTarget) {
            const profit = toNum(newRows[idx].profit);
            const target = toNum(newRows[idx].target);
            newRows[idx].percent =
                target !== 0 ? (profit / target) * 100 : null;
        }

        // Áp dụng công thức lợi nhuận cho các hàng trong danh sách
        if (["revenue", "cost"].includes(field) && isAutoProfitRow) {
            const rev = toNum(newRows[idx].revenue);
            const cost = toNum(newRows[idx].cost);
            const profit = rev - cost;
            const target = toNum(newRows[idx].target);
            const percent = target !== 0 ? (profit / target) * 100 : null;

            newRows[idx].profit = profit;
            // Gán lại percent để cập nhật % chỉ tiêu LN KH
            newRows[idx].percent = percent;
        }

        // Trường hợp còn lại: tự động tính profit và %LN quý như bình thường
        if (
            ["revenue", "cost"].includes(field) &&
            !isAutoProfitRow &&
            !isCalcPercentTarget &&
            name !== "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY" &&
            name !== "III. ĐẦU TƯ"
        ) {
            const rev = toNum(newRows[idx].revenue);
            const cost = toNum(newRows[idx].cost);
            const profit = rev - cost;
            const percent = rev !== 0 ? (profit / rev) * 100 : null;
            newRows[idx].profit = profit;
            newRows[idx].percent = percent;
        }

        // --- TÍNH LẠI CÁC DÒNG GROUP TỔNG HỢP VÀ LỢI NHUẬN FINAL ---
        let updatedRows = updateLDXRow(newRows);
        updatedRows = updateDTLNLDXRow(updatedRows);
        updatedRows = updateSalanRow(updatedRows);
        updatedRows = updateThuNhapKhacRow(updatedRows);
        updatedRows = updateDauTuRow(updatedRows);
        updatedRows = updateGroupI3(updatedRows);
        updatedRows = updateGroupI4(updatedRows); // ✨ THÊM DÒNG NÀY

        // === TÍNH LẠI DÒNG II. SẢN XUẤT ===
        const idxII = updatedRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "II. SẢN XUẤT"
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

        if (idxII !== -1 && idxII1 !== -1 && idxII2 !== -1 && idxII3 !== -1) {
            const revenue =
                toNum(updatedRows[idxII1].revenue) +
                toNum(updatedRows[idxII2].revenue) +
                toNum(updatedRows[idxII3].revenue);
            const cost =
                toNum(updatedRows[idxII1].cost) +
                toNum(updatedRows[idxII2].cost) +
                toNum(updatedRows[idxII3].cost);
            const profit =
                toNum(updatedRows[idxII1].profit) +
                toNum(updatedRows[idxII2].profit) +
                toNum(updatedRows[idxII3].profit);
            const percent = revenue ? (profit / revenue) * 100 : null;

            updatedRows[idxII] = {
                ...updatedRows[idxII],
                revenue: null,
                cost: null,
                profit: profit === 0 ? null : profit,
                percent,
            };
        }
        if (field === "target" && idxII !== -1) {
            const target = toNum(updatedRows[idxII].target);
            const profit = toNum(updatedRows[idxII].profit);
            updatedRows[idxII].percent =
                target !== 0 ? (profit / target) * 100 : null;
        }

        // === TÍNH LẠI DÒNG "I. XÂY DỰNG" ===
        const idxI = updatedRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "I. XÂY DỰNG"
        );
        const idxI1 = updatedRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "I.1. DÂN DỤNG + GIAO THÔNG"
        );
        const idxI2 = updatedRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "I.2. KÈ"
        );
        if (idxI2 !== -1) {
            updatedRows[idxI2] = {
                ...updatedRows[idxI2],
                percent: null, // Luôn là null để hiển thị dấu –
            };
        }
        if (idxI !== -1 && idxI1 !== -1 && idxI2 !== -1) {
            const rev =
                toNum(updatedRows[idxI1].revenue) +
                toNum(updatedRows[idxI2].revenue);
            const cost =
                toNum(updatedRows[idxI1].cost) + toNum(updatedRows[idxI2].cost);
            const profit = rev - cost;
            updatedRows[idxI].revenue = rev;
            updatedRows[idxI].cost = cost;
            updatedRows[idxI].profit = profit;
            const target = toNum(updatedRows[idxI].target);
            updatedRows[idxI].percent =
                target !== 0 ? (profit / target) * 100 : null;
        }

        updatedRows = calculateTotals(updatedRows);
        const idxTotal = updatedRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "TỔNG"
        );

        const idxIV = updatedRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`.toUpperCase()
        );
        if (idxIV !== -1 && idxTotal !== -1) {
            updatedRows[idxIV] = {
                ...updatedRows[idxIV],
                revenue: 0,
                cost: 0,
                profit: toNum(updatedRows[idxTotal].profit),
                percent: null,
            };
        }

        // Tính lại LỢI NHUẬN SAU GIẢM TRỪ
        const idxV = updatedRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "V. GIẢM LỢI NHUẬN"
        );
        const idxVI = updatedRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "VI. THU NHẬP KHÁC"
        );
        const idxVII = updatedRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                `VII. KHTSCĐ NĂM ${selectedYear}`.toUpperCase()
        );
        const idxVIII = updatedRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "VIII. GIẢM LÃI ĐT DỰ ÁN"
        );
        const idxLNFinal = updatedRows.findIndex(
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
            updatedRows[idxLNFinal] = {
                ...updatedRows[idxLNFinal],
                revenue: 0,
                cost: 0,
                profit:
                    toNum(updatedRows[idxIV].profit) -
                    toNum(updatedRows[idxV].profit) +
                    toNum(updatedRows[idxVI].profit) -
                    toNum(updatedRows[idxVII].profit) -
                    toNum(updatedRows[idxVIII].profit),
                percent: null,
            };
        }

        // Luôn hiển thị dấu – cho dòng II.4. THU NHẬP KHÁC CỦA NHÀ MÁY
        const idxII4 = updatedRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY"
        );
        if (idxII4 !== -1) {
            updatedRows[idxII4].percent = null;
            // The original code had a typo here (percentTarget), which I'm correcting.
            // It seems `percentTarget` isn't a property on the row object anyway.
            // Sticking to what the rest of the code does.
        }

        setRows([...updatedRows]);
    };

    // Kiểm tra dòng chi tiết nằm dưới I.1. Dân Dụng + Giao Thông
    const isDetailUnderI1 = (idx) => {
        const idxI1 = rows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "I.1. DÂN DỤNG + GIAO THÔNG"
        );
        // Hàm kiểm tra chi tiết dưới II.1 (bạn thêm vào đây)

        const idxI2 = rows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "I.2. KÈ"
        );
        // Là dòng chi tiết nếu nằm giữa I.1 và I.2, và không phải là dòng group
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
            "+ CHI PHÍ ĐÃ TRẢ TRƯỚC",
        ].includes(nameUpper);
        const isNoEditDetailI1 =
            ["revenue", "cost", "profit"].includes(field) &&
            (isDetailUnderI1(idx) ||
                isDetailUnderII1(idx) ||
                nameUpper === "II.1. SẢN XUẤT"); // ⛔ Không cho sửa dòng này

        const allowEdit =
            !disallowedFields.includes(field) &&
            !isCalcRow &&
            !isNoEditDetailI1 &&
            ((["revenue", "cost", "profit"].includes(field) && r.editable) ||
                ["target", "note", "suggest"].includes(field));

        // --- SỬA PHẦN costOverQuarter ---
        if (field === "costOverQuarter") {
            // CHO SỬA nếu là III. ĐẦU TƯ, các dòng khác thì chỉ đọc
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
            // CÁC DÒNG KHÁC: không cho nhập
            return (
                <TableCell align={align} sx={cellStyle}>
                    {format(value)}
                </TableCell>
            );
        }

        // --- Các field còn lại giữ nguyên logic ---
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

        // 1. Freeze header
        sheet.views = [{ state: "frozen", ySplit: 1 }];

        // 2. Header
        const headers = [
            "CÔNG TRÌNH",
            "DOANH THU",
            "CHI PHÍ ĐÃ CHI",
            "LỢI NHUẬN",
            "% CHỈ TIÊU LN KH",
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

        // 3. Block định dạng
        let lastGroupPrefix = "";
        rows.forEach((r, idx) => {
            const row = sheet.addRow([
                r.name,
                r.revenue,
                r.cost,
                r.profit,
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
            const groupPrefix = name.match(/^([IVX]+)\./)?.[1] || "";
            const isNewGroup = groupPrefix && groupPrefix !== lastGroupPrefix;
            const nextPrefix =
                (rows[idx + 1]?.name || "")
                    .toUpperCase()
                    .match(/^([IVX]+)\./)?.[1] || "";
            const isGroupEnd = groupPrefix && nextPrefix !== groupPrefix;

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

                // Đề xuất: bôi vàng
                if (col === 10 && r.suggest) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFFFF3B3" }, // vàng nhạt
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

                // Border mặc định
                cell.border = {
                    top: isNewGroup
                        ? { style: "medium", color: { argb: "FF666666" } }
                        : { style: "thin", color: { argb: "FFDDDDDD" } },
                    bottom: isGroupEnd
                        ? { style: "medium", color: { argb: "FF666666" } }
                        : { style: "thin", color: { argb: "FFDDDDDD" } },
                    left: { style: "thin", color: { argb: "FFDDDDDD" } },
                    right: { style: "thin", color: { argb: "FFDDDDDD" } },
                };
            });

            lastGroupPrefix = groupPrefix;
        });

        // 4. Widths
        sheet.columns = [
            { width: 40 },
            { width: 18 },
            { width: 18 },
            { width: 18 },
            { width: 16 },
            { width: 14 },
            { width: 18 },
            { width: 18 },
            { width: 28 },
            { width: 22 },
        ];

        // 5. Export
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
    // Helper để lấy giá trị từ state `rows`
    const getValueByName = (name, field) => {
        const row = rows.find(
            (r) => (r.name || "").trim().toUpperCase() === name.toUpperCase()
        );
        return row ? toNum(row[field]) : 0;
    };

    // Chuẩn bị dữ liệu `summaryData`
    // Chuẩn bị dữ liệu `summaryData`
    const summaryData = {
        revenueXayDung: getValueByName("I. XÂY DỰNG", "revenue"),
        profitXayDung: getValueByName("I. XÂY DỰNG", "profit"),
        costOverXayDung: getValueByName("I. XÂY DỰNG", "costOverQuarter"),

        // ✅ Đã sửa: Lấy doanh thu từ "II.1. SẢN XUẤT" thay vì "II. SẢN XUẤT"
        revenueSanXuat: getValueByName("II.1. SẢN XUẤT", "revenue"),

        // Giữ nguyên: Lợi nhuận vẫn lấy từ dòng tổng "II. SẢN XUẤT"
        profitSanXuat: getValueByName("II. SẢN XUẤT", "profit"),

        // ✅ Đã sửa: Lấy CP Vượt từ "II. SẢN XUẤT" thay vì để là 0
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
                {/* --- Chỉ dùng một thẻ cuộn ngang ở TableContainer --- */}
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
                                backgroundColor: "#1565c0",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                "& th": {
                                    color: "#fff",
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
                                    "% CHỈ TIÊU LN KH",
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
                                        "&:hover": {
                                            bgcolor: "#f5f5f5",
                                        },
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
                                    {/* Cột CÔNG TRÌNH với Tooltip và Icon */}
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

                                    {/* Các cột DOANH THU, CHI PHÍ ĐÃ CHI, LỢI NHUẬN */}
                                    {renderEditableCell(r, idx, "revenue")}
                                    {renderEditableCell(r, idx, "cost")}
                                    {renderEditableCell(r, idx, "profit")}

                                    {/* % CHỈ TIÊU LN KH */}
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

                                    {/* % LN QUÍ */}
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
                                                "percent"
                                            )
                                        )}
                                    </TableCell>

                                    {/* Cột CP VƯỢT QUÝ */}
                                    {renderEditableCell(
                                        r,
                                        idx,
                                        "costOverQuarter"
                                    )}

                                    {/* Cột CHỈ TIÊU */}
                                    {renderEditableCell(r, idx, "target")}

                                    {/* Cột THUẬN LỢI / KHÓ KHĂN */}
                                    {renderEditableCell(
                                        r,
                                        idx,
                                        "note",
                                        "center"
                                    )}

                                    {/* Cột ĐỀ XUẤT */}
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
                {/* --- Kết thúc phần bảng --- */}

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
                                    type: "",
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
        </Box>
    );
}
