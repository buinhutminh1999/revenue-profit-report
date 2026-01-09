import React, { useState, useEffect, useCallback, useRef } from "react";
import { useReactToPrint } from "react-to-print";
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
import { collection, getDocs, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase-config";
import { toNum, formatNumber } from "../../utils/numberUtils";
import { FileDown, Save } from "lucide-react";
import ProfitSummaryTable from "../../reports/ProfitSummaryTable";
// ✅ BƯỚC 1: IMPORT THƯ VIỆN VÀ CSS
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
// ✅ THAY THẾ COMPONENT RESIZABLEHEADER CŨ BẰNG COMPONENT NÀY
import { ViewColumn as ViewColumnIcon, Tv as TvIcon, Computer as ComputerIcon, Print as PrintIcon } from '@mui/icons-material'; // ✅ Thêm import icon
import PrintIcon2 from '@mui/icons-material/Print'; // Alias nếu cần
import { useTheme } from '@mui/material/styles'; // ✅ Thêm useTheme
import ProfitReportYearPrintTemplate from "../../components/finance/ProfitReportYearPrintTemplate";

const ResizableHeader = ({ onResize, width, children, ...restProps }) => {
    if (!width) {
        return <th {...restProps}>{children}</th>;
    }

    // Tạo một component riêng cho nút kéo
    const CustomHandle = React.forwardRef((props, ref) => {
        // Loại bỏ các props không hợp lệ cho DOM element
        const { handleAxis, ...validProps } = props;
        return (
            <span
                ref={ref}
                {...validProps}
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
        );
    });

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
    const [manualCostOver, setManualCostOver] = useState({}); // ✅ State lưu chi phí vượt nhập tay
    const isInitialLoad = useRef(true); // ✅ Flag để ngăn auto-save khi vừa load dữ liệu

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
                manualCostOver: manualCostOver, // ✅ Lưu chi phí vượt nhập tay
                lastUpdated: new Date(),
            });

            console.log("Đã lưu dữ liệu các hàng có thể chỉnh sửa");
        } catch (error) {
            console.error("Lỗi khi lưu dữ liệu:", error);
        }
    }, [editableRows, manualCostOver, selectedYear, editableRowNames]); // ✅ Thêm manualCostOver

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

    // Auto-save khi editableRows hoặc manualCostOver thay đổi
    useEffect(() => {
        // ✅ Bỏ qua auto-save khi vừa load dữ liệu từ Firestore
        if (isInitialLoad.current) {
            return;
        }

        const timeoutId = setTimeout(() => {
            if (Object.keys(editableRows).length > 0 || Object.keys(manualCostOver).length > 0) {
                saveEditableData();
            }
        }, 1000); // Auto-save sau 1 giây

        return () => clearTimeout(timeoutId);
    }, [editableRows, manualCostOver, saveEditableData]);

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
                let childRows = [];
                let i = groupHeaderIndex + 1;
                while (
                    i < updatedRows.length &&
                    !updatedRows[i].name.match(/^[IVX]+\./)
                ) {
                    childRows.push(updatedRows[i]);
                    i++;
                }

                // ✅ LOGIC MỚI: Nếu là nhóm I.1, lọc bỏ các hàng có doanh thu = 0 (TRỪ KHI có dữ liệu từ báo cáo)
                if (groupName === "I.1. Dân Dụng + Giao Thông") {
                    childRows = childRows.filter(r => r.fromProfitReport || toNum(r.revenue) !== 0);
                }

                updatedRows[groupHeaderIndex] = {
                    ...updatedRows[groupHeaderIndex],
                    ...sumGroup(childRows),
                };
            });

            // Tính tổng cho 3 nhóm con bạn yêu cầu (I.1, I.2, I.3)
            const groupISum = sumGroup(
                updatedRows.filter((r) =>
                    r.name === "I.1. Dân Dụng + Giao Thông" ||
                    r.name === "I.2. KÈ" ||
                    r.name === "I.3. CÔNG TRÌNH CÔNG TY CĐT"
                )
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
                // Tìm project "NHÀ MÁY SX BT CHÂU THÀNH" để lấy doanh thu
                const nhaMayChauThanhRow = updatedRows.find(
                    (r) => r.name && r.name.toUpperCase().includes("NHÀ MÁY SX BT CHÂU THÀNH")
                );

                updatedRows[idxII] = {
                    ...updatedRows[idxII],
                    ...groupIISum,
                    // Override revenue từ NHÀ MÁY SX BT CHÂU THÀNH
                    revenue: nhaMayChauThanhRow ? toNum(nhaMayChauThanhRow.revenue) : groupIISum.revenue,
                    revenueQ1: nhaMayChauThanhRow ? toNum(nhaMayChauThanhRow.revenueQ1) : groupIISum.revenueQ1,
                    revenueQ2: nhaMayChauThanhRow ? toNum(nhaMayChauThanhRow.revenueQ2) : groupIISum.revenueQ2,
                    revenueQ3: nhaMayChauThanhRow ? toNum(nhaMayChauThanhRow.revenueQ3) : groupIISum.revenueQ3,
                    revenueQ4: nhaMayChauThanhRow ? toNum(nhaMayChauThanhRow.revenueQ4) : groupIISum.revenueQ4,
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
                        toNum(updatedRows[idxTang][field]) -
                        toNum(updatedRows[idxGiam][field]);
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
                    if (field.startsWith("profit")) {
                        // ✅ SỬA LỖI: Áp dụng công thức trừ cho cả profit vả profitQ1-4
                        const valueA = toNum(updatedRows[idxRowA][field]);
                        const valueGiamGia = toNum(
                            updatedRows[idxGiamGiaTaiSan][field]
                        );
                        const valuePhucLoi = toNum(
                            updatedRows[idxQuyPhucLoi][field]
                        );
                        const valueLaiDuAn = toNum(
                            updatedRows[idxTrichLaiDuAn][field]
                        );

                        totalsLoiNhuan[field] =
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
                        // Không trừ lãi dự án ở cột này (theo logic cũ)

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
            isInitialLoad.current = true; // ✅ Reset flag khi bắt đầu load dữ liệu mới
            setLoading(true);

            const quarters = ["Q1", "Q2", "Q3", "Q4"];

            // ✅ Tính targetQuarter một lần để dùng lại
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
                    targetQuarter = quarters[currentQuarterIndex - 1];
                }
            }

            // ✅ TỐI ƯU: Load tất cả các document cần thiết song song
            const [
                quarterlyReports,
                editableDoc,
                projectsSnapshot,
                savedReportDoc,
                // [SỬA] Load cost allocation cho TẤT CẢ 4 quý thay vì chỉ quý cuối
                costAllocationDocs,
                sanXuatDoc
            ] = await Promise.all([
                // Load tất cả 4 báo cáo quý song song
                Promise.all(quarters.map(q =>
                    getDoc(doc(db, "profitReports", `${selectedYear}_${q}`))
                        .catch(err => {
                            console.error(`Lỗi khi đọc báo cáo quý ${q}/${selectedYear}:`, err);
                            return { exists: () => false };
                        })
                )),
                // Load dữ liệu các hàng có thể chỉnh sửa
                getDoc(doc(db, "editableProfitRows", `${selectedYear}`))
                    .catch(() => ({ exists: () => false })),
                // Load danh sách projects
                getDocs(collection(db, "projects")),
                // Load báo cáo năm đã lưu
                getDoc(doc(db, "profitReports", `${selectedYear}`))
                    .catch(() => ({ exists: () => false })),
                // [SỬA] Load cost allocation cho TẤT CẢ 4 quý (ưu tiên reportAdjustments, fallback costAllocationsQuarter)
                Promise.all(quarters.map(async q => {
                    // Ưu tiên reportAdjustments (trang /quarterly-cost-allocation mới)
                    const reportSnap = await getDoc(doc(db, "reportAdjustments", `${selectedYear}_${q}`))
                        .catch(() => ({ exists: () => false }));
                    if (reportSnap.exists && reportSnap.exists()) {
                        return { quarter: q, source: 'reportAdjustments', data: reportSnap.data() };
                    }
                    // Fallback về costAllocationsQuarter (trang cũ)
                    const costSnap = await getDoc(doc(db, "costAllocationsQuarter", `${selectedYear}_${q}`))
                        .catch(() => ({ exists: () => false }));
                    if (costSnap.exists && costSnap.exists()) {
                        return { quarter: q, source: 'costAllocationsQuarter', data: costSnap.data() };
                    }
                    return { quarter: q, source: null, data: null };
                })),
                // Load sanXuatDoc
                getDoc(doc(db, `projects/HKZyMDRhyXJzJiOauzVe/years/${targetYear}/quarters/${targetQuarter}`))
                    .catch(() => ({ exists: () => false }))
            ]);

            // ✅ Cache các báo cáo quý để sử dụng lại
            const quarterlyReportsCache = {};
            quarterlyReports.forEach((docSnap, index) => {
                if (docSnap.exists && docSnap.exists()) {
                    quarterlyReportsCache[quarters[index]] = docSnap.data();
                }
            });

            // ======================================================================
            // ✅ BƯỚC 1: TÍNH TỔNG CHỈ TIÊU
            // ======================================================================
            let summedTargets = {
                revenueTargetXayDung: 0,
                profitTargetXayDung: 0,
                revenueTargetSanXuat: 0,
                profitTargetSanXuat: 0,
                revenueTargetDauTu: 0,
                profitTargetDauTu: 0,
            };

            quarters.forEach(quarter => {
                const quarterlyData = quarterlyReportsCache[quarter];
                if (quarterlyData) {
                    const targetsForQuarter = quarterlyData.summaryTargets || {};
                    summedTargets.revenueTargetXayDung += toNum(targetsForQuarter.revenueTargetXayDung);
                    summedTargets.profitTargetXayDung += toNum(targetsForQuarter.profitTargetXayDung);
                    summedTargets.revenueTargetSanXuat += toNum(targetsForQuarter.revenueTargetSanXuat);
                    summedTargets.profitTargetSanXuat += toNum(targetsForQuarter.profitTargetSanXuat);
                    summedTargets.revenueTargetDauTu += toNum(targetsForQuarter.revenueTargetDauTu);
                    summedTargets.profitTargetDauTu += toNum(targetsForQuarter.profitTargetDauTu);
                }
            });
            setInitialSummaryTargets(summedTargets);

            // Load dữ liệu các hàng có thể chỉnh sửa
            if (editableDoc.exists()) {
                setEditableRows(editableDoc.data().rows || {});
                // ✅ Load manualCostOver (Chi phí vượt nhập tay)
                if (editableDoc.data().manualCostOver) {
                    setManualCostOver(editableDoc.data().manualCostOver);
                }
            }

            // ✅ Đánh dấu đã load xong, cho phép auto-save từ thao tác user
            setTimeout(() => {
                isInitialLoad.current = false;
            }, 2000); // Chờ 2 giây sau khi load xong

            // ✅ [SỬA] Xử lý cost allocation - TỔNG TẤT CẢ 4 QUÝ
            let costAddedForGroupI = 0;
            let costOverForGroupI = 0;
            let costAddedForGroupII = 0;
            let costOverForGroupII = 0;
            let costOverForGroupIII = 0;

            // Tính tổng CHI PHÍ VƯỢT từ tất cả 4 quý cho Thi công và KH-ĐT
            costAllocationDocs.forEach(({ quarter, source, data }) => {
                if (!data) return;

                if (source === 'reportAdjustments') {
                    // Từ reportAdjustments: tính tổng cumQuarterOnly từ mainRows
                    if (Array.isArray(data.mainRows)) {
                        data.mainRows.forEach(row => {
                            if (row.id !== 'DOANH_THU' && row.id !== 'TONG_CHI_PHI') {
                                // Cộng dồn cho Thi công
                                costOverForGroupI += toNum(row.byType?.['Thi công']?.cumQuarterOnly || 0);
                                // Cộng dồn cho KH-ĐT
                                costOverForGroupIII += toNum(row.byType?.['KH-ĐT']?.cumQuarterOnly || 0);
                            }
                        });
                    }
                    // Lấy thặng dư nếu có (chỉ quý cuối cùng có data)
                    if (quarter === 'Q4' || !costAddedForGroupI) {
                        costAddedForGroupI = toNum(data.totalSurplusThiCong || 0);
                        costAddedForGroupII = toNum(data.totalSurplusNhaMay || 0);
                    }
                } else if (source === 'costAllocationsQuarter') {
                    // Từ costAllocationsQuarter (trang cũ): cộng dồn các field tổng
                    costOverForGroupI += toNum(data.totalThiCongCumQuarterOnly || 0);
                    costOverForGroupIII += toNum(data.totalKhdtCumQuarterOnly || 0);
                    // Lấy thặng dư nếu có
                    if (quarter === 'Q4' || !costAddedForGroupI) {
                        costAddedForGroupI = toNum(data.totalSurplusThiCong || 0);
                        costAddedForGroupII = toNum(data.totalSurplusNhaMay || 0);
                    }
                }
            });

            if (sanXuatDoc.exists && sanXuatDoc.exists()) {
                const data = sanXuatDoc.data();
                if (Array.isArray(data.items) && data.items.length > 0) {
                    const totalCarryoverEnd = data.items.reduce((sum, item) => {
                        return sum + toNum(item.carryoverEnd || 0);
                    }, 0);
                    costOverForGroupII = -totalCarryoverEnd;
                } else if (data.carryoverEnd !== undefined) {
                    costOverForGroupII = -toNum(data.carryoverEnd);
                }
            }

            const savedRowsData = savedReportDoc.exists && savedReportDoc.exists()
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

            // ✅ TỐI ƯU: Load tất cả các quý cho tất cả projects song song
            const projects = await Promise.all(
                projectsSnapshot.docs.map(async (d) => {
                    const data = d.data();
                    const quarterlyData = {
                        revenues: {},
                        costs: {},
                        profits: {},
                    };

                    // Load tất cả 4 quý song song thay vì tuần tự
                    const quarterSnaps = await Promise.all(
                        quarters.map(quarter =>
                            getDoc(doc(db, `projects/${d.id}/years/${selectedYear}/quarters/${quarter}`))
                                .catch(err => {
                                    console.error(`Lỗi khi lấy dữ liệu quý ${quarter} cho dự án ${d.id}:`, err);
                                    return { exists: () => false };
                                })
                        )
                    );

                    quarterSnaps.forEach((qSnap, index) => {
                        const quarter = quarters[index];
                        if (qSnap.exists && qSnap.exists()) {
                            const qData = qSnap.data();
                            const revenue = toNum(qData.overallRevenue);
                            let cost = 0;

                            // ==========================================================
                            // ✅ LOGIC TÍNH CHI PHÍ MỚI ĐƯỢC ÁP DỤNG TẠI ĐÂY
                            // ==========================================================
                            const projectType = (data.type || "").toLowerCase();

                            if (projectType.includes("nhà máy")) {
                                if (Array.isArray(qData.items) && qData.items.length > 0) {
                                    cost = qData.items.reduce(
                                        (sum, item) => sum + toNum(item.totalCost || 0),
                                        0
                                    );
                                }
                            } else if (projectType === "thi công" || projectType === "thi cong") {
                                // ✅ TRƯỜNG HỢP: THI CÔNG (I.1)
                                if (Array.isArray(qData.items) && qData.items.length > 0) {
                                    // 1. Tính tổng doanh thu thực tế
                                    const totalActualRevenue = qData.items.reduce((s, i) => s + toNum(i.revenue || 0), 0);

                                    // 2. Logic kiểm tra điều kiện
                                    if (totalActualRevenue === 0) {
                                        // ✅ NẾU DOANH THU = 0 -> CHỈ LẤY TỔNG CHI PHÍ CỦA -VT, -NC (không phải -CP)
                                        cost = qData.items
                                            .filter(i => !(i.project || "").toUpperCase().includes("-CP"))
                                            .reduce((s, i) => s + toNum(i.totalCost || 0), 0);
                                    } else {
                                        // ✅ NẾU CÓ DOANH THU -> Logic cũ (ưu tiên cpSauQuyetToan)
                                        const totalCpSauQuyetToan = qData.items.reduce(
                                            (sum, item) => sum + toNum(item.cpSauQuyetToan || 0),
                                            0
                                        );

                                        if (totalCpSauQuyetToan !== 0) {
                                            cost = totalCpSauQuyetToan;
                                        } else {
                                            cost = qData.items.reduce(
                                                (sum, item) => sum + toNum(item.totalCost || 0),
                                                0
                                            );
                                        }
                                    }
                                }
                            } else if (projectType === "kh-đt") {
                                // ✅ TRƯỜNG HỢP: KH-ĐT (III)
                                if (Array.isArray(qData.items) && qData.items.length > 0) {
                                    const totalCpSauQuyetToan = qData.items.reduce(
                                        (sum, item) => sum + toNum(item.cpSauQuyetToan || 0),
                                        0
                                    );

                                    if (totalCpSauQuyetToan !== 0) {
                                        cost = totalCpSauQuyetToan;
                                    } else {
                                        cost = qData.items.reduce(
                                            (sum, item) => sum + toNum(item.totalCost || 0),
                                            0
                                        );
                                    }
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
                            // ==========================================================
                            // ✅ KẾT THÚC LOGIC TÍNH CHI PHÍ MỚI
                            // ==========================================================

                            quarterlyData.revenues[quarter] = revenue;
                            quarterlyData.costs[quarter] = cost;
                            quarterlyData.profits[quarter] = revenue - cost;
                        }
                    });

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

            // ✅ TỐI ƯU: Load profitChanges song song
            const profitChangeDocs = await Promise.all(
                quarters.map(q =>
                    getDoc(doc(db, "profitChanges", `${selectedYear}_${q}`))
                        .catch(() => ({ exists: () => false }))
                )
            );

            const decreaseProfitData = {};
            const increaseProfitData = {};
            profitChangeDocs.forEach((profitChangeDoc, index) => {
                const quarter = quarters[index];
                if (profitChangeDoc.exists && profitChangeDoc.exists()) {
                    const data = profitChangeDoc.data();
                    decreaseProfitData[`profit${quarter}`] = toNum(data.totalDecreaseProfit);
                    increaseProfitData[`profit${quarter}`] = toNum(data.totalIncreaseProfit);
                }
            });
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

            // ✅ TỐI ƯU: Lấy dữ liệu cho hàng "TRÍCH LN TRỪ LÃI DỰ ÁN" từ cache
            const projectInterestData = {};
            quarters.forEach(quarter => {
                const reportData = quarterlyReportsCache[quarter];
                if (reportData && Array.isArray(reportData.rows)) {
                    const interestRow = reportData.rows.find(
                        (row) => row.name === "VIII. GIẢM LÃI ĐT DỰ ÁN"
                    );
                    if (interestRow) {
                        projectInterestData[`profit${quarter}`] = toNum(interestRow.profit);
                    }
                }
            });
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

            // ✅ TỐI ƯU: Lấy dữ liệu cho hàng "GIẢM GIÁ TRỊ TÀI SẢN" từ cache
            const assetDepreciationData = {};
            quarters.forEach(quarter => {
                const reportData = quarterlyReportsCache[quarter];
                if (reportData && Array.isArray(reportData.rows)) {
                    const assetRow = reportData.rows.find(
                        (row) => row.name === `VII. KHTSCĐ NĂM ${selectedYear}`
                    );
                    if (assetRow) {
                        assetDepreciationData[`profit${quarter}`] = toNum(assetRow.profit);
                    }
                }
            });
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

            // ✅ TỐI ƯU: Sử dụng cache thay vì đọc lại từ Firestore
            for (const rowName of rowsToAggregate) {
                const aggregatedData = {};
                quarters.forEach(quarter => {
                    const reportData = quarterlyReportsCache[quarter];
                    if (reportData && Array.isArray(reportData.rows)) {
                        const sourceRow = reportData.rows.find(
                            (row) => row.name === rowName
                        );
                        if (sourceRow) {
                            aggregatedData[`revenue${quarter}`] = toNum(sourceRow.revenue);
                            aggregatedData[`cost${quarter}`] = toNum(sourceRow.cost);
                            aggregatedData[`profit${quarter}`] = toNum(sourceRow.profit);
                        }
                    }
                });

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
            // ✅ TỐI ƯU: Sử dụng cache thay vì đọc lại từ Firestore
            const xiNghiepXD2Projects = [];
            quarters.forEach(quarter => {
                const reportData = quarterlyReportsCache[quarter];
                if (reportData && Array.isArray(reportData.rows)) {
                    const xnxd2Rows = reportData.rows.filter((row) => row.type === "xnxd2");
                    xnxd2Rows.forEach((projectRow) => {
                        let existingProject = xiNghiepXD2Projects.find(
                            (p) => p.name === projectRow.name
                        );
                        if (!existingProject) {
                            existingProject = {
                                name: projectRow.name,
                                type: "xnxd2",
                                revenue: 0, revenueQ1: 0, revenueQ2: 0, revenueQ3: 0, revenueQ4: 0,
                                cost: 0, costQ1: 0, costQ2: 0, costQ3: 0, costQ4: 0,
                                profit: 0, profitQ1: 0, profitQ2: 0, profitQ3: 0, profitQ4: 0,
                            };
                            xiNghiepXD2Projects.push(existingProject);
                        }
                        existingProject[`revenue${quarter}`] = toNum(projectRow.revenue);
                        existingProject[`cost${quarter}`] = toNum(projectRow.cost);
                        existingProject[`profit${quarter}`] = toNum(projectRow.profit);
                    });
                }
            });

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
            // ✅ TỐI ƯU: Sử dụng cache thay vì đọc lại từ Firestore
            const nhaMayProjects = [];
            quarters.forEach(quarter => {
                const reportData = quarterlyReportsCache[quarter];
                if (reportData && Array.isArray(reportData.rows)) {
                    const nhaMayRows = reportData.rows.filter((row) => row.type === "Nhà máy");
                    nhaMayRows.forEach((projectRow) => {
                        let existingProject = nhaMayProjects.find(
                            (p) => p.name === projectRow.name
                        );
                        if (!existingProject) {
                            existingProject = {
                                name: projectRow.name,
                                type: "Nhà máy",
                                revenue: 0, revenueQ1: 0, revenueQ2: 0, revenueQ3: 0, revenueQ4: 0,
                                cost: 0, costQ1: 0, costQ2: 0, costQ3: 0, costQ4: 0,
                                profit: 0, profitQ1: 0, profitQ2: 0, profitQ3: 0, profitQ4: 0,
                            };
                            nhaMayProjects.push(existingProject);
                        }
                        existingProject[`revenue${quarter}`] = toNum(projectRow.revenue);
                        existingProject[`cost${quarter}`] = toNum(projectRow.cost);
                        existingProject[`profit${quarter}`] = toNum(projectRow.profit);
                    });
                }
            });

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

            // ✅ TỐI ƯU: Sử dụng cache thay vì đọc lại từ Firestore
            quarters.forEach(quarter => {
                const reportData = quarterlyReportsCache[quarter];
                if (reportData && Array.isArray(reportData.rows)) {
                    const dauTuRows = reportData.rows.filter((row) => row.type === "KH-ĐT");
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
            });

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

            // ✅ TỐI ƯU: Sử dụng cache thay vì đọc lại từ Firestore
            quarters.forEach(quarter => {
                const reportData = quarterlyReportsCache[quarter];
                if (reportData && Array.isArray(reportData.rows)) {
                    const cdtRows = reportData.rows.filter((row) => row.type === "CĐT");
                    cdtRows.forEach((projectRow) => {
                        let existingProject = cdtProjects.find(
                            (p) => p.name === projectRow.name
                        );
                        if (!existingProject) {
                            existingProject = {
                                name: projectRow.name, type: "CĐT",
                                revenue: 0, revenueQ1: 0, revenueQ2: 0, revenueQ3: 0, revenueQ4: 0,
                                cost: 0, costQ1: 0, costQ2: 0, costQ3: 0, costQ4: 0,
                                profit: 0, profitQ1: 0, profitQ2: 0, profitQ3: 0, profitQ4: 0,
                            };
                            cdtProjects.push(existingProject);
                        }
                        existingProject[`revenue${quarter}`] = toNum(projectRow.revenue);
                        existingProject[`cost${quarter}`] = toNum(projectRow.cost);
                        existingProject[`profit${quarter}`] = toNum(projectRow.profit);
                    });
                }
            });

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

                    // ✅ LOGIC MỚI: BỎ QUA các dự án thuộc các nhóm này từ DB (chỉ lấy từ báo cáo quý)
                    const isSkippedType =
                        (p.type === "Thi công") || // I.1 và I.2 (KÈ là Thi công)
                        (p.type === "XNII") ||     // I.4
                        (p.type === "KH-ĐT");      // III

                    if (isSkippedType) {
                        // Không chèn vào rowTemplate
                    } else if (insertIndex > -1) {
                        rowTemplate.splice(insertIndex, 0, p);
                    }
                }
            });
            // ======================================================================
            // ✅ BẮT ĐẦU: KHỐI CODE HỢP NHẤT VÀ CHÈN DỮ LIỆU HOÀN CHỈNH
            // ======================================================================

            // Object để tổng hợp dữ liệu từ các nhóm cần lấy từ báo cáo
            const manualGroupsData = {};
            const targetGroups = [
                { name: "I.1. DÂN DỤNG + GIAO THÔNG", type: "Thi công" },
                { name: "I.2. KÈ", type: "Thi công" },
                { name: "I.4. XÍ NGHIỆP XD II", type: "XNII" },
                { name: "III. ĐẦU TƯ", type: "KH-ĐT" }
            ];

            // ✅ TỐI ƯU: Sử dụng cache thay vì đọc lại từ Firestore
            quarters.forEach(quarter => {
                const reportData = quarterlyReportsCache[quarter];
                if (reportData) {
                    const quarterlyRows = reportData.rows || [];

                    targetGroups.forEach(group => {
                        const groupIndex = quarterlyRows.findIndex(r => (r.name || "").trim().toUpperCase() === group.name);
                        if (groupIndex === -1) return;

                        let endIndex = quarterlyRows.findIndex((r, idx) => idx > groupIndex && r.name && r.name.match(/^[IVX]+\./));
                        if (endIndex === -1) endIndex = quarterlyRows.length;

                        const childRows = quarterlyRows.slice(groupIndex + 1, endIndex);
                        // Lấy tất cả các hàng, trừ các hàng tổng con/tiêu đề con nếu có (nhưng thường là lấy hết project)
                        childRows.forEach(row => {
                            // Bỏ qua nếu là các dòng tổng hoặc ko có tên
                            if (!row.name || (row.name || "").trim().toUpperCase().includes("TỔNG")) return;

                            if (!manualGroupsData[row.name]) {
                                manualGroupsData[row.name] = { name: row.name, type: group.type };
                            }
                            // Nếu là nhóm I.1, I.2, I.4, III thì ghi đè logic type dựa theo nhóm tìm thấy
                            // Tuy nhiên logic gán type ở trên đã cover. 
                            // Chỉ cần lưu ý tên công trình là unique key.

                            if (!manualGroupsData[row.name][quarter]) manualGroupsData[row.name][quarter] = {};

                            manualGroupsData[row.name][quarter] = {
                                revenue: toNum(row.revenue),
                                cost: toNum(row.cost),
                                profit: toNum(row.profit),
                            };
                        });
                    });
                }
            });

            // Bước 2: Hợp nhất dữ liệu thủ công vào danh sách
            const manualNames = Object.keys(manualGroupsData);
            const purelyManualProjects = [];

            manualNames.forEach(name => {
                const manualData = manualGroupsData[name];

                // ✅ LOGIC MỚI: LUÔN COI LÀ DỰ ÁN TỪ BÁO CÁO
                const newManualProject = {
                    name: name,
                    type: manualData.type, // Sử dụng type đã xác định từ nhóm
                    revenue: 0, cost: 0, profit: 0,
                    revenueQ1: 0, costQ1: 0, profitQ1: 0, revenueQ2: 0, costQ2: 0, profitQ2: 0,
                    revenueQ3: 0, costQ3: 0, profitQ3: 0, revenueQ4: 0, costQ4: 0, profitQ4: 0,
                    fromProfitReport: true, // ✅ Đánh dấu là có dữ liệu từ báo cáo
                };
                for (const quarter of ["Q1", "Q2", "Q3", "Q4"]) {
                    if (manualData[quarter]) {
                        const qData = manualData[quarter];
                        newManualProject[`revenue${quarter}`] = qData.revenue;
                        newManualProject[`cost${quarter}`] = qData.cost;
                        newManualProject[`profit${quarter}`] = qData.profit;
                    }
                }
                newManualProject.revenue = newManualProject.revenueQ1 + newManualProject.revenueQ2 + newManualProject.revenueQ3 + newManualProject.revenueQ4;
                newManualProject.cost = newManualProject.costQ1 + newManualProject.costQ2 + newManualProject.costQ3 + newManualProject.costQ4;
                newManualProject.profit = newManualProject.profitQ1 + newManualProject.profitQ2 + newManualProject.profitQ3 + newManualProject.profitQ4;
                purelyManualProjects.push(newManualProject);
            });

            // Bước 3: Tạo một danh sách tổng hợp cuối cùng
            // Lọc bỏ danh sách project DB nếu nó thuộc các nhóm đã lấy từ báo cáo (Thi công, XNII, KH-ĐT)
            const projectsFiltered = projects.filter(p => {
                const isSkipped = (p.type === "Thi công") || (p.type === "XNII") || (p.type === "KH-ĐT");
                return !isSkipped;
            });
            const allProjects = [...projectsFiltered, ...purelyManualProjects];

            // Bước 4: Dùng vòng lặp duy nhất để chèn TOÀN BỘ công trình vào `rowTemplate`
            allProjects.forEach((p) => {
                const index = rowTemplate.findIndex((r) => r.name === p.name);
                if (index > -1) {
                    // Ghi đè nếu đã tồn tại (dành cho trường hợp load từ báo cáo đã lưu)
                    rowTemplate[index] = { ...rowTemplate[index], ...p };
                } else {
                    // Chèn mới vào đúng vị trí theo logic nguyên bản
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
                    } else if (p.type.toLowerCase().includes("nhà máy")) {
                        insertIndex = rowTemplate.findIndex(
                            (r) => r.name === `II.2. DT + LN ĐƯỢC CHIA TỪ LDX`
                        );
                    } else if (p.type === "KH-ĐT") {
                        insertIndex = rowTemplate.findIndex(
                            (r) => r.name === "IV. TỔNG"
                        );
                    }

                    if (insertIndex > -1) {
                        rowTemplate.splice(insertIndex, 0, p);
                    }
                }
            });

            // ======================================================================
            // ✅ KẾT THÚC: KHỐI CODE HỢP NHẤT VÀ CHÈN DỮ LIỆU HOÀN CHỈNH
            // ======================================================================
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

        // ✅ REALTIME: Lắng nghe thay đổi từ các nguồn dữ liệu
        const quarters = ["Q1", "Q2", "Q3", "Q4"];
        const isInitialProfitReports = { Q1: true, Q2: true, Q3: true, Q4: true };
        const isInitialReportAdjustments = { Q1: true, Q2: true, Q3: true, Q4: true };
        let isInitialEditable = true;

        // 1. Listeners cho profitReports (4 quý)
        const profitReportsListeners = quarters.map(q =>
            onSnapshot(doc(db, "profitReports", `${selectedYear}_${q}`), (docSnap) => {
                if (isInitialProfitReports[q]) {
                    isInitialProfitReports[q] = false;
                    return;
                }
                console.log(`[Realtime] profitReports Q${q}/${selectedYear} đã thay đổi`);
                fetchData();
            }, (error) => console.error(`Lỗi listener profitReports Q${q}:`, error))
        );

        // 2. Listeners cho reportAdjustments (4 quý) - từ /quarterly-cost-allocation
        const reportAdjustmentsListeners = quarters.map(q =>
            onSnapshot(doc(db, "reportAdjustments", `${selectedYear}_${q}`), (docSnap) => {
                if (isInitialReportAdjustments[q]) {
                    isInitialReportAdjustments[q] = false;
                    return;
                }
                console.log(`[Realtime] reportAdjustments Q${q}/${selectedYear} đã thay đổi`);
                fetchData();
            }, (error) => console.error(`Lỗi listener reportAdjustments Q${q}:`, error))
        );

        // 3. Listener cho editableProfitRows
        const editableListener = onSnapshot(doc(db, "editableProfitRows", `${selectedYear}`), (docSnap) => {
            if (isInitialEditable) {
                isInitialEditable = false;
                return;
            }
            console.log(`[Realtime] editableProfitRows ${selectedYear} đã thay đổi`);
            if (docSnap.exists()) {
                setEditableRows(docSnap.data().rows || {});
            }
        }, (error) => console.error(`Lỗi listener editableProfitRows:`, error));

        // Cleanup tất cả listeners khi unmount hoặc selectedYear thay đổi
        return () => {
            profitReportsListeners.forEach(unsub => unsub());
            reportAdjustmentsListeners.forEach(unsub => unsub());
            editableListener();
        };
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
        setRows, // ✅ Return setRows để có thể cập nhật từ component
        loading,
        initialSummaryTargets,
        editableRows,
        updateEditableRow,
        saveEditableData,
        editableRowNames,
        manualCostOver, // ✅ Return state
        setManualCostOver, // ✅ Return setter
    };
};

export default function ProfitReportYear() {
    const theme = useTheme(); // ✅ Thêm useTheme để đảm bảo theme được load
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [tvMode, setTvMode] = useState(false); // ✅ Mặc định false cho PC/laptop
    // ✅ BƯỚC 1: THÊM CÁC STATE VÀ REF CẦN THIẾT
    const [congTrinhColWidth, setCongTrinhColWidth] = useState(350); // Độ rộng ban đầu

    // ✅ SỬA LẠI PHẦN NÀY: LẤY `initialSummaryTargets` từ hook
    const {
        rows,
        setRows, // ✅ Lấy setRows để có thể cập nhật từ component
        loading,
        initialSummaryTargets, // Lấy dữ liệu chỉ tiêu ban đầu từ hook
        editableRows,
        updateEditableRow,
        saveEditableData,
        editableRowNames,
        manualCostOver, // ✅ Lấy state
        setManualCostOver, // ✅ Lấy setter
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

    // ✅ Hàm xử lý khi nhập tay Chi phí vượt trong BẢNG TÓM TẮT (Summary Table)
    // id: "I", "II", "III" -> tương ứng với hàng I. XÂY DỰNG, II. SẢN XUẤT, III. ĐẦU TƯ
    const handleSummaryCostOverChange = useCallback((id, value) => {
        const rowNameMap = {
            "I": "I. XÂY DỰNG",
            "II": "II. SẢN XUẤT",
            "III": "III. ĐẦU TƯ",
        };
        const rowName = rowNameMap[id];
        if (!rowName) return;

        // ✅ Cập nhật state manualCostOver để lưu và ưu tiên giá trị nhập tay
        setManualCostOver((prev) => ({
            ...prev,
            [id]: toNum(value),
        }));

        // ✅ Cập nhật luôn vào rows để hiển thị ngay
        setRows((prevRows) => {
            return prevRows.map((row) => {
                if (row.name === rowName) {
                    return { ...row, costOverCumulative: toNum(value) };
                }
                return row;
            });
        });
    }, [setManualCostOver, setRows]);
    // ✅ BƯỚC 1: THÊM ĐOẠN CODE NÀY ĐỂ CHUẨN BỊ DỮ LIỆU
    const summaryData = React.useMemo(() => {
        const constructionRow =
            rows.find((r) => r.name === "I. XÂY DỰNG") || {};
        const productionRow = rows.find((r) => r.name === "II. SẢN XUẤT") || {};
        const investmentRow = rows.find((r) => r.name === "III. ĐẦU TƯ") || {};

        return {
            revenueXayDung: constructionRow.revenue,
            profitXayDung: constructionRow.profit,
            // ✅ Ưu tiên giá trị nhập tay từ manualCostOver
            costOverXayDung: manualCostOver["I"] !== undefined ? manualCostOver["I"] : constructionRow.costOverCumulative,
            revenueSanXuat: productionRow.revenue,
            profitSanXuat: productionRow.profit,
            costOverSanXuat: manualCostOver["II"] !== undefined ? manualCostOver["II"] : productionRow.costOverCumulative,
            revenueDauTu: investmentRow.revenue,
            profitDauTu: investmentRow.profit,
            costOverDauTu: manualCostOver["III"] !== undefined ? manualCostOver["III"] : investmentRow.costOverCumulative,
        };
    }, [rows, manualCostOver]); // ✅ Thêm manualCostOver vào dep array
    // ✅ TỐI ƯU CHO TV MÀN HÌNH LỚN
    const cellStyle = {
        minWidth: tvMode ? 140 : 110,
        fontSize: tvMode ? 20 : { xs: 12, sm: 14 },
        padding: tvMode ? "12px 16px" : "8px 12px",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        border: tvMode ? "2px solid #ddd" : "1px solid #ddd",
        fontWeight: tvMode ? 500 : 400,
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

    // ✅ State để track ô đang được edit (tránh mất state khi re-render)
    const [editingCell, setEditingCell] = useState(null); // { rowName, field }
    const [editingValue, setEditingValue] = useState('');

    // Component cho ô có thể chỉnh sửa - Click để hiện input
    const ClickableEditCell = React.memo(({ rowName, field, value }) => {
        const isEditing = editingCell?.rowName === rowName && editingCell?.field === field;

        const handleClick = () => {
            setEditingCell({ rowName, field });
            setEditingValue(value || 0);
        };

        const handleBlur = () => {
            setEditingCell(null);
            updateEditableRow(rowName, field, editingValue);
        };

        const handleKeyPress = (e) => {
            if (e.key === "Enter") {
                setEditingCell(null);
                updateEditableRow(rowName, field, editingValue);
            }
            if (e.key === "Escape") {
                setEditingCell(null);
            }
        };

        const handleChange = (e) => {
            const newValue = e.target.value.replace(/,/g, ""); // Remove commas for calculation
            setEditingValue(newValue);
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
                    value={editingValue}
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
                    padding: tvMode ? "8px 12px" : "4px 8px",
                    minHeight: tvMode ? "36px" : "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                        borderRadius: "4px",
                        ...(tvMode ? {} : { transition: "background-color 0.2s" }),
                    },
                    border: "1px dashed transparent",
                    "&:hover .edit-hint": {
                        opacity: 1,
                        ...(tvMode ? {} : { transition: "opacity 0.2s" }),
                    },
                    fontSize: tvMode ? "1.1rem" : undefined,
                }}
            >
                {formatDisplayValue(value)}
                <Box
                    className="edit-hint"
                    sx={{
                        opacity: 0,
                        transition: tvMode ? "none" : "opacity 0.2s",
                        fontSize: tvMode ? "14px" : "10px",
                        color: "#666",
                        ml: 1,
                    }}
                >
                    ✏️
                </Box>
            </Box>
        );
    });
    // ... trước câu lệnh return

    // Print functionality
    const printRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `BaoCaoLoiNhuanNam_${selectedYear}`,
    });

    const visibleRevenueCols = Object.keys(columnVisibility).filter(k => k.startsWith('revenueQ') && columnVisibility[k]).length;
    const visibleCostCols = Object.keys(columnVisibility).filter(k => k.startsWith('costQ') && columnVisibility[k]).length;
    const visibleProfitCols = Object.keys(columnVisibility).filter(k => k.startsWith('profitQ') && columnVisibility[k]).length;

    // ✅ Tìm vị trí của nhóm I.1 và I.2 để áp dụng bộ lọc riêng
    const i1Index = rows.findIndex(r => r.name === "I.1. Dân Dụng + Giao Thông");
    const i2Index = rows.findIndex(r => r.name === "I.2. KÈ");

    return (
        <Box sx={{
            p: tvMode ? 4 : 3,
            bgcolor: tvMode ? "#f0f4f8" : "#f7faff",
            minHeight: "100vh",
            ...(tvMode && {
                background: "linear-gradient(135deg, #f0f4f8 0%, #e8f0f7 100%)",
            })
        }}>
            {loading && (
                <CircularProgress
                    size={tvMode ? 80 : 40}
                    thickness={tvMode ? 5 : 4}
                    sx={{
                        position: "fixed",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        zIndex: 2000,
                        color: "primary.main",
                    }}
                />
            )}
            <Paper
                elevation={tvMode ? 6 : 3}
                sx={{
                    p: tvMode ? 4 : { xs: 2, md: 3 },
                    borderRadius: tvMode ? 4 : 3,
                    ...(tvMode && {
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
                        border: "1px solid rgba(255, 255, 255, 0.8)",
                    })
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: tvMode ? 4 : 3,
                        flexWrap: "wrap",
                        gap: tvMode ? 3 : 2,
                    }}
                >
                    <Typography
                        variant={tvMode ? "h3" : "h5"}
                        fontWeight={700}
                        color="primary"
                        sx={{
                            fontSize: tvMode ? "2.5rem" : undefined,
                            textShadow: tvMode ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
                        }}
                    >
                        Báo cáo Lợi nhuận Năm: {selectedYear}
                    </Typography>
                    <Stack
                        direction="row"
                        spacing={tvMode ? 2 : 1.5}
                        useFlexGap
                        flexWrap="wrap"
                    >
                        <TextField
                            size={tvMode ? "medium" : "small"}
                            label="Năm"
                            type="number"
                            value={selectedYear}
                            onChange={(e) =>
                                setSelectedYear(Number(e.target.value))
                            }
                            sx={{
                                minWidth: tvMode ? 140 : 100,
                                "& .MuiInputBase-root": {
                                    fontSize: tvMode ? "1.25rem" : undefined,
                                    height: tvMode ? "48px" : undefined,
                                },
                                "& .MuiInputLabel-root": {
                                    fontSize: tvMode ? "1rem" : undefined,
                                }
                            }}
                        />
                        <Button
                            variant="contained"
                            color="success"
                            size={tvMode ? "large" : "medium"}
                            startIcon={<Save size={tvMode ? 24 : 18} />}
                            onClick={saveEditableData}
                            sx={{
                                fontSize: tvMode ? "1.1rem" : undefined,
                                px: tvMode ? 3 : undefined,
                                py: tvMode ? 1.5 : undefined,
                                fontWeight: tvMode ? 600 : undefined,
                            }}
                        >
                            Lưu thủ công
                        </Button>
                        <Button
                            variant="outlined"
                            color="primary"
                            size={tvMode ? "large" : "medium"}
                            startIcon={<FileDown size={tvMode ? 24 : 18} />}
                            sx={{
                                fontSize: tvMode ? "1.1rem" : undefined,
                                px: tvMode ? 3 : undefined,
                                py: tvMode ? 1.5 : undefined,
                                fontWeight: tvMode ? 600 : undefined,
                            }}
                        >
                            Xuất Excel
                        </Button>
                        {/* ✅ NÚT TOGGLE TV MODE */}
                        <Tooltip title={tvMode ? "Chuyển sang chế độ PC/Laptop" : "Chuyển sang chế độ TV màn hình lớn"}>
                            <Button
                                variant={tvMode ? "contained" : "outlined"}
                                size={tvMode ? "large" : "medium"}
                                onClick={() => setTvMode(!tvMode)}
                                startIcon={tvMode ? <TvIcon sx={{ fontSize: tvMode ? 24 : undefined }} /> : <ComputerIcon sx={{ fontSize: 20 }} />}
                                sx={{
                                    fontSize: tvMode ? "1.1rem" : undefined,
                                    px: tvMode ? 3 : undefined,
                                    py: tvMode ? 1.5 : undefined,
                                    fontWeight: tvMode ? 600 : undefined,
                                    minWidth: tvMode ? 160 : 140,
                                    ...(tvMode && {
                                        backgroundColor: theme.palette?.primary?.main || '#2081ED',
                                        color: theme.palette?.primary?.contrastText || '#FFFFFF',
                                        '&:hover': {
                                            backgroundColor: theme.palette?.primary?.dark || '#105AB8', // ✅ Giữ hover nhưng bỏ transition
                                        },
                                    }),
                                }}
                            >
                                {tvMode ? "Chế độ TV" : "Chế độ PC"}
                            </Button>
                        </Tooltip>
                        {/* ✅ NÚT IN */}
                        <Button
                            variant="outlined"
                            color="secondary"
                            size={tvMode ? "large" : "medium"}
                            onClick={handlePrint}
                            startIcon={<PrintIcon sx={{ fontSize: tvMode ? 24 : undefined }} />}
                            sx={{
                                fontSize: tvMode ? "1.1rem" : undefined,
                                px: tvMode ? 3 : undefined,
                                py: tvMode ? 1.5 : undefined,
                                fontWeight: tvMode ? 600 : undefined,
                            }}
                        >
                            In
                        </Button>

                        {/* ✅ 3. THÊM NÚT VÀ MENU TẠI ĐÂY */}
                        <Tooltip title="Ẩn/Hiện cột">
                            <Button
                                variant="outlined"
                                size={tvMode ? "large" : "medium"}
                                onClick={handleColumnMenuClick}
                                startIcon={<ViewColumnIcon sx={{ fontSize: tvMode ? 24 : undefined }} />}
                                sx={{
                                    fontSize: tvMode ? "1.1rem" : undefined,
                                    px: tvMode ? 3 : undefined,
                                    py: tvMode ? 1.5 : undefined,
                                    fontWeight: tvMode ? 600 : undefined,
                                }}
                            >
                                Các cột
                            </Button>
                        </Tooltip>
                        <Menu
                            anchorEl={anchorEl}
                            open={open}
                            onClose={handleColumnMenuClose}
                            PaperProps={{
                                sx: {
                                    ...(tvMode && {
                                        minWidth: 280,
                                        "& .MuiMenuItem-root": {
                                            fontSize: "1.1rem",
                                            padding: "12px 16px",
                                        },
                                        "& .MuiCheckbox-root": {
                                            fontSize: "1.2rem",
                                        },
                                    })
                                }
                            }}
                        >
                            {Object.keys(columnVisibility).map((key) => (
                                <MenuItem key={key} onClick={() => handleToggleColumn(key)}>
                                    <Checkbox checked={columnVisibility[key]} />
                                    <ListItemText
                                        primary={columnLabels[key] || key.toUpperCase()}
                                        primaryTypographyProps={{
                                            fontSize: tvMode ? "1.1rem" : undefined,
                                            fontWeight: tvMode ? 500 : undefined,
                                        }}
                                    />
                                </MenuItem>
                            ))}
                        </Menu>
                    </Stack>
                </Box>
                <ProfitSummaryTable
                    data={summaryData}
                    targets={summaryTargets}
                    onTargetChange={handleTargetChange}
                    onCostOverChange={handleSummaryCostOverChange} // ✅ Cho phép nhập CHI PHÍ VƯỢT ở bảng tóm tắt
                    isYearlyReport={true}
                    tvMode={tvMode} // ✅ Truyền tvMode vào component
                />

                <TableContainer
                    sx={{
                        maxHeight: tvMode ? "80vh" : "75vh",
                        border: tvMode ? "3px solid #1565c0" : "1px solid #e0e0e0",
                        borderRadius: tvMode ? 3 : 2,
                        boxShadow: tvMode ? "0 4px 20px rgba(0, 0, 0, 0.1)" : "none",
                    }}
                >
                    <Table
                        stickyHeader
                        size={tvMode ? "medium" : "small"}
                        sx={{
                            minWidth: tvMode ? 4200 : 3800,
                            tableLayout: 'fixed',
                            "& .MuiTableCell-root": {
                                fontSize: tvMode ? "1.1rem" : undefined,
                            }
                        }}
                    >
                        <TableHead>
                            <TableRow sx={{
                                "& th": {
                                    backgroundColor: tvMode ? "#0d47a1" : "#1565c0",
                                    color: "#fff",
                                    fontWeight: tvMode ? 800 : 700,
                                    border: tvMode ? "2px solid #004c8f" : "1px solid #004c8f",
                                    fontSize: tvMode ? "1.2rem" : undefined,
                                    padding: tvMode ? "16px" : undefined,
                                }
                            }}>
                                {/* CỘT CÔNG TRÌNH (Luôn hiển thị) */}
                                <ResizableHeader
                                    width={tvMode ? Math.max(congTrinhColWidth, 400) : congTrinhColWidth}
                                    onResize={handleColumnResize}
                                    style={{
                                        ...cellStyle,
                                        width: tvMode ? Math.max(congTrinhColWidth, 400) : congTrinhColWidth,
                                        position: "sticky",
                                        left: 0,
                                        zIndex: 110,
                                        backgroundColor: tvMode ? "#0d47a1" : "#1565c0",
                                        textAlign: 'center',
                                        fontSize: tvMode ? "1.3rem" : cellStyle.fontSize,
                                        fontWeight: tvMode ? 800 : 700,
                                        padding: tvMode ? "16px" : cellStyle.padding,
                                    }}
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

                            <TableRow sx={{
                                "& th": {
                                    backgroundColor: tvMode ? "#0d47a1" : "#1565c0",
                                    color: "#fff",
                                    fontWeight: tvMode ? 700 : 600,
                                    border: tvMode ? "2px solid #004c8f" : "1px solid #004c8f",
                                    fontSize: tvMode ? "1.1rem" : undefined,
                                    padding: tvMode ? "14px" : undefined,
                                }
                            }}>
                                {/* TIÊU ĐỀ PHỤ (THEO QUÝ) */}
                                {columnVisibility.revenueQ1 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>QUÝ 1</TableCell>}
                                {columnVisibility.revenueQ2 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>QUÝ 2</TableCell>}
                                {columnVisibility.revenueQ3 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>QUÝ 3</TableCell>}
                                {columnVisibility.revenueQ4 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>QUÝ 4</TableCell>}

                                {columnVisibility.costQ1 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>CP Q1</TableCell>}
                                {columnVisibility.costQ2 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>CP Q2</TableCell>}
                                {columnVisibility.costQ3 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>CP Q3</TableCell>}
                                {columnVisibility.costQ4 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>CP Q4</TableCell>}

                                {columnVisibility.profitQ1 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>LN Q1</TableCell>}
                                {columnVisibility.profitQ2 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>LN Q2</TableCell>}
                                {columnVisibility.profitQ3 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>LN Q3</TableCell>}
                                {columnVisibility.profitQ4 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>LN Q4</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.filter((r, idx) => {
                                const isSpecialHeaderRow = r.name?.match(/^[IVX]+\./) || r.name?.toUpperCase().includes("LỢI NHUẬN") || r.name?.toUpperCase().includes("=>");
                                if (isSpecialHeaderRow) return true;

                                // ✅ LỌC RIÊNG CHO I.1: Ẩn nếu doanh thu = 0 (TRỪ KHI có dữ liệu từ báo cáo: nhập tay/sửa tay)
                                if (i1Index !== -1 && i2Index !== -1 && idx > i1Index && idx < i2Index) {
                                    if (!r.fromProfitReport && toNum(r.revenue) === 0) return false;
                                }

                                if (r.projectId) {
                                    const hasFinancialData = toNum(r.revenue) !== 0 || toNum(r.cost) !== 0 || toNum(r.costOverCumulative) !== 0 || toNum(r.costAddedToProfit) !== 0;
                                    return hasFinancialData;
                                } else {
                                    return true;
                                }
                            }).map((r, idx) => {
                                // ✅ LOGIC TÔ MÀU HÀNG CẢI TIẾN
                                const isMainHeader = r.name?.match(/^[IVX]+\./); // I., II., III., IV., V., VI.
                                const isTotalRow = r.name === "IV. TỔNG";
                                const isResultRow = r.name?.includes("=>") || r.name?.startsWith("A.") || r.name?.startsWith("B.");
                                const isSummaryRow = r.name?.includes("TỔNG LỢI NHUẬN") || r.name?.includes("LỢI NHUẬN RÒNG");
                                const isSubSection = r.name?.match(/^[a-d]\./i) || r.name?.match(/^[1-4]\./);
                                const isEditable = isEditableRow(r.name);

                                // Màu nền
                                let bgColor;
                                if (isTotalRow) {
                                    bgColor = tvMode ? "#a5d6a7" : "#c8e6c9"; // Xanh lá đậm cho IV. TỔNG
                                } else if (isSummaryRow || isResultRow) {
                                    bgColor = tvMode ? "#90caf9" : "#bbdefb"; // Xanh dương nhạt cho hàng kết quả
                                } else if (isMainHeader) {
                                    bgColor = tvMode ? "#fff59d" : "#fff9c4"; // Vàng cho header chính
                                } else if (isEditable) {
                                    bgColor = tvMode ? "#e1bee7" : "#f3e5f5"; // Tím nhạt cho editable
                                } else {
                                    bgColor = idx % 2 === 0 ? "#ffffff" : (tvMode ? "#f5f5f5" : "#fafafa");
                                }

                                // Độ đậm chữ cho cột tên
                                let nameFontWeight;
                                if (isTotalRow || isSummaryRow || isResultRow) {
                                    nameFontWeight = tvMode ? 800 : 700; // Rất đậm
                                } else if (isMainHeader) {
                                    nameFontWeight = tvMode ? 700 : 600; // Đậm
                                } else if (isSubSection) {
                                    nameFontWeight = tvMode ? 500 : 400; // Bình thường
                                } else {
                                    nameFontWeight = tvMode ? 500 : 400;
                                }

                                return (
                                    <TableRow key={`${r.name}-${idx}`} sx={{
                                        backgroundColor: bgColor,
                                        "&:hover": {
                                            bgcolor: tvMode ? "#e3f2fd" : "#f0f4ff",
                                            ...(tvMode ? {} : { transition: "background-color 0.2s" }),
                                        },
                                        borderBottom: tvMode ? "2px solid #e0e0e0" : "1px solid #e0e0e0",
                                        // Thêm viền đậm cho các hàng quan trọng
                                        ...(isTotalRow || isSummaryRow || isResultRow ? {
                                            borderTop: tvMode ? "3px solid #1565c0" : "2px solid #1565c0",
                                            borderBottom: tvMode ? "3px solid #1565c0" : "2px solid #1565c0",
                                        } : {}),
                                    }}>
                                        <TableCell sx={{
                                            ...cellStyle,
                                            fontWeight: nameFontWeight,
                                            width: tvMode ? Math.max(congTrinhColWidth, 400) : congTrinhColWidth,
                                            minWidth: tvMode ? Math.max(congTrinhColWidth, 400) : congTrinhColWidth,
                                            backgroundColor: "inherit",
                                            position: "sticky",
                                            left: 0,
                                            zIndex: 99,
                                            borderRight: tvMode ? "3px solid #1565c0" : "2px solid #ccc",
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            fontSize: tvMode ? "1.15rem" : cellStyle.fontSize,
                                            // Thêm màu chữ đặc biệt cho hàng kết quả
                                            color: (isTotalRow || isSummaryRow) ? "#1565c0" : "inherit",
                                        }}>
                                            {r.name}
                                        </TableCell>
                                        {/* DỮ LIỆU DOANH THU */}
                                        {columnVisibility.revenueQ1 && <TableCell align="right" sx={cellStyle}>{format(r.revenueQ1)}</TableCell>}
                                        {columnVisibility.revenueQ2 && <TableCell align="right" sx={cellStyle}>{format(r.revenueQ2)}</TableCell>}
                                        {columnVisibility.revenueQ3 && <TableCell align="right" sx={cellStyle}>{format(r.revenueQ3)}</TableCell>}
                                        {columnVisibility.revenueQ4 && <TableCell align="right" sx={cellStyle}>{format(r.revenueQ4)}</TableCell>}
                                        {columnVisibility.totalRevenue && <TableCell align="right" sx={{ ...cellStyle, fontWeight: (isMainHeader || isTotalRow || isSummaryRow || isResultRow) ? "bold" : "normal", backgroundColor: "#e3f2fd" }}>{format(r.revenue)}</TableCell>}

                                        {/* DỮ LIỆU CHI PHÍ */}
                                        {columnVisibility.costQ1 && <TableCell align="right" sx={cellStyle}>{format(r.costQ1)}</TableCell>}
                                        {columnVisibility.costQ2 && <TableCell align="right" sx={cellStyle}>{format(r.costQ2)}</TableCell>}
                                        {columnVisibility.costQ3 && <TableCell align="right" sx={cellStyle}>{format(r.costQ3)}</TableCell>}
                                        {columnVisibility.costQ4 && <TableCell align="right" sx={cellStyle}>{format(r.costQ4)}</TableCell>}
                                        {columnVisibility.totalCost && <TableCell align="right" sx={{ ...cellStyle, fontWeight: (isMainHeader || isTotalRow || isSummaryRow || isResultRow) ? "bold" : "normal", backgroundColor: "#e3f2fd" }}>{format(r.cost)}</TableCell>}

                                        {/* DỮ LIỆU LỢI NHUẬN - Chỉ bold cho hàng quan trọng */}
                                        {columnVisibility.profitQ1 && <TableCell align="right" sx={{ ...cellStyle, fontWeight: (isMainHeader || isTotalRow || isSummaryRow || isResultRow) ? "bold" : "normal" }}>{format(r.profitQ1)}</TableCell>}
                                        {columnVisibility.profitQ2 && <TableCell align="right" sx={{ ...cellStyle, fontWeight: (isMainHeader || isTotalRow || isSummaryRow || isResultRow) ? "bold" : "normal" }}>{format(r.profitQ2)}</TableCell>}
                                        {columnVisibility.profitQ3 && <TableCell align="right" sx={{ ...cellStyle, fontWeight: (isMainHeader || isTotalRow || isSummaryRow || isResultRow) ? "bold" : "normal" }}>{format(r.profitQ3)}</TableCell>}
                                        {columnVisibility.profitQ4 && <TableCell align="right" sx={{ ...cellStyle, fontWeight: (isMainHeader || isTotalRow || isSummaryRow || isResultRow) ? "bold" : "normal" }}>{format(r.profitQ4)}</TableCell>}
                                        {columnVisibility.totalProfit && <TableCell align="right" sx={{
                                            ...cellStyle,
                                            fontWeight: (isMainHeader || isTotalRow || isSummaryRow || isResultRow) ? (tvMode ? 700 : "bold") : "normal",
                                            backgroundColor: (isMainHeader || isTotalRow || isSummaryRow || isResultRow) ? (tvMode ? "#b39ddb" : "#d1c4e9") : undefined,
                                            padding: tvMode ? "12px 16px" : "4px 8px",
                                            fontSize: tvMode ? "1.2rem" : cellStyle.fontSize,
                                        }}>{isEditableRow(r.name) ? <ClickableEditCell rowName={r.name} field="profit" value={editableRows[r.name]?.profit || r.profit || 0} /> : format(r.profit)}</TableCell>}

                                        {/* DỮ LIỆU CÁC CỘT ĐẶC BIỆT */}
                                        {columnVisibility.plannedProfitMargin && <TableCell align="center" sx={cellStyle}>{format(r.plannedProfitMargin, "percent")}</TableCell>}
                                        {columnVisibility.actualProfitMargin && <TableCell align="center" sx={cellStyle}>{r.projectId && r.revenue ? format((r.profit / r.revenue) * 100, "percent") : ''}</TableCell>}
                                        {columnVisibility.costOverCumulative && <TableCell align="right" sx={cellStyle}>{format(r.costOverCumulative)}</TableCell>}
                                        {columnVisibility.costAddedToProfit && <TableCell align="right" sx={cellStyle}>{format(r.costAddedToProfit)}</TableCell>}
                                        {columnVisibility.note && <TableCell align="left" sx={cellStyle}>{format(r.note)}</TableCell>}
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
            {/* Hidden Print Template */}
            <div style={{ display: "none" }}>
                <ProfitReportYearPrintTemplate
                    ref={printRef}
                    rows={rows} // Chú ý: rows ở đây là rows sau khi xử lý (được trả về từ useProfitReportData)
                    year={selectedYear}
                    summaryTargets={summaryTargets}
                    summaryData={summaryData}
                />
            </div>
        </Box >
    );
}