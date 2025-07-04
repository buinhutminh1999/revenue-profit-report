import React, { useState, useEffect, useCallback } from "react";
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
    CircularProgress,
    Stack,
    TextField,
    Button,
    MenuItem,
} from "@mui/material";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";
import { toNum, formatNumber } from "../utils/numberUtils";
import { FileDown } from "lucide-react";

const useProfitReportData = (selectedYear) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

const runAllCalculations = useCallback(
    (
        currentRows,
        costAddedToProfitForGroupI,
        costOverCumulativeForGroupI,
        costAddedToProfitForGroupII,
        costOverCumulativeForGroupII
    ) => {
        let updatedRows = [...currentRows];

        const sumGroup = (groupRows) => {
            const fieldsToSum = [
                "revenue", "revenueQ1", "revenueQ2", "revenueQ3", "revenueQ4",
                "cost", "costQ1", "costQ2", "costQ3", "costQ4",
                "profit", "profitQ1", "profitQ2", "profitQ3", "profitQ4",
                "costOverCumulative",
            ];
            const totals = {};
            fieldsToSum.forEach((field) => {
                totals[field] = groupRows.reduce(
                    (s, r) => s + toNum(r[field]),
                    0
                );
            });
            return totals;
        };

        const groupNames = [
            "I.1. Dân Dụng + Giao Thông", "I.2. KÈ", "I.3. CÔNG TRÌNH CÔNG TY CĐT",
            "II.1. SẢN XUẤT", "III. ĐẦU TƯ",
        ];
        groupNames.forEach((groupName) => {
            const groupHeaderIndex = updatedRows.findIndex(
                (r) => r.name === groupName
            );
            if (groupHeaderIndex === -1) return;
            const childRows = [];
            let i = groupHeaderIndex + 1;
            while (
                i < updatedRows.length &&
                !updatedRows[i].name.match(/^[IVX]+\./)
            ) {
                childRows.push(updatedRows[i]);
                i++;
            }
            updatedRows[groupHeaderIndex] = {
                ...updatedRows[groupHeaderIndex],
                ...sumGroup(childRows),
            };
        });

        const groupISum = sumGroup(
            updatedRows.filter((r) => r.name.startsWith("I."))
        );
        const groupIISum = sumGroup(
            updatedRows.filter((r) => r.name.startsWith("II."))
        );
        const groupIIISum = sumGroup(
            updatedRows.filter((r) => r.name.startsWith("III."))
        );

        const idxI = updatedRows.findIndex((r) => r.name === "I. XÂY DỰNG");
        if (idxI !== -1) {
            updatedRows[idxI] = { ...updatedRows[idxI], ...groupISum };
            if (costAddedToProfitForGroupI !== undefined) {
                updatedRows[idxI].costAddedToProfit = costAddedToProfitForGroupI;
            }
            if (costOverCumulativeForGroupI !== undefined) {
                updatedRows[idxI].costOverCumulative = costOverCumulativeForGroupI;
            }
        }

        const idxII = updatedRows.findIndex((r) => r.name === "II. SẢN XUẤT");
        if (idxII !== -1) {
            updatedRows[idxII] = {
                ...updatedRows[idxII],
                ...groupIISum,
                costAddedToProfit: costAddedToProfitForGroupII,
                costOverCumulative: costOverCumulativeForGroupII,
            };
        }
        const idxIII = updatedRows.findIndex((r) => r.name === "III. ĐẦU TƯ");
        if (idxIII !== -1)
            updatedRows[idxIII] = {
                ...updatedRows[idxIII],
                ...groupIIISum,
            };

        const idxTotal = updatedRows.findIndex((r) => r.name === "IV. TỔNG");
        if (idxTotal !== -1) {
            updatedRows[idxTotal] = {
                ...updatedRows[idxTotal],
                ...sumGroup([
                    updatedRows[idxI],
                    updatedRows[idxII],
                    updatedRows[idxIII],
                ]),
            };
        }

        // =================================================================================
        // ✨ BẮT ĐẦU: TÍNH TOÁN CHO HÀNG V. LỢI NHUẬN NĂM (LN & CP VƯỢT LŨY KẾ)
        // =================================================================================
        const idxRowV = updatedRows.findIndex(
            (r) => r.name === `V. LỢI NHUẬN NĂM ${selectedYear}`
        );
        const idxRowBPXD = updatedRows.findIndex(
            (r) => r.name === `BP XD CHUYỂN TIẾP LN N${selectedYear}`
        );
        const idxRowTNK = updatedRows.findIndex(
            (r) => r.name === "TRỪ THU NHẬP KHÁC CỦA NHÀ MÁY"
        );
        const idxRowCTLN = updatedRows.findIndex(
            (r) => r.name === `CHUYỂN TIẾP LỢI NHUẬN TC QUA N${selectedYear}`
        );

        if (idxTotal !== -1 && idxRowV !== -1 && idxRowBPXD !== -1 && idxRowTNK !== -1 && idxRowCTLN !== -1) {
            // ✨ CẬP NHẬT: Thêm 'costOverCumulative' vào danh sách các trường cần tính
            const fieldsToCalculateV = [
                "profit", "profitQ1", "profitQ2", "profitQ3", "profitQ4",
                "costOverCumulative"
            ];
            const totalsV = {};

            fieldsToCalculateV.forEach((field) => {
                const totalValue = toNum(updatedRows[idxTotal][field]);
                const bpXdValue = toNum(updatedRows[idxRowBPXD][field]);
                const tnkValue = toNum(updatedRows[idxRowTNK][field]);
                const ctlnValue = toNum(updatedRows[idxRowCTLN][field]);

                // Áp dụng công thức: V = IV - BPXD - TNK - CTLN
                totalsV[field] = totalValue - bpXdValue - tnkValue - ctlnValue;
            });

            updatedRows[idxRowV] = {
                ...updatedRows[idxRowV],
                revenue: 0,
                cost: 0,
                ...totalsV,
            };
        }
        // =================================================================================
        // ✨ KẾT THÚC: TÍNH TOÁN CHO HÀNG V. LỢI NHUẬN NĂM
        // =================================================================================

        const idxRowVI = updatedRows.findIndex(
            (r) => r.name === "VI. LỢI NHUẬN PHÁT SINH"
        );
        const idxGiam = updatedRows.findIndex(
            (r) => r.name === "1. PHÁT SINH GIẢM LỢI NHUẬN"
        );
        const idxTang = updatedRows.findIndex(
            (r) => r.name === "2. PHÁT SINH TĂNG LỢI NHUẬN"
        );
        if (idxRowVI !== -1 && idxGiam !== -1 && idxTang !== -1) {
            const profitFields = ["profit", "profitQ1", "profitQ2", "profitQ3", "profitQ4"];
            const profitTotals = {};
            profitFields.forEach((field) => {
                profitTotals[field] =
                    toNum(updatedRows[idxGiam][field]) +
                    toNum(updatedRows[idxTang][field]);
            });
            updatedRows[idxRowVI] = {
                ...updatedRows[idxRowVI],
                revenue: 0,
                cost: 0,
                ...profitTotals,
            };
        }

       const idxRowA = updatedRows.findIndex(
    (r) => r.name === `A. LỢI NHUẬN NĂM ${selectedYear}`
);
if (idxRowA !== -1 && idxRowV !== -1 && idxRowVI !== -1) {
    // 👇 THÊM 'costOverCumulative' VÀO ĐÂY
    const fieldsToSumA = [
        "profit", "profitQ1", "profitQ2", "profitQ3", "profitQ4",
        "costOverCumulative" 
    ];
    const totalsA = {};
    fieldsToSumA.forEach((field) => {
        // Công thức A[field] = V[field] + VI[field] sẽ được áp dụng cho tất cả các trường trong mảng trên
        totalsA[field] =
            toNum(updatedRows[idxRowV][field]) +
            toNum(updatedRows[idxRowVI][field]);
    });
    updatedRows[idxRowA] = { ...updatedRows[idxRowA], ...totalsA };
}

        return updatedRows;
    },
    [selectedYear]
);
useEffect(() => {
    const fetchData = async () => {
        setLoading(true);

        // ✨ SỬA LẠI: Khai báo thêm biến mới
        let costAddedForGroupI = 0; // Thặng dư cho nhóm I (Thi công)
        let costOverForGroupI = 0;   // Thiếu hụt cho nhóm I (Thi công)
        let costAddedForGroupII = 0; // Thặng dư cho nhóm II (Nhà máy)
        let costOverForGroupII = 0;  // Thiếu hụt cho nhóm II (Nhà máy)

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentQuarterIndex = Math.floor(currentMonth / 3);

        let targetQuarter;
        let targetYear = selectedYear;

        if (selectedYear < now.getFullYear()) {
            targetQuarter = "Q4";
        } else {
            if (currentQuarterIndex === 0) {
                targetQuarter = "Q4";
                targetYear = selectedYear - 1;
            } else {
                const quarters = ["Q1", "Q2", "Q3", "Q4"];
                targetQuarter = quarters[currentQuarterIndex - 1];
            }
        }

        const docId = `${targetYear}_${targetQuarter}`;
        try {
            const costAllocationDoc = await getDoc(
                doc(db, "costAllocationsQuarter", docId)
            );
            if (costAllocationDoc.exists()) {
                const data = costAllocationDoc.data();

                // ✨ SỬA LẠI: Lấy dữ liệu cho cả nhóm I (Thi công) và nhóm II (Nhà máy)
                costAddedForGroupI = toNum(data.totalSurplusThiCong);
                costOverForGroupI = toNum(data.totalDeficitThiCong);
                costAddedForGroupII = toNum(data.totalSurplusNhaMay); // Lấy thặng dư nhà máy
                costOverForGroupII = toNum(data.totalDeficitNhaMay);   // Lấy thiếu hụt nhà máy

                console.log(
                    `Đã lấy dữ liệu từ quý gần nhất: ${targetQuarter}/${targetYear}`
                );
            } else {
                console.log(
                    `Không tìm thấy dữ liệu cho quý gần nhất: ${targetQuarter}/${targetYear}`
                );
            }
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu phân bổ chi phí:", error);
        }

        const projectsSnapshot = await getDocs(collection(db, "projects"));
        const savedReportDoc = await getDoc(
            doc(db, "profitReports", `${selectedYear}`)
        );
        const savedRowsData = savedReportDoc.exists()
            ? savedReportDoc.data().rows
            : [];
        const projects = await Promise.all(
            projectsSnapshot.docs.map(async (d) => {
                const data = d.data();
                const quarterlyData = {
                    revenues: {},
                    costs: {},
                    profits: {},
                };
                for (const quarter of ["Q1", "Q2", "Q3", "Q4"]) {
                    try {
                        const qSnap = await getDoc(
                            doc(
                                db,
                                `projects/${d.id}/years/${selectedYear}/quarters/${quarter}`
                            )
                        );
                        if (qSnap.exists()) {
                            const qData = qSnap.data();
                            const revenue = toNum(qData.overallRevenue);
                            const cost = Array.isArray(qData.items)
                                ? qData.items.reduce(
                                      (sum, item) =>
                                          sum + toNum(item.totalCost),
                                      0
                                  )
                                : 0;
                            quarterlyData.revenues[quarter] = revenue;
                            quarterlyData.costs[quarter] = cost;
                            quarterlyData.profits[quarter] = revenue - cost;
                        }
                    } catch {}
                }
                const totalRevenue = Object.values(
                    quarterlyData.revenues
                ).reduce((s, v) => s + v, 0);
                const totalCost = Object.values(quarterlyData.costs).reduce(
                    (s, v) => s + v,
                    0
                );
                return {
                    ...(savedRowsData.find(
                        (row) => row.name === data.name
                    ) || {}),
                    projectId: d.id,
                    name: data.name,
                    type: data.type || "",
                    revenue: totalRevenue,
                    ...Object.fromEntries(
                        Object.entries(quarterlyData.revenues).map(
                            ([k, v]) => [`revenue${k}`, v]
                        )
                    ),
                    cost: totalCost,
                    ...Object.fromEntries(
                        Object.entries(quarterlyData.costs).map(([k, v]) => [
                            `cost${k}`,
                            v,
                        ])
                    ),
                    profit: totalRevenue - totalCost,
                    ...Object.fromEntries(
                        Object.entries(quarterlyData.profits).map(
                            ([k, v]) => [`profit${k}`, v]
                        )
                    ),
                    percent: totalRevenue
                        ? ((totalRevenue - totalCost) / totalRevenue) * 100
                        : null,
                };
            })
        );

        let rowTemplate = [...savedRowsData];
        if (rowTemplate.length === 0) {
            const template = [
                "I. XÂY DỰNG",
                "I.1. Dân Dụng + Giao Thông",
                "I.2. KÈ",
                "I.3. CÔNG TRÌNH CÔNG TY CĐT",
                "II. SẢN XUẤT",
                "II.1. SẢN XUẤT",
                "II.2. DT + LN ĐƯỢC CHIA TỪ LDX",
                "LỢI NHUẬN LIÊN DOANH (LDX)",
                "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)",
                "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)",
                "LỢI NHUẬN LIÊN DOANH (SÀ LAN)",
                "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)",
                "III. ĐẦU TƯ",
                "IV. TỔNG",
                // =============================================================
                // ✨ CÁC HÀNG MỚI ĐƯỢC THÊM VÀO ĐÂY
                // =============================================================
                `BP XD CHUYỂN TIẾP LN N${selectedYear}`,
                "TRỪ THU NHẬP KHÁC CỦA NHÀ MÁY",
                `CHUYỂN TIẾP LỢI NHUẬN TC QUA N${selectedYear}`,
                // =============================================================
                `V. LỢI NHUẬN NĂM ${selectedYear}`,
                "VI. LỢI NHUẬN PHÁT SINH",
                "1. PHÁT SINH GIẢM LỢI NHUẬN",
                "2. PHÁT SINH TĂNG LỢI NHUẬN",
                `A. LỢI NHUẬN NĂM ${selectedYear}`,
                `GIẢM GIÁ TRỊ TÀI SẢN NĂM ${selectedYear}`,
                "TRÍCH LN TRỪ LÃI DỰ ÁN",
                `TRÍCH QUỸ PHÚC LỢI NĂM ${selectedYear}`,
                `=> TỔNG LỢI NHUẬN NĂM ${selectedYear}`,
                "CHI PHÍ QUÀ TẾT KH XIN THÊM",
                "TRÍCH QUỸ DỰ PHÒNG",
                "B. KHOẢN TRÍCH THƯỞNG",
                `1. TRÍCH THƯỞNG NHÂN VIÊN NĂM ${selectedYear}`,
                "a. THỰC CHI THƯỞNG THEO XẾP LOẠI ABCD",
                "b. TRÍCH 50% THƯỞNG CÁC BP",
                "c. TRÍCH 50% QUỸ TƯƠNG TRỢ",
                "d. THU LƯƠNG TẠM ỨNG SALE",
                `2. LỢI NHUẬN RÒNG NĂM ${selectedYear}`,
                "3. GIÁ TRỊ CHIA CỔ TỨC 30% GIÁ TRỊ LỢI NHUẬN RÒNG",
                `4. CỔ TỨC GIỮ LẠI NĂM ${selectedYear} (70%)`,
            ];
            rowTemplate = template.map((name) => ({ name }));
        }

        const decreaseProfitData = {};
        const increaseProfitData = {};
        for (const quarter of ["Q1", "Q2", "Q3", "Q4"]) {
            const docId = `${selectedYear}_${quarter}`;
            const profitChangeDoc = await getDoc(
                doc(db, "profitChanges", docId)
            );
            if (profitChangeDoc.exists()) {
                const data = profitChangeDoc.data();
                decreaseProfitData[`profit${quarter}`] = toNum(
                    data.totalDecreaseProfit
                );
                increaseProfitData[`profit${quarter}`] = toNum(
                    data.totalIncreaseProfit
                );
            }
        }
        decreaseProfitData.profit = Object.values(
            decreaseProfitData
        ).reduce((s, v) => s + v, 0);
        increaseProfitData.profit = Object.values(
            increaseProfitData
        ).reduce((s, v) => s + v, 0);
        const idxGiam = rowTemplate.findIndex(
            (r) => r.name === "1. PHÁT SINH GIẢM LỢI NHUẬN"
        );
        if (idxGiam > -1)
            rowTemplate[idxGiam] = {
                ...rowTemplate[idxGiam],
                ...decreaseProfitData,
            };
        const idxTang = rowTemplate.findIndex(
            (r) => r.name === "2. PHÁT SINH TĂNG LỢI NHUẬN"
        );
        if (idxTang > -1)
            rowTemplate[idxTang] = {
                ...rowTemplate[idxTang],
                ...increaseProfitData,
            };

        projects.forEach((p) => {
            const index = rowTemplate.findIndex((r) => r.name === p.name);
            if (index > -1) {
                rowTemplate[index] = { ...rowTemplate[index], ...p };
            } else {
                let insertIndex = rowTemplate.findIndex(
                    (r) => r.name === `I.2. KÈ`
                );
                if (
                    p.type === "Thi công" &&
                    (p.name || "").toUpperCase().includes("KÈ")
                )
                    insertIndex = rowTemplate.findIndex(
                        (r) => r.name === `I.3. CÔNG TRÌNH CÔNG TY CĐT`
                    );
                if (p.type.toLowerCase().includes("nhà máy"))
                    insertIndex = rowTemplate.findIndex(
                        (r) => r.name === `II.2. DT + LN ĐƯỢC CHIA TỪ LDX`
                    );
                if (insertIndex === -1)
                    insertIndex = rowTemplate.findIndex(
                        (r) => r.name === "IV. TỔNG"
                    );
                rowTemplate.splice(insertIndex, 0, p);
            }
        });

        // ✨ SỬA LẠI: Truyền cả hai giá trị vào hàm tính toán
        const finalRows = runAllCalculations(
            rowTemplate,
            costAddedForGroupI,      // Đổi tên biến
            costOverForGroupI,       // Đổi tên biến
            costAddedForGroupII,     // ✨ THÊM VÀO
            costOverForGroupII       // ✨ THÊM VÀO
        );
        setRows(finalRows);
        setLoading(false);
    };

    fetchData();
}, [selectedYear, runAllCalculations]);

    return { rows, loading };
};
export default function ProfitReportYear() {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    // const [sourceQuarter, setSourceQuarter] = useState("Gần nhất"); // <-- ĐÃ XÓA
    const [tvMode, setTvMode] = useState(true);

    const { rows, loading } = useProfitReportData(selectedYear); // <-- ĐÃ XÓA

    const cellStyle = {
        minWidth: tvMode ? 90 : 110,
        fontSize: tvMode ? 16 : { xs: 12, sm: 14 },
        padding: tvMode ? "6px 8px" : "8px 12px",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        border: "1px solid #ddd",
    };

    const format = (v, field = "") => {
        if (
            v === null ||
            v === undefined ||
            (typeof v === "number" && isNaN(v))
        )
            return "";
        if (typeof v === "number" && v === 0 && field !== "percent") return "";
        if (typeof v === "number")
            return field === "percent" ? `${v.toFixed(2)}%` : formatNumber(v);
        return v;
    };

    return (
        <Box sx={{ p: 3, bgcolor: "#f7faff", minHeight: "100vh" }}>
            {loading && (
                <CircularProgress
                    sx={{
                        position: "fixed",
                        top: "50%",
                        left: "50%",
                        zIndex: 2000,
                    }}
                />
            )}
            <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 3,
                        flexWrap: "wrap",
                        gap: 2,
                    }}
                >
                    <Typography variant="h5" fontWeight={700} color="primary">
                        Báo cáo Lợi nhuận Năm: {selectedYear}
                    </Typography>
                    <Stack
                        direction="row"
                        spacing={1.5}
                        useFlexGap
                        flexWrap="wrap"
                    >
                        {/* <<-- Ô CHỌN NGUỒN QUÝ ĐÃ BỊ XÓA -->> */}
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
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<FileDown size={18} />}
                        >
                            Xuất Excel
                        </Button>
                    </Stack>
                </Box>
                <TableContainer
                    sx={{
                        maxHeight: "75vh",
                        border: "1px solid #e0e0e0",
                        borderRadius: 2,
                    }}
                >
                    <Table stickyHeader size="small" sx={{ minWidth: 3800 }}>
                        <TableHead>
                            <TableRow
                                sx={{
                                    "& th": {
                                        backgroundColor: "#1565c0",
                                        color: "#fff",
                                        fontWeight: 700,
                                        border: "1px solid #004c8f",
                                    },
                                }}
                            >
                                <TableCell
                                    rowSpan={2}
                                    align="center"
                                    sx={{
                                        ...cellStyle,
                                        minWidth: 350,
                                        position: "sticky",
                                        left: 0,
                                        zIndex: 110,
                                        backgroundColor: "#1565c0",
                                    }}
                                >
                                    CÔNG TRÌNH
                                </TableCell>
                                <TableCell colSpan={4} align="center">
                                    {" "}
                                    DOANH THU{" "}
                                </TableCell>
                                <TableCell rowSpan={2} align="center">
                                    {" "}
                                    TỔNG DT NĂM{" "}
                                </TableCell>
                                <TableCell colSpan={4} align="center">
                                    {" "}
                                    CHI PHÍ{" "}
                                </TableCell>
                                <TableCell rowSpan={2} align="center">
                                    {" "}
                                    TỔNG CP NĂM{" "}
                                </TableCell>
                                <TableCell colSpan={4} align="center">
                                    {" "}
                                    LỢI NHUẬN{" "}
                                </TableCell>
                                <TableCell rowSpan={2} align="center">
                                    {" "}
                                    TỔNG LN NĂM{" "}
                                </TableCell>
                                <TableCell
                                    rowSpan={2}
                                    align="center"
                                    sx={{ minWidth: 150 }}
                                >
                                    {" "}
                                    CP VƯỢT LŨY KẾ{" "}
                                </TableCell>
                                <TableCell
                                    rowSpan={2}
                                    align="center"
                                    sx={{ minWidth: 150 }}
                                >
                                    {" "}
                                    CP CỘNG VÀO LN{" "}
                                </TableCell>
                                <TableCell
                                    rowSpan={2}
                                    align="center"
                                    sx={{ minWidth: 200 }}
                                >
                                    {" "}
                                    GHI CHÚ{" "}
                                </TableCell>
                            </TableRow>
                            <TableRow
                                sx={{
                                    "& th": {
                                        backgroundColor: "#1565c0",
                                        color: "#fff",
                                        fontWeight: 600,
                                        border: "1px solid #004c8f",
                                    },
                                }}
                            >
                                <TableCell align="center">QUÝ 1</TableCell>
                                <TableCell align="center">QUÝ 2</TableCell>
                                <TableCell align="center">QUÝ 3</TableCell>
                                <TableCell align="center">QUÝ 4</TableCell>
                                <TableCell align="center">CP Q1</TableCell>
                                <TableCell align="center">CP Q2</TableCell>
                                <TableCell align="center">CP Q3</TableCell>
                                <TableCell align="center">CP Q4</TableCell>
                                <TableCell align="center">LN Q1</TableCell>
                                <TableCell align="center">LN Q2</TableCell>
                                <TableCell align="center">LN Q3</TableCell>
                                <TableCell align="center">LN Q4</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows
                                .filter((r) => {
                                    const isSpecialHeaderRow =
                                        r.name?.match(/^[IVX]+\./) ||
                                        r.name
                                            ?.toUpperCase()
                                            .includes("LỢI NHUẬN") ||
                                        r.name?.toUpperCase().includes("=>");
                                    if (isSpecialHeaderRow) return true;
                                    if (r.projectId) {
                                        const hasFinancialData =
                                            toNum(r.revenue) !== 0 ||
                                            toNum(r.cost) !== 0 ||
                                            toNum(r.costOverCumulative) !== 0 ||
                                            toNum(r.costAddedToProfit) !== 0;
                                        return hasFinancialData;
                                    } else {
                                        return true;
                                    }
                                })
                                .map((r, idx) => (
                                    <TableRow
                                        key={`${r.name}-${idx}`}
                                        sx={{
                                            backgroundColor:
                                                r.name === "IV. TỔNG"
                                                    ? "#e8f5e9"
                                                    : r.name?.match(/^[IVX]+\./)
                                                    ? "#fff9c4"
                                                    : idx % 2 === 0
                                                    ? "#ffffff"
                                                    : "#f9f9f9",
                                            "&:hover": { bgcolor: "#f0f4ff" },
                                        }}
                                    >
                                        <TableCell
                                            sx={{
                                                ...cellStyle,
                                                fontWeight:
                                                    r.name?.match(
                                                        /^[IVX]+\./
                                                    ) ||
                                                    r.name?.includes(
                                                        "LỢI NHUẬN"
                                                    )
                                                        ? 700
                                                        : 400,
                                                minWidth: 350,
                                                backgroundColor: "inherit",
                                                position: "sticky",
                                                left: 0,
                                                zIndex: 99,
                                                borderRight: "2px solid #ccc",
                                            }}
                                        >
                                            {r.name}
                                        </TableCell>
                                        <TableCell align="right" sx={cellStyle}>
                                            {format(r.revenueQ1)}
                                        </TableCell>
                                        <TableCell align="right" sx={cellStyle}>
                                            {format(r.revenueQ2)}
                                        </TableCell>
                                        <TableCell align="right" sx={cellStyle}>
                                            {format(r.revenueQ3)}
                                        </TableCell>
                                        <TableCell align="right" sx={cellStyle}>
                                            {format(r.revenueQ4)}
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{
                                                ...cellStyle,
                                                fontWeight: "bold",
                                                backgroundColor: "#e3f2fd",
                                            }}
                                        >
                                            {format(r.revenue)}
                                        </TableCell>
                                        <TableCell align="right" sx={cellStyle}>
                                            {format(r.costQ1)}
                                        </TableCell>
                                        <TableCell align="right" sx={cellStyle}>
                                            {format(r.costQ2)}
                                        </TableCell>
                                        <TableCell align="right" sx={cellStyle}>
                                            {format(r.costQ3)}
                                        </TableCell>
                                        <TableCell align="right" sx={cellStyle}>
                                            {format(r.costQ4)}
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{
                                                ...cellStyle,
                                                fontWeight: "bold",
                                                backgroundColor: "#e3f2fd",
                                            }}
                                        >
                                            {format(r.cost)}
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{
                                                ...cellStyle,
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {format(r.profitQ1)}
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{
                                                ...cellStyle,
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {format(r.profitQ2)}
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{
                                                ...cellStyle,
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {format(r.profitQ3)}
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{
                                                ...cellStyle,
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {format(r.profitQ4)}
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{
                                                ...cellStyle,
                                                fontWeight: "bold",
                                                backgroundColor: "#d1c4e9",
                                            }}
                                        >
                                            {format(r.profit)}
                                        </TableCell>
                                        <TableCell align="right" sx={cellStyle}>
                                            {format(r.costOverCumulative)}
                                        </TableCell>
                                        <TableCell align="right" sx={cellStyle}>
                                            {format(r.costAddedToProfit)}
                                        </TableCell>
                                        <TableCell align="left" sx={cellStyle}>
                                            {format(r.note)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
