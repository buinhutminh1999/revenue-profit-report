import React, { useState, useEffect, useCallback, useRef } from "react";
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
    Tooltip,
    Menu,
    Checkbox,
    ListItemText,
} from "@mui/material";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";
import { toNum, formatNumber } from "../utils/numberUtils";
import { FileDown, Save } from "lucide-react";
import ProfitSummaryTable from "../reports/ProfitSummaryTable";
// ✅ BƯỚC 1: IMPORT THƯ VIỆN VÀ CSS
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
// ✅ THAY THẾ COMPONENT RESIZABLEHEADER CŨ BẰNG COMPONENT NÀY
import { ViewColumn as ViewColumnIcon } from '@mui/icons-material'; // ✅ Thêm import icon

const ResizableHeader = ({ onResize, width, children, ...restProps }) => {
    if (!width) {
        return <th {...restProps}>{children}</th>;
    }

    // Tạo một component riêng cho nút kéo
    const CustomHandle = React.forwardRef((props, ref) => (
        <span
            ref={ref}
            {...props}
            style={{
                position: 'absolute',
                width: '10px',
                height: '100%',
                bottom: 0,
                right: '-5px',
                cursor: 'col-resize',
                zIndex: 1,
            }}
        >
            {/* Đây là đường kẻ dọc */}
            <span style={{
                position: 'absolute',
                right: '5px',
                top: '50%',
                transform: 'translateY(-50%)',
                height: '50%',
                width: '2px',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
            }} />
        </span>
    ));

    return (
        <Resizable
            width={width}
            height={0}
            handle={<CustomHandle />} // ✅ Sử dụng component nút kéo tùy chỉnh
            onResize={onResize}
            draggableOpts={{ enableUserSelectHack: false }}
        >
            <th {...restProps}>{children}</th>
        </Resizable>
    );
};

const useProfitReportData = (selectedYear) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialSummaryTargets, setInitialSummaryTargets] = useState({});

    const [editableRows, setEditableRows] = useState({});

    // Danh sách các hàng có thể chỉnh sửa
    const editableRowNames = [
        "CHI PHÍ QUÀ TẾT KH XIN THÊM",
        "TRÍCH QUỸ DỰ PHÒNG",
        "B. KHOẢN TRÍCH THƯỞNG",
        `1. TRÍCH THƯỞNG NHÂN VIÊN NĂM ${selectedYear}`, // <--- THÊM DÒNG NÀY
        "b. TRÍCH 50% THƯỞNG CÁC BP",
        "c. TRÍCH 50% QUỸ TƯƠNG TRỢ",
        "d. THU LƯƠNG TẠM ỨNG SALE",
        "3. GIÁ TRỊ CHIA CỔ TỨC 30% GIÁ TRỊ LỢI NHUẬN RÒNG",
        `4. CỔ TỨC GIỮ LẠI NĂM ${selectedYear} (70%)`,
    ];

    // Hàm lưu dữ liệu các hàng có thể chỉnh sửa
    const saveEditableData = useCallback(async () => {
        try {
            const editableData = {};
            editableRowNames.forEach((rowName) => {
                const actualRowName = rowName.includes("4. CỔ TỨC GIỮ LẠI NĂM")
                    ? `4. CỔ TỨC GIỮ LẠI NĂM ${selectedYear} (70%)`
                    : rowName;

                if (editableRows[actualRowName]) {
                    editableData[actualRowName] = editableRows[actualRowName];
                }
            });

            await setDoc(doc(db, "editableProfitRows", `${selectedYear}`), {
                rows: editableData,
                lastUpdated: new Date(),
            });

            console.log("Đã lưu dữ liệu các hàng có thể chỉnh sửa");
        } catch (error) {
            console.error("Lỗi khi lưu dữ liệu:", error);
        }
    }, [editableRows, selectedYear, editableRowNames]);

    // Hàm cập nhật giá trị cho hàng có thể chỉnh sửa
    const updateEditableRow = useCallback((rowName, field, value) => {
        setEditableRows((prev) => ({
            ...prev,
            [rowName]: {
                ...prev[rowName],
                [field]: toNum(value),
            },
        }));
    }, []);

    // Auto-save khi editableRows thay đổi
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (Object.keys(editableRows).length > 0) {
                saveEditableData();
            }
        }, 1000); // Auto-save sau 1 giây

        return () => clearTimeout(timeoutId);
    }, [editableRows, saveEditableData]);

    const runAllCalculations = useCallback(
        (
            currentRows,
            costAddedToProfitForGroupI,
            costOverCumulativeForGroupI,
            costAddedToProfitForGroupII,
            costOverCumulativeForGroupII,
            costOverCumulativeForGroupIII

        ) => {
            let updatedRows = [...currentRows];

            const sumGroup = (groupRows) => {
                const fieldsToSum = [
                    "revenue",
                    "revenueQ1",
                    "revenueQ2",
                    "revenueQ3",
                    "revenueQ4",
                    "cost",
                    "costQ1",
                    "costQ2",
                    "costQ3",
                    "costQ4",
                    "profit",
                    "profitQ1",
                    "profitQ2",
                    "profitQ3",
                    "profitQ4",
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
                "I.1. Dân Dụng + Giao Thông",
                "I.2. KÈ",
                "I.3. CÔNG TRÌNH CÔNG TY CĐT",
                "I.4. Xí nghiệp XD II", // ← THÊM DÒNG NÀY

                "II.1. SẢN XUẤT",
                "III. ĐẦU TƯ",
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
                    updatedRows[idxI].costAddedToProfit =
                        costAddedToProfitForGroupI;
                }
                if (costOverCumulativeForGroupI !== undefined) {
                    updatedRows[idxI].costOverCumulative =
                        costOverCumulativeForGroupI;
                } else {
                }
            }

            const idxII = updatedRows.findIndex(
                (r) => r.name === "II. SẢN XUẤT"
            );
            if (idxII !== -1) {
                updatedRows[idxII] = {
                    ...updatedRows[idxII],
                    ...groupIISum,
                    costAddedToProfit: costAddedToProfitForGroupII,
                    costOverCumulative: costOverCumulativeForGroupII,
                };
            }
            const idxIII = updatedRows.findIndex(
                (r) => r.name === "III. ĐẦU TƯ"
            );
            if (idxIII !== -1)
                updatedRows[idxIII] = {
                    ...updatedRows[idxIII],
                    ...groupIIISum,
                    // ✅ THÊM DÒNG NÀY ĐỂ GÁN GIÁ TRỊ
                    costOverCumulative: costOverCumulativeForGroupIII,
                };

            const idxTotal = updatedRows.findIndex(
                (r) => r.name === "IV. TỔNG"
            );
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
                (r) =>
                    r.name === `CHUYỂN TIẾP LỢI NHUẬN TC QUA N${selectedYear}`
            );

            if (
                idxTotal !== -1 &&
                idxRowV !== -1 &&
                idxRowBPXD !== -1 &&
                idxRowTNK !== -1 &&
                idxRowCTLN !== -1
            ) {
                const fieldsToCalculateV = [
                    "profit",
                    "profitQ1",
                    "profitQ2",
                    "profitQ3",
                    "profitQ4",
                    "costOverCumulative",
                ];
                const totalsV = {};

                fieldsToCalculateV.forEach((field) => {
                    const totalValue = toNum(updatedRows[idxTotal][field]);
                    const bpXdValue = toNum(updatedRows[idxRowBPXD][field]);
                    const tnkValue = toNum(updatedRows[idxRowTNK][field]);
                    const ctlnValue = toNum(updatedRows[idxRowCTLN][field]);

                    totalsV[field] =
                        totalValue - bpXdValue - tnkValue - ctlnValue;
                });

                updatedRows[idxRowV] = {
                    ...updatedRows[idxRowV],
                    revenue: 0,
                    cost: 0,
                    ...totalsV,
                };
            }

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
                const profitFields = [
                    "profit",
                    "profitQ1",
                    "profitQ2",
                    "profitQ3",
                    "profitQ4",
                ];
                const profitTotals = {};
                profitFields.forEach((field) => {
                    profitTotals[field] =
                        toNum(updatedRows[idxGiam][field]) -
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
                const fieldsToSumA = [
                    "profit",
                    "profitQ1",
                    "profitQ2",
                    "profitQ3",
                    "profitQ4",
                    "costOverCumulative",
                ];
                const totalsA = {};
                fieldsToSumA.forEach((field) => {
                    totalsA[field] =
                        toNum(updatedRows[idxRowV][field]) +
                        toNum(updatedRows[idxRowVI][field]);
                });
                updatedRows[idxRowA] = { ...updatedRows[idxRowA], ...totalsA };
            }

            // Tính toán cho "=> TỔNG LỢI NHUẬN NĂM"
            const idxTongLoiNhuanNam = updatedRows.findIndex(
                (r) => r.name === `=> TỔNG LỢI NHUẬN NĂM ${selectedYear}`
            );
            const idxGiamGiaTaiSan = updatedRows.findIndex(
                (r) => r.name === `GIẢM GIÁ TRỊ TÀI SẢN NĂM ${selectedYear}`
            );
            const idxQuyPhucLoi = updatedRows.findIndex(
                (r) => r.name === `TRÍCH QUỸ PHÚC LỢI NĂM ${selectedYear}`
            );
            const idxTrichLaiDuAn = updatedRows.findIndex(
                (r) => r.name === "TRÍCH LN TRỪ LÃI DỰ ÁN"
            );

            if (
                idxTongLoiNhuanNam !== -1 &&
                idxRowA !== -1 &&
                idxGiamGiaTaiSan !== -1 &&
                idxQuyPhucLoi !== -1 &&
                idxTrichLaiDuAn !== -1
            ) {
                const fieldsToCalculateTotal = [
                    "profit",
                    "profitQ1",
                    "profitQ2",
                    "profitQ3",
                    "profitQ4",
                    "costOverCumulative",
                ];
                const totalsLoiNhuan = {};

                fieldsToCalculateTotal.forEach((field) => {
                    if (field === "profit") {
                        const valueA = toNum(updatedRows[idxRowA]["profit"]);
                        const valueGiamGia = toNum(
                            updatedRows[idxGiamGiaTaiSan]["profit"]
                        );
                        const valuePhucLoi = toNum(
                            updatedRows[idxQuyPhucLoi]["profit"]
                        );
                        const valueLaiDuAn = toNum(
                            updatedRows[idxTrichLaiDuAn]["profit"]
                        );

                        totalsLoiNhuan["profit"] =
                            valueA - valueGiamGia - valuePhucLoi - valueLaiDuAn;
                    } else if (field === "costOverCumulative") {
                        const valueA = toNum(
                            updatedRows[idxRowA]["costOverCumulative"]
                        );
                        const valueGiamGia = toNum(
                            updatedRows[idxGiamGiaTaiSan]["costOverCumulative"]
                        );
                        const valuePhucLoi = toNum(
                            updatedRows[idxQuyPhucLoi]["costOverCumulative"]
                        );

                        totalsLoiNhuan["costOverCumulative"] =
                            valueA - valueGiamGia - valuePhucLoi;
                    } else {
                        const valueA = toNum(updatedRows[idxRowA][field]);
                        const valueGiamGia = toNum(
                            updatedRows[idxGiamGiaTaiSan][field]
                        );

                        totalsLoiNhuan[field] = valueA - valueGiamGia;
                    }
                });

                updatedRows[idxTongLoiNhuanNam] = {
                    ...updatedRows[idxTongLoiNhuanNam],
                    ...totalsLoiNhuan,
                };
            }

            // Tính toán cho "2. LỢI NHUẬN RÒNG NĂM" - lấy từ TỔNG LỢI NHUẬN NĂM
            const idxLoiNhuanRong = updatedRows.findIndex(
                (r) => r.name === `2. LỢI NHUẬN RÒNG NĂM ${selectedYear}`
            );
            const idxTongLN = updatedRows.findIndex(
                (r) => r.name === `=> TỔNG LỢI NHUẬN NĂM ${selectedYear}`
            );

            if (idxLoiNhuanRong !== -1 && idxTongLN !== -1) {
                updatedRows[idxLoiNhuanRong] = {
                    ...updatedRows[idxLoiNhuanRong],
                    profit: toNum(updatedRows[idxTongLN].profit),
                };
            }
            // Tính toán cho "a. THỰC CHI THƯỞNG THEO XẾP LOẠI ABCD"
            const idxThucChiThuong = updatedRows.findIndex(
                (r) => r.name === "a. THỰC CHI THƯỞNG THEO XẾP LOẠI ABCD"
            );
            const idxTrichThuongNV = updatedRows.findIndex(
                (r) =>
                    r.name === `1. TRÍCH THƯỞNG NHÂN VIÊN NĂM ${selectedYear}`
            );
            const idxTrich50BP = updatedRows.findIndex(
                (r) => r.name === "b. TRÍCH 50% THƯỞNG CÁC BP"
            );
            const idxThuLuongSale = updatedRows.findIndex(
                (r) => r.name === "d. THU LƯƠNG TẠM ỨNG SALE"
            );

            if (
                idxThucChiThuong !== -1 &&
                idxTrichThuongNV !== -1 &&
                idxTrich50BP !== -1 &&
                idxThuLuongSale !== -1
            ) {
                const thucChiThuong =
                    toNum(updatedRows[idxTrichThuongNV].profit) -
                    toNum(updatedRows[idxTrich50BP].profit) -
                    toNum(updatedRows[idxThuLuongSale].profit);

                updatedRows[idxThucChiThuong] = {
                    ...updatedRows[idxThucChiThuong],
                    profit: thucChiThuong,
                };
            }
            return updatedRows;
        },
        [selectedYear]
    );

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // ======================================================================
            // ✅ BƯỚC 1: THÊM LẠI ĐOẠN CODE TÍNH TỔNG CHỈ TIÊU TẠI ĐÂY
            // ======================================================================
            let summedTargets = {
                revenueTargetXayDung: 0,
                profitTargetXayDung: 0,
                revenueTargetSanXuat: 0,
                profitTargetSanXuat: 0,
                revenueTargetDauTu: 0,
                profitTargetDauTu: 0,
            };

            const quarters = ["Q1", "Q2", "Q3", "Q4"];
            // Thay thế toàn bộ vòng lặp for cũ bằng vòng lặp này

            for (const quarter of quarters) {
                try {
                    const quarterlyReportDoc = await getDoc(
                        doc(db, "profitReports", `${selectedYear}_${quarter}`)
                    );

                    if (quarterlyReportDoc.exists()) {
                        const quarterlyData = quarterlyReportDoc.data();

                        // Lấy object summaryTargets từ dữ liệu của quý
                        const targetsForQuarter =
                            quarterlyData.summaryTargets || {};

                        // Cộng dồn đúng trường chỉ tiêu
                        summedTargets.revenueTargetXayDung += toNum(
                            targetsForQuarter.revenueTargetXayDung
                        );
                        summedTargets.profitTargetXayDung += toNum(
                            targetsForQuarter.profitTargetXayDung
                        );

                        summedTargets.revenueTargetSanXuat += toNum(
                            targetsForQuarter.revenueTargetSanXuat
                        );
                        summedTargets.profitTargetSanXuat += toNum(
                            targetsForQuarter.profitTargetSanXuat
                        );

                        summedTargets.revenueTargetDauTu += toNum(
                            targetsForQuarter.revenueTargetDauTu
                        );
                        summedTargets.profitTargetDauTu += toNum(
                            targetsForQuarter.profitTargetDauTu
                        );
                    }
                } catch (error) {
                    console.error(
                        `Lỗi khi đọc báo cáo quý ${quarter}/${selectedYear}:`,
                        error
                    );
                }
            }
            setInitialSummaryTargets(summedTargets);
            // ✅ KẾT THÚC THAY ĐỔI
            // ======================================================================
            // Load dữ liệu các hàng có thể chỉnh sửa đã lưu
            try {
                const editableDoc = await getDoc(
                    doc(db, "editableProfitRows", `${selectedYear}`)
                );
                if (editableDoc.exists()) {
                    setEditableRows(editableDoc.data().rows || {});
                }
            } catch (error) {
                console.error(
                    "Lỗi khi tải dữ liệu các hàng có thể chỉnh sửa:",
                    error
                );
            }

            let costAddedForGroupI = 0;
            let costOverForGroupI = 0;
            let costAddedForGroupII = 0;
            let costOverForGroupII = 0;
            let costOverForGroupIII = 0; // ✅ THÊM BIẾN NÀY


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

            // Lấy dữ liệu cho Group I từ costAllocationsQuarter như cũ
            const docId = `${targetYear}_${targetQuarter}`;
            try {
                const costAllocationDoc = await getDoc(
                    doc(db, "costAllocationsQuarter", docId)
                );
                if (costAllocationDoc.exists()) {
                    const data = costAllocationDoc.data();

                    costAddedForGroupI = toNum(data.totalSurplusThiCong);
                    costOverForGroupI = toNum(data.totalDeficitThiCong);
                    costAddedForGroupII = toNum(data.totalSurplusNhaMay); // Giữ nguyên cho CP CỘNG VÀO LN

                    costOverForGroupIII = toNum(data.totalDeficitKHDT);

                }
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu phân bổ chi phí:", error);
            }

            // ✅ THÊM MỚI: Lấy carryoverEnd cho II. SẢN XUẤT từ công trình cụ thể
            try {
                const sanXuatDoc = await getDoc(
                    doc(db, `projects/HKZyMDRhyXJzJiOauzVe/years/${targetYear}/quarters/${targetQuarter}`)
                );

                if (sanXuatDoc.exists()) {
                    const data = sanXuatDoc.data();

                    // Kiểm tra nếu có items và cộng dồn carryoverEnd của từng item
                    if (Array.isArray(data.items) && data.items.length > 0) {
                        const totalCarryoverEnd = data.items.reduce((sum, item) => {
                            return sum + toNum(item.carryoverEnd || 0);
                        }, 0);
                        costOverForGroupII = -totalCarryoverEnd;
                        console.log(
                            `Đã cộng dồn carryoverEnd từ ${data.items.length} items cho Sản xuất: ${costOverForGroupII}`
                        );
                    } else {
                        // Nếu không có items, lấy carryoverEnd ở cấp document (fallback)
                        if (data.carryoverEnd !== undefined) {
                            costOverForGroupII = -toNum(data.carryoverEnd);
                            console.log(
                                `Đã lấy carryoverEnd ở cấp document cho Sản xuất: ${costOverForGroupII}`
                            );
                        } else {
                            costOverForGroupII = 0;
                            console.log("Không tìm thấy carryoverEnd cho Sản xuất");
                        }
                    }
                } else {
                    costOverForGroupII = 0;
                    console.log(
                        `Không tìm thấy dữ liệu cho Sản xuất trong quý ${targetQuarter}/${targetYear}`
                    );
                }
            } catch (error) {
                console.error("Lỗi khi lấy carryoverEnd cho Sản xuất:", error);
                costOverForGroupII = 0;
            }

            const projectsSnapshot = await getDocs(collection(db, "projects"));
            const savedReportDoc = await getDoc(
                doc(db, "profitReports", `${selectedYear}`)
            );
            const savedRowsData = savedReportDoc.exists()
                ? savedReportDoc.data().rows
                : [];
            // ======================================================================
            // ✅ VỊ TRÍ 1: TỐT NHẤT ĐỂ KIỂM TRA DỮ LIỆU GỐC
            console.log(
                `Dữ liệu gốc từ 'profitReports/${selectedYear}':`,
                savedRowsData
            );
            // ======================================================================
            // =================================================================
            // ✅ SAO CHÉP VÀ THAY THẾ TOÀN BỘ KHỐI CODE BÊN DƯỚI
            // =================================================================

            // =================================================================
            // ✅ SAO CHÉP VÀ THAY THẾ TOÀN BỘ KHỐI CODE BÊN DƯỚI
            // =================================================================

            const projects = await Promise.all(
                projectsSnapshot.docs.map(async (d) => {
                    const data = d.data();
                    const projectName = data.name;

                    // BƯỚC 1: Luôn lấy dữ liệu của cả 4 quý từ Firestore trước
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
                                let cost = 0;
                                const projectType = (data.type || "").toLowerCase();

                                if (projectType.includes("nhà máy")) {
                                    if (Array.isArray(qData.items) && qData.items.length > 0) {
                                        cost = qData.items.reduce(
                                            (sum, item) => sum + toNum(item.totalCost || 0),
                                            0
                                        );
                                    }
                                } else {
                                    if (Array.isArray(qData.items) && qData.items.length > 0) {
                                        const totalItemsRevenue = qData.items.reduce(
                                            (sum, item) => sum + toNum(item.revenue || 0),
                                            0
                                        );

                                        if (totalItemsRevenue === 0 && revenue === 0) {
                                            cost = 0;
                                        } else {
                                            if (totalItemsRevenue === 0) {
                                                cost = qData.items.reduce(
                                                    (sum, item) => sum + toNum(item.cpSauQuyetToan || 0),
                                                    0
                                                );
                                            } else {
                                                cost = qData.items.reduce(
                                                    (sum, item) => sum + toNum(item.totalCost || 0),
                                                    0
                                                );
                                            }
                                        }
                                    } else if (revenue === 0) {
                                        cost = 0;
                                    }
                                }

                                quarterlyData.revenues[quarter] = revenue;
                                quarterlyData.costs[quarter] = cost;
                                quarterlyData.profits[quarter] = revenue - cost;
                            }
                        } catch (error) {
                            console.error(`Lỗi khi lấy dữ liệu quý ${quarter} cho dự án ${d.id}:`, error);
                        }
                    }

                    // ======================================================================
                    // ✅ BƯỚC 2: KIỂM TRA VÀ GHI ĐÈ DỮ LIỆU QUÝ 3 NẾU ĐÚNG CÔNG TRÌNH
                    // ======================================================================
                    if (projectName === "MAT TRAN TO QUOC") {
                        console.log("🔥 Ghi đè dữ liệu Quý 3 cho công trình: MAT TRAN TO QUOC");

                        // ✅ CHỮA CHÁY: NHẬP SỐ LIỆU QUÝ 3 MỚI TẠI ĐÂY
                        // 👇👇👇 THAY SỐ TIỀN CỦA BẠN VÀO ĐÂY 👇👇👇
                        const revenueQ3_override = 0; // Thay bằng Doanh thu Q3 thực tế
                        const costQ3_override = 17200000
;    // Thay bằng Chi phí Q3 thực tế

                        // Ghi đè dữ liệu Q3 trong object đã lấy được ở trên
                        quarterlyData.revenues['Q3'] = revenueQ3_override;
                        quarterlyData.costs['Q3'] = costQ3_override;
                        quarterlyData.profits['Q3'] = revenueQ3_override - costQ3_override;
                    }
                    // ======================================================================
                    // ✅ KẾT THÚC LOGIC GHI ĐÈ
                    // ======================================================================


                    // BƯỚC 3: TÍNH TOÁN TỔNG NĂM TỪ DỮ LIỆU ĐÃ CÓ (Q3 ĐÃ ĐƯỢC CẬP NHẬT)
                    const totalRevenue = Object.values(quarterlyData.revenues).reduce((s, v) => s + v, 0);
                    const totalCost = Object.values(quarterlyData.costs).reduce((s, v) => s + v, 0);

                    return {
                        ...(savedRowsData.find((row) => row.name === data.name) || {}),
                        projectId: d.id,
                        name: data.name,
                        type: data.type || "",
                        revenue: totalRevenue,
                        ...Object.fromEntries(
                            Object.entries(quarterlyData.revenues).map(([k, v]) => [`revenue${k}`, v])
                        ),
                        cost: totalCost,
                        ...Object.fromEntries(
                            Object.entries(quarterlyData.costs).map(([k, v]) => [`cost${k}`, v])
                        ),
                        profit: totalRevenue - totalCost,
                        ...Object.fromEntries(
                            Object.entries(quarterlyData.profits).map(([k, v]) => [`profit${k}`, v])
                        ),
                        percent: totalRevenue
                            ? ((totalRevenue - totalCost) / totalRevenue) * 100
                            : null,
                        plannedProfitMargin: data.estimatedProfitMargin || null,
                    };
                })
            );


            // =================================================================
            // ✅ KẾT THÚC KHỐI CODE THAY THẾ
            // =================================================================

            // =================================================================
            // ✅ KẾT THÚC KHỐI CODE THAY THẾ
            // =================================================================

            let rowTemplate = [...savedRowsData];
            if (rowTemplate.length === 0) {
                const template = [
                    "I. XÂY DỰNG",
                    "I.1. Dân Dụng + Giao Thông",
                    "I.2. KÈ",
                    "I.3. CÔNG TRÌNH CÔNG TY CĐT",
                    "I.4. Xí nghiệp XD II", // ← THÊM DÒNG NÀY
                    "II. SẢN XUẤT",
                    "II.1. SẢN XUẤT",
                    "II.2. DT + LN ĐƯỢC CHIA TỪ LDX",
                    "LỢI NHUẬN LIÊN DOANH (LDX)",
                    "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)",
                    "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)",
                    "LỢI NHUẬN LIÊN DOANH (SÀ LAN)",
                    "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)",
                    "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY",
                    "LỢI NHUẬN BÁN SP NGOÀI (RON CỐNG + 68)",
                    "III. ĐẦU TƯ",
                    "IV. TỔNG",
                    `BP XD CHUYỂN TIẾP LN N${selectedYear}`,
                    "TRỪ THU NHẬP KHÁC CỦA NHÀ MÁY",
                    `CHUYỂN TIẾP LỢI NHUẬN TC QUA N${selectedYear}`,
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

            // Lấy dữ liệu cho hàng "TRÍCH LN TRỪ LÃI DỰ ÁN"
            const projectInterestData = {};
            for (const quarter of ["Q1", "Q2", "Q3", "Q4"]) {
                try {
                    const docId = `${selectedYear}_${quarter}`;
                    const profitReportSnap = await getDoc(
                        doc(db, "profitReports", docId)
                    );
                    if (profitReportSnap.exists()) {
                        const reportData = profitReportSnap.data();
                        if (Array.isArray(reportData.rows)) {
                            const interestRow = reportData.rows.find(
                                (row) => row.name === "VIII. GIẢM LÃI ĐT DỰ ÁN"
                            );
                            if (interestRow) {
                                projectInterestData[`profit${quarter}`] = toNum(
                                    interestRow.profit
                                );
                            }
                        }
                    }
                } catch (error) {
                    console.error(
                        `Lỗi khi lấy dữ liệu "GIẢM LÃI ĐT DỰ ÁN" cho ${quarter}/${selectedYear}:`,
                        error
                    );
                }
            }
            projectInterestData.profit = Object.values(
                projectInterestData
            ).reduce((s, v) => s + v, 0);

            const idxInterest = rowTemplate.findIndex(
                (r) => r.name === "TRÍCH LN TRỪ LÃI DỰ ÁN"
            );
            if (idxInterest > -1) {
                rowTemplate[idxInterest] = {
                    ...rowTemplate[idxInterest],
                    ...projectInterestData,
                };
            }

            // Lấy dữ liệu cho hàng "GIẢM GIÁ TRỊ TÀI SẢN"
            const assetDepreciationData = {};
            for (const quarter of ["Q1", "Q2", "Q3", "Q4"]) {
                try {
                    const docId = `${selectedYear}_${quarter}`;
                    const profitReportSnap = await getDoc(
                        doc(db, "profitReports", docId)
                    );
                    if (profitReportSnap.exists()) {
                        const reportData = profitReportSnap.data();
                        if (Array.isArray(reportData.rows)) {
                            const assetRow = reportData.rows.find(
                                (row) =>
                                    row.name ===
                                    `VII. KHTSCĐ NĂM ${selectedYear}`
                            );
                            if (assetRow) {
                                assetDepreciationData[`profit${quarter}`] =
                                    toNum(assetRow.profit);
                            }
                        }
                    }
                } catch (error) {
                    console.error(
                        `Lỗi khi lấy dữ liệu "KHTSCĐ" cho ${quarter}/${selectedYear}:`,
                        error
                    );
                }
            }
            assetDepreciationData.profit = Object.values(
                assetDepreciationData
            ).reduce((s, v) => s + v, 0);

            const idxAsset = rowTemplate.findIndex(
                (r) => r.name === `GIẢM GIÁ TRỊ TÀI SẢN NĂM ${selectedYear}`
            );
            if (idxAsset > -1) {
                rowTemplate[idxAsset] = {
                    ...rowTemplate[idxAsset],
                    ...assetDepreciationData,
                };
            }
            // ✅ BẮT ĐẦU: THAY THẾ TOÀN BỘ KHỐI CODE CŨ BẰNG KHỐI NÀY
            // ======================================================================
            // TỔNG HỢP DỮ LIỆU TỪ BÁO CÁO QUÝ CHO CÁC HÀNG ĐẶC BIỆT
            // ======================================================================
            const rowsToAggregate = [
                "II.2. DT + LN ĐƯỢC CHIA TỪ LDX",
                "LỢI NHUẬN LIÊN DOANH (LDX)",
                "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)",
                "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)",
                "LỢI NHUẬN LIÊN DOANH (SÀ LAN)",
                "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)",
                "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY",
                "LỢI NHUẬN BÁN SP NGOÀI (RON CỐNG + 68)"
            ];

            for (const rowName of rowsToAggregate) {
                const aggregatedData = {};
                for (const quarter of ["Q1", "Q2", "Q3", "Q4"]) {
                    try {
                        const docId = `${selectedYear}_${quarter}`;
                        const profitReportSnap = await getDoc(
                            doc(db, "profitReports", docId)
                        );

                        if (profitReportSnap.exists()) {
                            const reportData = profitReportSnap.data();
                            if (Array.isArray(reportData.rows)) {
                                const sourceRow = reportData.rows.find(
                                    (row) => row.name === rowName
                                );
                                if (sourceRow) {
                                    // Lấy số liệu từ báo cáo quý và gán vào đúng trường của năm
                                    aggregatedData[`revenue${quarter}`] = toNum(
                                        sourceRow.revenue
                                    );
                                    aggregatedData[`cost${quarter}`] = toNum(
                                        sourceRow.cost
                                    );
                                    aggregatedData[`profit${quarter}`] = toNum(
                                        sourceRow.profit
                                    );
                                }
                            }
                        }
                    } catch (error) {
                        console.error(
                            `Lỗi khi lấy dữ liệu cho "${rowName}" từ quý ${quarter}/${selectedYear}:`,
                            error
                        );
                    }
                }

                // Tính tổng cả năm từ dữ liệu các quý vừa lấy
                aggregatedData.revenue = ["Q1", "Q2", "Q3", "Q4"].reduce(
                    (sum, q) => sum + (aggregatedData[`revenue${q}`] || 0),
                    0
                );
                aggregatedData.cost = ["Q1", "Q2", "Q3", "Q4"].reduce(
                    (sum, q) => sum + (aggregatedData[`cost${q}`] || 0),
                    0
                );
                aggregatedData.profit = ["Q1", "Q2", "Q3", "Q4"].reduce(
                    (sum, q) => sum + (aggregatedData[`profit${q}`] || 0),
                    0
                );

                // Cập nhật dữ liệu vào rowTemplate
                const targetIndex = rowTemplate.findIndex(
                    (r) => r.name === rowName
                );
                if (targetIndex > -1) {
                    rowTemplate[targetIndex] = {
                        ...rowTemplate[targetIndex],
                        ...aggregatedData,
                    };
                }
            }
            // Thêm đoạn code này vào phần TỔNG HỢP DỮ LIỆU TỪ BÁO CÁO QUÝ
            // (sau phần xử lý các hàng liên doanh, khoảng dòng 600-650)

            // ======================================================================
            // LOAD DỮ LIỆU CHO I.4. XÍ NGHIỆP XD II
            // ======================================================================
            // Biến để lưu các công trình chi tiết của Xí nghiệp XD II
            const xiNghiepXD2Projects = [];

            for (const quarter of ["Q1", "Q2", "Q3", "Q4"]) {
                try {
                    const docId = `${selectedYear}_${quarter}`;
                    const profitReportSnap = await getDoc(
                        doc(db, "profitReports", docId)
                    );

                    if (profitReportSnap.exists()) {
                        const reportData = profitReportSnap.data();
                        if (Array.isArray(reportData.rows)) {
                            // Lọc các dự án có type = "xnxd2"
                            const xnxd2Rows = reportData.rows.filter(
                                (row) => row.type === "xnxd2"
                            );

                            // Xử lý từng dự án
                            xnxd2Rows.forEach((projectRow) => {
                                // Tìm xem dự án này đã tồn tại trong danh sách chưa
                                let existingProject = xiNghiepXD2Projects.find(
                                    (p) => p.name === projectRow.name
                                );

                                if (!existingProject) {
                                    // Nếu chưa tồn tại, tạo mới
                                    existingProject = {
                                        name: projectRow.name,
                                        type: "xnxd2",
                                        revenue: 0,
                                        revenueQ1: 0,
                                        revenueQ2: 0,
                                        revenueQ3: 0,
                                        revenueQ4: 0,
                                        cost: 0,
                                        costQ1: 0,
                                        costQ2: 0,
                                        costQ3: 0,
                                        costQ4: 0,
                                        profit: 0,
                                        profitQ1: 0,
                                        profitQ2: 0,
                                        profitQ3: 0,
                                        profitQ4: 0,
                                    };
                                    xiNghiepXD2Projects.push(existingProject);
                                }

                                // Cập nhật dữ liệu cho quý tương ứng
                                existingProject[`revenue${quarter}`] = toNum(projectRow.revenue);
                                existingProject[`cost${quarter}`] = toNum(projectRow.cost);
                                existingProject[`profit${quarter}`] = toNum(projectRow.profit);
                            });
                        }
                    }
                } catch (error) {
                    console.error(
                        `Lỗi khi lấy dữ liệu Xí nghiệp XD II cho ${quarter}/${selectedYear}:`,
                        error
                    );
                }
            }

            // Tính tổng cả năm cho từng dự án
            xiNghiepXD2Projects.forEach((project) => {
                project.revenue = ["Q1", "Q2", "Q3", "Q4"].reduce(
                    (sum, q) => sum + (project[`revenue${q}`] || 0),
                    0
                );
                project.cost = ["Q1", "Q2", "Q3", "Q4"].reduce(
                    (sum, q) => sum + (project[`cost${q}`] || 0),
                    0
                );
                project.profit = ["Q1", "Q2", "Q3", "Q4"].reduce(
                    (sum, q) => sum + (project[`profit${q}`] || 0),
                    0
                );
            });

            // Tìm vị trí để chèn các dự án Xí nghiệp XD II vào rowTemplate
            const xiNghiepHeaderIndex = rowTemplate.findIndex(
                (r) => r.name === "I.4. Xí nghiệp XD II"
            );

            if (xiNghiepHeaderIndex !== -1) {
                // Chèn các dự án chi tiết sau header I.4
                let insertPosition = xiNghiepHeaderIndex + 1;

                // Xóa các dự án cũ nếu có (để tránh duplicate)
                while (insertPosition < rowTemplate.length &&
                    !rowTemplate[insertPosition].name.match(/^[IVX]+\./) &&
                    rowTemplate[insertPosition].type === "xnxd2") {
                    rowTemplate.splice(insertPosition, 1);
                }

                // Chèn các dự án mới
                xiNghiepXD2Projects.forEach((project, index) => {
                    rowTemplate.splice(insertPosition + index, 0, project);
                });
            }
            const nhaMayProjects = [];

            for (const quarter of ["Q1", "Q2", "Q3", "Q4"]) {
                try {
                    const docId = `${selectedYear}_${quarter}`;
                    const profitReportSnap = await getDoc(
                        doc(db, "profitReports", docId)
                    );

                    if (profitReportSnap.exists()) {
                        const reportData = profitReportSnap.data();
                        if (Array.isArray(reportData.rows)) {
                            // Lọc các dự án có type = "Nhà máy"
                            const nhaMayRows = reportData.rows.filter(
                                (row) => row.type === "Nhà máy"
                            );

                            // Xử lý từng dự án
                            nhaMayRows.forEach((projectRow) => {
                                // Tìm xem dự án này đã tồn tại trong danh sách chưa
                                let existingProject = nhaMayProjects.find(
                                    (p) => p.name === projectRow.name
                                );

                                if (!existingProject) {
                                    // Nếu chưa tồn tại, tạo mới
                                    existingProject = {
                                        name: projectRow.name,
                                        type: "Nhà máy",
                                        revenue: 0,
                                        revenueQ1: 0,
                                        revenueQ2: 0,
                                        revenueQ3: 0,
                                        revenueQ4: 0,
                                        cost: 0,
                                        costQ1: 0,
                                        costQ2: 0,
                                        costQ3: 0,
                                        costQ4: 0,
                                        profit: 0,
                                        profitQ1: 0,
                                        profitQ2: 0,
                                        profitQ3: 0,
                                        profitQ4: 0,
                                    };
                                    nhaMayProjects.push(existingProject);
                                }

                                // Cập nhật dữ liệu cho quý tương ứng
                                existingProject[`revenue${quarter}`] = toNum(projectRow.revenue);
                                existingProject[`cost${quarter}`] = toNum(projectRow.cost);
                                existingProject[`profit${quarter}`] = toNum(projectRow.profit);
                            });
                        }
                    }
                } catch (error) {
                    console.error(
                        `Lỗi khi lấy dữ liệu Nhà máy cho ${quarter}/${selectedYear}:`,
                        error
                    );
                }
            }

            // Tính tổng cả năm cho từng dự án
            nhaMayProjects.forEach((project) => {
                project.revenue = ["Q1", "Q2", "Q3", "Q4"].reduce(
                    (sum, q) => sum + (project[`revenue${q}`] || 0),
                    0
                );
                project.cost = ["Q1", "Q2", "Q3", "Q4"].reduce(
                    (sum, q) => sum + (project[`cost${q}`] || 0),
                    0
                );
                project.profit = ["Q1", "Q2", "Q3", "Q4"].reduce(
                    (sum, q) => sum + (project[`profit${q}`] || 0),
                    0
                );
            });

            // Tìm vị trí để chèn các dự án Nhà máy vào rowTemplate
            const sanXuatHeaderIndex = rowTemplate.findIndex(
                (r) => r.name === "II.1. SẢN XUẤT"
            );

            if (sanXuatHeaderIndex !== -1) {
                // Chèn các dự án chi tiết sau header II.1
                let insertPosition = sanXuatHeaderIndex + 1;

                // Xóa các dự án cũ nếu có (để tránh duplicate)
                while (insertPosition < rowTemplate.length &&
                    !rowTemplate[insertPosition].name.match(/^[IVX]+\./) &&
                    rowTemplate[insertPosition].type === "Nhà máy") {
                    rowTemplate.splice(insertPosition, 1);
                }

                // Chèn các dự án mới
                nhaMayProjects.forEach((project, index) => {
                    rowTemplate.splice(insertPosition + index, 0, project);
                });
            }
            // ======================================================================
            // ✅ BẮT ĐẦU: LOGIC MỚI CHO III. ĐẦU TƯ
            // ======================================================================
            const dauTuProjects = []; // Mảng chứa các dự án đầu tư

            // Vòng lặp để lấy dữ liệu từ nguồn mới (ví dụ: báo cáo quý)
            for (const quarter of ["Q1", "Q2", "Q3", "Q4"]) {
                try {
                    const docId = `${selectedYear}_${quarter}`;
                    const profitReportSnap = await getDoc(
                        doc(db, "profitReports", docId)
                    );

                    if (profitReportSnap.exists()) {
                        const reportData = profitReportSnap.data();
                        if (Array.isArray(reportData.rows)) {
                            // Lọc các dự án có type = "KH-ĐT"
                            const dauTuRows = reportData.rows.filter(
                                (row) => row.type === "KH-ĐT"
                            );

                            // Xử lý và tổng hợp dữ liệu (tương tự logic của "Nhà máy")
                            dauTuRows.forEach((projectRow) => {
                                let existingProject = dauTuProjects.find(
                                    (p) => p.name === projectRow.name
                                );

                                if (!existingProject) {
                                    existingProject = {
                                        name: projectRow.name, type: "KH-ĐT",
                                        revenue: 0, revenueQ1: 0, revenueQ2: 0, revenueQ3: 0, revenueQ4: 0,
                                        cost: 0, costQ1: 0, costQ2: 0, costQ3: 0, costQ4: 0,
                                        profit: 0, profitQ1: 0, profitQ2: 0, profitQ3: 0, profitQ4: 0,
                                    };
                                    dauTuProjects.push(existingProject);
                                }
                                existingProject[`revenue${quarter}`] = toNum(projectRow.revenue);
                                existingProject[`cost${quarter}`] = toNum(projectRow.cost);
                                existingProject[`profit${quarter}`] = toNum(projectRow.profit);
                            });
                        }
                    }
                } catch (error) { /*...*/ }
            }

            // Tính tổng năm cho từng dự án
            dauTuProjects.forEach((project) => {
                project.revenue = ["Q1", "Q2", "Q3", "Q4"].reduce((s, q) => s + (project[`revenue${q}`] || 0), 0);
                project.cost = ["Q1", "Q2", "Q3", "Q4"].reduce((s, q) => s + (project[`cost${q}`] || 0), 0);
                project.profit = ["Q1", "Q2", "Q3", "Q4"].reduce((s, q) => s + (project[`profit${q}`] || 0), 0);
            });


            // Chèn các dự án đã xử lý vào bảng
            const dauTuHeaderIndex = rowTemplate.findIndex((r) => r.name === "III. ĐẦU TƯ");
            if (dauTuHeaderIndex !== -1) {
                dauTuProjects.forEach((project, index) => {
                    rowTemplate.splice(dauTuHeaderIndex + 1 + index, 0, project);
                });
            }
            // ======================================================================
            // ✅ KẾT THÚC: LOGIC MỚI CHO III. ĐẦU TƯ
            // ======================================================================// ======================================================================
            // ======================================================================
            // ✅ BẮT ĐẦU: LOGIC MỚI CHO I.3. CÔNG TRÌNH CÔNG TY CĐT
            // ======================================================================
            const cdtProjects = []; // Mảng chứa các dự án CĐT

            // Vòng lặp qua 4 quý để lấy dữ liệu từ profitReports
            for (const quarter of ["Q1", "Q2", "Q3", "Q4"]) {
                try {
                    const docId = `${selectedYear}_${quarter}`;
                    const profitReportSnap = await getDoc(
                        doc(db, "profitReports", docId)
                    );

                    if (profitReportSnap.exists()) {
                        const reportData = profitReportSnap.data();
                        if (Array.isArray(reportData.rows)) {
                            // Lọc ra các dự án có type = "CĐT" trong báo cáo quý
                            const cdtRows = reportData.rows.filter(
                                (row) => row.type === "CĐT"
                            );

                            // Xử lý và tổng hợp dữ liệu cho từng dự án tìm thấy
                            cdtRows.forEach((projectRow) => {
                                let existingProject = cdtProjects.find(
                                    (p) => p.name === projectRow.name
                                );

                                if (!existingProject) {
                                    // Nếu dự án chưa có trong danh sách, tạo mới
                                    existingProject = {
                                        name: projectRow.name, type: "CĐT",
                                        revenue: 0, revenueQ1: 0, revenueQ2: 0, revenueQ3: 0, revenueQ4: 0,
                                        cost: 0, costQ1: 0, costQ2: 0, costQ3: 0, costQ4: 0,
                                        profit: 0, profitQ1: 0, profitQ2: 0, profitQ3: 0, profitQ4: 0,
                                    };
                                    cdtProjects.push(existingProject);
                                }
                                // Cập nhật dữ liệu cho quý tương ứng
                                existingProject[`revenue${quarter}`] = toNum(projectRow.revenue);
                                existingProject[`cost${quarter}`] = toNum(projectRow.cost);
                                existingProject[`profit${quarter}`] = toNum(projectRow.profit);
                            });
                        }
                    }
                } catch (error) {
                    console.error(
                        `Lỗi khi lấy dữ liệu CĐT cho ${quarter}/${selectedYear}:`,
                        error
                    );
                }
            }

            // Tính tổng cả năm cho từng dự án CĐT
            cdtProjects.forEach((project) => {
                project.revenue = ["Q1", "Q2", "Q3", "Q4"].reduce((s, q) => s + (project[`revenue${q}`] || 0), 0);
                project.cost = ["Q1", "Q2", "Q3", "Q4"].reduce((s, q) => s + (project[`cost${q}`] || 0), 0);
                project.profit = ["Q1", "Q2", "Q3", "Q4"].reduce((s, q) => s + (project[`profit${q}`] || 0), 0);
            });

            // Chèn các dự án CĐT đã xử lý vào bảng kết quả (rowTemplate)
            const cdtHeaderIndex = rowTemplate.findIndex((r) => r.name === "I.3. CÔNG TRÌNH CÔNG TY CĐT");
            if (cdtHeaderIndex !== -1) {
                // Chèn các dự án chi tiết ngay sau header I.3
                cdtProjects.forEach((project, index) => {
                    rowTemplate.splice(cdtHeaderIndex + 1 + index, 0, project);
                });
            }
            // ======================================================================
            // ✅ KẾT THÚC: LOGIC MỚI CHO I.3. CÔNG TRÌNH CÔNG TY CĐT
            // ======================================================================
            projects.forEach((p) => {
                const index = rowTemplate.findIndex((r) => r.name === p.name);
                if (index > -1) {
                    rowTemplate[index] = { ...rowTemplate[index], ...p };
                } else {
                    let insertIndex = -1;

                    if (p.type === "Thi công") {
                        if ((p.name || "").toUpperCase().includes("KÈ")) {
                            insertIndex = rowTemplate.findIndex(
                                (r) => r.name === `I.3. CÔNG TRÌNH CÔNG TY CĐT`
                            );
                        } else {
                            insertIndex = rowTemplate.findIndex(
                                (r) => r.name === `I.2. KÈ`
                            );
                        }
                    }
                    // COMMENT HOẶC XÓA PHẦN NÀY vì đã lấy từ báo cáo quý
                    // else if (p.type.toLowerCase().includes("nhà máy")) {
                    //     insertIndex = rowTemplate.findIndex(
                    //         (r) => r.name === `II.2. DT + LN ĐƯỢC CHIA TỪ LDX`
                    //     );
                    // }
                    // else if (p.type === "KH-ĐT") {
                    //     insertIndex = rowTemplate.findIndex(
                    //         (r) => r.name === "IV. TỔNG"
                    //     );
                    // }

                    if (insertIndex > -1) {
                        rowTemplate.splice(insertIndex, 0, p);
                    }
                }
            });
            // Cập nhật dữ liệu cho các hàng có thể chỉnh sửa và tính toán
            const finalRows = runAllCalculations(
                rowTemplate,
                costAddedForGroupI,
                costOverForGroupI,
                costAddedForGroupII,
                costOverForGroupII,
                costOverForGroupIII
            );

            // Cập nhật dữ liệu cho các hàng có thể chỉnh sửa sau khi tính toán
            editableRowNames.forEach((rowName) => {
                const actualRowName = rowName.includes("4. CỔ TỨC GIỮ LẠI NĂM")
                    ? `4. CỔ TỨC GIỮ LẠI NĂM ${selectedYear} (70%)`
                    : rowName;

                const idx = finalRows.findIndex(
                    (r) => r.name === actualRowName
                );
                if (idx !== -1 && editableRows[actualRowName]) {
                    finalRows[idx] = {
                        ...finalRows[idx],
                        ...editableRows[actualRowName],
                    };
                }
            });

            setRows(finalRows);
            setLoading(false);
        };

        fetchData();
    }, [selectedYear, runAllCalculations]);

    // UseEffect riêng để cập nhật rows khi editableRows thay đổi
    useEffect(() => {
        if (rows.length > 0) {
            const updatedRows = [...rows];
            let hasChanges = false;

            editableRowNames.forEach((rowName) => {
                const actualRowName = rowName.includes("4. CỔ TỨC GIỮ LẠI NĂM")
                    ? `4. CỔ TỨC GIỮ LẠI NĂM ${selectedYear} (70%)`
                    : rowName;

                const idx = updatedRows.findIndex(
                    (r) => r.name === actualRowName
                );
                if (idx !== -1 && editableRows[actualRowName]) {
                    const oldProfit = updatedRows[idx].profit;
                    const newProfit = editableRows[actualRowName].profit;

                    if (oldProfit !== newProfit) {
                        updatedRows[idx] = {
                            ...updatedRows[idx],
                            ...editableRows[actualRowName],
                        };
                        hasChanges = true;
                    }
                }
            });

            // Tính toán lại các hàng phụ thuộc
            if (hasChanges) {
                // Tính toán cho "2. LỢI NHUẬN RÒNG NĂM" - lấy giá trị từ TỔNG LỢI NHUẬN NĂM
                const idxLoiNhuanRong = updatedRows.findIndex(
                    (r) => r.name === `2. LỢI NHUẬN RÒNG NĂM ${selectedYear}`
                );
                const idxTongLN = updatedRows.findIndex(
                    (r) => r.name === `=> TỔNG LỢI NHUẬN NĂM ${selectedYear}`
                );

                if (idxLoiNhuanRong !== -1 && idxTongLN !== -1) {
                    updatedRows[idxLoiNhuanRong] = {
                        ...updatedRows[idxLoiNhuanRong],
                        profit: toNum(updatedRows[idxTongLN].profit),
                    };
                }

                // Tính toán cho "a. THỰC CHI THƯỞNG THEO XẾP LOẠI ABCD"
                const idxThucChiThuong = updatedRows.findIndex(
                    (r) => r.name === "a. THỰC CHI THƯỞNG THEO XẾP LOẠI ABCD"
                );
                const idxTrichThuongNV = updatedRows.findIndex(
                    (r) =>
                        r.name ===
                        `1. TRÍCH THƯỞNG NHÂN VIÊN NĂM ${selectedYear}`
                );
                const idxTrich50BP = updatedRows.findIndex(
                    (r) => r.name === "b. TRÍCH 50% THƯỞNG CÁC BP"
                );
                const idxThuLuongSale = updatedRows.findIndex(
                    (r) => r.name === "d. THU LƯƠNG TẠM ỨNG SALE"
                );

                if (
                    idxThucChiThuong !== -1 &&
                    idxTrichThuongNV !== -1 &&
                    idxTrich50BP !== -1 &&
                    idxThuLuongSale !== -1
                ) {
                    const thucChiThuong =
                        toNum(updatedRows[idxTrichThuongNV].profit) -
                        toNum(updatedRows[idxTrich50BP].profit) -
                        toNum(updatedRows[idxThuLuongSale].profit);

                    updatedRows[idxThucChiThuong] = {
                        ...updatedRows[idxThucChiThuong],
                        profit: thucChiThuong,
                    };
                }

                setRows(updatedRows);
            }
        }
    }, [editableRows, selectedYear, editableRowNames]);

    return {
        rows,
        loading,
        initialSummaryTargets,
        editableRows,
        updateEditableRow,
        saveEditableData,
        editableRowNames,
    };
};

export default function ProfitReportYear() {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [tvMode, setTvMode] = useState(true);
    // ✅ BƯỚC 1: THÊM CÁC STATE VÀ REF CẦN THIẾT
    const [congTrinhColWidth, setCongTrinhColWidth] = useState(350); // Độ rộng ban đầu

    // ✅ SỬA LẠI PHẦN NÀY: LẤY `initialSummaryTargets` từ hook
    const {
        rows,
        loading,
        initialSummaryTargets, // Lấy dữ liệu chỉ tiêu ban đầu từ hook
        editableRows,
        updateEditableRow,
        saveEditableData,
        editableRowNames,
    } = useProfitReportData(selectedYear);
    // ✅ 1. SỬ DỤNG LẠI STATE CHI TIẾT NÀY
    const [columnVisibility, setColumnVisibility] = useState({
        revenueQ1: true,
        revenueQ2: true,
        revenueQ3: true,
        revenueQ4: true,
        totalRevenue: true, // Thêm cột tổng
        costQ1: true,
        costQ2: true,
        costQ3: true,
        costQ4: true,
        totalCost: true,   // Thêm cột tổng
        profitQ1: true,
        profitQ2: true,
        profitQ3: true,
        profitQ4: true,
        totalProfit: true, // Thêm cột tổng
        plannedProfitMargin: true,
        actualProfitMargin: true,
        costOverCumulative: true,
        costAddedToProfit: true,
        note: true,
    });

    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    // ✅ 2. CẬP NHẬT LẠI MAP TÊN CỘT
    const columnLabels = {
        revenueQ1: 'DT Quý 1',
        revenueQ2: 'DT Quý 2',
        revenueQ3: 'DT Quý 3',
        revenueQ4: 'DT Quý 4',
        totalRevenue: 'Tổng DT Năm',
        costQ1: 'CP Quý 1',
        costQ2: 'CP Quý 2',
        costQ3: 'CP Quý 3',
        costQ4: 'CP Quý 4',
        totalCost: 'Tổng CP Năm',
        profitQ1: 'LN Quý 1',
        profitQ2: 'LN Quý 2',
        profitQ3: 'LN Quý 3',
        profitQ4: 'LN Quý 4',
        totalProfit: 'Tổng LN Năm',
        plannedProfitMargin: '% LN Theo KH',
        actualProfitMargin: '% LN Thực Tế',
        costOverCumulative: 'CP Vượt Lũy Kế',
        costAddedToProfit: 'CP Cộng Vào LN',
        note: 'Ghi Chú',
    };

    // ✅ 3. CẬP NHẬT HÀM TOGGLE
    const handleColumnMenuClick = (event) => setAnchorEl(event.currentTarget);
    const handleColumnMenuClose = () => setAnchorEl(null);
    const handleToggleColumn = (columnKey) => {
        setColumnVisibility((prev) => ({
            ...prev,
            [columnKey]: !prev[columnKey],
        }));
    };
    const [summaryTargets, setSummaryTargets] = useState({});
    // ✅ BƯỚC 4: TẠO HÀM CALLBACK MỚI CHO THƯ VIỆN
    const handleColumnResize = useCallback((event, { size }) => {
        setCongTrinhColWidth(size.width);
    }, []);
    useEffect(() => {
        // Kiểm tra để đảm bảo initialSummaryTargets có dữ liệu
        if (Object.keys(initialSummaryTargets).length > 0) {
            setSummaryTargets(initialSummaryTargets);
        }
    }, [initialSummaryTargets]);

    const handleTargetChange = (key, value) => {
        setSummaryTargets((prevTargets) => ({
            ...prevTargets,
            [key]: value,
        }));
        // TODO: Tại đây bạn có thể thêm hàm để lưu `summaryTargets` mới vào Firestore
        // Ví dụ: saveTargetsToFirestore(selectedYear, { ...summaryTargets, [key]: value });
    };
    // ✅ BƯỚC 1: THÊM ĐOẠN CODE NÀY ĐỂ CHUẨN BỊ DỮ LIỆU
    const summaryData = React.useMemo(() => {
        const constructionRow =
            rows.find((r) => r.name === "I. XÂY DỰNG") || {};
        const productionRow = rows.find((r) => r.name === "II. SẢN XUẤT") || {};
        const investmentRow = rows.find((r) => r.name === "III. ĐẦU TƯ") || {};

        return {
            revenueXayDung: constructionRow.revenue,
            profitXayDung: constructionRow.profit,
            costOverXayDung: constructionRow.costOverCumulative,
            revenueSanXuat: productionRow.revenue,
            profitSanXuat: productionRow.profit,
            costOverSanXuat: productionRow.costOverCumulative,
            revenueDauTu: investmentRow.revenue,
            profitDauTu: investmentRow.profit,
            costOverDauTu: investmentRow.costOverCumulative,
        };
    }, [rows]);
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

    // Kiểm tra xem hàng có thể chỉnh sửa hay không
    const isEditableRow = (rowName) => {
        return editableRowNames.some((editableName) => {
            if (editableName.includes("4. CỔ TỨC GIỮ LẠI NĂM")) {
                return (
                    rowName === `4. CỔ TỨC GIỮ LẠI NĂM ${selectedYear} (70%)`
                );
            }
            return rowName === editableName;
        });
    };

    // Component cho ô có thể chỉnh sửa - Click để hiện input
    const ClickableEditCell = ({ rowName, field, value }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [localValue, setLocalValue] = useState(value || 0);

        useEffect(() => {
            setLocalValue(value || 0);
        }, [value]);

        const handleClick = () => {
            setIsEditing(true);
        };

        const handleBlur = () => {
            setIsEditing(false);
            updateEditableRow(rowName, field, localValue);
        };

        const handleKeyPress = (e) => {
            if (e.key === "Enter") {
                setIsEditing(false);
                updateEditableRow(rowName, field, localValue);
            }
            if (e.key === "Escape") {
                setIsEditing(false);
                setLocalValue(value || 0);
            }
        };

        const handleChange = (e) => {
            const newValue = e.target.value.replace(/,/g, ""); // Remove commas for calculation
            setLocalValue(newValue);
        };

        // Format number with commas
        const formatDisplayValue = (val) => {
            if (!val || val === 0) return "0";
            return Number(val).toLocaleString("en-US");
        };

        if (isEditing) {
            return (
                <TextField
                    size="small"
                    type="text"
                    value={localValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyPress}
                    autoFocus
                    sx={{
                        "& .MuiInputBase-root": {
                            fontSize: cellStyle.fontSize,
                            height: "auto",
                        },
                        "& .MuiInputBase-input": {
                            padding: "4px 8px",
                            textAlign: "right",
                        },
                        width: "100%",
                        minWidth: cellStyle.minWidth - 20,
                    }}
                />
            );
        }

        return (
            <Box
                onClick={handleClick}
                sx={{
                    cursor: "pointer",
                    padding: "4px 8px",
                    minHeight: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                        borderRadius: "4px",
                    },
                    border: "1px dashed transparent",
                    "&:hover .edit-hint": {
                        opacity: 1,
                    },
                }}
            >
                {formatDisplayValue(localValue)}
                <Box
                    className="edit-hint"
                    sx={{
                        opacity: 0,
                        transition: "opacity 0.2s",
                        fontSize: "10px",
                        color: "#666",
                        ml: 1,
                    }}
                >
                    ✏️
                </Box>
            </Box>
        );
    };
    // ... trước câu lệnh return

    const visibleRevenueCols = Object.keys(columnVisibility).filter(k => k.startsWith('revenueQ') && columnVisibility[k]).length;
    const visibleCostCols = Object.keys(columnVisibility).filter(k => k.startsWith('costQ') && columnVisibility[k]).length;
    const visibleProfitCols = Object.keys(columnVisibility).filter(k => k.startsWith('profitQ') && columnVisibility[k]).length;
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
                            variant="contained"
                            color="success"
                            startIcon={<Save size={18} />}
                            onClick={saveEditableData}
                        >
                            Lưu thủ công
                        </Button>
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<FileDown size={18} />}
                        >
                            Xuất Excel
                        </Button>
                        {/* ✅ 3. THÊM NÚT VÀ MENU TẠI ĐÂY */}
                        <Tooltip title="Ẩn/Hiện cột">
                            <Button variant="outlined" onClick={handleColumnMenuClick} startIcon={<ViewColumnIcon />}>
                                Các cột
                            </Button>
                        </Tooltip>
                        <Menu anchorEl={anchorEl} open={open} onClose={handleColumnMenuClose}>
                            {Object.keys(columnVisibility).map((key) => (
                                <MenuItem key={key} onClick={() => handleToggleColumn(key)}>
                                    <Checkbox checked={columnVisibility[key]} />
                                    <ListItemText primary={columnLabels[key] || key.toUpperCase()} />
                                </MenuItem>
                            ))}
                        </Menu>
                    </Stack>
                </Box>
                <ProfitSummaryTable
                    data={summaryData}
                    targets={summaryTargets}
                    onTargetChange={handleTargetChange}
                    isYearlyReport={true} // <--- Đã thêm lại prop này
                />

                <TableContainer
                    sx={{
                        maxHeight: "75vh",
                        border: "1px solid #e0e0e0",
                        borderRadius: 2,
                    }}
                >
                    <Table stickyHeader size="small" sx={{ minWidth: 3800, tableLayout: 'fixed' }}>
                        <TableHead>
                            <TableRow sx={{ "& th": { backgroundColor: "#1565c0", color: "#fff", fontWeight: 700, border: "1px solid #004c8f" } }}>
                                {/* CỘT CÔNG TRÌNH (Luôn hiển thị) */}
                                <ResizableHeader
                                    width={congTrinhColWidth}
                                    onResize={handleColumnResize}
                                    style={{ ...cellStyle, width: congTrinhColWidth, position: "sticky", left: 0, zIndex: 110, backgroundColor: "#1565c0", textAlign: 'center' }}
                                    rowSpan={2}
                                >
                                    CÔNG TRÌNH
                                </ResizableHeader>

                                {/* TIÊU ĐỀ CHA */}
                                {visibleRevenueCols > 0 && <TableCell colSpan={visibleRevenueCols} align="center">DOANH THU</TableCell>}
                                {columnVisibility.totalRevenue && <TableCell rowSpan={2} align="center">TỔNG DT NĂM</TableCell>}

                                {visibleCostCols > 0 && <TableCell colSpan={visibleCostCols} align="center">CHI PHÍ</TableCell>}
                                {columnVisibility.totalCost && <TableCell rowSpan={2} align="center">TỔNG CP NĂM</TableCell>}

                                {visibleProfitCols > 0 && <TableCell colSpan={visibleProfitCols} align="center">LỢI NHUẬN</TableCell>}
                                {columnVisibility.totalProfit && <TableCell rowSpan={2} align="center">TỔNG LN NĂM</TableCell>}

                                {columnVisibility.plannedProfitMargin && <TableCell rowSpan={2} align="center" sx={{ minWidth: 150 }}>% LN THEO KH</TableCell>}
                                {columnVisibility.actualProfitMargin && <TableCell rowSpan={2} align="center" sx={{ minWidth: 150 }}>% LN THỰC TẾ</TableCell>}
                                {columnVisibility.costOverCumulative && <TableCell rowSpan={2} align="center" sx={{ minWidth: 150 }}>CP VƯỢT LŨY KẾ</TableCell>}
                                {columnVisibility.costAddedToProfit && <TableCell rowSpan={2} align="center" sx={{ minWidth: 150 }}>CP CỘNG VÀO LN</TableCell>}
                                {columnVisibility.note && <TableCell rowSpan={2} align="center" sx={{ minWidth: 200 }}>GHI CHÚ</TableCell>}
                            </TableRow>

                            <TableRow sx={{ "& th": { backgroundColor: "#1565c0", color: "#fff", fontWeight: 600, border: "1px solid #004c8f" } }}>
                                {/* TIÊU ĐỀ PHỤ (THEO QUÝ) */}
                                {columnVisibility.revenueQ1 && <TableCell align="center">QUÝ 1</TableCell>}
                                {columnVisibility.revenueQ2 && <TableCell align="center">QUÝ 2</TableCell>}
                                {columnVisibility.revenueQ3 && <TableCell align="center">QUÝ 3</TableCell>}
                                {columnVisibility.revenueQ4 && <TableCell align="center">QUÝ 4</TableCell>}

                                {columnVisibility.costQ1 && <TableCell align="center">CP Q1</TableCell>}
                                {columnVisibility.costQ2 && <TableCell align="center">CP Q2</TableCell>}
                                {columnVisibility.costQ3 && <TableCell align="center">CP Q3</TableCell>}
                                {columnVisibility.costQ4 && <TableCell align="center">CP Q4</TableCell>}

                                {columnVisibility.profitQ1 && <TableCell align="center">LN Q1</TableCell>}
                                {columnVisibility.profitQ2 && <TableCell align="center">LN Q2</TableCell>}
                                {columnVisibility.profitQ3 && <TableCell align="center">LN Q3</TableCell>}
                                {columnVisibility.profitQ4 && <TableCell align="center">LN Q4</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.filter(r => {
                                const isSpecialHeaderRow = r.name?.match(/^[IVX]+\./) || r.name?.toUpperCase().includes("LỢI NHUẬN") || r.name?.toUpperCase().includes("=>");
                                if (isSpecialHeaderRow) return true;
                                if (r.projectId) {
                                    const hasFinancialData = toNum(r.revenue) !== 0 || toNum(r.cost) !== 0 || toNum(r.costOverCumulative) !== 0 || toNum(r.costAddedToProfit) !== 0;
                                    return hasFinancialData;
                                } else {
                                    return true;
                                }
                            }).map((r, idx) => (
                                <TableRow key={`${r.name}-${idx}`} sx={{ backgroundColor: r.name === "IV. TỔNG" ? "#e8f5e9" : r.name?.match(/^[IVX]+\./) ? "#fff9c4" : isEditableRow(r.name) ? "#f3e5f5" : idx % 2 === 0 ? "#ffffff" : "#f9f9f9", "&:hover": { bgcolor: "#f0f4ff" } }}>
                                    <TableCell sx={{ ...cellStyle, fontWeight: r.name?.match(/^[IVX]+\./) || r.name?.includes("LỢI NHUẬN") ? 700 : 400, width: congTrinhColWidth, minWidth: congTrinhColWidth, backgroundColor: "inherit", position: "sticky", left: 0, zIndex: 99, borderRight: "2px solid #ccc", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {r.name}
                                    </TableCell>
                                    {/* DỮ LIỆU DOANH THU */}
                                    {columnVisibility.revenueQ1 && <TableCell align="right" sx={cellStyle}>{format(r.revenueQ1)}</TableCell>}
                                    {columnVisibility.revenueQ2 && <TableCell align="right" sx={cellStyle}>{format(r.revenueQ2)}</TableCell>}
                                    {columnVisibility.revenueQ3 && <TableCell align="right" sx={cellStyle}>{format(r.revenueQ3)}</TableCell>}
                                    {columnVisibility.revenueQ4 && <TableCell align="right" sx={cellStyle}>{format(r.revenueQ4)}</TableCell>}
                                    {columnVisibility.totalRevenue && <TableCell align="right" sx={{ ...cellStyle, fontWeight: "bold", backgroundColor: "#e3f2fd" }}>{format(r.revenue)}</TableCell>}

                                    {/* DỮ LIỆU CHI PHÍ */}
                                    {columnVisibility.costQ1 && <TableCell align="right" sx={cellStyle}>{format(r.costQ1)}</TableCell>}
                                    {columnVisibility.costQ2 && <TableCell align="right" sx={cellStyle}>{format(r.costQ2)}</TableCell>}
                                    {columnVisibility.costQ3 && <TableCell align="right" sx={cellStyle}>{format(r.costQ3)}</TableCell>}
                                    {columnVisibility.costQ4 && <TableCell align="right" sx={cellStyle}>{format(r.costQ4)}</TableCell>}
                                    {columnVisibility.totalCost && <TableCell align="right" sx={{ ...cellStyle, fontWeight: "bold", backgroundColor: "#e3f2fd" }}>{format(r.cost)}</TableCell>}

                                    {/* DỮ LIỆU LỢI NHUẬN */}
                                    {columnVisibility.profitQ1 && <TableCell align="right" sx={{ ...cellStyle, fontWeight: "bold" }}>{format(r.profitQ1)}</TableCell>}
                                    {columnVisibility.profitQ2 && <TableCell align="right" sx={{ ...cellStyle, fontWeight: "bold" }}>{format(r.profitQ2)}</TableCell>}
                                    {columnVisibility.profitQ3 && <TableCell align="right" sx={{ ...cellStyle, fontWeight: "bold" }}>{format(r.profitQ3)}</TableCell>}
                                    {columnVisibility.profitQ4 && <TableCell align="right" sx={{ ...cellStyle, fontWeight: "bold" }}>{format(r.profitQ4)}</TableCell>}
                                    {columnVisibility.totalProfit && <TableCell align="right" sx={{ ...cellStyle, fontWeight: "bold", backgroundColor: "#d1c4e9", padding: "4px 8px" }}>{isEditableRow(r.name) ? <ClickableEditCell rowName={r.name} field="profit" value={editableRows[r.name]?.profit || r.profit || 0} /> : format(r.profit)}</TableCell>}

                                    {/* DỮ LIỆU CÁC CỘT ĐẶC BIỆT */}
                                    {columnVisibility.plannedProfitMargin && <TableCell align="center" sx={cellStyle}>{format(r.plannedProfitMargin, "percent")}</TableCell>}
                                    {columnVisibility.actualProfitMargin && <TableCell align="center" sx={cellStyle}>{r.projectId && r.revenue ? format((r.profit / r.revenue) * 100, "percent") : ''}</TableCell>}
                                    {columnVisibility.costOverCumulative && <TableCell align="right" sx={cellStyle}>{format(r.costOverCumulative)}</TableCell>}
                                    {columnVisibility.costAddedToProfit && <TableCell align="right" sx={cellStyle}>{format(r.costAddedToProfit)}</TableCell>}
                                    {columnVisibility.note && <TableCell align="left" sx={cellStyle}>{format(r.note)}</TableCell>}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}