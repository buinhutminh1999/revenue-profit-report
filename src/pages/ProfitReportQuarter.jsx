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

    // Đổi nhãn cột "CP VƯỢT QUÝ <hiện tại>"
    const cpVuotLabel = `CP VƯỢT QUÝ ${selectedQuarter} ${selectedYear}`;

    const cellStyle = {
        minWidth: 120,
        fontSize: tvMode ? 18 : { xs: 12, sm: 14, md: 16 },
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        overflow: "hidden",
        textOverflow: "ellipsis",
        border: "1px solid #ccc", // 👉 viền mảnh giống Excel
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
    const normalizePercentage = (rows) => {
        const specialRows = [
            "I.2. KÈ",
            "II.2. DT + LN ĐƯỢC CHIA TỪ LDX",
            "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)",
            "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY",
            `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`,
            "V. GIẢM LỢI NHUẬN",
            "VI. THU NHẬP KHÁC",
            `VII. KHTSCĐ NĂM ${selectedYear}`,
            "VIII. GIẢM LÃI ĐT DỰ ÁN",
            `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`,
        ];

        const upperNames = specialRows.map((name) => name.trim().toUpperCase());

        return rows.map((r) => {
            const name = (r.name || "").trim().toUpperCase();
            if (upperNames.includes(name)) {
                return {
                    ...r,
                    percent: null,
                    percentTarget: null, // nếu có sử dụng
                };
            }
            return r;
        });
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
                percent: null, // Cột % CHỈ TIÊU LN QUÍ để dấu –
                // % LN QUÍ hiển thị "–" là do phần format ở UI đã để rồi, không cần xử lý thêm
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
            const target = toNum(rows[idxMain].target); // LẤY CHỈ TIÊU
            const percent = target !== 0 ? (profit / target) * 100 : null; // ĐÚNG Ý BẠN
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

                // Cập nhật số liệu mới cho I.1
                groupI1.forEach((p) => {
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
                        };
                    }
                });

                // Thêm công trình mới nếu có
                const idxI1 = updatedRows.findIndex(
                    (r) =>
                        (r.name || "").trim().toUpperCase() ===
                        "I.1. DÂN DỤNG + GIAO THÔNG"
                );
                let i = idxI1 + 1,
                    existedNames = [];
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
                const newProjects = groupI1.filter(
                    (p) => !existedNames.includes((p.name || "").trim())
                );
                if (newProjects.length > 0 && idxI1 !== -1) {
                    updatedRows.splice(idxI1 + 1, 0, ...newProjects);
                }

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
                    ...sumGroup(groupI1),
                    percent: (() => {
                        const profit = groupI1.reduce(
                            (s, r) => s + toNum(r.profit),
                            0
                        );
                        const target = groupI1.reduce(
                            (s, r) => s + toNum(r.target),
                            0
                        );
                        return target ? (profit / target) * 100 : null;
                    })(),
                },
                ...groupI1,
                { name: "I.2. KÈ", ...sumGroup(groupI2), percent: null },
                ...groupI2,
                { name: "I.3. CÔNG TRÌNH CÔNG TY CĐT", ...sumGroup(groupI3) },
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
                    name: `+ Vượt CP BPXN do ko đạt DT ${selectedQuarter}`,
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
                },
                {
                    name: `+ Vượt CP BPĐT do ko có DT ${selectedQuarter} (lãi + thuê vp)`,
                    revenue: 0,
                    cost: 0,
                    profit: 0,
                    percent: null,
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

            // 11. Tính lại TỔNG
            const idxTotal = updatedRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "TỔNG"
            );
            const idxIXD = updatedRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "I. XÂY DỰNG"
            );
            const idxI2KE = updatedRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "I.2. KÈ"
            );
            const idxI3CDT = updatedRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() ===
                    "I.3. CÔNG TRÌNH CÔNG TY CĐT"
            );
            const idxIISX = updatedRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "II. SẢN XUẤT"
            );
            const idxIIIDT = updatedRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "III. ĐẦU TƯ"
            );
            if (
                idxTotal !== -1 &&
                idxIXD !== -1 &&
                idxI2KE !== -1 &&
                idxI3CDT !== -1 &&
                idxIISX !== -1 &&
                idxIIIDT !== -1
            ) {
                const doanhThu =
                    toNum(updatedRows[idxIXD]?.revenue) +
                    toNum(updatedRows[idxI2KE]?.revenue) +
                    toNum(updatedRows[idxI3CDT]?.revenue) +
                    toNum(updatedRows[idxIISX]?.revenue) +
                    toNum(updatedRows[idxIIIDT]?.revenue);

                const chiPhi =
                    toNum(updatedRows[idxIXD]?.cost) +
                    toNum(updatedRows[idxI2KE]?.cost) +
                    toNum(updatedRows[idxI3CDT]?.cost) +
                    toNum(updatedRows[idxIISX]?.cost) +
                    toNum(updatedRows[idxIIIDT]?.cost);

                const loiNhuan = doanhThu - chiPhi;

                updatedRows[idxTotal] = {
                    ...updatedRows[idxTotal],
                    revenue: doanhThu === 0 ? null : doanhThu,
                    cost: chiPhi === 0 ? null : chiPhi,
                    profit: loiNhuan === 0 ? null : loiNhuan,
                    percent: null,
                };
            }

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

        // Nếu là dòng đặc biệt và cột doanh thu hoặc chi phí đã chi => luôn là "–"
        if (
            ["revenue", "cost"].includes(field) &&
            rowsHideRevenueCost.includes(name)
        ) {
            return "–";
        }

        // ✅ Luôn hiển thị – cho cột % LN QUÍ dòng II.4. THU NHẬP KHÁC CỦA NHÀ MÁY
        if (field === "percent" && name === "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY") {
            return "–";
        }

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

    // Xác định các dòng đặc biệt luôn tự động profit = revenue - cost
    const isSpecialLDX = [
        "LỢI NHUẬN LIÊN DOANH (LDX)",
        "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)",
        "GIẢM LN LDX",
    ].includes(name);

    const isSpecialSalan = [
        "LỢI NHUẬN LIÊN DOANH (SÀ LAN)",
        "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)",
    ].includes(name);

    const isLoiNhuanBanNgoai = name === "LỢI NHUẬN BÁN SP NGOÀI (RON CỐNG + 68)";
    const isThuNhapKhacNhaMay = name === "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY";

    // Khi nhập target cho các dòng đặc biệt, cập nhật % chỉ tiêu LN quý
    if (
        field === "target" &&
        (isSpecialLDX ||
            isSpecialSalan ||
            isLoiNhuanBanNgoai ||
            isThuNhapKhacNhaMay)
    ) {
        const profit = toNum(newRows[idx].profit);
        const target = toNum(newRows[idx].target);
        newRows[idx].percent = target !== 0 ? (profit / target) * 100 : null;
    }

    // Khi nhập revenue/cost/profit cho các dòng đặc biệt: luôn tự động profit = revenue - cost
    if (
        ["profit", "revenue", "cost"].includes(field) &&
        (isSpecialLDX || isSpecialSalan || isLoiNhuanBanNgoai)
    ) {
        const rev = toNum(newRows[idx].revenue);
        const cost = toNum(newRows[idx].cost);
        const profit = rev - cost;
        const target = toNum(newRows[idx].target);
        const percent = target !== 0 ? (profit / target) * 100 : null;
        newRows[idx].profit = profit;
        newRows[idx].percent = percent;
    }

    // Trường hợp còn lại: tự động tính profit và %LN quý như bình thường
    if (
        ["revenue", "cost"].includes(field) &&
        !isSpecialLDX &&
        !isSpecialSalan &&
        !isLoiNhuanBanNgoai &&
        !isThuNhapKhacNhaMay
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

    // === TÍNH LẠI DÒNG TỔNG, IV, FINAL LN ===
    const idxTotal = updatedRows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "TỔNG"
    );
    const idxIXD = updatedRows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "I. XÂY DỰNG"
    );
    const idxI2KE = updatedRows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "I.2. KÈ"
    );
    const idxI3CDT = updatedRows.findIndex(
        (r) =>
            (r.name || "").trim().toUpperCase() ===
            "I.3. CÔNG TRÌNH CÔNG TY CĐT"
    );
    const idxIISX = updatedRows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "II. SẢN XUẤT"
    );
    const idxIIIDT = updatedRows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "III. ĐẦU TƯ"
    );

    if (
        idxTotal !== -1 &&
        idxIXD !== -1 &&
        idxI2KE !== -1 &&
        idxI3CDT !== -1 &&
        idxIISX !== -1 &&
        idxIIIDT !== -1
    ) {
        const doanhThu =
            toNum(updatedRows[idxIXD]?.revenue) +
            toNum(updatedRows[idxI2KE]?.revenue) +
            toNum(updatedRows[idxI3CDT]?.revenue) +
            toNum(updatedRows[idxIISX]?.revenue) +
            toNum(updatedRows[idxIIIDT]?.revenue);

        const chiPhi =
            toNum(updatedRows[idxIXD]?.cost) +
            toNum(updatedRows[idxI2KE]?.cost) +
            toNum(updatedRows[idxI3CDT]?.cost) +
            toNum(updatedRows[idxIISX]?.cost) +
            toNum(updatedRows[idxIIIDT]?.cost);

        const loiNhuan = doanhThu - chiPhi;

        updatedRows[idxTotal] = {
            ...updatedRows[idxTotal],
            revenue: doanhThu === 0 ? null : doanhThu,
            cost: chiPhi === 0 ? null : chiPhi,
            profit: loiNhuan === 0 ? null : loiNhuan,
            percent: null,
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

    // Luôn hiển thị dấu – cho dòng II.4. THU NHẬP KHÁC CỦA NHÀ MÁY
    const idxII4 = updatedRows.findIndex(
        (r) =>
            (r.name || "").trim().toUpperCase() ===
            "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY"
    );
    if (idxII4 !== -1) {
        updatedRows[idxII4].percent = null;
        updatedRows[idxII4].percentTarget = null;
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
        ].includes(nameUpper);
        const isNoEditDetailI1 =
            ["revenue", "cost", "profit"].includes(field) &&
            isDetailUnderI1(idx);

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
            "% CHỈ TIÊU LN QUÍ",
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

                <Box
                    sx={{ width: "100%", maxHeight: "75vh", overflow: "auto" }}
                >
                    <TableContainer sx={{ maxHeight: "75vh" }}>
                        <Table size="small">
                            <TableHead
                                sx={{
                                    position: "sticky",
                                    top: 0,
                                    zIndex: 100,
                                    backgroundColor: "#1976d2",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                    "& th": {
                                        color: "#fff",
                                        fontWeight: 700,
                                        fontSize: { xs: 12, sm: 14, md: 16 },
                                        textAlign: "center",
                                        borderBottom: "2px solid white",
                                        whiteSpace: "nowrap",
                                    },
                                }}
                            >
                                <TableRow>
                                    {[
                                        "CÔNG TRÌNH",
                                        "DOANH THU",
                                        "CHI PHÍ ĐÃ CHI",
                                        "LỢI NHUẬN",
                                        "% CHỈ TIÊU LN QUÍ",
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
                                            height: { xs: 40, md: 48 },
                                            bgcolor: r.name?.includes("TỔNG")
                                                ? "#d0f0c0"
                                                : r.name?.match(/^[IVX]+\./)
                                                ? "#ffe082"
                                                : idx % 2 === 0
                                                ? "white"
                                                : "#f9f9f9",
                                        }}
                                    >
                                        <TableCell
                                            sx={{
                                                ...cellStyle,
                                                fontWeight: r.name?.includes(
                                                    "TỔNG"
                                                )
                                                    ? 800
                                                    : r.name?.match(/^[IVX]+\./)
                                                    ? 700
                                                    : 400,
                                                fontSize: r.name?.match(
                                                    /^[IVX]+\./
                                                )
                                                    ? 18
                                                    : "inherit",
                                                textDecoration: r.name?.match(
                                                    /^[IVX]+\./
                                                )
                                                    ? "underline"
                                                    : "none",
                                            }}
                                        >
                                            {r.name?.match(/^[IVX]+\./)
                                                ? "▶ "
                                                : ""}
                                            {r.name}
                                        </TableCell>
                                        {renderEditableCell(r, idx, "revenue")}
                                        {renderEditableCell(r, idx, "cost")}
                                        {renderEditableCell(r, idx, "profit")}

                                        {/* % CHỈ TIÊU LN QUÍ */}
                                        {isDTLNLDX(r) ? (
                                            <TableCell
                                                align="center"
                                                sx={cellStyle}
                                            >
                                                –
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
                                            sx={cellStyle}
                                        >
                                            {isDTLNLDX(r) ||
                                            (r.name || "")
                                                .trim()
                                                .toUpperCase() ===
                                                "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY" ||
                                            (r.name || "")
                                                .trim()
                                                .toUpperCase() === "I.2. KÈ"
                                                ? "–"
                                                : format(
                                                      r.revenue
                                                          ? (r.profit /
                                                                r.revenue) *
                                                                100
                                                          : null,
                                                      "percent"
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
                </Box>
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
        </Box>
    );
}
