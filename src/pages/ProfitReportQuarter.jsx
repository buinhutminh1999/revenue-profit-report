import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
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

    // Đổi nhãn cột "CP VƯỢT QUÝ <hiện tại>"
    const cpVuotLabel = `CP VƯỢT QUÝ ${selectedQuarter} ${selectedYear}`;

    const cellStyle = {
        minWidth: 120,
        fontSize: tvMode ? 20 : 16,
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        overflow: "hidden",
        textOverflow: "ellipsis",
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

    const updateSalanRow = (inputRows) => {
        const rows = [...inputRows];
        const idxMain = rows.findIndex((r) =>
            (r.name || "").toUpperCase().includes("TỪ SÀ LAN")
        );
        const idxLNLD = rows.findIndex((r) =>
            (r.name || "").toUpperCase().includes("LIÊN DOANH (SÀ LAN)")
        );
        const idxLNPT = rows.findIndex((r) =>
            (r.name || "")
                .toUpperCase()
                .includes("PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)")
        );
        if (idxMain !== -1 && idxLNLD !== -1 && idxLNPT !== -1) {
            const revenue =
                toNum(rows[idxLNLD].revenue) + toNum(rows[idxLNPT].revenue);
            const cost = toNum(rows[idxLNLD].cost) + toNum(rows[idxLNPT].cost);
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

    const updateThuNhapKhacRow = (inputRows) => {
        const rows = [...inputRows];
        const idxMain = rows.findIndex((r) =>
            (r.name || "").toUpperCase().includes("THU NHẬP KHÁC")
        );
        const children = rows.filter((r) =>
            (r.name || "").toUpperCase().includes("LỢI NHUẬN BÁN SP NGOÀI")
        );
        if (idxMain !== -1 && children.length) {
            const revenue = children.reduce((s, r) => s + toNum(r.revenue), 0);
            const cost = children.reduce((s, r) => s + toNum(r.cost), 0);
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

    const updateDauTuRow = (inputRows) => {
        const rows = [...inputRows];
        const idxMain = rows.findIndex((r) =>
            (r.name || "").toUpperCase().startsWith("III. ĐẦU TƯ")
        );
        const children = rows.filter((r) =>
            (r.name || "").toUpperCase().includes("DOANH THU BLX")
        );
        if (idxMain !== -1 && children.length) {
            const revenue = children.reduce((s, r) => s + toNum(r.revenue), 0);
            const cost = children.reduce((s, r) => s + toNum(r.cost), 0);
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

    // ==== useEffect chính ====
  useEffect(() => {
    const fetchData = async () => {
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
        (r.revenue !== 0 || r.cost !== 0)
);

        const groupI2 = groupBy(projects, (r) => r.type === "Kè");
        const groupI3 = groupBy(projects, (r) => r.type === "CĐT");
        const groupII = groupBy(projects, (r) => r.type === "Nhà máy");
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

        if (
            saved.exists() &&
            Array.isArray(saved.data().rows) &&
            saved.data().rows.length > 0
        ) {
            let updatedRows = [...saved.data().rows];

            // --- Bổ sung công trình mới cho nhóm I.1. Dân Dụng + Giao Thông ---
            const idxI1 = updatedRows.findIndex(
                (r) =>
                    (r.name || "")
                        .trim()
                        .toUpperCase() ===
                    "I.1. DÂN DỤNG + GIAO THÔNG"
            );
            // Tìm các công trình hiện có phía dưới nhóm này
            let i = idxI1 + 1;
            let existedNames = [];
            while (
                i < updatedRows.length &&
                !(
                    updatedRows[i].name &&
                    updatedRows[i].name.match(/^[IVX]+\./)
                )
            ) {
                existedNames.push((updatedRows[i].name || "").trim());
                i++;
            }
            // Tìm công trình mới chưa có
            const newProjects = groupI1.filter(
                (p) => !existedNames.includes((p.name || "").trim())
            );
            if (newProjects.length > 0 && idxI1 !== -1) {
                updatedRows.splice(idxI1 + 1, 0, ...newProjects);
            }

            setRows(updatedRows);
            return;
        }

        // Nếu chưa có dữ liệu đã lưu => Build defaultRows như bình thường
        let defaultRows = [
            {
                name: "I. XÂY DỰNG",
                revenue: 0,
                cost: 0,
                profit: 0,
                percent: null,
                costOverQuarter: null,
            },
            { name: "I.1. Dân Dụng + Giao Thông", ...sumGroup(groupI1) },
            ...groupI1,
            { name: "I.2. KÈ", ...sumGroup(groupI2) },
            ...groupI2,
            { name: "I.3. CÔNG TRÌNH CÔNG TY CĐT", ...sumGroup(groupI3) },
            ...groupI3,
            ...others,
            {
                name: "II. SẢN XUẤT",
                revenue: 0,
                cost: 0,
                profit: 0,
                percent: null,
            },
            {
                name: "II.1. SẢN XUẤT",
                ...sumGroup(groupII),
                costOverQuarter: null,
                editable: true,
            },
            ...groupII,
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
                editable: true,
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
                editable: true,
            },
            {
                name: "DOANH THU BLX Q3 N2024 - D21",
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
            {
                name: `+ Vượt CP BPSX do ko đạt DT ${selectedQuarter}`,
                revenue: 0,
                cost: 0,
                profit: 0,
                percent: null,
                editable: true,
            },
            {
                name: `+ Vượt CP BPĐT do ko có DT ${selectedQuarter} (lãi + thuê vp)`,
                revenue: 0,
                cost: 0,
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
                editable: true,
            },
        ];

        // 4. Lấy chi phí vượt quý hiện tại (nếu có)
        let cpVuotCurr = 0;
        try {
            const currDocSnap = await getDoc(
                doc(
                    db,
                    "costAllocationsQuarter",
                    `${selectedYear}_${selectedQuarter}`
                )
            );
            if (currDocSnap.exists()) {
                cpVuotCurr = toNum(
                    currDocSnap.data().totalThiCongCumQuarterOnly
                );
            }
        } catch {
            cpVuotCurr = 0;
        }
        const idxXD = defaultRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "I. XÂY DỰNG"
        );
        if (idxXD !== -1)
            defaultRows[idxXD].costOverQuarter = cpVuotCurr || 0;

        // 5. LẤY GIÁ TRỊ GIẢM LỢI NHUẬN & THU NHẬP KHÁC TỪ /profitChanges/<quy_nam>
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

        // *** LUÔN GÁN lại GIÁ TRỊ GIẢM LỢI NHUẬN & THU NHẬP KHÁC SAU KHI ĐỒNG BỘ FIRESTORE ***
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

        // 7. Cập nhật các dòng nhóm (LDX, Sà Lan, Thu nhập khác, Đầu tư)
        let updatedRows = updateLDXRow(defaultRows);
        updatedRows = updateSalanRow(updatedRows);
        updatedRows = updateThuNhapKhacRow(updatedRows);
        updatedRows = updateDauTuRow(updatedRows);

        // ---- BỔ SUNG: TÍNH LẠI DOANH THU & CHI PHÍ I. XÂY DỰNG = I.1 + I.2 ----
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

            // % LN = LỢI NHUẬN / CHỈ TIÊU * 100
            const target = toNum(updatedRows[idxI].target);
            const percent = target !== 0 ? (profit / target) * 100 : null;
            updatedRows[idxI].percent = percent;
        }

        // 8. Tính lại TỔNG và các dòng tổng hợp
        const isNotTotal = (r) =>
            (r.name || "").trim().toUpperCase() !== "TỔNG" &&
            typeof r.revenue === "number" &&
            typeof r.cost === "number";
        const sum = updatedRows.filter(isNotTotal);
        const revenue = sum.reduce((t, r) => t + toNum(r.revenue), 0);
        const cost = sum.reduce((t, r) => t + toNum(r.cost), 0);
        const profit = revenue - cost;
        const percent = revenue ? (profit / revenue) * 100 : null;

        const idxTotal = updatedRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "TỔNG"
        );
        if (idxTotal !== -1) {
            updatedRows[idxTotal] = {
                ...updatedRows[idxTotal],
                revenue,
                cost,
                profit,
                percent,
            };
        }

        // 9. IV. LỢI NHUẬN ... = profit của TỔNG
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

        // 10. LỢI NHUẬN SAU GIẢM TRỪ = công thức đặc biệt
        const idxLNFinal = updatedRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                finalProfitRowName.trim().toUpperCase()
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
    };

    fetchData();

    // eslint-disable-next-line
}, [selectedYear, selectedQuarter]);


    const handleSave = async (rowsToSave) => {
        const rowsData = Array.isArray(rowsToSave) ? rowsToSave : rows;
        await setDoc(
            doc(db, "profitReports", `${selectedYear}_${selectedQuarter}`),
            {
                rows: rowsData,
                updatedAt: new Date().toISOString(),
            }
        );
        // Có thể thêm toast/success
    };

    const format = (v, field = "") => {
        if (v === null || v === undefined) return "–";
        if (typeof v === "number")
            return field === "percent" ? `${v.toFixed(2)}%` : formatNumber(v);
        return v;
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
        const isSpecialLDX = [
            "LỢI NHUẬN LIÊN DOANH (LDX)",
            "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)",
            "GIẢM LN LDX",
        ].includes(name);

        const isSpecialSalan = [
            "LỢI NHUẬN LIÊN DOANH (SÀ LAN)",
            "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)",
        ].includes(name);

        if (
            ["revenue", "cost"].includes(field) &&
            !isSpecialLDX &&
            !isSpecialSalan
        ) {
            const rev = toNum(newRows[idx].revenue);
            const cost = toNum(newRows[idx].cost);
            const profit = rev - cost;
            const percent = rev !== 0 ? (profit / rev) * 100 : null;
            newRows[idx].profit = profit;
            newRows[idx].percent = percent;
        }

        if (["profit", "revenue", "cost"].includes(field) && isSpecialLDX) {
            const rev = toNum(newRows[idx].revenue);
            const cost = toNum(newRows[idx].cost);
            const profit = newRows[idx].profit ?? rev - cost;
            const percent = rev !== 0 ? (profit / rev) * 100 : null;
            newRows[idx].profit = profit;
            newRows[idx].percent = percent;
        }

        if (["profit", "revenue", "cost"].includes(field) && isSpecialSalan) {
            const rev = toNum(newRows[idx].revenue);
            const cost = toNum(newRows[idx].cost);
            const profit = newRows[idx].profit ?? rev - cost;
            const percent = rev !== 0 ? (profit / rev) * 100 : null;
            newRows[idx].profit = profit;
            newRows[idx].percent = percent;
        }

        // --- TÍNH LẠI CÁC DÒNG GROUP TỔNG HỢP VÀ LỢI NHUẬN FINAL ---
        let updatedRows = updateLDXRow(newRows);
        updatedRows = updateSalanRow(updatedRows);
        updatedRows = updateThuNhapKhacRow(updatedRows);
        updatedRows = updateDauTuRow(updatedRows);

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
            // % LN = LỢI NHUẬN / CHỈ TIÊU * 100
            const target = toNum(updatedRows[idxI].target);
            updatedRows[idxI].percent =
                target !== 0 ? (profit / target) * 100 : null;
        }

        // === TÍNH LẠI DÒNG TỔNG, IV, FINAL LN ===
        const isNotTotal = (r) =>
            (r.name || "").trim().toUpperCase() !== "TỔNG" &&
            typeof r.revenue === "number" &&
            typeof r.cost === "number";
        const sum = updatedRows.filter(isNotTotal);
        const revenue = sum.reduce((t, r) => t + toNum(r.revenue), 0);
        const cost = sum.reduce((t, r) => t + toNum(r.cost), 0);
        const profit = revenue - cost;
        const percent = revenue ? (profit / revenue) * 100 : null;

        const idxTotal = updatedRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "TỔNG"
        );
        if (idxTotal !== -1) {
            updatedRows[idxTotal] = {
                ...updatedRows[idxTotal],
                revenue,
                cost,
                profit,
                percent,
            };
        }

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

        setRows([...updatedRows]);
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
            `V. GIẢM LỢI NHUẬN`,
            "VI. THU NHẬP KHÁC",
        ].includes(nameUpper);
        const allowEdit =
            !disallowedFields.includes(field) &&
            !isCalcRow &&
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
                    format(value, field)
                )}
            </TableCell>
        );
    };
    const handleAddProject = () => {
        if (!addProject.name.trim()) return;
        let insertIndex = -1;
        let groupLabel = addProject.group.trim().toUpperCase();
        let rowsCopy = [...rows];

        const idxGroup = rowsCopy.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === groupLabel
        );
        if (idxGroup !== -1) {
            insertIndex = idxGroup + 1;
            while (
                insertIndex < rowsCopy.length &&
                !(
                    rowsCopy[insertIndex].name &&
                    rowsCopy[insertIndex].name.match(/^[IVX]+\./)
                ) &&
                !["I. XÂY DỰNG", "II. SẢN XUẤT", "TỔNG"].includes(
                    (rowsCopy[insertIndex].name || "").toUpperCase()
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

        // => LƯU NGAY LÊN FIRESTORE SAU KHI THÊM
        setTimeout(() => {
            handleSave(rowsCopy); // truyền rows mới vào hàm lưu
        }, 200);
    };

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "#f7faff", py: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 2,
                        flexWrap: "wrap",
                        gap: 2,
                    }}
                >
                    <Typography variant="h5" fontWeight={600}>
                        Báo cáo quý: {selectedQuarter}.{selectedYear}
                    </Typography>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<SaveIcon />}
                            onClick={() => handleSave()}
                            sx={{ borderRadius: 2 }}
                        >
                            Lưu dữ liệu
                        </Button>

                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Chọn quý</InputLabel>
                            <Select
                                value={selectedQuarter}
                                label="Chọn quý"
                                onChange={(e) =>
                                    setSelectedQuarter(e.target.value)
                                }
                            >
                                {["Q1", "Q2", "Q3", "Q4"].map((q) => (
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
                            sx={{ minWidth: 100 }}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={tvMode}
                                    onChange={() => setTvMode(!tvMode)}
                                />
                            }
                            label="TV Mode"
                        />
                        <Button
                            variant="outlined"
                            color="success"
                            onClick={() => setAddModal(true)}
                            sx={{ borderRadius: 2 }}
                        >
                            + Thêm Công Trình
                        </Button>
                    </Stack>
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: "#e3f2fd" }}>
                            <TableRow>
                                {[
                                    "CÔNG TRÌNH",
                                    "DOANH THU",
                                    "CHI PHÍ ĐÃ CHI",
                                    "LỢI NHUẬN",
                                    "% LN",
                                    cpVuotLabel,
                                    "CHỈ TIÊU",
                                    "THUẬN LỢI / KHÓ KHĂN",
                                    "ĐỀ XUẤT",
                                ].map((label, i) => (
                                    <TableCell
                                        key={i}
                                        align={i > 0 ? "right" : "left"}
                                        sx={cellStyle}
                                    >
                                        <strong>{label}</strong>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((r, idx) => (
                                <TableRow
                                    key={idx}
                                    sx={{
                                        bgcolor: r.name?.includes("TỔNG")
                                            ? "#e8f5e9"
                                            : r.name?.match(/^[IVX]+\./)
                                            ? "#fffde7"
                                            : "inherit",
                                    }}
                                >
                                    <TableCell
                                        sx={{
                                            ...cellStyle,
                                            fontWeight: r.name?.includes("TỔNG")
                                                ? 800
                                                : r.name?.match(/^[IVX]+\./)
                                                ? 700
                                                : "normal",
                                            textDecoration: r.name?.match(
                                                /^[IVX]+\./
                                            )
                                                ? "underline"
                                                : "none",
                                        }}
                                    >
                                        {r.name}
                                    </TableCell>
                                    {renderEditableCell(r, idx, "revenue")}
                                    {renderEditableCell(r, idx, "cost")}
                                    {renderEditableCell(r, idx, "profit")}
                                    {renderEditableCell(
                                        r,
                                        idx,
                                        "percent",
                                        "center"
                                    )}
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
            </Paper>

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
                                type: "", // type để rỗng hoặc có thể tự động hóa nếu muốn, hiện không nhập từ dialog
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
        </Box>
    );
}
